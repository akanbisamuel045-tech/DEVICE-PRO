/**
 * DEVICE PRO — STAGE 30.1: PROCUREMENT OUTREACH PREPARATION TEST SUITE (Stage 8.4.2.1)
 *
 * Verifies all Stage 8.4.2.1 requirements:
 * 1. Approved quotation template integrity, cell protection, and non-fabrication.
 * 2. Distributor research shortlist completeness, source citations, and status classification.
 * 3. Outreach email draft governance, mandatory terms, and non-award disclosures.
 * 4. Quotation review checklist prohibitions (no automated lowest-bid selection, two-person rule).
 * 5. Database invariance (zero supplier cost mutations, zero retail price changes, record preservation).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { connectMongo, closeMongo } = require('../db/mongo/connection');
const { Product, PackageBom, Order, User, Quote, Enquiry } = require('../db/mongo/models');

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 30.1: STAGE 8.4.2.1 PROCUREMENT OUTREACH TEST SUITE');
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

  try {
    // ---------------------------------------------------------------------------
    // 1. APPROVED QUOTATION TEMPLATE INTEGRITY & CELL PROTECTION
    // ---------------------------------------------------------------------------
    console.log('--- 1. Quotation Template Integrity & Cell Protection ---');

    await test('1.1: Excel workbook exists, has 2 sheets, and contains cell protection', async () => {
      const xlsxPath = path.join(__dirname, '..', 'templates', 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx');
      assert.strictEqual(fs.existsSync(xlsxPath), true, 'Excel template must exist in templates/');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(xlsxPath);

      assert.strictEqual(workbook.worksheets.length, 2, 'Workbook must contain exactly 2 worksheets');
      const matrixSheet = workbook.getWorksheet('Quotation Matrix');
      const instrSheet = workbook.getWorksheet('Instructions & Guidelines');

      assert.ok(matrixSheet, 'Must contain "Quotation Matrix" sheet');
      assert.ok(instrSheet, 'Must contain "Instructions & Guidelines" sheet');
      assert.ok(matrixSheet.sheetProtection, 'Sheet protection configuration must exist');
      assert.strictEqual(matrixSheet.sheetProtection.sheet, true, 'Sheet protection must be active');
    });

    await test('1.2: Excel matrix contains exactly 48 active commercial products and 0 benchmark items', async () => {
      const xlsxPath = path.join(__dirname, '..', 'templates', 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(xlsxPath);
      const ws = workbook.getWorksheet('Quotation Matrix');

      assert.strictEqual(ws.rowCount, 50, 'Row count must be 50 (Row 1 Banner, Row 2 Headers, Rows 3-50 Products)');

      const skus = [];
      for (let r = 3; r <= ws.rowCount; r++) {
        const sku = ws.getRow(r).getCell(1).value;
        if (sku) skus.push(String(sku).trim());
      }

      assert.strictEqual(skus.length, 48, 'Must contain exactly 48 product SKUs');
      assert.strictEqual(skus.includes('SG-10K-HYBRID-NG'), false, 'Archived benchmark product must be excluded');

      const dbActive = await Product.find({ published: 1 }).lean();
      assert.strictEqual(dbActive.length, 48, 'Database must have 48 active products');
      const dbSkus = new Set(dbActive.map(p => p.sku));
      skus.forEach(s => assert.ok(dbSkus.has(s), `Template SKU ${s} must exist in active DB catalog`));
    });

    await test('1.3: Reference columns A-F are locked; Supplier columns G-O are unlocked', async () => {
      const xlsxPath = path.join(__dirname, '..', 'templates', 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(xlsxPath);
      const ws = workbook.getWorksheet('Quotation Matrix');

      const row3 = ws.getRow(3);
      for (let col = 1; col <= 6; col++) {
        const cell = row3.getCell(col);
        const isLocked = cell.protection ? cell.protection.locked !== false : true;
        assert.strictEqual(isLocked, true, `Column ${col} must be locked`);
      }

      for (let col = 7; col <= 15; col++) {
        const cell = row3.getCell(col);
        assert.ok(cell.protection, `Column ${col} must have explicit cell protection`);
        assert.strictEqual(cell.protection.locked, false, `Column ${col} must be unlocked for supplier entry`);
      }
    });

    await test('1.4: Unit cost column is blank on all 48 rows (0 fabricated prices); Currency defaults to NGN', async () => {
      const xlsxPath = path.join(__dirname, '..', 'templates', 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(xlsxPath);
      const ws = workbook.getWorksheet('Quotation Matrix');

      for (let r = 3; r <= ws.rowCount; r++) {
        const costVal = ws.getRow(r).getCell(9).value;
        const currVal = ws.getRow(r).getCell(10).value;
        assert.ok(costVal === '' || costVal === null || costVal === undefined, `Row ${r} unit cost must be empty`);
        assert.strictEqual(currVal, 'NGN', `Row ${r} currency must default to NGN`);
      }
    });

    await test('1.5: CSV template contains exactly 49 lines (1 header + 48 active products)', async () => {
      const csvPath = path.join(__dirname, '..', 'templates', 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv');
      assert.strictEqual(fs.existsSync(csvPath), true, 'CSV template must exist');

      const content = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      assert.strictEqual(lines.length, 49, 'CSV must have 49 lines');
      assert.ok(lines[0].includes('DEVICE PRO SKU'), 'Header must contain DEVICE PRO SKU');
      assert.strictEqual(content.includes('SG-10K-HYBRID-NG'), false, 'CSV must not contain benchmark product');
    });

    // ---------------------------------------------------------------------------
    // 2. DISTRIBUTOR RESEARCH SHORTLIST VERIFICATION
    // ---------------------------------------------------------------------------
    console.log('\n--- 2. Distributor Research Shortlist Verification ---');

    await test('2.1: Shortlist CSV exists, has 9 headers, and contains exactly 14 candidates', async () => {
      const shortlistPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_DISTRIBUTOR_SHORTLIST.csv');
      assert.strictEqual(fs.existsSync(shortlistPath), true, 'Shortlist CSV must exist');

      const content = fs.readFileSync(shortlistPath, 'utf8').trim();
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      assert.strictEqual(lines.length, 15, 'Shortlist must have 1 header + 14 rows');

      const headerCols = lines[0].split('","').map(s => s.replace(/^"|"$/g, ''));
      assert.strictEqual(headerCols.length, 9, 'Header must contain 9 columns');
      assert.strictEqual(headerCols[0], 'Company Name');
      assert.strictEqual(headerCols[7], 'Verification Status');
    });

    await test('2.2: Shortlist candidates have valid verification statuses (8 VERIFIED, 4 PARTIAL, 1 UNVERIFIED, 1 EXCLUDE)', async () => {
      const shortlistPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_DISTRIBUTOR_SHORTLIST.csv');
      const content = fs.readFileSync(shortlistPath, 'utf8').trim();
      const lines = content.split('\n').filter(l => l.trim().length > 0);

      const counts = { VERIFIED: 0, PARTIALLY_VERIFIED: 0, UNVERIFIED: 0, EXCLUDE: 0 };
      const validStatuses = new Set(Object.keys(counts));

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('","').map(s => s.replace(/^"|"$/g, ''));
        const [company, website, location, categories, contact, sourceUrl, authEvidence, status] = parts;

        assert.ok(validStatuses.has(status), `Status "${status}" must be a valid enum`);
        counts[status]++;
        assert.ok(website.startsWith('http'), `Website for ${company} must be a valid URL`);
        assert.ok(sourceUrl.startsWith('http'), `Source URL for ${company} must be a valid URL`);
      }

      assert.strictEqual(counts.VERIFIED, 8, 'Must have 8 VERIFIED candidates');
      assert.strictEqual(counts.PARTIALLY_VERIFIED, 4, 'Must have 4 PARTIALLY_VERIFIED candidates');
      assert.strictEqual(counts.UNVERIFIED, 1, 'Must have 1 UNVERIFIED candidate (Deepoint)');
      assert.strictEqual(counts.EXCLUDE, 1, 'Must have 1 EXCLUDE candidate (Wavetra Energy)');
    });

    await test('2.3: Shortlist contains zero generic placeholders or invented dummy emails', async () => {
      const shortlistPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_DISTRIBUTOR_SHORTLIST.csv');
      const content = fs.readFileSync(shortlistPath, 'utf8').toLowerCase();

      assert.strictEqual(content.includes('example.com'), false, 'Must not contain example.com');
      assert.strictEqual(content.includes('john.doe'), false, 'Must not contain john.doe');
      assert.strictEqual(content.includes('placeholder'), false, 'Must not contain placeholder');
      assert.strictEqual(content.includes('tbd'), false, 'Must not contain tbd');
    });

    // ---------------------------------------------------------------------------
    // 3. OUTREACH EMAIL DRAFT VERIFICATION
    // ---------------------------------------------------------------------------
    console.log('\n--- 3. Outreach Email Draft Verification ---');

    await test('3.1: Email draft is prominently flagged as DRAFT and NOT SENT', async () => {
      const emailPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_OUTREACH_EMAIL_DRAFT.md');
      assert.strictEqual(fs.existsSync(emailPath), true, 'Email draft must exist');

      const content = fs.readFileSync(emailPath, 'utf8');
      assert.ok(content.includes('DRAFT FOR OWNER REVIEW ONLY'), 'Must include DRAFT FOR OWNER REVIEW warning');
      assert.ok(content.includes('DO NOT SEND'), 'Must include DO NOT SEND warning');
      assert.ok(content.includes('NOT SENT'), 'Must state NOT SENT status');
    });

    await test('3.2: Email draft enforces NGN currency, substitution disclosure, and 30-day freshness', async () => {
      const emailPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_OUTREACH_EMAIL_DRAFT.md');
      const content = fs.readFileSync(emailPath, 'utf8');

      assert.ok(content.includes('Nigerian Naira (NGN)'), 'Must enforce NGN currency');
      assert.ok(content.includes('SUBSTITUTION'), 'Must require explicit substitution disclosure');
      assert.ok(content.includes('30-calendar-day price freshness window'), 'Must require 30-day validity window');
      assert.ok(content.includes('DEVICE PRO Procurement Team'), 'Must use neutral signature');
    });

    await test('3.3: Email draft explicitly states quotation submission does not guarantee order', async () => {
      const emailPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_OUTREACH_EMAIL_DRAFT.md');
      const content = fs.readFileSync(emailPath, 'utf8');

      assert.ok(content.includes('does not constitute a purchase order'), 'Must disclaim order guarantee');
      assert.ok(content.includes('No Automatic Selection'), 'Must disclaim automatic selection');
    });

    // ---------------------------------------------------------------------------
    // 4. QUOTATION REVIEW CHECKLIST GOVERNANCE
    // ---------------------------------------------------------------------------
    console.log('\n--- 4. Quotation Review Checklist Governance ---');

    await test('4.1: Checklist explicitly prohibits automated lowest-bid selection', async () => {
      const checklistPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_QUOTATION_REVIEW_CHECKLIST.md');
      assert.strictEqual(fs.existsSync(checklistPath), true, 'Checklist must exist');

      const content = fs.readFileSync(checklistPath, 'utf8');
      assert.ok(content.includes('no automated algorithm may declare a winning supplier'), 'Must prohibit auto selection');
      assert.ok(content.includes('PROHIBITION 1: No Automatic Lowest-Bid Selection'), 'Must contain Prohibition 1');
    });

    await test('4.2: Checklist preserves Two-Person Rule and prohibits direct database activation', async () => {
      const checklistPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_4_2_1_QUOTATION_REVIEW_CHECKLIST.md');
      const content = fs.readFileSync(checklistPath, 'utf8');

      assert.ok(content.includes('Two-Person Rule'), 'Must mandate Two-Person Rule');
      assert.ok(content.includes('Finance Review'), 'Must mandate Finance Review');
      assert.ok(content.includes('distinct Superadmin'), 'Must mandate distinct Superadmin');
      assert.ok(content.includes('PROHIBITION 2: No Direct Database Activation'), 'Must prohibit direct database activation');
    });

    // ---------------------------------------------------------------------------
    // 5. DATABASE INVARIANCE VERIFICATION
    // ---------------------------------------------------------------------------
    console.log('\n--- 5. Database Invariance Verification ---');

    await test('5.1: Catalog counts, active products, and supplier costs remain 100% invariant', async () => {
      const totalCount = await Product.countDocuments();
      assert.strictEqual(totalCount, 118, 'Total product count must remain 118');

      const activeCount = await Product.countDocuments({ published: 1 });
      assert.strictEqual(activeCount, 48, 'Active commercial products must remain 48');

      const benchmarkCount = await Product.countDocuments({ published: 0 });
      assert.strictEqual(benchmarkCount, 70, 'Archived benchmark products must remain 70');

      const productsWithCost = await Product.countDocuments({
        published: 1,
        cost_price_ngn: { $gt: 0 }
      });
      assert.strictEqual(productsWithCost, 0, 'Commercial products with active supplier cost must remain 0');
    });

    await test('5.2: Commercial orders, customers, quotes, and enquiries are preserved intact', async () => {
      const orderCount = await Order.countDocuments();
      assert.strictEqual(orderCount, 412, 'Order count must remain 412 (410 legitimate + 2 test fixtures)');

      const customerCount = await User.countDocuments({ role: 'customer' });
      assert.strictEqual(customerCount, 310, 'Customer count must remain 310 (308 legitimate + 2 test fixtures)');

      const quoteCount = await Quote.countDocuments();
      assert.strictEqual(quoteCount, 182, 'Sizing quotes count must remain 182');

      const enquiryCount = await Enquiry.countDocuments();
      assert.strictEqual(enquiryCount, 147, 'Customer enquiries count must remain 147');
    });
  } finally {
    console.log('\n========================================================================');
    console.log(`STAGE 30.1 TEST EXECUTION SUMMARY:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total:  ${passed + failed}`);
    console.log('========================================================================\n');
  }

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
