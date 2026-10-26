/**
 * DEVICE PRO — Stage 27: Supplier Baseline Reconciliation & Invariance Test Suite
 * 
 * Sub-stages 8.1, 8.2, 8.3:
 * - Stage 8.1: Active Catalog SKU and Specification Matrix Template
 * - Stage 8.2: Supplier Price List Intake and Pre-Validation
 * - Stage 8.3: Controlled Batch Reconciliation and Invariance Testing
 * 
 * Strict Safety Rules:
 * 1. Zero catalog cost application to actual products.
 * 2. Complete database invariance for retail prices, supplier costs, stock, publication status, benchmark records.
 * 3. Verified test isolation.
 */

const assert = require('assert');
const ExcelJS = require('exceljs');
const { connectMongo, assertTestEnvironmentIsolated } = require('../db/mongo/connection');
const { Product, Order, Quote, User, PriceImport, AuditLog } = require('../db/mongo/models');
const {
  processSupplierPriceFile,
  generateMasterCatalogTemplate,
  compareSupplierQuotations,
  evaluateQuotationFreshness,
  parseDate,
  preparePriceImportForReview,
  FRESHNESS_WINDOW_DAYS
} = require('../lib/price-import-engine');

// Enforce test environment isolation
assertTestEnvironmentIsolated();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 27: SUPPLIER BASELINE RECONCILIATION & INVARIANCE');
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
    } else if (contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
      const arrayBuf = await res.arrayBuffer();
      body = Buffer.from(arrayBuf);
    } else {
      body = await res.text();
    }
    return { status: res.status, headers: res.headers, body };
  }

  // Pre-test setup: Connect Mongo and authenticate staff roles
  await connectMongo();

  // Clean up any old test records from prior runs
  await PriceImport.deleteMany({ filename: /^STAGE27-TEST/i });

  // Baseline customer count BEFORE creating test user
  const preCustomersCount = await User.countDocuments({ role: 'customer' });

  // 1. Authenticate Superadmin
  const saRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(saRes.status, 200, 'Superadmin login must succeed');
  const superadminToken = saRes.body.token;

  // 2. Authenticate Engineer
  const engRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engRes.status, 200, 'Lead Engineer login must succeed');
  const engineerToken = engRes.body.token;

  // 3. Register and Authenticate Customer
  const testCustomerEmail = `customer_stage27_${Date.now()}@devicepro.test`;
  const custRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Reconciliation Test',
      email: testCustomerEmail,
      phone: '+2348099887766',
      password: 'CustomerPass123!'
    }
  });
  assert.strictEqual(custRes.status, 201, 'Customer registration must succeed');
  const customerToken = custRes.body.token;

  // =========================================================================
  // CAPTURE BASELINE SNAPSHOTS (MANDATORY INVARIANCE AUDIT)
  // =========================================================================
  console.log('[STAGE 27] Capturing pre-test database baseline snapshots...');

  const preTotalProducts = await Product.countDocuments();
  const preActiveProducts = await Product.find({ published: 1 }).lean();
  const preBenchmarkProducts = await Product.find({ published: 0 }).lean();
  const preOrdersCount = await Order.countDocuments();
  const preQuotesCount = await Quote.countDocuments();

  // Map of active products by SKU
  const preActiveMap = new Map();
  preActiveProducts.forEach(p => {
    preActiveMap.set(p.sku, {
      id: String(p._id),
      name: p.name,
      price_ngn: p.price_ngn,
      previous_price_ngn: p.previous_price_ngn,
      supplier_cost_ngn: p.supplier_cost_ngn,
      cost_price_ngn: p.cost_price_ngn,
      stock_quantity: p.stock_quantity,
      published: p.published
    });
  });

  console.log(`[STAGE 27] Pre-test state:`);
  console.log(`  - Total products: ${preTotalProducts}`);
  console.log(`  - Active commercial products: ${preActiveProducts.length}`);
  console.log(`  - Archived benchmark products: ${preBenchmarkProducts.length}`);
  console.log(`  - Total orders: ${preOrdersCount}`);
  console.log(`  - Total quotes: ${preQuotesCount}`);
  console.log(`  - Total customers: ${preCustomersCount}\n`);

  assert.strictEqual(preActiveProducts.length, 48, 'Catalog must contain exactly 48 active commercial products');
  assert.strictEqual(preBenchmarkProducts.length, 70, 'Catalog must contain exactly 70 benchmark products (verified Atlas baseline)');

  // Helper to build test Excel buffers
  async function createTestWorkbook(headers, rows) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Supplier Prices');
    ws.addRow(headers);
    rows.forEach(r => ws.addRow(r));
    const rawBuffer = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  }

  // =========================================================================
  // SECTION 1: STAGE 8.1 ACTIVE CATALOG SKU & SPECIFICATION MATRIX TEMPLATE
  // =========================================================================

  await test('8.1.1: Download Excel catalog template via API (Superadmin)', async () => {
    const res = await request('/api/admin/price-imports/catalog-template/xlsx', {
      method: 'GET',
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200, 'Catalog template download must return 200');
    assert(res.body instanceof Buffer, 'Response body must be a Buffer');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);

    const wsMatrix = wb.getWorksheet('Quotation Matrix');
    assert(wsMatrix, 'Workbook must contain "Quotation Matrix" worksheet');

    // Row 1 is Top Banner, Row 2 is Column Headers, Rows 3..50 are 48 active products
    const rowCount = wsMatrix.rowCount;
    assert.strictEqual(rowCount, 50, `Quotation Matrix must contain 50 rows (2 headers + 48 products), found ${rowCount}`);

    const wsGuide = wb.getWorksheet('Instructions & Guidelines');
    assert(wsGuide, 'Workbook must contain "Instructions & Guidelines" worksheet');
  });

  await test('8.1.2: Download CSV catalog template via API and verify contents', async () => {
    const res = await request('/api/admin/price-imports/catalog-template/csv', {
      method: 'GET',
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200, 'CSV catalog template download must return 200');
    const text = typeof res.body === 'string' ? res.body : res.body.toString('utf8');
    const lines = text.trim().split('\n');

    // 1 header row + 48 product rows = 49 lines
    assert.strictEqual(lines.length, 49, `CSV must contain 49 lines, found ${lines.length}`);
    assert(lines[0].includes('DEVICE PRO SKU'), 'CSV header must include "DEVICE PRO SKU"');
    assert(lines[0].includes('Quoted Unit Cost (NGN)'), 'CSV header must include "Quoted Unit Cost (NGN)"');

    // Verify benchmark product is NOT in the template
    assert(!text.includes('SG-10K-HYBRID-NG'), 'Template must exclude benchmark SKU SG-10K-HYBRID-NG');
    assert(!text.includes('Sungrow Benchmark'), 'Template must exclude Sungrow Benchmark brand');
  });

  await test('8.1.3: Non-admin roles rejected from downloading catalog template', async () => {
    // Customer rejected with 403
    const custRes = await request('/api/admin/price-imports/catalog-template/xlsx', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(custRes.status, 403, 'Customer must be rejected with 403');

    // Engineer rejected with 403
    const engRes = await request('/api/admin/price-imports/catalog-template/xlsx', {
      method: 'GET',
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert.strictEqual(engRes.status, 403, 'Engineer must be rejected with 403');

    // Unauthenticated rejected with 401
    const unauthRes = await request('/api/admin/price-imports/catalog-template/xlsx', {
      method: 'GET'
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
  });

  // =========================================================================
  // SECTION 2: STAGE 8.2 SUPPLIER INTAKE, FRESHNESS & METADATA VALIDATION
  // =========================================================================

  await test('8.2.1: Fresh quotation validation (within 30 days window)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const freshness = evaluateQuotationFreshness(today, expiry);
    assert.strictEqual(freshness.status, 'fresh', 'Today quotation must be marked fresh');
    assert.strictEqual(freshness.stale, false, 'Fresh quotation must not be stale');
    assert.strictEqual(freshness.expired, false, 'Future expiry must not be expired');
  });

  await test('8.2.2: Stale quotation validation (> 30 days old flagged for human review)', async () => {
    // 45 days ago
    const staleDate = new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0];
    const freshness = evaluateQuotationFreshness(staleDate);

    assert.strictEqual(freshness.status, 'stale', 'Quotation older than 30 days must be marked stale');
    assert.strictEqual(freshness.stale, true, 'Quotation must be flagged as stale');
    assert(freshness.warning.includes('30') && freshness.warning.includes('freshness window'), 'Warning must explain 30-day freshness window policy');
  });

  await test('8.2.3: Future date and expired quotation validation', async () => {
    // Future quotation date
    const futureDate = '2035-01-01';
    const futureFreshness = evaluateQuotationFreshness(futureDate);
    assert.strictEqual(futureFreshness.status, 'future_date', 'Future quotation date must be flagged');

    // Expired quotation
    const pastQuoteDate = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];
    const pastExpiryDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    const expiredFreshness = evaluateQuotationFreshness(pastQuoteDate, pastExpiryDate);
    assert.strictEqual(expiredFreshness.status, 'expired', 'Past expiry date must be marked expired');
    assert.strictEqual(expiredFreshness.expired, true, 'Quotation must be flagged as expired');
  });

  await test('8.2.4: Missing quotation date validation', async () => {
    const missingFreshness = evaluateQuotationFreshness(null);
    assert.strictEqual(missingFreshness.status, 'date_missing', 'Missing date must be flagged as date_missing');
  });

  await test('8.2.5: Date parsing across international formats (ISO, UK/NG, US, Excel)', async () => {
    const isoResult = parseDate('2026-10-24');
    assert(isoResult.valid && isoResult.date && isoResult.date.toISOString().startsWith('2026-10-24'), 'ISO date parsed correctly');

    const ukResult = parseDate('24/10/2026');
    assert(ukResult.valid && ukResult.date && ukResult.date.getUTCDate() === 24 && ukResult.date.getUTCMonth() === 9, 'UK/NG DD/MM/YYYY date parsed correctly');

    const dashResult = parseDate('24-10-2026');
    assert(dashResult.valid && dashResult.date && dashResult.date.getUTCDate() === 24, 'Dash DD-MM-YYYY date parsed correctly');

    const usResult = parseDate('10/24/2026');
    assert(usResult.valid && usResult.date && usResult.date.getUTCDate() === 24 && usResult.date.getUTCMonth() === 9, 'Unambiguous US MM/DD/YYYY parsed correctly');

    const excelResult = parseDate(46320); // Excel serial date
    assert(excelResult.valid && excelResult.date instanceof Date && !isNaN(excelResult.date.getTime()), 'Excel serial date parsed correctly');

    const excelStrResult = parseDate('46319');
    assert(excelStrResult.valid && excelStrResult.date.toISOString().startsWith('2026-10-24'), 'Numeric string Excel serial parsed correctly');

    const invalidResult = parseDate('not-a-date');
    assert.strictEqual(invalidResult.valid, false, 'Invalid date string must return valid: false');
  });

  await test('8.2.5b: Ambiguous date rejection policy (e.g. 04/05/2026) and explicit resolution', async () => {
    // 1. Without explicit format, ambiguous date must be rejected
    const ambig = parseDate('04/05/2026');
    assert.strictEqual(ambig.valid, false, 'Ambiguous date must not be silently parsed');
    assert.strictEqual(ambig.isAmbiguous, true, 'isAmbiguous flag must be true');
    assert.ok(ambig.error.includes('Ambiguous date format'), 'Error must explain ambiguity');

    // 2. With explicit DD/MM/YYYY, resolves to 4 May 2026
    const resolvedUk = parseDate('04/05/2026', { dateFormat: 'DD/MM/YYYY' });
    assert.strictEqual(resolvedUk.valid, true);
    assert.strictEqual(resolvedUk.date.getUTCDate(), 4);
    assert.strictEqual(resolvedUk.date.getUTCMonth(), 4); // May is 4 (0-indexed)

    // 3. With explicit MM/DD/YYYY, resolves to 5 April 2026
    const resolvedUs = parseDate('04/05/2026', { dateFormat: 'MM/DD/YYYY' });
    assert.strictEqual(resolvedUs.valid, true);
    assert.strictEqual(resolvedUs.date.getUTCDate(), 5);
    assert.strictEqual(resolvedUs.date.getUTCMonth(), 3); // April is 3 (0-indexed)

    // 4. evaluateQuotationFreshness flags ambiguous date as date_ambiguous
    const ambigFreshness = evaluateQuotationFreshness('04/05/2026');
    assert.strictEqual(ambigFreshness.status, 'date_ambiguous');
    assert.strictEqual(ambigFreshness.ambiguous, true);
  });

  await test('8.2.5c: Calendar rollover and leap year boundaries', async () => {
    // 1. Month day overflow (April has 30 days)
    const apr31 = parseDate('2026-04-31');
    assert.strictEqual(apr31.valid, false, 'April 31st must be rejected');
    assert.ok(apr31.error.includes('calendar rollover'));

    // 2. Non-leap year Feb 29 (2025 is not leap)
    const feb29_2025 = parseDate('2025-02-29');
    assert.strictEqual(feb29_2025.valid, false, 'Feb 29 on non-leap year must be rejected');

    // 3. Valid leap year Feb 29 (2024 is leap)
    const feb29_2024 = parseDate('2024-02-29');
    assert.strictEqual(feb29_2024.valid, true, 'Feb 29 on leap year must be valid');
    assert.strictEqual(feb29_2024.date.getUTCMonth(), 1);
    assert.strictEqual(feb29_2024.date.getUTCDate(), 29);

    // 4. Century non-leap year (1900 is not leap)
    const feb29_1900 = parseDate('1900-02-29');
    assert.strictEqual(feb29_1900.valid, false, '1900 Feb 29 must be rejected');

    // 5. Century leap year (2000 is leap)
    const feb29_2000 = parseDate('2000-02-29');
    assert.strictEqual(feb29_2000.valid, true, '2000 Feb 29 must be valid');
  });

  await test('8.2.5d: Future dates and expiry boundary freshness evaluation', async () => {
    const refDate = new Date('2026-10-24T12:00:00Z');

    // Future date (> 1 day)
    const futureFresh = evaluateQuotationFreshness('2026-11-15', null, refDate);
    assert.strictEqual(futureFresh.status, 'future_date');

    // Expired quotation
    const expiredFresh = evaluateQuotationFreshness('2026-10-01', '2026-10-15', refDate);
    assert.strictEqual(expiredFresh.status, 'expired');
    assert.strictEqual(expiredFresh.expired, true);

    // Stale quotation (> 30 calendar days)
    const staleFresh = evaluateQuotationFreshness('2026-09-01', null, refDate);
    assert.strictEqual(staleFresh.status, 'stale');
    assert.strictEqual(staleFresh.stale, true);

    // Fresh quotation (within 30 calendar days)
    const freshFresh = evaluateQuotationFreshness('2026-10-10', '2026-11-10', refDate);
    assert.strictEqual(freshFresh.status, 'fresh');
  });

  await test('8.2.6: Intake persistence records quotation metadata in PriceImport document', async () => {
    const testImportPayload = {
      filename: 'STAGE27-TEST-METADATA.xlsx',
      supplier_name: 'Rubitec Solar Nigeria',
      supplier_quote_ref: 'QT-2026-RUB-0091',
      quote_date: new Date('2026-10-20'),
      quote_expiry_date: new Date('2026-11-20'),
      import_source: 'Direct Distributor B2B',
      currency: 'NGN',
      freshness_status: 'fresh',
      validation_warnings: [],
      file_format: 'xlsx',
      summary: {
        total_rows: 5,
        valid_rows: 5,
        matched_rows: 5,
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
          supplier_name: 'Rubitec Solar Nigeria',
          quoted_cost_ngn: 185000,
          quote_date: new Date('2026-10-20'),
          quote_expiry_date: new Date('2026-11-20'),
          quote_ref: 'QT-2026-RUB-0091',
          freshness_status: 'fresh',
          currency: 'NGN',
          match_status: 'matched'
        }
      ]
    };

    const res = await request('/api/admin/price-imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: testImportPayload
    });

    assert.strictEqual(res.status, 201, `Import persistence must return 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const saved = res.body.importRecord;
    assert.strictEqual(saved.supplier_quote_ref, 'QT-2026-RUB-0091', 'Supplier quote ref must be saved');
    assert.strictEqual(saved.currency, 'NGN', 'Currency must be saved');
    assert.strictEqual(saved.freshness_status, 'fresh', 'Freshness status must be saved');
    assert.strictEqual(saved.import_source, 'Direct Distributor B2B', 'Import source must be saved');

    // Retrieve via GET /api/admin/price-imports/:id
    const getRes = await request(`/api/admin/price-imports/${saved.id || saved._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(getRes.status, 200, 'Retrieve import must return 200');
    assert.strictEqual(getRes.body.importRecord.supplier_quote_ref, 'QT-2026-RUB-0091');
  });

  // =========================================================================
  // SECTION 3: STAGE 8.3 BATCH RECONCILIATION & MATCHING ENGINE LOGIC
  // =========================================================================

  await test('8.3.1: Exact SKU matching against active catalog (48 active products)', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency', 'Quote Date'];
    const rows = [
      ['JKM-550M-72HL4', 'Monocrystalline Solar Panel', '185000', 'NGN', '2026-10-24'],
      ['GW-SPH5000-TL-BL-UP', 'Hybrid Inverter', '1750000', 'NGN', '2026-10-24'],
      ['PYL-US3000C-48V', 'Lithium Battery', '1400000', 'NGN', '2026-10-24']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-EXACT-MATCH.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(result.summary.total_rows, 3, 'Total rows must be 3');
    assert.strictEqual(result.summary.matched_rows, 3, 'All 3 rows must match exact SKUs');
    assert.strictEqual(result.summary.unmatched_rows, 0, 'Zero unmatched rows');
    assert.strictEqual(result.summary.invalid_rows, 0, 'Zero invalid rows');
    assert.strictEqual(result.rows[0].status, 'matched');
    assert.strictEqual(result.rows[0].matched_sku, 'JKM-550M-72HL4');
    assert.strictEqual(result.rows[0].normalized_cost_ngn, 185000);
  });

  await test('8.3.2: Unmatched supplier SKUs handled safely without crashing', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['NONEXISTENT-PANEL-9999', 'Super Fantastic 900W Panel', '250000', 'NGN'],
      ['GW-SPH5000-TL-BL-UP', 'Growatt Hybrid Inverter', '1750000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-UNMATCHED.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(result.summary.total_rows, 2);
    assert.strictEqual(result.summary.matched_rows, 1);
    assert.strictEqual(result.summary.unmatched_rows, 1);
    assert.strictEqual(result.rows[0].status, 'unmatched');
    assert.strictEqual(result.rows[0].is_eligible_for_approval, false, 'Unmatched row must not be eligible for approval');
  });

  await test('8.3.3: Duplicate rows in supplier file all flagged as duplicate_in_file', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel Option A', '185000', 'NGN'],
      ['JKM-550M-72HL4', 'Jinko 550W Panel Option B', '190000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-DUPLICATE.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(result.summary.total_rows, 2);
    assert.strictEqual(result.summary.duplicate_in_file_rows, 2);
    assert.strictEqual(result.rows[0].status, 'duplicate_in_file');
    assert.strictEqual(result.rows[1].status, 'duplicate_in_file');
    assert.strictEqual(result.rows[0].is_eligible_for_approval, false);
    assert.strictEqual(result.rows[1].is_eligible_for_approval, false);
  });

  await test('8.3.4: Conflicting supplier quotations comparison (compareSupplierQuotations)', async () => {
    const mockAnalyzedRows = [
      {
        row_number: 1,
        matched_sku: 'JKM-550M-72HL4',
        matched_product_name: 'Monocrystalline Solar Panel',
        supplier_name: 'Rubitec Solar',
        supplier_ref: 'QT-RUB-01',
        normalized_cost_ngn: 185000,
        currency: 'NGN',
        quote_date: '2026-10-24',
        freshness_status: 'fresh',
        availability: 'In Stock Lagos (500 units)',
        warranty_terms: '25 Years Output Warranty',
        is_eligible_for_approval: true
      },
      {
        row_number: 2,
        matched_sku: 'JKM-550M-72HL4',
        matched_product_name: 'Monocrystalline Solar Panel',
        supplier_name: 'Wavetronics Tech',
        supplier_ref: 'QT-WAV-99',
        normalized_cost_ngn: 192000,
        currency: 'NGN',
        quote_date: '2026-10-22',
        freshness_status: 'fresh',
        availability: 'In Stock Abuja (200 units)',
        warranty_terms: '25 Years Output Warranty',
        is_eligible_for_approval: true
      }
    ];

    const comparison = compareSupplierQuotations(mockAnalyzedRows);
    assert.strictEqual(comparison.length, 1, 'Should group by unique SKU');
    assert.strictEqual(comparison[0].sku, 'JKM-550M-72HL4');
    assert.strictEqual(comparison[0].quotation_count, 2, 'Should preserve both quotations');
    assert.strictEqual(comparison[0].has_competing_quotes, true, 'Should flag as having competing quotes');
    assert.strictEqual(comparison[0].quotations[0].supplier_name, 'Rubitec Solar');
    assert.strictEqual(comparison[0].quotations[1].supplier_name, 'Wavetronics Tech');
    // Ensure the engine presents them transparently without auto-selecting a winner
    assert.strictEqual(comparison[0].quotations[0].quoted_cost_ngn, 185000);
    assert.strictEqual(comparison[0].quotations[1].quoted_cost_ngn, 192000);
  });

  await test('8.3.5: Missing supplier identifiers (missing quote ref / supplier name)', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel', '185000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-NO-SUPPLIER.xlsx',
      activeProducts: preActiveProducts,
      supplierName: '' // deliberately empty
    });

    assert.strictEqual(result.summary.total_rows, 1);
    assert(result.supplier_name.length > 0, 'Engine must provide fallback supplier name');
    assert(result.validation_warnings.some(w => w.includes('Supplier name was not specified')), 'Warning must be recorded');
  });

  await test('8.3.6: Prevention of name-only automatic matching (variant mismatch)', async () => {
    // Similar name but different SKU or variant
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['CUSTOM-DEYE-12K', 'Deye 8kW Hybrid Inverter Single Phase (Special Custom Edition)', '2200000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-NAME-MISMATCH.xlsx',
      activeProducts: preActiveProducts
    });

    // Must NOT auto-match based only on partial name match
    assert.strictEqual(result.summary.matched_rows, 0, 'Must not auto-match on partial name');
    assert.strictEqual(result.summary.unmatched_rows, 1, 'Mismatched variant must be marked unmatched');
    assert.strictEqual(result.rows[0].status, 'unmatched');
  });

  await test('8.3.7: Invalid costs (negative, 0, non-numeric, NaN) rejected', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel', '-185000', 'NGN'],
      ['GW-SPH5000-TL-BL-UP', 'Growatt Inverter', '0', 'NGN'],
      ['PYL-US3000C-48V', 'Pylontech Battery', 'FREE', 'NGN'],
      ['EF-DELTA-1000W', 'Portable Station', 'NaN', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-INVALID-COSTS.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(result.summary.total_rows, 4);
    assert.strictEqual(result.summary.invalid_rows, 4, 'All 4 rows must be flagged as invalid_price');
    assert.strictEqual(result.summary.valid_rows, 0);
    result.rows.forEach(r => {
      assert.strictEqual(r.status, 'invalid_price');
      assert.strictEqual(r.is_eligible_for_approval, false);
    });
  });

  await test('8.3.8: Unsupported currencies (USD, EUR, GBP) strictly rejected', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel', '150', 'USD'],
      ['GW-SPH5000-TL-BL-UP', 'Growatt Inverter', '1200', 'EUR'],
      ['PYL-US3000C-48V', 'Pylontech Battery', '900', 'GBP']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-UNSUPPORTED-CURRENCY.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(result.summary.total_rows, 3);
    assert.strictEqual(result.summary.invalid_rows, 3, 'All 3 rows must be flagged as unsupported_currency');
    result.rows.forEach(r => {
      assert.strictEqual(r.status, 'unsupported_currency');
      assert.strictEqual(r.is_eligible_for_approval, false);
    });
  });

  await test('8.3.9: Archived benchmark products (70 items with SG-10K-HYBRID-NG) strictly excluded', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['SG-10K-HYBRID-NG', 'Sungrow 10kW Hybrid Inverter Benchmark', '1650000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-BENCHMARK-EXCLUSION.xlsx',
      activeProducts: preActiveProducts // all 48 active commercial products
    });

    // The active catalog does NOT contain the benchmark products, so this SKU must be unmatched
    assert.strictEqual(result.summary.matched_rows, 0, 'Benchmark SKU must never match active commercial products');
    assert.strictEqual(result.summary.unmatched_rows, 1, 'Benchmark SKU must be marked unmatched');
    assert.strictEqual(result.rows[0].status, 'unmatched');
  });

  await test('8.3.10: Partial batch reconciliation with strict summary counts integrity', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency', 'Quote Date'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel', '185000', 'NGN', '2026-10-24'],     // duplicate row
      ['GW-SPH5000-TL-BL-UP', 'Growatt Inverter', '1750000', 'NGN', '2026-10-24'], // matched
      ['UNKNOWN-RACK-001', 'Generic Unknown Rack', '85000', 'NGN', '2026-10-24'],    // unmatched
      ['JKM-550M-72HL4', 'Jinko 550W Duplicate', '190000', 'NGN', '2026-10-24'],  // duplicate in file
      ['PYL-US3000C-48V', 'Pylontech Battery', '-1400000', 'NGN', '2026-10-24'],     // invalid price
      ['EF-DELTA-1000W', 'Portable Station', '1200', 'USD', '2026-10-24']           // unsupported currency
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-PARTIAL-BATCH.xlsx',
      activeProducts: preActiveProducts
    });

    const { summary } = result;
    assert.strictEqual(summary.total_rows, 6, 'Total rows must be 6');
    assert.strictEqual(summary.total_rows, summary.valid_rows + summary.invalid_rows, 'Total = Valid + Invalid');
    assert.strictEqual(summary.valid_rows, summary.matched_rows + summary.unmatched_rows, 'Valid = Matched + Unmatched');
    assert.strictEqual(summary.invalid_rows, 4, '4 invalid rows (2 duplicate rows + 1 negative price + 1 USD currency)');
    assert.strictEqual(summary.valid_rows, 2, '2 valid rows (1 matched + 1 unmatched)');
    assert.strictEqual(summary.duplicate_in_file_rows, 2, '2 duplicate rows for JKM-550M-72HL4');
  });

  await test('8.3.11: Spreadsheet formula injection sanitization', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency'];
    const rows = [
      ['=CMD|\'/C calc\'!A0', '=1+1', '185000', 'NGN'],
      ['+MALICIOUS-SKU', '@SUM(1,2)', '195000', 'NGN']
    ];

    const buf = await createTestWorkbook(headers, rows);
    const result = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-INJECTION.xlsx',
      activeProducts: preActiveProducts
    });

    // Sanitization must prepend single quote to formulas
    result.rows.forEach(r => {
      assert(!String(r.raw_sku).startsWith('='), 'Formula = must be sanitized');
      assert(!String(r.raw_sku).startsWith('+'), 'Formula + must be sanitized');
    });
  });

  await test('8.3.12: Repeated processing of the same import is idempotent and safe', async () => {
    const headers = ['Supplier SKU', 'Product Name', 'Supplier Cost', 'Currency', 'Quote Date'];
    const rows = [
      ['JKM-550M-72HL4', 'Jinko 550W Panel', '185000', 'NGN', '2026-10-24']
    ];

    const buf = await createTestWorkbook(headers, rows);

    // Run 1
    const res1 = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-IDEMPOTENT.xlsx',
      activeProducts: preActiveProducts
    });

    // Run 2
    const res2 = await processSupplierPriceFile({
      buffer: buf,
      filename: 'STAGE27-TEST-IDEMPOTENT.xlsx',
      activeProducts: preActiveProducts
    });

    assert.strictEqual(res1.summary.matched_rows, res2.summary.matched_rows);
    assert.strictEqual(res1.rows[0].normalized_cost_ngn, res2.rows[0].normalized_cost_ngn);
  });

  await test('8.3.13: Unapproved import cannot apply supplier costs to catalog', async () => {
    // Create an import in 'analysed' status
    const testImport = await PriceImport.create({
      filename: 'STAGE27-TEST-UNAPPROVED.xlsx',
      supplier_name: 'Test Solar Supplier',
      file_format: 'xlsx',
      uploaded_by: '1',
      uploaded_by_email: 'admin@devicepro.ng',
      uploaded_by_role: 'superadmin',
      status: 'analysed',
      summary: { total_rows: 1, valid_rows: 1, matched_rows: 1, unmatched_rows: 0 },
      rows_preview: [
        {
          row_number: 1,
          raw_sku: preActiveProducts[0].sku,
          matched_sku: preActiveProducts[0].sku,
          matched_product_id: preActiveProducts[0]._id,
          normalized_cost_ngn: 185000,
          currency: 'NGN',
          match_status: 'matched'
        }
      ]
    });

    // Attempt to invoke apply endpoint
    const applyRes = await request(`/api/admin/price-imports/${testImport._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(applyRes.status, 400, 'Attempting to apply an unapproved import must be rejected with 400');
    assert(applyRes.body.error.includes('approved'), 'Error must specify that import is not approved');

    // Clean up test import
    await PriceImport.deleteOne({ _id: testImport._id });
  });

  await test('8.3.14: Freshness re-validation during preparePriceImportForReview', async () => {
    const pastDate = new Date(Date.now() - 40 * 86400 * 1000); // 40 days ago
    const expiredDate = new Date(Date.now() - 5 * 86400 * 1000); // expired 5 days ago

    const mockImport = {
      quote_date: pastDate,
      quote_expiry_date: expiredDate,
      rows_preview: [
        {
          row_number: 1,
          raw_sku: preActiveProducts[0].sku,
          normalized_sku: preActiveProducts[0].sku,
          normalized_cost_ngn: 185000,
          currency: 'NGN',
          quote_date: pastDate,
          quote_expiry_date: expiredDate,
          status: 'matched'
        }
      ]
    };

    const review = preparePriceImportForReview(mockImport, preActiveProducts);
    assert.strictEqual(review.freshness_status, 'expired', 'Document freshness must re-evaluate to expired');
    assert.strictEqual(review.rows[0].freshness_status, 'expired', 'Row freshness must re-evaluate to expired');
    assert(review.rows[0].validation_warnings.some(w => w.includes('expired')), 'Warning must indicate expired quotation');
  });

  // =========================================================================
  // SECTION 4: MANDATORY POST-TEST DATABASE INVARIANCE VERIFICATION
  // =========================================================================
  console.log('\n[STAGE 27] Executing Post-Test Database Invariance Audit...');

  await test('INVARIANCE 1: All 48 active commercial products retain identical retail prices', async () => {
    const postActive = await Product.find({ published: 1 }).lean();
    assert.strictEqual(postActive.length, preActiveProducts.length, 'Active product count must be identical');

    postActive.forEach(p => {
      const pre = preActiveMap.get(p.sku);
      assert(pre, `Product SKU ${p.sku} must exist in baseline`);
      assert.strictEqual(p.price_ngn, pre.price_ngn, `Retail price_ngn for ${p.sku} must be unchanged`);
      assert.strictEqual(p.previous_price_ngn, pre.previous_price_ngn, `previous_price_ngn for ${p.sku} must be unchanged`);
    });
  });

  await test('INVARIANCE 2: All 48 active commercial products retain identical supplier costs', async () => {
    const postActive = await Product.find({ published: 1 }).lean();
    postActive.forEach(p => {
      const pre = preActiveMap.get(p.sku);
      assert.strictEqual(p.supplier_cost_ngn, pre.supplier_cost_ngn, `supplier_cost_ngn for ${p.sku} must be unchanged`);
      assert.strictEqual(p.cost_price_ngn, pre.cost_price_ngn, `cost_price_ngn for ${p.sku} must be unchanged`);
    });
  });

  await test('INVARIANCE 3: Stock quantities and publication status remain 100% unchanged', async () => {
    const postActive = await Product.find({ published: 1 }).lean();
    postActive.forEach(p => {
      const pre = preActiveMap.get(p.sku);
      assert.strictEqual(p.stock_quantity, pre.stock_quantity, `stock_quantity for ${p.sku} must be unchanged`);
      assert.strictEqual(p.published, pre.published, `published status for ${p.sku} must be unchanged`);
    });
  });

  await test('INVARIANCE 4: All 70 archived benchmark products remain strictly intact and untouched', async () => {
    const postBenchmark = await Product.find({ published: 0 }).lean();
    assert.strictEqual(postBenchmark.length, preBenchmarkProducts.length, 'Benchmark product count must remain 70');
    assert.strictEqual(postBenchmark.length, 70, 'Must be exactly 70 benchmark products');
    postBenchmark.forEach(p => {
      assert.strictEqual(p.sku, 'SG-10K-HYBRID-NG', 'Benchmark SKU must remain SG-10K-HYBRID-NG');
      assert.strictEqual(p.published, 0, 'Benchmark products must remain unpublished');
    });
  });

  await test('INVARIANCE 5: Orders, quotes, and customer business records remain strictly unchanged', async () => {
    const postOrdersCount = await Order.countDocuments();
    const postQuotesCount = await Quote.countDocuments();

    assert.strictEqual(postOrdersCount, preOrdersCount, 'Orders count must be strictly unchanged');
    assert.strictEqual(postQuotesCount, preQuotesCount, 'Quotes count must be strictly unchanged');

    // Clean up test customer
    await User.deleteOne({ email: testCustomerEmail });
    const finalCustomersCount = await User.countDocuments({ role: 'customer' });
    assert.strictEqual(finalCustomersCount, preCustomersCount, 'Customer accounts count must be strictly unchanged');
  });

  // Final Cleanup: Clean only test imports created by this test suite
  await PriceImport.deleteMany({ filename: /^STAGE27-TEST/i });

  console.log('\n========================================================================');
  console.log(`STAGE 27 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
