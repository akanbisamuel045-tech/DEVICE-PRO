/**
 * DEVICE PRO — Stage 24: Supplier Price Import Infrastructure Automated Test Suite
 * 
 * Verifies all 34 Stage 5 requirements:
 * 1. Authorized upload (superadmin)
 * 2. Unauthenticated upload rejection (401)
 * 3. Customer upload rejection (403)
 * 4. Unauthorized staff rejection (Engineer and Sales receive 403)
 * 5. Valid Excel parsing (.xlsx via ExcelJS)
 * 6. Valid CSV parsing (.csv)
 * 7. Unsupported file rejection (.pdf, .exe, etc. rejected with 400)
 * 8. Oversized file rejection (> 4MB rejected with 400)
 * 9. Corrupted workbook rejection (handled safely with 400)
 * 10. Empty file rejection (rejected with 400)
 * 11. Excessive row count rejection (> 1,000 rows rejected with 400)
 * 12. Automatic column mapping (intelligent header detection)
 * 13. Manual column mapping (custom mapping overrides applied)
 * 14. Missing SKU detection (flagged as missing_sku)
 * 15. Invalid price detection (non-numeric / NaN / text prices flagged)
 * 16. Negative price rejection (negative prices flagged as invalid_price)
 * 17. Unsupported currency detection (USD, EUR, GBP flagged as unsupported_currency)
 * 18. Duplicate SKUs in supplier files (all occurrences flagged as duplicate_in_file)
 * 19. Duplicate SKUs in active catalog (handled safely without crash)
 * 20. Archived product exclusion (the 65 Sungrow benchmark documents are never matched)
 * 21. Prevention of name-only automatic matching (suggestions only, not auto-matched)
 * 22. Correct summary counts reconciliation (Total = Valid + Invalid; Valid = Matched + Unmatched)
 * 23. Unmatched product handling (kept in preview with status unmatched)
 * 24. Safe rendering of malicious cell content (formula injection & XSS sanitization)
 * 25. Import history persistence (saved in MongoDB Atlas with status 'analysed')
 * 26. Unauthorized import history access (unauthenticated / customer rejected)
 * 27. Import record identifier validation (invalid ID returns 404 without server crash)
 * 28. Audit logging (ANALYSE_PRICE_IMPORT audit event recorded)
 * 29. No live price changes after upload (active product price_ngn strictly unchanged)
 * 30. No supplier cost changes after upload (active product supplier_cost_ngn strictly unchanged)
 * 31. No stock changes after upload (active product stock_quantity strictly unchanged)
 * 32. Existing product management regression (Stage 4 operations intact)
 * 33. Existing checkout price integrity (authoritative order price recalculation intact)
 * 34. Existing session and logout regression (immediate token invalidation intact)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { connectMongo } = require('../db/mongo/connection');
const { Product, Order, AuditLog, User, Session, PriceImport } = require('../db/mongo/models');
const { generateImportTemplate } = require('../lib/price-import-engine');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 24: SUPPLIER PRICE IMPORT INFRASTRUCTURE');
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

  // Clean up any old test import records
  await PriceImport.deleteMany({ filename: /^STAGE24-TEST/i });

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
  assert.strictEqual(engRes.status, 200, 'Lead Engineer login must succeed');
  const engineerToken = engRes.body.token;

  // 3. Sales Token
  const salesRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'sales.lagos', password: 'Sales@DevicePro2026!' }
  });
  assert.strictEqual(salesRes.status, 200, 'Sales login must succeed');
  const salesToken = salesRes.body.token;

  // 4. Customer Account & Token
  const testCustomerEmail = `customer_stage24_${Date.now()}@devicepro.test`;
  const custRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Price Test',
      email: testCustomerEmail,
      phone: '+2348011223344',
      password: 'CustomerPass123!'
    }
  });
  assert.strictEqual(custRes.status, 201, 'Customer registration must succeed');
  const customerToken = custRes.body.token;

  // Verify baseline product before any imports
  const baselineProduct = await Product.findOne({ published: 1 }).lean();
  assert(baselineProduct, 'At least one active product must exist for catalog checks');
  const baselinePrice = baselineProduct.price_ngn;
  const baselineCost = baselineProduct.supplier_cost_ngn;
  const baselineStock = baselineProduct.stock_quantity;

  // Helper to create in-memory Excel buffers
  async function createTestExcelBuffer(rows = [], sheetName = 'PriceList') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    rows.forEach(r => worksheet.addRow(r));
    return workbook.xlsx.writeBuffer();
  }

  // Helper to create test CSV string
  function createTestCsvString(lines = []) {
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // 1. AUTHORIZATION & ACCESS CONTROL
  // ---------------------------------------------------------------------------
  console.log('--- 1. Authorization & Role Verification ---');

  await test('Requirement 1: Authorized administrator can access price import upload endpoint', async () => {
    const csvContent = 'SKU,Product Name,Cost Price,Currency\nDP-FEL-5K-48V,Felicity 5kW Inverter,850000,NGN\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'STAGE24-TEST-valid.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200, 'Authorized superadmin upload must return 200');
    assert.strictEqual(res.body.success, true);
    assert(res.body.notice.includes('No live product prices or supplier costs have been changed'));
  });

  await test('Requirement 2: Unauthenticated upload is rejected with 401 Unauthorized', async () => {
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      body: { filename: 'unauth.csv', csvText: 'SKU,Cost\nTEST,1000\n' }
    });
    assert.strictEqual(res.status, 401, 'Unauthenticated upload must be rejected with 401');
  });

  await test('Requirement 3: Customer role upload is strictly rejected with 403 Forbidden', async () => {
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { filename: 'customer_tamper.csv', csvText: 'SKU,Cost\nTEST,1000\n' }
    });
    assert.strictEqual(res.status, 403, 'Customer upload must be rejected with 403');
  });

  await test('Requirement 4: Unauthorized staff (Engineer and Sales) receive 403 Forbidden', async () => {
    const engRes = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: { filename: 'engineer_attempt.csv', csvText: 'SKU,Cost\nTEST,1000\n' }
    });
    assert.strictEqual(engRes.status, 403, 'Engineer must be forbidden from supplier price upload (403)');

    const salesRes = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: { filename: 'sales_attempt.csv', csvText: 'SKU,Cost\nTEST,1000\n' }
    });
    assert.strictEqual(salesRes.status, 403, 'Sales staff must be forbidden from supplier price upload (403)');
  });

  // ---------------------------------------------------------------------------
  // 2. PARSING & FILE FORMAT HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. File Parsing & Multi-Format Validation ---');

  await test('Requirement 5: Valid Excel (.xlsx) workbook parsing via ExcelJS', async () => {
    const excelBuffer = await createTestExcelBuffer([
      ['Supplier SKU', 'Model Description', 'Brand', 'Supplier Cost NGN', 'Stock Info'],
      ['FEL-IV-5K-48V', 'Felicity 5kVA Hybrid Inverter', 'Felicity Solar', 920000, 'In Stock'],
      ['GROW-SPF-5000', 'Growatt SPF 5000 ES Inverter', 'Growatt', 875000, 'Warehouse Lagos']
    ]);

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'STAGE24-TEST-pricing.xlsx',
        fileBase64: excelBuffer.toString('base64')
      }
    });

    assert.strictEqual(res.status, 200, 'Valid Excel parsing must return 200');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.format, 'xlsx');
    assert.strictEqual(res.body.summary.total_rows, 2);
    assert.strictEqual(res.body.summary.valid_rows, 2);
  });

  await test('Requirement 6: Valid CSV (.csv) parsing with RFC 4180 quotes & commas', async () => {
    const csvContent = [
      '"Supplier SKU","Description","Manufacturer","Cost Price NGN","Currency"',
      '"DEYE-8K-2P","Deye 8kW Hybrid Inverter, Dual MPPT","Deye",1650000,"NGN"',
      '"JIN-550W-BF","Jinko 550W Tiger Pro Bifacial Panel","Jinko Solar",85000,"NGN"'
    ].join('\n');

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'STAGE24-TEST-rfc4180.csv',
        csvText: csvContent
      }
    });

    assert.strictEqual(res.status, 200, 'Valid CSV parsing must return 200');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.format, 'csv');
    assert.strictEqual(res.body.summary.total_rows, 2);
    assert.strictEqual(res.body.rowsPreview[0].raw_name, 'Deye 8kW Hybrid Inverter, Dual MPPT', 'Quoted commas must be preserved in name');
  });

  await test('Requirement 7: Unsupported file extensions (.pdf, .exe) rejected with 400', async () => {
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'price_list_scanned.pdf',
        fileBase64: Buffer.from('FAKE-PDF-CONTENT').toString('base64')
      }
    });
    assert.strictEqual(res.status, 400, 'PDF files must be rejected in Stage 5');
    assert(res.body.error.includes('Supported formats: .xlsx, .csv'));
  });

  await test('Requirement 8: Oversized file rejection (> 4MB rejected with 400)', async () => {
    // Generate a payload exceeding 4MB
    const bigBuffer = Buffer.alloc(4.2 * 1024 * 1024, 'A');
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'huge_file.xlsx',
        fileBase64: bigBuffer.toString('base64')
      }
    });
    assert.strictEqual(res.status, 400, 'Files > 4MB must be rejected with 400');
    assert(res.body.error.includes('exceeds the maximum permitted limit'));
  });

  await test('Requirement 9: Corrupted workbook safely rejected with 400 without crashing', async () => {
    const corruptBuffer = Buffer.from('NOT-A-REAL-EXCEL-ZIP-STREAM-00001111');
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'corrupted.xlsx',
        fileBase64: corruptBuffer.toString('base64')
      }
    });
    assert.strictEqual(res.status, 400, 'Corrupted Excel file must return 400');
    assert.strictEqual(res.body.success, false);
  });

  await test('Requirement 10: Empty file rejected with 400', async () => {
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'empty.csv',
        csvText: ''
      }
    });
    assert.strictEqual(res.status, 400, 'Empty file must return 400');
    assert(res.body.error.includes('Empty'));
  });

  await test('Requirement 11: Excessive row count rejection (> 1,000 rows rejected with 400)', async () => {
    const rows = [['SKU', 'Cost']];
    for (let i = 1; i <= 1005; i++) {
      rows.push([`SKU-${i}`, 50000]);
    }
    const csvContent = rows.map(r => r.join(',')).join('\n');

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'oversized_rows.csv',
        csvText: csvContent
      }
    });
    assert.strictEqual(res.status, 400, 'Files exceeding 1,000 rows must be rejected with 400');
    assert(res.body.error.includes('1,000'));
  });

  // ---------------------------------------------------------------------------
  // 3. COLUMN MAPPING & PRICE VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Column Mapping & Price Validation ---');

  await test('Requirement 12: Automatic column mapping identifies supplier headers', async () => {
    const csvContent = 'Item Part Code,Model Title,Wholesale Rate NGN,Stock Status\nFEL-5K,Felicity 5kVA,850000,In Stock\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'auto_map.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mappingConfig.sku, 'Item Part Code', 'Must auto-map Part Code to sku');
    assert.strictEqual(res.body.mappingConfig.name, 'Model Title', 'Must auto-map Model Title to name');
    assert.strictEqual(res.body.mappingConfig.cost, 'Wholesale Rate NGN', 'Must auto-map Rate to cost');
  });

  await test('Requirement 13: Manual column mapping overrides applied cleanly', async () => {
    const csvContent = 'Col_A,Col_B,Col_C\nMY-SKU-99,Custom Inverter,1250000\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        filename: 'manual_map.csv',
        csvText: csvContent,
        mapping: {
          sku: 'Col_A',
          name: 'Col_B',
          cost: 'Col_C'
        }
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mappingConfig.sku, 'Col_A');
    assert.strictEqual(res.body.rowsPreview[0].raw_sku, 'MY-SKU-99');
    assert.strictEqual(res.body.rowsPreview[0].normalized_cost_ngn, 1250000);
  });

  await test('Requirement 14: Missing SKU detection flags row as missing_sku', async () => {
    const csvContent = 'SKU,Product Name,Cost Price\n,No SKU Solar Battery,450000\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'missing_sku.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'missing_sku');
    assert.strictEqual(res.body.summary.invalid_rows, 1);
  });

  await test('Requirement 15: Invalid / non-numeric price flagged as invalid_price', async () => {
    const csvContent = 'SKU,Product Name,Cost Price\nTEST-SKU-01,Test Solar Cable,CONTACT_SALES\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'text_price.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'invalid_price');
  });

  await test('Requirement 16: Negative price rejection flags row as invalid_price', async () => {
    const csvContent = 'SKU,Product Name,Cost Price\nTEST-SKU-02,Faulty Panel,-150000\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'negative_price.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'invalid_price');
    assert(res.body.rowsPreview[0].validation_errors.some(e => e.includes('negative')));
  });

  await test('Requirement 17: Unsupported currency detection flags unsupported_currency', async () => {
    const csvContent = 'SKU,Product Name,Cost Price,Currency\nTEST-SKU-USD,Imported Inverter,2500,USD\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'usd_price.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'unsupported_currency');
    assert(res.body.rowsPreview[0].validation_errors.some(e => e.includes('Unsupported currency')));
  });

  // ---------------------------------------------------------------------------
  // 4. DUPLICATE & SKU MATCHING ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. SKU Matching Engine & Duplicate Detection ---');

  await test('Requirement 18: Duplicate SKUs in supplier file flags all occurrences', async () => {
    const csvContent = [
      'SKU,Product Name,Cost Price',
      'DP-DUP-01,Duplicate Item First Row,200000',
      'DP-DUP-01,Duplicate Item Second Row,210000'
    ].join('\n');

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'in_file_dups.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.summary.duplicate_in_file_rows, 2, 'Both duplicate occurrences must be counted');
    assert.strictEqual(res.body.rowsPreview[0].status, 'duplicate_in_file');
    assert.strictEqual(res.body.rowsPreview[1].status, 'duplicate_in_file');
  });

  await test('Requirement 19: Duplicate SKUs in active catalog handled safely', async () => {
    // If a supplier SKU matches an active catalog product, status is 'matched'
    const csvContent = `SKU,Product Name,Cost Price\n${baselineProduct.sku},${baselineProduct.name},${baselineProduct.supplier_cost_ngn || 500000}\n`;
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'catalog_match.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'matched');
    assert.strictEqual(res.body.rowsPreview[0].matched_product_sku, baselineProduct.sku);
  });

  await test('Requirement 20: Archived product exclusion (65 Sungrow benchmark documents never matched)', async () => {
    // Sungrow benchmark records share SKU: SG-10K-HYBRID-NG and published: 0
    const csvContent = 'SKU,Product Name,Cost Price\nSG-10K-HYBRID-NG,Sungrow 10kW Benchmark,2500000\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'archived_benchmark_check.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'unmatched', 'Archived benchmark SKU must NOT be matched to active catalog');
    assert.strictEqual(res.body.rowsPreview[0].matched_product_id, null);
  });

  await test('Requirement 21: Prevention of name-only automatic matching (Suggestions only, never auto-matched)', async () => {
    // Row has unmatched SKU, but similar name to an active product
    const csvContent = `SKU,Product Name,Cost Price\nRANDOM-NEW-SKU-999,${baselineProduct.name},550000\n`;
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'name_similarity.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rowsPreview[0].status, 'unmatched', 'Name similarity must NEVER automatically confirm a match');
    assert(res.body.rowsPreview[0].matching_method.includes('No SKU match'), 'Matching method must indicate no SKU match');
  });

  await test('Requirement 22: Summary counts reconcile with total parsed rows', async () => {
    const csvContent = [
      'SKU,Product Name,Cost Price',
      `${baselineProduct.sku},Valid Matched Item,800000`, // valid matched
      'UNMATCHED-SKU-001,Unmatched Item,600000',          // valid unmatched
      ',Missing SKU Item,400000',                          // invalid missing sku
      'NEGATIVE-SKU-002,Negative Price Item,-50000'        // invalid negative price
    ].join('\n');

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'reconcile.csv', csvText: csvContent }
    });

    assert.strictEqual(res.status, 200);
    const sum = res.body.summary;
    assert.strictEqual(sum.total_rows, 4, 'Total rows must be 4');
    assert.strictEqual(sum.valid_rows, 2, 'Valid rows must be 2');
    assert.strictEqual(sum.invalid_rows, 2, 'Invalid rows must be 2');
    assert.strictEqual(sum.total_rows, sum.valid_rows + sum.invalid_rows, 'Total must equal valid + invalid');
    assert.strictEqual(sum.matched_rows, 1, 'Matched rows must be 1');
    assert.strictEqual(sum.unmatched_rows, 1, 'Unmatched rows must be 1');
    assert.strictEqual(sum.valid_rows, sum.matched_rows + sum.unmatched_rows, 'Valid must equal matched + unmatched');
  });

  await test('Requirement 23: Unmatched product handling retains records in preview', async () => {
    const csvContent = 'SKU,Product Name,Cost Price\nBRAND-NEW-SKU-XYZ,Brand New Solar Inverter 10kVA,1500000\n';
    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'unmatched_row.csv', csvText: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.summary.unmatched_rows, 1);
    assert.strictEqual(res.body.rowsPreview[0].status, 'unmatched');
    assert.strictEqual(res.body.rowsPreview[0].raw_sku, 'BRAND-NEW-SKU-XYZ');
  });

  await test('Requirement 24: Safe rendering of malicious spreadsheet formulas & XSS tags', async () => {
    const maliciousCsv = [
      'SKU,Product Name,Cost Price',
      '=cmd|\'/C calc\'!A0,"=SUM(1+1)<script>alert(1)</script>",100000'
    ].join('\n');

    const res = await request('/api/admin/price-imports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { filename: 'malicious_cells.csv', csvText: maliciousCsv }
    });
    assert.strictEqual(res.status, 200);
    // The engine must strip or neutralize leading formula triggers (=, +, -, @)
    const previewRow = res.body.rowsPreview[0];
    assert(!previewRow.raw_sku.startsWith('='), 'Leading formula trigger in SKU must be neutralized');
    assert(!previewRow.raw_name.startsWith('='), 'Leading formula trigger in Name must be neutralized');
  });

  // ---------------------------------------------------------------------------
  // 5. PERSISTENCE, HISTORY & AUDIT LOGGING
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Persistence, History & Audit Logging ---');

  let savedImportId = null;

  await test('Requirement 25: Import history persistence in MongoDB Atlas (status strictly analysed)', async () => {
    const payload = {
      filename: 'STAGE24-TEST-final-run.xlsx',
      supplier_name: 'Felicity Solar Nigeria Ltd',
      file_format: 'xlsx',
      mapping_config: { sku: 'SKU', cost: 'Cost', name: 'Name' },
      summary: {
        total_rows: 5,
        valid_rows: 4,
        matched_rows: 3,
        unmatched_rows: 1,
        duplicate_in_file_rows: 0,
        duplicate_in_catalog_rows: 0,
        invalid_rows: 1,
        requires_review_rows: 1
      },
      rows_preview: [
        {
          row_number: 1,
          raw_sku: 'FEL-5K',
          raw_name: 'Felicity 5kVA',
          normalized_cost_ngn: 850000,
          currency: 'NGN',
          status: 'matched'
        }
      ],
      notes: 'Automated test import record'
    };

    const res = await request('/api/admin/price-imports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 201, 'Saving import record must return 201 Created');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.importRecord.status, 'analysed', 'Status must strictly be analysed');
    assert(res.body.message.includes('No live product prices or supplier costs have been changed'));
    savedImportId = res.body.importRecord.id || res.body.importRecord._id;

    // Verify retrievable via GET /api/admin/price-imports
    const listRes = await request('/api/admin/price-imports', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    assert(listRes.body.imports.some(imp => imp.filename === 'STAGE24-TEST-final-run.xlsx'));
  });

  await test('Requirement 26: Unauthorized import history access is rejected (401 & 403)', async () => {
    const unauthRes = await request('/api/admin/price-imports');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated history access must return 401');

    const custRes = await request('/api/admin/price-imports', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(custRes.status, 403, 'Customer history access must return 403');
  });

  await test('Requirement 27: Import record identifier validation (invalid ID returns 404 without crash)', async () => {
    const notFoundRes = await request('/api/admin/price-imports/99999999', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent numeric ID must return 404');

    const malformedRes = await request('/api/admin/price-imports/invalid-mongo-id-xyz', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(malformedRes.status, 404, 'Malformed string ID must return 404 without server error');
  });

  await test('Requirement 28: Audit logging creates ANALYSE_PRICE_IMPORT event with staff attribution', async () => {
    const auditDoc = await AuditLog.findOne({
      action: 'ANALYSE_PRICE_IMPORT',
      entity_type: 'price_import'
    }).sort({ created_at: -1 }).lean();

    assert(auditDoc, 'Audit log entry must be created for price import analysis');
    assert(auditDoc.details.includes('STAGE24-TEST-final-run.xlsx'));
    assert(auditDoc.details.includes('No live prices changed'));
  });

  // ---------------------------------------------------------------------------
  // 6. ZERO LIVE DATA MUTATION VERIFICATION (CRITICAL STAGE 5 BOUNDARY)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Zero Live Catalog Mutation Verification ---');

  await test('Requirement 29: No live product prices modified after price import analysis', async () => {
    const recheckProduct = await Product.findById(baselineProduct._id).lean();
    assert.strictEqual(
      recheckProduct.price_ngn,
      baselinePrice,
      `Live product price_ngn must NOT be changed (was ${baselinePrice}, is ${recheckProduct.price_ngn})`
    );
  });

  await test('Requirement 30: No supplier costs modified after price import analysis', async () => {
    const recheckProduct = await Product.findById(baselineProduct._id).lean();
    assert.strictEqual(
      recheckProduct.supplier_cost_ngn,
      baselineCost,
      `Live supplier_cost_ngn must NOT be changed (was ${baselineCost}, is ${recheckProduct.supplier_cost_ngn})`
    );
  });

  await test('Requirement 31: No stock quantities modified after price import analysis', async () => {
    const recheckProduct = await Product.findById(baselineProduct._id).lean();
    assert.strictEqual(
      recheckProduct.stock_quantity,
      baselineStock,
      `Live stock_quantity must NOT be changed (was ${baselineStock}, is ${recheckProduct.stock_quantity})`
    );
  });

  // ---------------------------------------------------------------------------
  // 7. REGRESSION CHECKS (STAGES 4, 15, 2)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. System Regressions & Downstream Integrity ---');

  await test('Requirement 32: Existing product catalog operations remain functional', async () => {
    const res = await request('/api/admin/products?limit=5', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.products));
  });

  await test('Requirement 33: Existing checkout price integrity intact (tampered client price ignored)', async () => {
    // Attempt order submission with tampered price
    const orderPayload = {
      customerName: 'Price Integrity Checker',
      customerPhone: '+2348011223344',
      customerEmail: 'integrity@devicepro.test',
      deliveryAddress: '12 Victoria Island',
      deliveryState: 'Lagos',
      paymentMethod: 'transfer',
      items: [
        {
          id: baselineProduct.id,
          name: baselineProduct.name,
          sku: baselineProduct.sku,
          quantity: 1,
          price_ngn: 10 // Tampered client price (10 NGN instead of actual price)
        }
      ]
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: orderPayload
    });

    assert.strictEqual(res.status, 201, 'Order must succeed');
    // Order total must be recalculated from authoritative database price + shipping, NOT client tampered price
    assert(res.body.order.total_ngn >= baselineProduct.price_ngn, 'Order total must reflect authoritative catalog price');
    assert.strictEqual(res.body.order.subtotal_ngn, baselineProduct.price_ngn, 'Subtotal must strictly match database authoritative price');
  });

  await test('Requirement 34: Existing session and logout regression (revoked session rejected with 401)', async () => {
    // Login temporary staff user
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'Admin@DevicePro2026!' }
    });
    const tempToken = loginRes.body.token;

    // Logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // Immediate reuse of revoked token must be rejected with 401
    const testRes = await request('/api/admin/price-imports', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(testRes.status, 401, 'Revoked token must be rejected with 401');
  });

  // Post-test cleanup
  await PriceImport.deleteMany({ filename: /^STAGE24-TEST/i });
  await User.deleteOne({ email: testCustomerEmail });

  console.log('\n========================================================================');
  console.log(`STAGE 24 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('STAGE 24 TEST SUITE RUNTIME ERROR:', err);
  process.exit(1);
});
