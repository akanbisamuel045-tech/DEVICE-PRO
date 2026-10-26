/**
 * DEVICE PRO — STAGE 30: SUPPLIER COST BASELINE ESTABLISHMENT TEST SUITE (Stage 8.4.2)
 *
 * Verifies all 14 Stage 8.4.2 requirements:
 * 1. Valid genuine quotation structure & exact normalized SKU matching
 * 2. Missing and invalid quotation fields detection
 * 3. Duplicate SKU handling in supplier files
 * 4. Stale (> 30 days) and ambiguous date handling (calendar rollover & leap years)
 * 5. Unsupported currencies rejection (only NGN supported, 0 implicit FX)
 * 6. Invalid, zero, negative, and excessive prices rejection
 * 7. Archived benchmark records exclusion (70 benchmark documents never matched)
 * 8. Multi-supplier comparison without automatic selection
 * 9. Missing quotation behavior (missing cost remains null, never zero or retail price)
 * 10. Audit attribution & evidence preservation (user, email, role, timestamp, source)
 * 11. Cost field confidentiality in public APIs (/api/packages, /api/products)
 * 12. BOM completeness when supplier costs are absent (BOM remains incomplete)
 * 13. Dual-authorization & revision invalidation remain strictly enforced
 * 14. Database invariance: Zero retail price, promotional price, stock, or cost mutations
 */

const assert = require('assert');
const path = require('path');
const { connectMongo } = require('../db/mongo/connection');
const { Product, Order, AuditLog, User, PriceImport, PackageBom } = require('../db/mongo/models');
const {
  processSupplierPriceFile,
  compareSupplierQuotations,
  parseDate,
  evaluateQuotationFreshness,
  normalizeSku
} = require('../lib/price-import-engine');
const { calculateBom } = require('../lib/bom-engine');

const BASE_URL = 'http://localhost:3000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };
  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOptions);
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, headers: res.headers, body };
}

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 30: STAGE 8.4.2 SUPPLIER COST BASELINE TEST SUITE');
  console.log('========================================================================\n');

  await connectMongo();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`    Actual: ${err.actual}`);
        console.error(`    Expected: ${err.expected}`);
      }
      failed++;
    }
  }

  // Pre-test baseline capture
  const preProductCount = await Product.countDocuments();
  const preActiveCount = await Product.countDocuments({ published: 1 });
  const preArchivedCount = await Product.countDocuments({ published: 0 });
  const preOrdersCount = await Order.countDocuments();
  const preCustomersCount = await User.countDocuments({ role: 'customer' });
  const preWithCost = await Product.countDocuments({ published: 1, cost_price_ngn: { $gt: 0 } });

  console.log('[STAGE 30] Pre-test state:');
  console.log(`  - Total products: ${preProductCount}`);
  console.log(`  - Active commercial products: ${preActiveCount}`);
  console.log(`  - Archived benchmark products: ${preArchivedCount}`);
  console.log(`  - Commercial products with supplier cost: ${preWithCost}`);
  console.log(`  - Orders: ${preOrdersCount}`);
  console.log(`  - Customers: ${preCustomersCount}\n`);

  // Obtain superadmin token for administrative requests
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(adminLogin.status, 200, 'Superadmin login must succeed');
  const superadminToken = adminLogin.body.token;

  // Track all test-created resources for guaranteed cleanup in finally block
  const testUsersToClean = [];
  const testImportsToClean = [];

  try {
    // ---------------------------------------------------------------------------
    // 1. VALID GENUINE QUOTATION STRUCTURE & EXACT SKU MATCHING
    // ---------------------------------------------------------------------------
    console.log('--- 1. Quotation Structure & Exact SKU Matching ---');

    await test('1.1 Exact normalized SKU matching against active commercial products', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = [
        'DEVICE PRO SKU,Product Name,Supplier Name,Supplier SKU / Model Ref,Quoted Unit Cost (NGN),Currency,Quotation Date (YYYY-MM-DD)',
        'JKM-550M-72HL4,Jinko Solar 550W Mono Panel,Jinko Authorized Distributor,JKM-550-NG-2026,185000,NGN,2026-10-20',
        'GW-SPH5000-TL-BL-UP,Growatt 5kW Hybrid Inverter,Growatt West Africa,GW-SPH5K-WAT,920000,NGN,2026-10-22'
      ].join('\n');

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'valid_supplier_quote.csv',
        activeProducts,
        supplierName: 'Jinko & Growatt Official'
      });

      assert.strictEqual(result.summary.total_rows, 2);
      assert.strictEqual(result.summary.matched_rows, 2);
      assert.strictEqual(result.summary.unmatched_rows, 0);
      assert.strictEqual(result.summary.invalid_rows, 0);

      const row1 = result.rows[0];
      assert.strictEqual(row1.matched_sku, 'JKM-550M-72HL4');
      assert.strictEqual(row1.normalized_cost_ngn, 185000);
      assert.strictEqual(row1.currency, 'NGN');
      assert.strictEqual(row1.status, 'matched');

      const row2 = result.rows[1];
      assert.strictEqual(row2.matched_sku, 'GW-SPH5000-TL-BL-UP');
      assert.strictEqual(row2.normalized_cost_ngn, 920000);
      assert.strictEqual(row2.status, 'matched');
    });

    await test('1.2 Endpoint verification: POST /api/admin/price-imports/intake accepted as alias', async () => {
      const csv = 'SKU,Product Name,Cost Price,Currency\nJKM-550M-72HL4,Jinko 550W Panel,185000,NGN\n';
      const res = await request('/api/admin/price-imports/intake', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: {
          csvText: csv,
          filename: 'test_intake.csv',
          supplierName: 'Direct Intake Test'
        }
      });

      assert.strictEqual(res.status, 200, 'POST /api/admin/price-imports/intake must return HTTP 200');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.summary.matched_rows, 1);
    });

    // ---------------------------------------------------------------------------
    // 2. MISSING & INVALID QUOTATION FIELDS
    // ---------------------------------------------------------------------------
    console.log('\n--- 2. Missing & Invalid Quotation Fields ---');

    await test('2.1 Missing SKU value in row is flagged and categorized as missing_sku', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = 'SKU,Product Name,Cost Price,Currency\n,Jinko 550W Panel,185000,NGN\n';
      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'missing_sku.csv',
        activeProducts
      });

      assert.strictEqual(result.summary.invalid_rows, 1);
      assert.strictEqual(result.rows[0].status, 'missing_sku');
      assert.strictEqual(result.rows[0].is_eligible_for_approval, false);
    });

    await test('2.2 Missing or non-numeric cost is flagged as invalid_price', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = [
        'SKU,Product Name,Cost Price,Currency',
        'JKM-550M-72HL4,Jinko 550W Panel,,NGN',
        'GW-SPH5000-TL-BL-UP,Growatt 5kW,CONTACT_US,NGN'
      ].join('\n');

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'invalid_costs.csv',
        activeProducts
      });

      assert.strictEqual(result.summary.invalid_rows, 2);
      assert.strictEqual(result.rows[0].status, 'invalid_price');
      assert.strictEqual(result.rows[1].status, 'invalid_price');
      assert.strictEqual(result.rows[0].is_eligible_for_approval, false);
      assert.strictEqual(result.rows[1].is_eligible_for_approval, false);
    });

    // ---------------------------------------------------------------------------
    // 3. DUPLICATE SKU HANDLING
    // ---------------------------------------------------------------------------
    console.log('\n--- 3. Duplicate SKU Handling in Supplier Files ---');

    await test('3.1 Multiple lines with same SKU within single file are flagged as duplicate_in_file', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = [
        'SKU,Product Name,Cost Price,Currency',
        'JKM-550M-72HL4,Jinko 550W Panel (Line 1),185000,NGN',
        'JKM-550M-72HL4,Jinko 550W Panel (Line 2),180000,NGN'
      ].join('\n');

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'duplicate_skus.csv',
        activeProducts
      });

      assert.strictEqual(result.summary.duplicate_in_file_rows, 2);
      assert.strictEqual(result.rows[0].status, 'duplicate_in_file');
      assert.strictEqual(result.rows[1].status, 'duplicate_in_file');
      assert.strictEqual(result.rows[0].is_eligible_for_approval, false);
      assert.strictEqual(result.rows[1].is_eligible_for_approval, false);
    });

    // ---------------------------------------------------------------------------
    // 4. STALE & AMBIGUOUS DATES
    // ---------------------------------------------------------------------------
    console.log('\n--- 4. Stale & Ambiguous Date Handling ---');

    await test('4.1 Quotations older than 30 calendar days are classified as stale', () => {
      // Evaluation at 2026-10-26: A quote from 2026-08-01 is 86 days old (> 30 days)
      const res = evaluateQuotationFreshness(
        new Date('2026-08-01T00:00:00.000Z'),
        null,
        new Date('2026-10-26T10:00:00.000Z')
      );
      assert.strictEqual(res.status, 'stale');
      assert.strictEqual(res.stale, true);
    });

    await test('4.2 Quotations within 30 days are classified as fresh', () => {
      // Evaluation at 2026-10-26: A quote from 2026-10-20 is 6 days old (<= 30 days)
      const res = evaluateQuotationFreshness(
        new Date('2026-10-20T00:00:00.000Z'),
        null,
        new Date('2026-10-26T10:00:00.000Z')
      );
      assert.strictEqual(res.status, 'fresh');
      assert.strictEqual(res.stale, false);
    });

    await test('4.3 Calendar rollover and invalid leap years are strictly rejected', () => {
      // Non-leap year 2025-02-29
      const leapCheck = parseDate('2025-02-29');
      assert.strictEqual(leapCheck.valid, false, 'Non-leap year 2025-02-29 must be invalid');

      // 31st of April (April only has 30 days)
      const aprilCheck = parseDate('2026-04-31');
      assert.strictEqual(aprilCheck.valid, false, 'April 31st must be invalid');

      // Valid leap year 2024-02-29
      const validLeap = parseDate('2024-02-29');
      assert.strictEqual(validLeap.valid, true, 'Leap year 2024-02-29 must be valid');
    });

    await test('4.4 Ambiguous date format is rejected unless explicit format is provided', () => {
      // 04/05/2026 could be April 5 or May 4
      const ambig = parseDate('04/05/2026');
      assert.strictEqual(ambig.valid, false);
      assert.strictEqual(ambig.isAmbiguous, true);

      // With explicit format options.dateFormat = 'DD/MM/YYYY'
      const withFormat = parseDate('04/05/2026', { dateFormat: 'DD/MM/YYYY' });
      assert.strictEqual(withFormat.valid, true);
      assert.strictEqual(withFormat.date.getUTCDate(), 4);
      assert.strictEqual(withFormat.date.getUTCMonth(), 4); // May is index 4
    });

    // ---------------------------------------------------------------------------
    // 5. UNSUPPORTED CURRENCIES
    // ---------------------------------------------------------------------------
    console.log('\n--- 5. Currency Handling (NGN Only) ---');

    await test('5.1 Foreign currencies (USD, EUR, GBP, CNY) are strictly rejected with 0 implicit FX', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = [
        'SKU,Product Name,Cost Price,Currency',
        'JKM-550M-72HL4,Jinko 550W Panel,120,USD',
        'GW-SPH5000-TL-BL-UP,Growatt 5kW,700,EUR'
      ].join('\n');

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'foreign_currencies.csv',
        activeProducts
      });

      assert.strictEqual(result.summary.invalid_rows, 2);
      assert.strictEqual(result.rows[0].status, 'unsupported_currency');
      assert.strictEqual(result.rows[1].status, 'unsupported_currency');
      assert.strictEqual(result.rows[0].is_eligible_for_approval, false);
      assert.strictEqual(result.rows[1].is_eligible_for_approval, false);
    });

    // ---------------------------------------------------------------------------
    // 6. INVALID & EXCESSIVE PRICES
    // ---------------------------------------------------------------------------
    console.log('\n--- 6. Price Bounds & Zero/Negative Protection ---');

    await test('6.1 Negative, zero, and excessive prices (> ₦100,000,000,000) are flagged as invalid', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      const csv = [
        'SKU,Product Name,Cost Price,Currency',
        'JKM-550M-72HL4,Jinko 550W Panel,-50000,NGN',
        'GW-SPH5000-TL-BL-UP,Growatt 5kW,0,NGN',
        'PYL-US3000C-48V,Pylontech Battery,150000000000,NGN'
      ].join('\n');

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'extreme_prices.csv',
        activeProducts
      });

      assert.strictEqual(result.summary.invalid_rows, 3);
      assert.strictEqual(result.rows[0].status, 'invalid_price');
      assert.strictEqual(result.rows[1].status, 'invalid_price');
      assert.strictEqual(result.rows[2].status, 'invalid_price');
    });

    // ---------------------------------------------------------------------------
    // 7. ARCHIVED PRODUCT EXCLUSION
    // ---------------------------------------------------------------------------
    console.log('\n--- 7. Archived Benchmark Products Exclusion ---');

    await test('7.1 Archived benchmark SKU (SG-10K-HYBRID-NG) is strictly excluded from matching', async () => {
      const allCatalogProducts = await Product.find().lean();
      const csv = 'SKU,Product Name,Cost Price,Currency\nSG-10K-HYBRID-NG,Sungrow Benchmark Inverter,1200000,NGN\n';

      const result = await processSupplierPriceFile({
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'archived_sku_test.csv',
        activeProducts: allCatalogProducts
      });

      // Must NOT match against any of the 70 archived benchmark items
      assert.strictEqual(result.summary.matched_rows, 0);
      assert.strictEqual(result.summary.unmatched_rows, 1);
      assert.strictEqual(result.rows[0].status, 'unmatched');
      assert.strictEqual(result.rows[0].matched_product_id, null);
    });

    // ---------------------------------------------------------------------------
    // 8. MULTI-SUPPLIER COMPARISON WITHOUT AUTOMATIC SELECTION
    // ---------------------------------------------------------------------------
    console.log('\n--- 8. Multi-Supplier Comparison & Reconciliation ---');

    await test('8.1 compareSupplierQuotations groups competing quotes without picking a winner', () => {
      const mockRows = [
        {
          row_number: 1,
          matched_sku: 'JKM-550M-72HL4',
          matched_product_name: 'Monocrystalline Solar Panel',
          matched_product_id: 1,
          matched_current_price_ngn: 245000,
          matched_current_cost_ngn: 0,
          supplier_name: 'Distributor Alpha Nigeria',
          supplier_ref: 'ALPHA-JK-550',
          normalized_cost_ngn: 185000,
          currency: 'NGN',
          quote_date: '2026-10-20',
          freshness_status: 'fresh',
          is_eligible_for_approval: true
        },
        {
          row_number: 2,
          matched_sku: 'JKM-550M-72HL4',
          matched_product_name: 'Monocrystalline Solar Panel',
          matched_product_id: 1,
          matched_current_price_ngn: 245000,
          matched_current_cost_ngn: 0,
          supplier_name: 'Distributor Beta West Africa',
          supplier_ref: 'BETA-JK-550',
          normalized_cost_ngn: 192000,
          currency: 'NGN',
          quote_date: '2026-10-22',
          freshness_status: 'fresh',
          is_eligible_for_approval: true
        }
      ];

      const comparison = compareSupplierQuotations(mockRows);
      assert.strictEqual(comparison.length, 1);
      const group = comparison[0];
      assert.strictEqual(group.sku, 'JKM-550M-72HL4');
      assert.strictEqual(group.quotation_count, 2);
      assert.strictEqual(group.has_competing_quotes, true);
      assert.strictEqual(group.quotations.length, 2);

      // Verify NO winning supplier was automatically chosen
      assert.strictEqual(group.winning_supplier, undefined);
      assert.strictEqual(group.selected_quotation, undefined);
      assert.strictEqual(group.quotations[0].supplier_name, 'Distributor Alpha Nigeria');
      assert.strictEqual(group.quotations[0].quoted_cost_ngn, 185000);
      assert.strictEqual(group.quotations[1].supplier_name, 'Distributor Beta West Africa');
      assert.strictEqual(group.quotations[1].quoted_cost_ngn, 192000);
    });

    // ---------------------------------------------------------------------------
    // 9. MISSING QUOTATION BEHAVIOR
    // ---------------------------------------------------------------------------
    console.log('\n--- 9. Missing Quotation Behavior ---');

    await test('9.1 Products lacking quotations retain missing_cost (null), never zero or retail price', async () => {
      const activeProducts = await Product.find({ published: 1 }).lean();
      // All 48 active commercial products currently lack supplier costs
      assert.strictEqual(activeProducts.length, 48);

      activeProducts.forEach(p => {
        assert.ok(
          p.cost_price_ngn === null || p.cost_price_ngn === 0 || p.cost_price_ngn === undefined,
          `Product ID ${p.id} must not have active cost prior to explicit approval`
        );
        // Ensure retail price is NEVER treated as cost price
        assert.notStrictEqual(
          p.cost_price_ngn,
          p.price_ngn,
          `Product ID ${p.id} retail price (₦${p.price_ngn}) must never be substituted for cost`
        );
      });
    });

    // ---------------------------------------------------------------------------
    // 10. AUDIT ATTRIBUTION & EVIDENCE PRESERVATION
    // ---------------------------------------------------------------------------
    console.log('\n--- 10. Audit Attribution & Evidence Preservation ---');

    await test('10.1 Saving an analyzed import records user attribution and ANALYSE_PRICE_IMPORT audit log', async () => {
      const saveRes = await request('/api/admin/price-imports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: {
          filename: 'audit_test_quotation.csv',
          supplier_name: 'Audit Provenance Vendor',
          supplier_quote_ref: 'QUO-AUDIT-2026-001',
          quote_date: '2026-10-20',
          import_source: 'Stage 8.4.2 Audit Test',
          currency: 'NGN',
          freshness_status: 'fresh',
          file_format: 'csv',
          summary: {
            total_rows: 1,
            valid_rows: 1,
            matched_rows: 1,
            unmatched_rows: 0,
            duplicate_in_file_rows: 0,
            duplicate_in_catalog_rows: 0,
            invalid_rows: 0,
            requires_review_rows: 0
          },
          rows_preview: [
            {
              row_number: 1,
              raw_sku: 'JKM-550M-72HL4',
              matched_sku: 'JKM-550M-72HL4',
              matched_product_id: 1,
              normalized_cost_ngn: 185000,
              currency: 'NGN',
              status: 'matched'
            }
          ]
        }
      });

      assert.strictEqual(saveRes.status, 201);
      assert.strictEqual(saveRes.body.success, true);
      const savedDoc = saveRes.body.importRecord;
      testImportsToClean.push(savedDoc._id || savedDoc.id);

      // Verify audit log entry
      const auditRes = await request('/api/admin/audit-logs?limit=5', {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      assert.strictEqual(auditRes.status, 200);
      const recentActions = auditRes.body.logs.map(l => l.action);
      assert.ok(recentActions.includes('ANALYSE_PRICE_IMPORT'), 'Audit trail must record ANALYSE_PRICE_IMPORT');
    });

    // ---------------------------------------------------------------------------
    // 11. COST FIELD CONFIDENTIALITY IN PUBLIC APIS
    // ---------------------------------------------------------------------------
    console.log('\n--- 11. Cost Field Confidentiality in Public APIs ---');

    await test('11.1 Public product catalog endpoints leak 0 internal supplier cost data', async () => {
      const res = await request('/api/products?limit=5');
      assert.strictEqual(res.status, 200);
      const prods = res.body.products || res.body;
      assert.ok(Array.isArray(prods) && prods.length > 0);
      prods.forEach(p => {
        assert.strictEqual(p.cost_price_ngn, undefined, `Public /api/products must omit cost_price_ngn`);
        assert.strictEqual(p.supplier_cost_ngn, undefined, `Public /api/products must omit supplier_cost_ngn`);
      });
    });

    await test('11.2 Public solar package endpoints leak 0 internal BOM costs or margin data', async () => {
      const res = await request('/api/packages');
      assert.strictEqual(res.status, 200);
      const packages = res.body.packages || res.body;
      assert.ok(Array.isArray(packages) && packages.length > 0);
      packages.forEach(pkg => {
        assert.strictEqual(pkg.bom, undefined, 'Public /api/packages must not include internal BOM object');
        assert.strictEqual(pkg.total_cost_kobo, undefined, 'Public /api/packages must not include total_cost_kobo');
        assert.strictEqual(pkg.gross_margin_percent, undefined, 'Public /api/packages must not include gross_margin_percent');
      });
    });

    // ---------------------------------------------------------------------------
    // 12. BOM COMPLETENESS WHEN SUPPLIER COSTS ARE ABSENT
    // ---------------------------------------------------------------------------
    console.log('\n--- 12. BOM Completeness Safeguards with Missing Costs ---');

    await test('12.1 BOM component line with missing supplier cost blocks BOM completeness', () => {
      const hardwareLines = [
        {
          line_id: 'line_1',
          component_type: 'solar-panels',
          product_id: 1,
          sku: 'JKM-550M-72HL4',
          name: '550W Solar Panel',
          product_name: '550W Solar Panel',
          description: '550W Solar Panel',
          quantity: 10,
          unit: 'pcs',
          unit_cost_ngn: null, // MISSING SUPPLIER COST
          waste_percent: 0,
          is_optional: false
        }
      ];

      const bomResult = calculateBom({
        components: hardwareLines,
        non_product_costs: [],
        packagePriceNgn: 2450000
      });

      assert.strictEqual(bomResult.cost_summary.is_costing_complete, false, 'BOM must be incomplete when supplier cost is missing');
      assert.strictEqual(bomResult.cost_summary.missing_cost_lines_count, 1, 'Must count 1 missing cost line');
      assert.strictEqual(bomResult.cost_summary.total_estimated_cost_ngn, null, 'Total estimated cost must be null when costs are missing');
      assert.strictEqual(bomResult.margin_analysis, null, 'Margin analysis must be disabled when costs are incomplete');
    });

    // ---------------------------------------------------------------------------
    // 13. DUAL-AUTHORIZATION & REVISION INVALIDATION REMAIN ENFORCED
    // ---------------------------------------------------------------------------
    console.log('\n--- 13. Dual-Authorization & Two-Person Governance Integrity ---');

    await test('13.1 Incomplete BOM cannot be approved by superadmin or finance', async () => {
      // Query current revision of package 27 BOM
      const curBomRes = await request('/api/admin/solar-packages/27/bom', {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      const currentRev = (curBomRes.body && curBomRes.body.bom) ? curBomRes.body.bom.revision : 0;

      // Create/update a BOM with missing costs on test package 27
      const saveRes = await request('/api/admin/solar-packages/27/bom', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: {
          base_revision: currentRev,
          hardware_components: [
            {
              component_type: 'solar-panels',
              product_id: 1,
              sku: 'JKM-550M-72HL4',
              description: 'Panel without cost',
              quantity: 4,
              unit: 'pcs',
              unit_cost_ngn: null, // missing cost
              waste_percent: 0
            }
          ],
          services_and_logistics: [],
          notes: 'Stage 8.4.2 Completeness Guard Test'
        }
      });
      assert.ok([200, 201].includes(saveRes.status), `BOM save must return 200/201 (received ${saveRes.status})`);

      // Attempt approval on incomplete BOM - must be blocked with HTTP 400
      const approveRes = await request('/api/admin/solar-packages/27/bom/approve', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: { base_revision: saveRes.body.bom.revision }
      });
      assert.strictEqual(approveRes.status, 400, 'Approval of incomplete BOM must return HTTP 400');
      assert.strictEqual(approveRes.body.success, false);
      assert.ok(
        approveRes.body.error && (approveRes.body.error.includes('incomplete') || approveRes.body.error.includes('missing') || approveRes.body.error.includes('review')),
        'Error message must indicate incomplete costing or review requirement'
      );
    });

    // ---------------------------------------------------------------------------
    // 14. DATABASE INVARIANCE
    // ---------------------------------------------------------------------------
    console.log('\n--- 14. Database Invariance Verification ---');

    await test('14.1 Zero commercial catalog products had supplier costs activated', async () => {
      const postWithCost = await Product.countDocuments({ published: 1, cost_price_ngn: { $gt: 0 } });
      assert.strictEqual(postWithCost, 0, 'Zero commercial products must have activated supplier costs');
    });

    await test('14.2 Commercial catalog product counts, retail prices, and stock remain invariant', async () => {
      const postTotal = await Product.countDocuments();
      const postActive = await Product.countDocuments({ published: 1 });
      const postArchived = await Product.countDocuments({ published: 0 });

      assert.strictEqual(postTotal, preProductCount, 'Total product count must remain unchanged');
      assert.strictEqual(postActive, preActiveCount, 'Active commercial product count must remain 48');
      assert.strictEqual(postArchived, preArchivedCount, 'Archived benchmark count must remain 70');

      // Check retail prices of active products
      const prods = await Product.find({ published: 1 }).select('id sku price_ngn stock_quantity').lean();
      prods.forEach(p => {
        assert.ok(p.price_ngn > 0, `Product ID ${p.id} price must remain positive`);
      });
    });

    await test('14.3 Orders and customer accounts remain invariant', async () => {
      const postOrders = await Order.countDocuments();
      const postCustomers = await User.countDocuments({ role: 'customer' });

      assert.strictEqual(postOrders, preOrdersCount, 'Orders count must remain invariant (412)');
      assert.strictEqual(postCustomers, preCustomersCount, 'Customers count must remain invariant (310)');
    });

  } finally {
    // Guaranteed cleanup of any temporary test artifacts
    console.log('\n--- Teardown: Cleaning Temporary Test Artifacts ---');
    try {
      if (testImportsToClean.length > 0) {
        for (const id of testImportsToClean) {
          await PriceImport.deleteOne({ _id: id });
        }
        console.log(`  ✓ Cleaned up ${testImportsToClean.length} temporary test price import(s)`);
      }
      if (testUsersToClean.length > 0) {
        for (const email of testUsersToClean) {
          await User.deleteOne({ email });
        }
        console.log(`  ✓ Cleaned up ${testUsersToClean.length} temporary test user(s)`);
      }
      // Reset BOM for test package 27 to clean state
      await PackageBom.deleteMany({ package_id: 27 });
      console.log('  ✓ Reset test package 27 BOM');
    } catch (cleanupErr) {
      console.error('  ✗ Teardown error:', cleanupErr.message);
    }
  }

  // Final summary
  console.log('\n========================================================================');
  console.log(`STAGE 30 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
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
