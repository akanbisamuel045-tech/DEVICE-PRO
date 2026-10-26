/**
 * tests/stage28_solar_package_bom.test.js
 * 
 * DEVICE PRO — Stage 8.4: Solar Package Bill of Materials (BOM) Test Suite
 * 
 * Comprehensive Automated Verification covering Section 11 requirements:
 * 1. Creating a BOM
 * 2. Retrieving a BOM
 * 3. Editing a BOM & Revision increment
 * 4. Adding and removing draft component lines
 * 5. Invalid package identifiers
 * 6. Invalid product identifiers
 * 7. Archived product exclusion for new component selections
 * 8. Circular reference prevention (turnkey solar package cannot be component)
 * 9. Historical snapshot behavior
 * 10. Missing component costs (cost stored as null, not zero; marked as missing)
 * 11. Complete and incomplete costing
 * 12. Quantity validation (> 0, finite, reject <= 0 or NaN)
 * 13. Unit validation (strict permitted list)
 * 14. Waste allowance & currency calculation precision
 * 15. Concurrent edit handling (optimistic concurrency HTTP 409)
 * 16. Authorization and role restrictions (unauthenticated, customer, staff, engineer, superadmin)
 * 17. Approval workflow guard (incomplete costing cannot be approved; superadmin only)
 * 18. Public API confidentiality (public packages endpoints do not leak internal costs)
 * 19. Audit logging (CREATE_BOM, UPDATE_BOM_REVISION, APPROVE_BOM)
 * 20. Database invariance audit (48 active products, 70 benchmarks, 0 price/cost mutations)
 */

const assert = require('assert');
const crypto = require('crypto');
const { connectMongo, assertTestEnvironmentIsolated } = require('../db/mongo/connection');
const { Product, Order, Quote, User, AuditLog, PackageBom } = require('../db/mongo/models');
const {
  calculateBom,
  validateQuantity,
  validateUnit,
  validateWasteAllowance,
  normalizeCurrencyNgn,
  validateCatalogProductForBom,
  COST_SOURCES
} = require('../lib/bom-engine');

// Enforce test environment isolation
assertTestEnvironmentIsolated();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 8.4: SOLAR PACKAGE BILL OF MATERIALS (BOM) TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function request(reqPath, options = {}) {
    const url = `${BASE_URL}${reqPath}`;
    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String) && !(options.body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return { status: res.status, headers: res.headers, body };
  }

  // Pre-flight database connection
  await connectMongo();

  // Baseline database counts
  console.log('[STAGE 8.4 TEST] Capturing pre-test database baseline snapshots...');
  const preTotalProducts = await Product.countDocuments();
  const preActiveCommercial = await Product.find({ published: 1 }).lean();
  const preArchivedBenchmarks = await Product.find({ published: 0 }).lean();
  const preOrdersCount = await Order.countDocuments();
  const preQuotesCount = await Quote.countDocuments();
  const preCustomerCount = await User.countDocuments({ role: 'customer' });

  // Map of active commercial product prices and costs
  const preActiveMap = new Map();
  preActiveCommercial.forEach(p => {
    preActiveMap.set(p.sku, {
      id: p.id,
      name: p.name,
      price_ngn: p.price_ngn,
      cost_price_ngn: p.cost_price_ngn,
      published: p.published
    });
  });

  // Verify baseline product counts
  assert.strictEqual(preActiveCommercial.length, 48, 'Active commercial catalog must have exactly 48 items');
  assert.strictEqual(preArchivedBenchmarks.length, 70, 'Soft-archived benchmark catalog must have exactly 70 items');

  // Find a target package for testing (e.g. Package ID 24, DP-PKG-5KVA, Executive 5kVA Solar Package)
  const targetPackage = await Product.findOne({ id: 24, category: 'solar-packages' }).lean();
  assert.ok(targetPackage, 'Target test package ID 24 (DP-PKG-5KVA) must exist in database');

  // Find active commercial catalog products for component linking (e.g. inverter, panels, batteries)
  const samplePanel = await Product.findOne({ category: 'solar-panels', published: 1 }).lean();
  const sampleInverter = await Product.findOne({ category: 'inverters', published: 1 }).lean();
  const sampleBattery = await Product.findOne({ category: 'batteries', published: 1 }).lean();
  assert.ok(samplePanel, 'Active sample solar panel must exist');
  assert.ok(sampleInverter, 'Active sample inverter must exist');
  assert.ok(sampleBattery, 'Active sample battery must exist');

  // Authenticate roles
  console.log('[STAGE 8.4 TEST] Authenticating test actors...');

  // 1. Superadmin
  const saLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(saLogin.status, 200, 'Superadmin login must succeed');
  const superadminToken = saLogin.body.token;

  // 2. Lead Engineer
  const engLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engLogin.status, 200, 'Engineer login must succeed');
  const engineerToken = engLogin.body.token;

  // 3. Customer account
  const testCustomerEmail = `cust_stage84_${Date.now()}@devicepro.test`;
  const custReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'BOM Customer Access Test',
      email: testCustomerEmail,
      phone: '+2348099881122',
      password: 'CustomerBOMPass123!'
    }
  });
  assert.strictEqual(custReg.status, 201, 'Customer registration must succeed');
  const customerToken = custReg.body.token;

  // 4. Finance Reviewer Account (Stage 8.4.1 Dual-Authorization)
  const testFinanceEmail = `fin_stage28_${Date.now()}@devicepro.test`;
  const finSalt = crypto.randomBytes(16).toString('hex');
  const finHash = crypto.scryptSync('Finance@DevicePro2026!', finSalt, 64).toString('hex');
  await User.create({
    id: Date.now() + Math.floor(Math.random() * 1000),
    username: `finance_stage28_${Date.now()}`,
    email: testFinanceEmail,
    full_name: 'Finance Reviewer Test',
    role: 'finance',
    password_hash: finHash,
    salt: finSalt,
    created_at: new Date()
  });

  const finLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: testFinanceEmail, password: 'Finance@DevicePro2026!' }
  });
  assert.strictEqual(finLogin.status, 200, 'Finance test user login must succeed');
  const financeToken = finLogin.body.token;

  // Clean up any existing BOM for the target test package before test sequence
  await PackageBom.deleteMany({ package_id: 24 });

  console.log('\n--- 1. BOM LIFECYCLE & REVISION MANAGEMENT TESTS ---');

  await test('1.1 List admin solar packages returns 6 turnkey packages with BOM summaries', async () => {
    const res = await request('/api/admin/solar-packages', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.count, 6);
    assert.strictEqual(res.body.packages.length, 6);

    const pkg24 = res.body.packages.find(p => p.id === 24);
    assert.ok(pkg24);
    assert.strictEqual(pkg24.sku, 'DP-PKG-5KVA');
    assert.strictEqual(pkg24.price_ngn, targetPackage.price_ngn);
    assert.strictEqual(pkg24.has_bom, false);
    assert.strictEqual(pkg24.bom_summary, null);
  });

  await test('1.2 Retrieve BOM for package with no existing BOM returns package & eligible products', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.package.id, 24);
    assert.strictEqual(res.body.bom, null);
    assert.ok(Array.isArray(res.body.eligible_products));
    assert.strictEqual(res.body.eligible_products.length, 42); // 48 active minus 6 packages
  });

  await test('1.3 Create new draft BOM with draft component lines and unknown costs', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 0,
        status: 'draft',
        revision_notes: 'Initial engineering draft for 5kVA system',
        components: [
          {
            component_type: 'solar-panels',
            product_id: samplePanel.id,
            product_name: samplePanel.name,
            product_sku: samplePanel.sku,
            quantity: 8,
            unit: 'pcs',
            waste_allowance_pct: 0,
            unit_cost_ngn: null, // Unknown cost
            cost_source: 'unknown',
            cost_provenance_ref: '',
            notes: 'Roof mount PV array'
          },
          {
            component_type: 'hybrid-inverter',
            product_id: sampleInverter.id,
            product_name: sampleInverter.name,
            product_sku: sampleInverter.sku,
            quantity: 1,
            unit: 'pcs',
            waste_allowance_pct: 0,
            unit_cost_ngn: null,
            cost_source: 'unknown'
          }
        ],
        non_product_costs: [
          {
            cost_type: 'labour_installation',
            name: 'Standard rooftop solar installation & commissioning',
            cost_ngn: null, // Unknown cost
            provenance_ref: ''
          }
        ]
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const bom = res.body.bom;
    assert.ok(bom);
    assert.strictEqual(bom.bom_id, 'BOM-PKG-DP-PKG-5KVA');
    assert.strictEqual(bom.package_id, 24);
    assert.strictEqual(bom.revision, 1);
    assert.strictEqual(bom.status, 'draft');
    assert.strictEqual(bom.components.length, 2);
    assert.strictEqual(bom.non_product_costs.length, 1);
    assert.strictEqual(bom.cost_summary.total_lines_count, 3);
    assert.strictEqual(bom.cost_summary.missing_cost_lines_count, 3);
    assert.strictEqual(bom.cost_summary.is_costing_complete, false);
    assert.strictEqual(bom.cost_summary.total_estimated_cost_ngn, null);
  });

  await test('1.4 Retrieve existing BOM returns populated lines, snapshots, and revision 1', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert.strictEqual(res.status, 200);
    const bom = res.body.bom;
    assert.ok(bom);
    assert.strictEqual(bom.revision, 1);
    assert.strictEqual(bom.status, 'draft');
    assert.strictEqual(bom.components[0].product_sku, samplePanel.sku);
    assert.strictEqual(bom.components[0].unit_cost_ngn, null);
    assert.strictEqual(bom.margin_analysis, null); // Margin is null because costing is incomplete
  });

  await test('1.5 Edit BOM: add component line, remove one, and increment to revision 2', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 1,
        status: 'draft',
        revision_notes: 'Added battery storage line; removed inverter for sizing review',
        components: [
          {
            component_type: 'solar-panels',
            product_id: samplePanel.id,
            product_name: samplePanel.name,
            quantity: 8,
            unit: 'pcs',
            waste_allowance_pct: 5,
            unit_cost_ngn: null
          },
          {
            component_type: 'battery',
            product_id: sampleBattery.id,
            product_name: sampleBattery.name,
            quantity: 2,
            unit: 'pcs',
            waste_allowance_pct: 0,
            unit_cost_ngn: null
          }
        ],
        non_product_costs: []
      }
    });

    assert.strictEqual(res.status, 200);
    const bom = res.body.bom;
    assert.strictEqual(bom.revision, 2);
    assert.strictEqual(bom.components.length, 2);
    assert.strictEqual(bom.history.length, 1);
    assert.strictEqual(bom.history[0].revision, 1);
    assert.strictEqual(bom.history[0].revision_notes, 'Initial engineering draft for 5kVA system');
  });

  console.log('\n--- 2. INPUT VALIDATION & INTEGRITY GUARDS ---');

  await test('2.1 Invalid package identifier (non-existent ID) returns HTTP 404', async () => {
    const res = await request('/api/admin/solar-packages/99999/bom', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  await test('2.2 Invalid package identifier (non-package catalog product) returns HTTP 404', async () => {
    // Product ID 1 is an inverter, not category: 'solar-packages'
    const res = await request('/api/admin/solar-packages/1/bom', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  await test('2.3 Non-numeric package identifier returns HTTP 400', async () => {
    const res = await request('/api/admin/solar-packages/invalid-id/bom', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 400);
  });

  await test('2.4 Invalid product identifier for component link returns HTTP 400', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 2,
        components: [
          {
            component_type: 'solar-panels',
            product_id: 888888, // Non-existent product ID
            product_name: 'Ghost Panel',
            quantity: 5,
            unit: 'pcs'
          }
        ]
      }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('not found in catalog'));
  });

  await test('2.5 Soft-archived benchmark products (published: 0) rejected from BOM selection', async () => {
    const benchmarkProduct = await Product.findOne({ published: 0 }).lean();
    assert.ok(benchmarkProduct, 'Archived benchmark product must exist');

    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 2,
        components: [
          {
            component_type: 'hybrid-inverter',
            product_id: benchmarkProduct.id,
            product_name: benchmarkProduct.name,
            quantity: 1,
            unit: 'pcs'
          }
        ]
      }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('is archived and cannot be selected'));
  });

  await test('2.6 Turnkey solar package cannot be linked as component of another package (circular reference guard)', async () => {
    // Package 23 (DP-PKG-3.5KVA)
    const otherPkg = await Product.findOne({ id: 23, category: 'solar-packages' }).lean();
    assert.ok(otherPkg);

    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 2,
        components: [
          {
            component_type: 'other',
            product_id: otherPkg.id,
            product_name: otherPkg.name,
            quantity: 1,
            unit: 'pcs'
          }
        ]
      }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('cannot be added as a subcomponent'));
  });

  await test('2.7 Quantity validation rejects zero, negative, infinite, and NaN values', async () => {
    assert.throws(() => validateQuantity(0), /greater than 0/);
    assert.throws(() => validateQuantity(-4), /greater than 0/);
    assert.throws(() => validateQuantity('abc'), /Invalid quantity/);
    assert.throws(() => validateQuantity(Infinity), /Invalid quantity/);
    assert.strictEqual(validateQuantity(12.5), 12.5);
  });

  await test('2.8 Unit of measure validation enforces approved dictionary', async () => {
    assert.strictEqual(validateUnit('pcs'), 'pcs');
    assert.strictEqual(validateUnit('METERS'), 'meters');
    assert.strictEqual(validateUnit('sets'), 'sets');
    assert.throws(() => validateUnit('gallons'), /Invalid unit of measure/);
    assert.throws(() => validateUnit('bottles'), /Invalid unit of measure/);
  });

  await test('2.9 Waste allowance validation rejects negative and > 100% values', async () => {
    assert.strictEqual(validateWasteAllowance(0), 0);
    assert.strictEqual(validateWasteAllowance(10), 10);
    assert.strictEqual(validateWasteAllowance('5.5'), 5.5);
    assert.throws(() => validateWasteAllowance(-5), /between 0% and 100%/);
    assert.throws(() => validateWasteAllowance(150), /between 0% and 100%/);
  });

  await test('2.10 Negative monetary values rejected by currency normalizer', async () => {
    assert.throws(() => normalizeCurrencyNgn(-1000), /cannot be negative/);
    assert.strictEqual(normalizeCurrencyNgn(null), null);
    assert.strictEqual(normalizeCurrencyNgn(150500.55), 150500.55);
  });

  console.log('\n--- 3. FINANCIAL CALCULATION PRECISION & COSTING COMPLETENESS ---');

  await test('3.1 Missing component costs are stored as null and never defaulted to 0', async () => {
    const calc = calculateBom({
      components: [
        {
          component_type: 'solar-panels',
          product_name: '550W Panel',
          quantity: 4,
          unit: 'pcs',
          unit_cost_ngn: null,
          cost_source: 'unknown'
        }
      ]
    });
    assert.strictEqual(calc.components[0].unit_cost_ngn, null);
    assert.strictEqual(calc.components[0].line_cost_ngn, null);
    assert.strictEqual(calc.cost_summary.is_costing_complete, false);
    assert.strictEqual(calc.cost_summary.missing_cost_lines_count, 1);
    assert.strictEqual(calc.cost_summary.total_estimated_cost_ngn, null);
    assert.strictEqual(calc.margin_analysis, null);
  });

  await test('3.2 Waste percentage arithmetic is applied accurately without floating point error', async () => {
    // 10 units at ₦120,500.25 with 10% waste = 11 effective units * ₦120,500.25 = ₦1,325,502.75
    const calc = calculateBom({
      components: [
        {
          component_type: 'cables-connectors',
          product_name: '4mm DC Solar Cable',
          quantity: 10,
          unit: 'meters',
          waste_allowance_pct: 10,
          unit_cost_ngn: 120500.25,
          cost_source: 'manual_sourced_cost',
          cost_provenance_ref: 'Cable Vendor Quotation #CV-442'
        }
      ]
    });
    assert.strictEqual(calc.components[0].effective_quantity, 11);
    assert.strictEqual(calc.components[0].line_cost_ngn, 1325502.75);
    assert.strictEqual(calc.cost_summary.components_subtotal_ngn, 1325502.75);
    assert.strictEqual(calc.cost_summary.is_costing_complete, true);
  });

  await test('3.3 100% complete costing produces verified total cost and gross margin', async () => {
    // Retail Price: ₦2,950,000
    // Component 1: 8 panels * ₦95,000 = ₦760,000
    // Component 2: 1 inverter * ₦850,000 = ₦850,000
    // Component 3: 1 battery * ₦550,000 = ₦550,000
    // Services: Labour ₦150,000 + Transport ₦50,000 = ₦200,000
    // Total Cost: ₦2,360,000
    // Profit: ₦2,950,000 - ₦2,360,000 = ₦590,000
    // Margin: (590,000 / 2,950,000) * 100 = 20.00%
    const calc = calculateBom({
      components: [
        {
          component_type: 'solar-panels',
          product_name: '550W Tier-1 Mono Bifacial PV Panel',
          quantity: 8,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 95000,
          cost_source: 'manual_sourced_cost',
          cost_provenance_ref: 'Verified Supplier Quotation #SQ-881'
        },
        {
          component_type: 'hybrid-inverter',
          product_name: '5kVA 48V Hybrid Solar Inverter',
          quantity: 1,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 850000,
          cost_source: 'manual_sourced_cost',
          cost_provenance_ref: 'Verified Supplier Quotation #SQ-881'
        },
        {
          component_type: 'battery',
          product_name: '5.12kWh 100Ah LiFePO4 Lithium Battery',
          quantity: 1,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 550000,
          cost_source: 'manual_sourced_cost',
          cost_provenance_ref: 'Verified Supplier Quotation #SQ-881'
        }
      ],
      non_product_costs: [
        {
          cost_type: 'labour_installation',
          name: 'Professional engineering installation & cabling',
          cost_ngn: 150000,
          provenance_ref: 'Engineering Tariff 2026'
        },
        {
          cost_type: 'logistics_transport',
          name: 'Secure logistics & delivery to site',
          cost_ngn: 50000,
          provenance_ref: 'Logistics Standard Delivery'
        }
      ],
      packagePriceNgn: 2950000
    });

    assert.strictEqual(calc.cost_summary.components_subtotal_ngn, 2160000);
    assert.strictEqual(calc.cost_summary.non_product_subtotal_ngn, 200000);
    assert.strictEqual(calc.cost_summary.total_estimated_cost_ngn, 2360000);
    assert.strictEqual(calc.cost_summary.missing_cost_lines_count, 0);
    assert.strictEqual(calc.cost_summary.is_costing_complete, true);
    assert.strictEqual(calc.cost_summary.costing_completeness_pct, 100);

    assert.ok(calc.margin_analysis);
    assert.strictEqual(calc.margin_analysis.retail_price_ngn, 2950000);
    assert.strictEqual(calc.margin_analysis.total_cost_ngn, 2360000);
    assert.strictEqual(calc.margin_analysis.gross_profit_ngn, 590000);
    assert.strictEqual(calc.margin_analysis.gross_margin_percent, 20);
  });

  console.log('\n--- 4. CONCURRENCY, AUTHORIZATION & APPROVAL WORKFLOW ---');

  await test('4.1 Optimistic concurrency conflict (HTTP 409) when base_revision is stale', async () => {
    // Current revision of package 24 is 2. Attempting to save with base_revision: 1
    const res = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        base_revision: 1, // Stale!
        components: [
          {
            component_type: 'solar-panels',
            product_id: samplePanel.id,
            product_name: samplePanel.name,
            quantity: 4,
            unit: 'pcs'
          }
        ]
      }
    });
    assert.strictEqual(res.status, 409);
    assert.ok(res.body.error.includes('Concurrent edit conflict'));
  });

  await test('4.2 Unauthenticated access to BOM APIs is rejected with HTTP 401', async () => {
    const res = await request('/api/admin/solar-packages/24/bom');
    assert.strictEqual(res.status, 401);
  });

  await test('4.3 Customer account cannot access administrator BOM APIs (HTTP 403)', async () => {
    const res = await request('/api/admin/solar-packages/24/bom', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('4.4 Approval attempt by Lead Engineer is rejected (HTTP 403 Superadmin Only)', async () => {
    const res = await request('/api/admin/solar-packages/24/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: { approval_notes: 'Engineer attempting approval' }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('4.5 Approval of incomplete BOM is rejected with HTTP 400', async () => {
    // Package 24 currently has missing costs (incomplete)
    const res = await request('/api/admin/solar-packages/24/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approval_notes: 'Attempting to approve incomplete BOM' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Costing is incomplete'));
  });

  await test('4.6 Save 100% complete BOM revision as ready_for_review and approve as Superadmin', async () => {
    // Save complete BOM revision 3
    const saveRes = await request('/api/admin/solar-packages/24/bom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        base_revision: 2,
        status: 'ready_for_review',
        revision_notes: '100% verified component costs from vendor quotation SQ-881',
        components: [
          {
            component_type: 'solar-panels',
            product_id: samplePanel.id,
            product_name: samplePanel.name,
            quantity: 8,
            unit: 'pcs',
            waste_allowance_pct: 0,
            unit_cost_ngn: 95000,
            cost_source: 'verified_supplier_quote',
            cost_provenance_ref: 'SQ-881'
          },
          {
            component_type: 'hybrid-inverter',
            product_id: sampleInverter.id,
            product_name: sampleInverter.name,
            quantity: 1,
            unit: 'pcs',
            waste_allowance_pct: 0,
            unit_cost_ngn: 850000,
            cost_source: 'verified_supplier_quote',
            cost_provenance_ref: 'SQ-881'
          }
        ],
        non_product_costs: [
          {
            cost_type: 'labour_installation',
            name: 'Professional Engineering Installation',
            cost_ngn: 150000,
            provenance_ref: 'Tariff 2026'
          }
        ]
      }
    });

    assert.strictEqual(saveRes.status, 200);
    assert.strictEqual(saveRes.body.bom.revision, 3);
    assert.strictEqual(saveRes.body.bom.cost_summary.is_costing_complete, true);

    // Step 1: Submit formal Finance Review (Stage 8.4.1 Dual-Authorization requirement)
    const reviewRes = await request('/api/admin/solar-packages/24/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: {
        base_revision: 3,
        decision: 'reviewed',
        notes: 'Verified against vendor quotation SQ-881'
      }
    });
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.body.bom.finance_review.status, 'reviewed');

    // Step 2: Formally approve as distinct superadmin
    const approveRes = await request('/api/admin/solar-packages/24/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approval_notes: 'Formally approved for commercial quoting' }
    });

    assert.strictEqual(approveRes.status, 200);
    const approvedBom = approveRes.body.bom;
    assert.strictEqual(approvedBom.status, 'approved');
    assert.strictEqual(approvedBom.revision, 4); // Increment on approval snapshot
    assert.ok(approvedBom.approved_at);
    assert.ok(approvedBom.approved_by_email);
    assert.strictEqual(approvedBom.cost_summary.is_costing_complete, true);
  });

  console.log('\n--- 5. CONFIDENTIALITY, AUDIT TRAIL & DATABASE INVARIANCE ---');

  await test('5.1 Public package endpoints do NOT expose internal BOM costs or private notes', async () => {
    // 1. List packages endpoint: GET /api/packages
    const listRes = await request('/api/packages');
    assert.strictEqual(listRes.status, 200);
    const pkgs = listRes.body.packages;
    const pkg24 = pkgs.find(p => p.id === 24);
    assert.ok(pkg24);
    // Crucial check: verify that internal BOM cost properties are absent from public payload
    assert.strictEqual(pkg24.cost_summary, undefined, 'Public packages must not expose cost_summary');
    assert.strictEqual(pkg24.components, undefined, 'Public packages must not expose internal BOM components');
    assert.strictEqual(pkg24.non_product_costs, undefined, 'Public packages must not expose non_product_costs');
    assert.strictEqual(pkg24.total_estimated_cost_ngn, undefined, 'Public packages must not expose total cost');

    // 2. Detail package endpoint: GET /api/packages/:slug
    const detailRes = await request(`/api/packages/${encodeURIComponent(targetPackage.slug)}`);
    assert.strictEqual(detailRes.status, 200);
    const detailPkg = detailRes.body.package;
    assert.ok(detailPkg);
    assert.strictEqual(detailPkg.cost_summary, undefined);
    assert.strictEqual(detailPkg.components, undefined);
    assert.strictEqual(detailPkg.bom_id, undefined);
  });

  await test('5.2 Structured AuditLog records emitted for CREATE_BOM, UPDATE_BOM_REVISION, APPROVE_BOM', async () => {
    const createLogs = await AuditLog.find({ action: 'CREATE_BOM', entity_type: 'PACKAGE_BOM' }).lean();
    const updateLogs = await AuditLog.find({ action: 'UPDATE_BOM_REVISION', entity_type: 'PACKAGE_BOM' }).lean();
    const approveLogs = await AuditLog.find({ action: 'APPROVE_BOM', entity_type: 'PACKAGE_BOM' }).lean();

    assert.ok(createLogs.length > 0, 'CREATE_BOM audit log must be recorded');
    assert.ok(updateLogs.length > 0, 'UPDATE_BOM_REVISION audit log must be recorded');
    assert.ok(approveLogs.length > 0, 'APPROVE_BOM audit log must be recorded');

    const approveEntry = approveLogs[approveLogs.length - 1];
    assert.strictEqual(approveEntry.metadata.status, 'approved');
    assert.strictEqual(approveEntry.metadata.package_id, 24);
  });

  await test('5.3 Database Invariance: Active commercial catalog count strictly invariant (48)', async () => {
    const postActiveCommercial = await Product.find({ published: 1 }).lean();
    assert.strictEqual(postActiveCommercial.length, 48, 'Active commercial products count must remain exactly 48');
  });

  await test('5.4 Database Invariance: Soft-archived benchmark catalog count strictly invariant (70)', async () => {
    const postArchivedBenchmarks = await Product.find({ published: 0 }).lean();
    assert.strictEqual(postArchivedBenchmarks.length, 70, 'Soft-archived benchmark items must remain exactly 70');
  });

  await test('5.5 Database Invariance: Total product collection count strictly invariant (118)', async () => {
    const postTotalProducts = await Product.countDocuments();
    assert.strictEqual(postTotalProducts, preTotalProducts, `Total products must remain exactly ${preTotalProducts}`);
  });

  await test('5.6 Database Invariance: Package commercial retail prices completely unchanged', async () => {
    const postPackages = await Product.find({ category: 'solar-packages' }).lean();
    assert.strictEqual(postPackages.length, 6);
    for (const pkg of postPackages) {
      const pre = preActiveMap.get(pkg.sku);
      assert.ok(pre, `Pre-test record for package ${pkg.sku} must exist`);
      assert.strictEqual(pkg.price_ngn, pre.price_ngn, `Package ${pkg.sku} price_ngn must remain exactly ${pre.price_ngn}`);
      assert.strictEqual(pkg.cost_price_ngn, pre.cost_price_ngn, `Package ${pkg.sku} cost_price_ngn must remain ${pre.cost_price_ngn}`);
    }
  });

  await test('5.7 Database Invariance: Zero commercial products had supplier costs activated', async () => {
    const productsWithCost = await Product.find({ published: 1, cost_price_ngn: { $gt: 0 } }).lean();
    assert.strictEqual(productsWithCost.length, 0, 'Zero active commercial products must have active supplier costs');
  });

  await test('5.8 Database Invariance: Orders, quotes, and customer accounts unaffected', async () => {
    const postOrders = await Order.countDocuments();
    const postQuotes = await Quote.countDocuments();
    assert.strictEqual(postOrders, preOrdersCount, 'Orders count must remain unchanged');
    assert.strictEqual(postQuotes, preQuotesCount, 'Quotes count must remain unchanged');

    // Teardown test customer and finance test user
    await User.deleteOne({ email: testCustomerEmail });
    await User.deleteOne({ email: testFinanceEmail });
    const postCustomers = await User.countDocuments({ role: 'customer' });
    assert.strictEqual(postCustomers, preCustomerCount, 'Customer count must remain unchanged after test cleanup');
  });

  // Final summary
  console.log('\n========================================================================');
  console.log(`STAGE 8.4 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('[UNCAUGHT TEST RUNNER ERROR]:', err);
  process.exit(1);
});
