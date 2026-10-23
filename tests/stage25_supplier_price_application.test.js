/**
 * DEVICE PRO — Stage 25: Supplier Price Review, Approval & Controlled Application Test Suite
 * 
 * Verifies all 40 Stage 6 requirements across Review, Approval, Controlled Application & Regressions:
 * 
 * --- A. Review (1-10) ---
 * 1. An analysed import can be opened for review (transitions to awaiting_approval).
 * 2. Current and proposed supplier costs are displayed correctly.
 * 3. Absolute (cost_diff_ngn) and percentage (cost_diff_percent) differences are calculated correctly.
 * 4. Currency is displayed correctly (NGN).
 * 5. Invalid rows are clearly identified as ineligible for approval.
 * 6. Unmatched SKUs cannot be approved.
 * 7. Duplicate mappings cannot be applied / approved.
 * 8. Archived products are strictly excluded from approval eligibility.
 * 9. Review alone does not mutate products.
 * 10. Retail selling prices remain unchanged during review.
 * 
 * --- B. Approval (11-22) ---
 * 11. An unauthenticated user cannot approve an import (401).
 * 12. A customer cannot approve an import (403).
 * 13. A role without the required permission cannot approve an import (Engineer / Sales receive 403).
 * 14. An authorized administrator can approve eligible selected rows.
 * 15. Unselected rows remain unapproved.
 * 16. Invalid rows cannot be approved (400).
 * 17. Unsupported currencies cannot be approved (400).
 * 18. High variance warnings (>30%) require configured acknowledgement (400 without it).
 * 19. A row from another import cannot be approved (400).
 * 20. Stored approved values are immutable and protected against payload manipulation.
 * 21. Approval is recorded in the audit trail (APPROVE_PRICE_IMPORT).
 * 22. Repeated approval requests behave safely.
 * 
 * --- C. Controlled Application (23-40) ---
 * 23. Application is rejected before approval (400).
 * 24. Only approved rows are applied.
 * 25. Unselected rows remain unchanged.
 * 26. Supplier costs change to the approved values (cost_price_ngn updated).
 * 27. Retail selling prices remain strictly unchanged (price_ngn untouched).
 * 28. Stock quantities remain strictly unchanged.
 * 29. Archived products cannot be modified during application.
 * 30. Products with changed SKUs or stale values are protected from blind overwrites.
 * 31. Deleted products are handled safely as application errors without crashing.
 * 32. Duplicate application requests do not apply a row twice (completed import rejected with 400).
 * 33. Concurrent application requests cannot apply the same import twice (atomic transition returns 409).
 * 34. Interrupted / partially applied import can be recovered safely.
 * 35. Partial failures are represented accurately with detailed error reasons.
 * 36. Successful rows are not reapplied during recovery.
 * 37. Audit records capture previous and new supplier costs (PRICE_IMPORT_APPLIED_ROW).
 * 38. Unsupported currency and invalid numeric values are rejected.
 * 39. Customers cannot read or invoke review, approval, or application endpoints (403).
 * 40. Existing product APIs continue to protect supplier cost fields from public exposure.
 */

const assert = require('assert');
const { connectMongo, assertTestEnvironmentIsolated } = require('../db/mongo/connection');
const { Product, Order, AuditLog, User, Session, PriceImport } = require('../db/mongo/models');
const mongoose = require('mongoose');

// SAFETY FIRST: Enforce database isolation guard
assertTestEnvironmentIsolated();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 25: SUPPLIER PRICE REVIEW, APPROVAL & APPLICATION');
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

  // Pre-test setup: Connect Mongo and authenticate staff roles
  await connectMongo();

  // Clean up any old test records
  await PriceImport.deleteMany({ filename: /^STAGE25-TEST/i });
  await Product.deleteMany({ sku: /^STG6-TEST-/i });

  // 1. Superadmin Token
  const saRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(saRes.status, 200, 'Superadmin login must succeed');
  const superadminToken = saRes.body.token;

  // 2. Engineer Token
  const engRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engRes.status, 200, 'Engineer login must succeed');
  const engineerToken = engRes.body.token;

  // 3. Sales Token
  const salesRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'sales.lagos', password: 'Sales@DevicePro2026!' }
  });
  assert.strictEqual(salesRes.status, 200, 'Sales login must succeed');
  const salesToken = salesRes.body.token;

  // 4. Customer Account & Token
  const testCustomerEmail = `customer_stage25_${Date.now()}@devicepro.test`;
  const custRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Price Test Stage 6',
      email: testCustomerEmail,
      phone: '+2348011223388',
      password: 'CustomerPass123!'
    }
  });
  assert.strictEqual(custRes.status, 201, 'Customer registration must succeed');
  const customerToken = custRes.body.token;

  // =========================================================================
  // CREATE ISOLATED TEST PRODUCTS (Strictly isolating from live catalog)
  // =========================================================================
  const nextId = (await Product.countDocuments()) + 2000;

  // Product 1: Standard Active Product (Small cost increase: 100k -> 110k, +10%)
  const testProdA = await Product.create({
    id: nextId + 1,
    name: 'TEST STAGE 6 - 5kW Hybrid Inverter Standard',
    sku: 'STG6-TEST-INV-5K',
    brand: 'Growatt',
    category: 'inverters',
    price_ngn: 450000,
    cost_price_ngn: 100000,
    supplier_cost_ngn: 100000,
    stock_quantity: 15,
    published: 1,
    slug: `test-stage6-5kw-standard-${Date.now()}`
  });

  // Product 2: High Variance Product (Large cost increase: 200k -> 320k, +60% > 30% threshold)
  const testProdB = await Product.create({
    id: nextId + 2,
    name: 'TEST STAGE 6 - 10kWh Lithium Battery High Var',
    sku: 'STG6-TEST-BAT-10K',
    brand: 'Felicity Solar',
    category: 'batteries',
    price_ngn: 850000,
    cost_price_ngn: 200000,
    supplier_cost_ngn: 200000,
    stock_quantity: 8,
    published: 1,
    slug: `test-stage6-10kwh-battery-${Date.now()}`
  });

  // Product 3: Archived Product (Must NEVER be matched or modified)
  const testProdArchived = await Product.create({
    id: nextId + 3,
    name: 'TEST STAGE 6 - Archived Legacy Solar Panel',
    sku: 'STG6-TEST-PANEL-ARCHIVED',
    brand: 'Canadian Solar',
    category: 'solar-panels',
    price_ngn: 180000,
    cost_price_ngn: 70000,
    supplier_cost_ngn: 70000,
    stock_quantity: 4,
    published: 0, // ARCHIVED!
    slug: `test-stage6-archived-panel-${Date.now()}`
  });

  // Product 4: Unselected Active Product (To verify unselected rows remain completely untouched)
  const testProdD = await Product.create({
    id: nextId + 4,
    name: 'TEST STAGE 6 - 8kW Inverter Unselected',
    sku: 'STG6-TEST-INV-8K',
    brand: 'Deye',
    category: 'inverters',
    price_ngn: 620000,
    cost_price_ngn: 150000,
    supplier_cost_ngn: 150000,
    stock_quantity: 12,
    published: 1,
    slug: `test-stage6-8kw-unselected-${Date.now()}`
  });

  console.log('--- 1. Review Workflow & Baseline Protection ---');

  // Helper to create an analysed import in MongoDB
  async function createTestAnalysedImport(filename = 'STAGE25-TEST-IMPORT-1.xlsx') {
    const importDoc = await PriceImport.create({
      filename,
      supplier_name: 'Solar Wholesale Distributor Lagos',
      file_format: 'xlsx',
      uploaded_by: 1,
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'analysed',
      summary: {
        total_rows: 7,
        valid_rows: 4,
        matched_rows: 2,
        unmatched_rows: 2,
        duplicate_in_file_rows: 1,
        duplicate_in_catalog_rows: 0,
        invalid_rows: 1,
        requires_review_rows: 1
      },
      rows_preview: [
        {
          row_number: 1,
          raw_sku: 'STG6-TEST-INV-5K',
          raw_name: 'Growatt 5kW Hybrid Inverter',
          raw_cost: '110,000',
          normalized_cost_ngn: 110000,
          currency: 'NGN',
          matched_product_id: String(testProdA._id),
          matched_product_sku: testProdA.sku,
          matched_product_name: testProdA.name,
          matched_current_cost_ngn: 100000,
          matched_selling_price_ngn: 450000,
          status: 'matched',
          validation_errors: []
        },
        {
          row_number: 2,
          raw_sku: 'STG6-TEST-BAT-10K',
          raw_name: 'Felicity 10kWh LiFePO4 Battery',
          raw_cost: '320,000',
          normalized_cost_ngn: 320000,
          currency: 'NGN',
          matched_product_id: String(testProdB._id),
          matched_product_sku: testProdB.sku,
          matched_product_name: testProdB.name,
          matched_current_cost_ngn: 200000,
          matched_selling_price_ngn: 850000,
          status: 'matched',
          validation_errors: []
        },
        {
          row_number: 3,
          raw_sku: 'STG6-TEST-PANEL-ARCHIVED',
          raw_name: 'Legacy Panel Archived',
          raw_cost: '85,000',
          normalized_cost_ngn: 85000,
          currency: 'NGN',
          matched_product_id: null,
          matched_product_sku: null,
          status: 'archived_product_excluded',
          validation_errors: ['Product is archived in catalog']
        },
        {
          row_number: 4,
          raw_sku: 'UNKNOWN-SUPPLIER-SKU-999',
          raw_name: 'Unmatched Inverter Mounting Rails',
          raw_cost: '15,000',
          normalized_cost_ngn: 15000,
          currency: 'NGN',
          status: 'unmatched',
          validation_errors: []
        },
        {
          row_number: 5,
          raw_sku: 'INVALID-PRICE-SKU',
          raw_name: 'Damaged Battery Cable',
          raw_cost: 'N/A - CONTACT REP',
          normalized_cost_ngn: null,
          currency: 'NGN',
          status: 'invalid_price',
          validation_errors: ['Invalid or non-numeric price']
        },
        {
          row_number: 6,
          raw_sku: 'DUPLICATE-FILE-SKU',
          raw_name: 'Growatt Cable Dup 1',
          raw_cost: '25,000',
          normalized_cost_ngn: 25000,
          currency: 'NGN',
          status: 'duplicate_in_file',
          validation_errors: ['Duplicate SKU in uploaded file']
        },
        {
          row_number: 7,
          raw_sku: 'UNSUPPORTED-CURR-SKU',
          raw_name: 'Imported Inverter USD',
          raw_cost: '$500',
          normalized_cost_ngn: null,
          currency: 'USD',
          status: 'unsupported_currency',
          validation_errors: ['Unsupported currency USD']
        }
      ]
    });
    return importDoc;
  }

  let testImport1;

  await test('Requirement 1: An analysed import can be opened for review', async () => {
    testImport1 = await createTestAnalysedImport();
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.importRecord.status, 'awaiting_approval');
  });

  await test('Requirement 2: Current and proposed supplier costs are displayed correctly', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const rows = res.body.importRecord.rows_preview;
    const row1 = rows.find(r => r.row_number === 1);
    assert.strictEqual(row1.matched_current_cost_ngn, 100000);
    assert.strictEqual(row1.normalized_cost_ngn, 110000);
  });

  await test('Requirement 3: Absolute and percentage differences are calculated correctly', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const rows = res.body.importRecord.rows_preview;
    const row1 = rows.find(r => r.row_number === 1);
    const row2 = rows.find(r => r.row_number === 2);

    // Row 1: 100k -> 110k => +10,000 NGN (+10.0%)
    assert.strictEqual(row1.cost_diff_ngn, 10000);
    assert.strictEqual(row1.cost_diff_percent, 10);
    assert.strictEqual(row1.variance_warning, 'NONE');

    // Row 2: 200k -> 320k => +120,000 NGN (+60.0% > 30% threshold)
    assert.strictEqual(row2.cost_diff_ngn, 120000);
    assert.strictEqual(row2.cost_diff_percent, 60);
    assert.strictEqual(row2.variance_warning, 'HIGH_VARIANCE_INCREASE');
  });

  await test('Requirement 4: Currency is displayed correctly (NGN)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row1 = res.body.importRecord.rows_preview.find(r => r.row_number === 1);
    assert.strictEqual(row1.currency, 'NGN');
  });

  await test('Requirement 5: Invalid rows are clearly identified as ineligible for approval', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row5 = res.body.importRecord.rows_preview.find(r => r.row_number === 5);
    assert.strictEqual(row5.is_eligible_for_approval, false);
    assert.strictEqual(row5.approval_status, 'ineligible');
  });

  await test('Requirement 6: Unmatched SKUs cannot be approved', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row4 = res.body.importRecord.rows_preview.find(r => r.row_number === 4);
    assert.strictEqual(row4.is_eligible_for_approval, false);
    assert.strictEqual(row4.approval_status, 'ineligible');
  });

  await test('Requirement 7: Duplicate mappings cannot be applied / approved', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row6 = res.body.importRecord.rows_preview.find(r => r.row_number === 6);
    assert.strictEqual(row6.is_eligible_for_approval, false);
    assert.strictEqual(row6.approval_status, 'ineligible');
  });

  await test('Requirement 8: Archived products are strictly excluded from approval eligibility', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row3 = res.body.importRecord.rows_preview.find(r => r.row_number === 3);
    assert.strictEqual(row3.is_eligible_for_approval, false);
    assert.strictEqual(row3.approval_status, 'ineligible');
  });

  await test('Requirement 9: Review alone does not mutate products', async () => {
    const prodA = await Product.findById(testProdA._id).lean();
    assert.strictEqual(prodA.cost_price_ngn, 100000, 'Supplier cost must remain 100000');
    assert.strictEqual(prodA.price_ngn, 450000, 'Selling price must remain 450000');
  });

  await test('Requirement 10: Retail selling prices remain unchanged during review', async () => {
    const prodB = await Product.findById(testProdB._id).lean();
    assert.strictEqual(prodB.price_ngn, 850000, 'Retail selling price strictly unchanged');
  });

  console.log('\n--- 2. Explicit Approval Controls & Authorization ---');

  await test('Requirement 11: An unauthenticated user cannot approve an import (401)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(res.status, 401);
  });

  await test('Requirement 12: A customer cannot approve an import (403)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Requirement 13: Unauthorized staff (Engineer & Sales) cannot approve an import (403)', async () => {
    const engRes = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(engRes.status, 403);

    const salesRes = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(salesRes.status, 403);
  });

  await test('Requirement 14: An authorized administrator can approve eligible selected rows', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.importRecord.status, 'approved_for_application');
    const row1 = res.body.importRecord.rows_preview.find(r => r.row_number === 1);
    assert.strictEqual(row1.approval_status, 'approved');
    assert.strictEqual(row1.approved_cost_ngn, 110000);
  });

  await test('Requirement 15: Unselected rows remain unapproved', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    const row2 = res.body.importRecord.rows_preview.find(r => r.row_number === 2);
    assert.strictEqual(row2.approval_status, 'unapproved');
    assert.strictEqual(row2.approved_cost_ngn, null);
  });

  await test('Requirement 16: Invalid rows cannot be approved (400)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [5] } // Row 5 is invalid_price
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('not eligible for approval'));
  });

  await test('Requirement 17: Unsupported currencies cannot be approved (400)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [7] } // Row 7 is USD
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('not eligible for approval'));
  });

  await test('Requirement 18: High variance warnings (>30%) require configured acknowledgement', async () => {
    // Attempting to approve Row 2 (+60% variance) without acknowledgeHighVariance
    const resFail = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1, 2], acknowledgeHighVariance: false }
    });
    assert.strictEqual(resFail.status, 400);
    assert.strictEqual(resFail.body.highVariance, true);
    assert(resFail.body.error.includes('High variance'));

    // Re-attempting with explicit acknowledgement
    const resSuccess = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1, 2], acknowledgeHighVariance: true }
    });
    assert.strictEqual(resSuccess.status, 200);
    assert.strictEqual(resSuccess.body.importRecord.status, 'approved_for_application');
  });

  await test('Requirement 19: A row from another import cannot be approved (400)', async () => {
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [9999] } // Non-existent row in this import
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('does not belong to this price import'));
  });

  await test('Requirement 20: Stored approved values are immutable and protected against payload manipulation', async () => {
    // Browser attempt to submit a modified price in approval or apply payload
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        approvedRowNumbers: [1],
        tampered_price: 100 // malicious client price
      }
    });
    assert.strictEqual(res.status, 200);
    const row1 = res.body.importRecord.rows_preview.find(r => r.row_number === 1);
    // Server uses normalized_cost_ngn stored in DB, ignoring tampered price
    assert.strictEqual(row1.approved_cost_ngn, 110000);
  });

  await test('Requirement 21: Approval is recorded in the audit trail (APPROVE_PRICE_IMPORT)', async () => {
    const audit = await AuditLog.findOne({
      action: 'APPROVE_PRICE_IMPORT',
      entity_id: String(testImport1.id || testImport1._id)
    }).sort({ created_at: -1 }).lean();
    assert(audit, 'Audit log entry for APPROVE_PRICE_IMPORT must exist');
    assert(audit.details.includes('Approved 1 supplier price rows'));
  });

  await test('Requirement 22: Repeated approval requests behave safely', async () => {
    // Second approval call updates selection cleanly without duplicating records
    const res = await request(`/api/admin/price-imports/${testImport1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1] }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importRecord.status, 'approved_for_application');
  });

  console.log('\n--- 3. Controlled Application, Consistency & Concurrency ---');

  await test('Requirement 23: Application is rejected before approval (400)', async () => {
    const unapprovedImport = await createTestAnalysedImport('STAGE25-TEST-UNAPPROVED.xlsx');
    const res = await request(`/api/admin/price-imports/${unapprovedImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Import must be approved before application'));
  });

  await test('Requirement 24: Only approved rows are applied', async () => {
    // Apply testImport1 where only Row 1 was approved
    const res = await request(`/api/admin/price-imports/${testImport1._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.appliedCount, 1);
    assert.strictEqual(res.body.status, 'successfully_applied');
  });

  await test('Requirement 25: Unselected rows remain unchanged', async () => {
    // Row 2 (testProdB) was unselected, so its catalog costs remain unchanged
    const prodB = await Product.findById(testProdB._id).lean();
    assert.strictEqual(prodB.cost_price_ngn, 200000, 'Unselected Product B cost must remain 200000');
  });

  await test('Requirement 26: Supplier costs change to the approved values (cost_price_ngn updated)', async () => {
    // Row 1 (testProdA) was approved at 110,000 NGN
    const prodA = await Product.findById(testProdA._id).lean();
    assert.strictEqual(prodA.cost_price_ngn, 110000, 'Product A canonical cost_price_ngn updated to 110000');
  });

  await test('Requirement 27: Retail selling prices remain strictly unchanged (price_ngn untouched)', async () => {
    const prodA = await Product.findById(testProdA._id).lean();
    assert.strictEqual(prodA.price_ngn, 450000, 'Product A retail selling price strictly untouched (450000)');
  });

  await test('Requirement 28: Stock quantities remain strictly unchanged', async () => {
    const prodA = await Product.findById(testProdA._id).lean();
    assert.strictEqual(prodA.stock_quantity, 15, 'Product A stock quantity strictly untouched (15)');
  });

  await test('Requirement 29: Archived products cannot be modified during application', async () => {
    const prodArchived = await Product.findById(testProdArchived._id).lean();
    assert.strictEqual(prodArchived.cost_price_ngn, 70000, 'Archived product cost remains 70000');
    assert.strictEqual(prodArchived.published, 0, 'Archived product remains published: 0');
  });

  await test('Requirement 30: Products with changed SKUs or stale values are protected from blind overwrites', async () => {
    // Create an import with a matching SKU, approve it, then change the product SKU before application
    const staleImport = await createTestAnalysedImport('STAGE25-TEST-STALE-SKU.xlsx');
    // Open review and approve Row 1
    await request(`/api/admin/price-imports/${staleImport._id}/review`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    await request(`/api/admin/price-imports/${staleImport._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1] }
    });

    // Mutate product SKU in catalog
    await Product.updateOne({ _id: testProdA._id }, { $set: { sku: 'STG6-CHANGED-SKU' } });

    // Execute application - must detect SKU conflict and mark row as failed
    const applyRes = await request(`/api/admin/price-imports/${staleImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(applyRes.status, 200);
    assert.strictEqual(applyRes.body.failedCount, 1);
    assert(applyRes.body.failedRows[0].error.includes('no longer matches'));

    // Revert SKU for subsequent tests
    await Product.updateOne({ _id: testProdA._id }, { $set: { sku: 'STG6-TEST-INV-5K' } });
  });

  await test('Requirement 31: Deleted products are handled safely as application errors without crashing', async () => {
    // Create a temporary product, approve an import for it, delete the product, then apply
    const tempProd = await Product.create({
      id: nextId + 99,
      name: 'Temp Product to Delete',
      sku: 'TEMP-PROD-DEL-SKU',
      category: 'inverters',
      brand: 'Growatt',
      price_ngn: 200000,
      cost_price_ngn: 80000,
      stock_quantity: 5,
      published: 1,
      slug: `temp-del-${Date.now()}`
    });

    const delImport = await PriceImport.create({
      filename: 'STAGE25-TEST-DELETED-PROD.xlsx',
      supplier_name: 'Distributor',
      file_format: 'xlsx',
      uploaded_by: 1,
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'analysed',
      summary: { total_rows: 1, valid_rows: 1, matched_rows: 1, unmatched_rows: 0 },
      rows_preview: [{
        row_number: 1,
        raw_sku: tempProd.sku,
        raw_name: tempProd.name,
        normalized_cost_ngn: 95000,
        currency: 'NGN',
        matched_product_id: String(tempProd._id),
        matched_product_sku: tempProd.sku,
        status: 'matched',
        is_eligible_for_approval: true
      }]
    });

    await request(`/api/admin/price-imports/${delImport._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { approvedRowNumbers: [1] }
    });

    // Delete the product from DB
    await Product.deleteOne({ _id: tempProd._id });

    // Apply import
    const applyRes = await request(`/api/admin/price-imports/${delImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(applyRes.status, 200);
    assert.strictEqual(applyRes.body.failedCount, 1);
    assert(applyRes.body.failedRows[0].error.includes('no longer exists'));
  });

  await test('Requirement 32: Duplicate application requests do not apply a row twice', async () => {
    // testImport1 was already successfully_applied in Req 24
    const res = await request(`/api/admin/price-imports/${testImport1._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('already been successfully applied'));
  });

  await test('Requirement 33: Concurrent application requests cannot apply the same import twice (409)', async () => {
    // Set an import status to 'applying' to simulate a concurrent thread
    const lockedImport = await createTestAnalysedImport('STAGE25-TEST-CONCURRENT.xlsx');
    lockedImport.status = 'applying';
    await lockedImport.save();

    const res = await request(`/api/admin/price-imports/${lockedImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });
    assert.strictEqual(res.status, 409);
    assert(res.body.error.includes('in progress by another request'));
  });

  await test('Requirement 34: Interrupted / partially applied import can be recovered safely', async () => {
    // Create import with partially_applied status and 1 pending row
    const partialImport = await PriceImport.create({
      filename: 'STAGE25-TEST-RECOVERY.xlsx',
      supplier_name: 'Distributor',
      file_format: 'xlsx',
      uploaded_by: 1,
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'partially_applied',
      summary: { total_rows: 2, valid_rows: 2, matched_rows: 2, unmatched_rows: 0, applied_rows: 1, failed_rows: 1 },
      rows_preview: [
        {
          row_number: 1,
          raw_sku: testProdA.sku,
          normalized_cost_ngn: 115000,
          currency: 'NGN',
          matched_product_id: String(testProdA._id),
          matched_product_sku: testProdA.sku,
          approval_status: 'approved',
          approved_cost_ngn: 115000,
          application_status: 'applied', // Already applied
          applied_at: new Date()
        },
        {
          row_number: 2,
          raw_sku: testProdB.sku,
          normalized_cost_ngn: 210000,
          currency: 'NGN',
          matched_product_id: String(testProdB._id),
          matched_product_sku: testProdB.sku,
          approval_status: 'approved',
          approved_cost_ngn: 210000,
          application_status: 'failed', // Failed on first try, eligible for recovery
          application_error: 'Temporary connection timeout'
        }
      ]
    });

    const res = await request(`/api/admin/price-imports/${partialImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.appliedCount, 1, 'Only the pending row should be applied');
    assert.strictEqual(res.body.status, 'successfully_applied');

    // Verify Row 2 cost was updated
    const prodB = await Product.findById(testProdB._id).lean();
    assert.strictEqual(prodB.cost_price_ngn, 210000);
  });

  await test('Requirement 35: Partial failures are represented accurately with detailed error reasons', async () => {
    // Create an import with one valid row and one referencing an archived product
    const mixedImport = await PriceImport.create({
      filename: 'STAGE25-TEST-PARTIAL-FAIL.xlsx',
      supplier_name: 'Distributor',
      file_format: 'xlsx',
      uploaded_by: 1,
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'approved_for_application',
      summary: { total_rows: 2, valid_rows: 2, matched_rows: 2, unmatched_rows: 0 },
      rows_preview: [
        {
          row_number: 1,
          raw_sku: testProdD.sku,
          normalized_cost_ngn: 155000,
          currency: 'NGN',
          matched_product_id: String(testProdD._id),
          matched_product_sku: testProdD.sku,
          approval_status: 'approved',
          approved_cost_ngn: 155000,
          application_status: 'pending'
        },
        {
          row_number: 2,
          raw_sku: testProdArchived.sku,
          normalized_cost_ngn: 88000,
          currency: 'NGN',
          matched_product_id: String(testProdArchived._id),
          matched_product_sku: testProdArchived.sku,
          approval_status: 'approved',
          approved_cost_ngn: 88000,
          application_status: 'pending'
        }
      ]
    });

    const res = await request(`/api/admin/price-imports/${mixedImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'partially_applied');
    assert.strictEqual(res.body.appliedCount, 1);
    assert.strictEqual(res.body.failedCount, 1);
    assert(res.body.failedRows[0].error.includes('is archived'));
  });

  await test('Requirement 36: Successful rows are not reapplied during recovery', async () => {
    // Prior test successfully applied Row 1 (testProdD cost 155,000)
    // Manually change testProdD cost in DB to 160,000 to verify Row 1 is not touched on re-apply
    await Product.updateOne({ _id: testProdD._id }, { $set: { cost_price_ngn: 160000 } });

    // The mixedImport status is partially_applied, but Row 1 is already 'applied'.
    // Calling apply again should only attempt unapplied rows.
    const mixed = await PriceImport.findOne({ filename: 'STAGE25-TEST-PARTIAL-FAIL.xlsx' });
    const res = await request(`/api/admin/price-imports/${mixed._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(res.status, 200);
    // Row 1 should not have been reapplied
    assert.strictEqual(res.body.appliedCount, 0);

    const prodD = await Product.findById(testProdD._id).lean();
    assert.strictEqual(prodD.cost_price_ngn, 160000, 'Already applied product was not overwritten');
  });

  await test('Requirement 37: Audit records capture previous and new supplier costs (PRICE_IMPORT_APPLIED_ROW)', async () => {
    const audit = await AuditLog.findOne({
      action: 'PRICE_IMPORT_APPLIED_ROW',
      entity_id: String(testProdA.id || testProdA._id)
    }).sort({ created_at: -1 }).lean();

    assert(audit, 'Audit log entry for PRICE_IMPORT_APPLIED_ROW must exist');
    assert(audit.details.includes('Updated supplier cost for SKU'));
    assert(audit.details.includes('Retail selling price'));
    assert(audit.details.includes('strictly unchanged'));
  });

  await test('Requirement 38: Unsupported currency and invalid numeric values are rejected', async () => {
    const badImport = await PriceImport.create({
      filename: 'STAGE25-TEST-BAD-VALUES.xlsx',
      supplier_name: 'Distributor',
      file_format: 'xlsx',
      uploaded_by: 1,
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'approved_for_application',
      summary: { total_rows: 1, valid_rows: 1, matched_rows: 1, unmatched_rows: 0 },
      rows_preview: [{
        row_number: 1,
        raw_sku: testProdA.sku,
        normalized_cost_ngn: null,
        approved_cost_ngn: -50000, // Invalid negative
        currency: 'USD',
        matched_product_id: String(testProdA._id),
        matched_product_sku: testProdA.sku,
        approval_status: 'approved',
        application_status: 'pending'
      }]
    });

    const res = await request(`/api/admin/price-imports/${badImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {}
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.failedCount, 1);
    assert(res.body.failedRows[0].error.includes('Invalid approved price'));
  });

  await test('Requirement 39: Customers cannot read or invoke review, approval, or application endpoints', async () => {
    const revRes = await request(`/api/admin/price-imports/${testImport1._id}/review`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(revRes.status, 403);

    const appRes = await request(`/api/admin/price-imports/${testImport1._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {}
    });
    assert.strictEqual(appRes.status, 403);

    const cancelRes = await request(`/api/admin/price-imports/${testImport1._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { reason: 'Customer attempt' }
    });
    assert.strictEqual(cancelRes.status, 403);
  });

  await test('Requirement 40: Existing product APIs continue to protect supplier cost fields from public exposure', async () => {
    const publicRes = await request(`/api/products/${testProdA.slug}`);
    assert.strictEqual(publicRes.status, 200);
    assert.strictEqual(publicRes.body.product.cost_price_ngn, undefined, 'Public product API must NEVER expose cost_price_ngn');
    assert.strictEqual(publicRes.body.product.supplier_cost_ngn, undefined, 'Public product API must NEVER expose supplier_cost_ngn');
    assert.strictEqual(publicRes.body.product.price_ngn, 450000, 'Selling price must be visible');
  });

  // Cleanup isolated test products & imports
  await Product.deleteMany({ sku: /^STG6-TEST-/i });
  await PriceImport.deleteMany({ filename: /^STAGE25-TEST/i });

  console.log('\n========================================================================');
  console.log(`STAGE 25 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
