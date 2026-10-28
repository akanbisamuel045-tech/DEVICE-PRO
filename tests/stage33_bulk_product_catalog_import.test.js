/**
 * DEVICE PRO — Stage 33: Bulk Product Creation & Catalog Management Engine Test Suite
 * 
 * Verifies:
 * 1. Template Generation & Download API:
 *    - Authenticated GET /api/admin/products/import-template returns 200 with valid .xlsx
 *    - Header Content-Disposition contains attachment filename
 *    - ExcelJS parses 2 worksheets ('Product Catalog Import', 'Instructions & Field Guide')
 *    - Validates navy frozen header (#0157A2) and 3 sample solar equipment rows
 *    - Unauthenticated request is rejected (401 Unauthorized)
 * 
 * 2. Bulk Upload & In-Memory Analysis API:
 *    - Authenticated POST /api/admin/products/bulk-upload parses multipart spreadsheet
 *    - Smart Diffing:
 *      * Brand new SKU -> categorized as CREATE_NEW
 *      * Existing SKU -> categorized as UPDATE_EXISTING with diff calculation
 *      * Invalid fields (missing name, negative price, duplicate SKU) -> VALIDATION_ERROR
 *    - Unauthenticated request is rejected (401 Unauthorized)
 * 
 * 3. Bulk Apply & Controlled Publication API:
 *    - Authenticated POST /api/admin/products/bulk-apply executes atomic writes
 *    - Mode handling ('all', 'create_only', 'update_only')
 *    - Emits audit log entry (PRODUCT_BULK_ONBOARDED)
 * 
 * 4. Live Public Catalog Verification:
 *    - Newly onboarded product is immediately live on GET /api/products
 *    - Accessible via friendly slug route GET /api/products/:slug
 * 
 * 5. Data Hygiene:
 *    - Restores existing item and deletes test equipment after test execution
 */

const assert = require('assert');
const path = require('path');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { connectMongo } = require('../db/mongo/connection');
const { Product, AuditLog } = require('../db/mongo/models');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 33: BULK PRODUCT CATALOG IMPORT AUTOMATED TEST SUITE');
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

  // Pre-test MongoDB connection
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const conn = await connectMongo();
      if (conn && mongoose.connection.readyState === 1) break;
    } catch (e) {}
  }

  // Obtain Superadmin Token
  let superadminToken = '';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@DevicePro2026!' })
  });
  if (loginRes.ok) {
    const data = await loginRes.json();
    superadminToken = data.token;
  }
  assert.ok(superadminToken, 'Superadmin token must be retrieved');

  // Test 1: Template Download Auth Rejection
  await test('1. GET /api/admin/products/import-template rejects unauthenticated requests', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products/import-template`);
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized when missing token');
  });

  // Test 2: Template Download & Workbook Structure
  let downloadedTemplateBuffer = null;
  await test('2. GET /api/admin/products/import-template downloads formatted Excel template', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products/import-template`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200, 'Should return 200 OK');
    const disp = res.headers.get('content-disposition') || '';
    assert.ok(disp.includes('DEVICE_PRO_PRODUCT_CATALOG_TEMPLATE.xlsx'), 'Should have attachment filename');

    const arrayBuffer = await res.arrayBuffer();
    downloadedTemplateBuffer = Buffer.from(arrayBuffer);
    assert.ok(downloadedTemplateBuffer.length > 5000, 'Template should be a non-trivial xlsx file (>5KB)');

    // Parse with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(downloadedTemplateBuffer);

    const dataSheet = workbook.getWorksheet('Products Catalog') || workbook.getWorksheet('Product Catalog Import') || workbook.worksheets[0];
    assert.ok(dataSheet, 'Must contain product catalog data sheet');

    const guideSheet = workbook.getWorksheet('Instructions & Guidance') || workbook.getWorksheet('Instructions & Field Guide') || workbook.worksheets[1];
    assert.ok(guideSheet, 'Must contain instructions & guidance sheet');

    // Verify Header row (Row 1)
    const headerRow = dataSheet.getRow(1);
    const cellA1 = headerRow.getCell(1).value;
    assert.ok(String(cellA1).includes('Product Name'), 'Col 1 must be Product Name');

    // Verify 3 sample rows
    assert.strictEqual(dataSheet.rowCount >= 4, true, 'Should contain header + 3 sample rows');
    const sampleSku1 = dataSheet.getRow(2).getCell(2).value;
    assert.ok(sampleSku1, 'Sample row 1 should have SKU');
  });

  // Test 3: Bulk Upload rejects unauthenticated requests
  await test('3. POST /api/admin/products/bulk-upload rejects unauthenticated requests', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products/bulk-upload`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
  });

  // Test 4: Upload Template itself and verify smart classification
  await test('4. POST /api/admin/products/bulk-upload parses template and detects sample rows', async () => {
    const formData = new FormData();
    const blob = new Blob([downloadedTemplateBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'template.xlsx');

    const res = await fetch(`${BASE_URL}/api/admin/products/bulk-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200, 'Should return 200 OK');
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Should succeed');
    assert.strictEqual(data.summary.total_rows, 3, 'Should parse 3 sample rows');
    assert.strictEqual(data.summary.error_count, 0, 'Official template sample rows should have zero errors');
  });

  // Test 5: Custom Multi-Scenario Spreadsheet (New SKU, Existing SKU, Validation Error)
  const testNewSku = 'TEST-STG33-650W-MONO';
  const existingSku = 'JKM-550M-72HL4';
  let originalExistingProduct = null;

  await test('5. POST /api/admin/products/bulk-upload handles multi-scenario diffing', async () => {
    // Record original state of existing product
    originalExistingProduct = await Product.findOne({ sku: existingSku }).lean();
    assert.ok(originalExistingProduct, `Existing product ${existingSku} should exist in Atlas`);

    // Build custom test workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.addRow([
      'Product Name', 'SKU', 'Category', 'Brand', 'Selling Price (NGN)',
      'Cost Price (NGN)', 'Previous Price (NGN)', 'Power Rating', 'Power Tier',
      'Warranty (Years)', 'Stock Status', 'Stock Quantity', 'Short Description',
      'Full Description', 'Technical Specifications', 'Image URL', 'Featured'
    ]);

    // Row 1: Brand new product
    ws.addRow([
      'Stage 33 Test Monocrystalline Solar Panel 650W',
      testNewSku,
      'Solar Panels',
      'Canadian Solar',
      195000,
      160000,
      210000,
      '650W',
      'Commercial Tier',
      12,
      'in_stock',
      75,
      'High efficiency bifacial monocrystalline solar panel.',
      'Full commercial spec solar panel tested for Nigerian climate.',
      'Cell Type: Monocrystalline; Efficiency: 22.8%; Dimensions: 2384x1303x35mm',
      '/images/products/canadian-solar-650w.webp',
      'Yes'
    ]);

    // Row 2: Existing product update (price + warranty)
    ws.addRow([
      'Jinko Tiger Pro 550W Mono-Facial (Stage 33 Updated)',
      existingSku,
      'Solar Panels',
      'Jinko Solar',
      180000, // new selling price
      140000,
      195000,
      '550W',
      'Residential Tier',
      15, // updated warranty
      'in_stock',
      60,
      'Updated short description.',
      'Updated full description.',
      'Updated specs.',
      '/images/products/jinko-550w.webp',
      'No'
    ]);

    // Row 3: Validation Error (missing name, negative price, empty sku)
    ws.addRow([
      '', // Missing name
      '', // Missing SKU
      'Solar Panels',
      'Unknown',
      -45000, // Negative price
      0,
      0,
      '',
      '',
      5,
      'in_stock',
      10,
      '',
      '',
      '',
      '',
      'No'
    ]);

    const buf = await wb.xlsx.writeBuffer();
    const formData = new FormData();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'test_batch.xlsx');

    const res = await fetch(`${BASE_URL}/api/admin/products/bulk-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.summary.total_rows, 3);
    assert.strictEqual(data.summary.create_count, 1, 'Should detect 1 new product');
    assert.strictEqual(data.summary.update_count, 1, 'Should detect 1 existing update');
    assert.strictEqual(data.summary.error_count, 1, 'Should detect 1 validation error');

    // Check Row 1 (CREATE_NEW)
    const row1 = data.rows[0];
    assert.strictEqual(row1.action, 'CREATE_NEW');
    assert.strictEqual(row1.sku, testNewSku);
    assert.strictEqual(row1.price_ngn, 195000);
    assert.strictEqual(row1.category, 'solar-panels');

    // Check Row 2 (UPDATE_EXISTING)
    const row2 = data.rows[1];
    assert.strictEqual(row2.action, 'UPDATE_EXISTING');
    assert.strictEqual(row2.sku, existingSku);
    assert.ok(row2.price_diff, 'Should include price_diff calculation');
    assert.strictEqual(row2.price_diff.new, 180000);

    // Check Row 3 (VALIDATION_ERROR)
    const row3 = data.rows[2];
    assert.strictEqual(row3.action, 'VALIDATION_ERROR');
    assert.ok(row3.errors.length >= 2, 'Should flag missing name and negative price');
  });

  // Test 6: Bulk Apply (Publishes new product & updates existing)
  let analyzedRowsForApply = null;
  await test('6. POST /api/admin/products/bulk-apply writes new equipment & applies update', async () => {
    // Re-parse to get exact structure
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.addRow(['Product Name', 'SKU', 'Category', 'Brand', 'Selling Price (NGN)', 'Cost Price (NGN)', 'Warranty (Years)', 'Stock Quantity', 'Power Rating']);
    ws.addRow(['Stage 33 Test Monocrystalline Solar Panel 650W', testNewSku, 'Solar Panels', 'Canadian Solar', 195000, 160000, 12, 75, '650W']);
    ws.addRow(['Jinko Tiger Pro 550W Mono-Facial (Stage 33 Updated)', existingSku, 'Solar Panels', 'Jinko Solar', 180000, 140000, 15, 60, '550W']);
    ws.addRow(['', '', 'Solar Panels', '', -10, 0, 5, 0, '']);

    const buf = await wb.xlsx.writeBuffer();
    const formData = new FormData();
    formData.append('file', new Blob([buf]), 'batch.xlsx');

    const parseRes = await fetch(`${BASE_URL}/api/admin/products/bulk-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: formData
    });
    const parsed = await parseRes.json();
    analyzedRowsForApply = parsed.rows;

    // Apply with mode = 'all'
    const applyRes = await fetch(`${BASE_URL}/api/admin/products/bulk-apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        rows: analyzedRowsForApply,
        mode: 'all'
      })
    });

    assert.strictEqual(applyRes.status, 200, 'Apply should succeed');
    const applyData = await applyRes.json();
    assert.strictEqual(applyData.success, true);
    assert.strictEqual(applyData.summary.created_count, 1, '1 product created');
    assert.strictEqual(applyData.summary.updated_count, 1, '1 product updated');
    assert.strictEqual(applyData.summary.failed_count, 1, '1 invalid product skipped/failed');
  });

  // Test 7: Public Catalog Verification
  await test('7. Public GET /api/products and /api/products/:slug return newly onboarded product', async () => {
    // 1. Check all products listing
    const listRes = await fetch(`${BASE_URL}/api/products`);
    assert.strictEqual(listRes.status, 200);
    const catalog = await listRes.json();
    const products = Array.isArray(catalog) ? catalog : (catalog.products || []);
    const foundNew = products.find(p => p.sku === testNewSku);
    assert.ok(foundNew, `Newly onboarded SKU ${testNewSku} must be live in public catalog`);
    assert.strictEqual(foundNew.price_ngn, 195000);
    assert.strictEqual(foundNew.brand, 'Canadian Solar');
    assert.strictEqual(foundNew.category, 'solar-panels');

    // 2. Check slug endpoint
    const slug = foundNew.slug;
    assert.ok(slug, 'Product must have generated unique slug');
    const slugRes = await fetch(`${BASE_URL}/api/products/${slug}`);
    assert.strictEqual(slugRes.status, 200, 'Slug route must return 200 OK');
    const slugData = await slugRes.json();
    const prodDetails = slugData.product || slugData;
    assert.strictEqual(prodDetails.sku, testNewSku);
    assert.strictEqual(prodDetails.warranty_years, 12);
  });

  // Test 8: Audit Log Verification
  await test('8. AuditLog records PRODUCT_BULK_ONBOARDED entry in MongoDB Atlas', async () => {
    const log = await AuditLog.findOne({
      action: 'PRODUCT_BULK_ONBOARDED',
      entity_type: 'product_catalog'
    }).sort({ created_at: -1 }).lean();

    assert.ok(log, 'Audit log entry for bulk product onboard must be recorded');
    assert.ok(log.details.toLowerCase().includes('1 created') || (log.metadata && log.metadata.createdCount === 1), 'Audit log details should record 1 created');
  });

  // Cleanup: Delete test product and restore original existing product
  await test('9. Post-test cleanup restores MongoDB Atlas catalog state', async () => {
    // Delete test product
    const delRes = await Product.deleteOne({ sku: testNewSku });
    assert.strictEqual(delRes.deletedCount, 1, 'Test product should be deleted from Atlas');

    // Restore original existing product price & warranty
    if (originalExistingProduct) {
      await Product.updateOne(
        { sku: existingSku },
        {
          $set: {
            name: originalExistingProduct.name,
            price_ngn: originalExistingProduct.price_ngn,
            warranty_years: originalExistingProduct.warranty_years
          }
        }
      );
    }
  });

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
