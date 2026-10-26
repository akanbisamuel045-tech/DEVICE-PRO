/**
 * DEVICE PRO — STAGE 30.2: SUPPLIER COST ACTIVATION READINESS & EVIDENCE AUDIT TEST SUITE (Stage 8.5.1)
 *
 * Verifies all Stage 8.5.1 audit deliverables and compliance invariants:
 * 1. Existence and integrity of all four required Stage 8.5.1 report deliverables.
 * 2. Product Cost Coverage CSV: 48 active commercial items, zero benchmark items, all marked MISSING_COST.
 * 3. Solar Package BOM Readiness CSV: 6 turnkey packages, all marked INCOMPLETE with blockers documented.
 * 4. Control Verification Matrix: all 14 validation, dual-authorization, and security controls verified.
 * 5. Readiness Audit Report: classifies state as BLOCKED BY MISSING EVIDENCE, documents mandatory stop gate.
 * 6. Governance records: ADR-022 in DECISIONS.md and Stage 32 in PROJECT_PROGRESS.md.
 * 7. Live database invariance: zero supplier costs activated, zero retail prices changed, all collections invariant.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { connectMongo } = require('../db/mongo/connection');
const { Product, PackageBom, Order, User, Quote, Enquiry } = require('../db/mongo/models');

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 30.2: STAGE 8.5.1 READINESS AUDIT TEST SUITE');
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
    // 1. DELIVERABLE ARTIFACT EXISTENCE & INTEGRITY
    // ---------------------------------------------------------------------------
    console.log('--- 1. Stage 8.5.1 Deliverable Artifact Existence ---');

    await test('1.1: All four required Stage 8.5.1 report files exist in reports/', async () => {
      const reportsDir = path.join(__dirname, '..', 'reports');
      const files = [
        'DEVICE_PRO_ADMIN_STAGE_8_5_1_READINESS_AUDIT.md',
        'DEVICE_PRO_ADMIN_STAGE_8_5_1_PRODUCT_COST_COVERAGE.csv',
        'DEVICE_PRO_ADMIN_STAGE_8_5_1_BOM_READINESS.csv',
        'DEVICE_PRO_ADMIN_STAGE_8_5_1_CONTROL_VERIFICATION.md'
      ];

      for (const file of files) {
        const fullPath = path.join(reportsDir, file);
        assert.strictEqual(fs.existsSync(fullPath), true, `File must exist: ${file}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 500, `File ${file} must have meaningful non-trivial size`);
      }
    });

    // ---------------------------------------------------------------------------
    // 2. PRODUCT COST COVERAGE CSV AUDIT
    // ---------------------------------------------------------------------------
    console.log('\n--- 2. Product Cost Coverage CSV Audit (48 Active Items) ---');

    await test('2.1: CSV header matches canonical schema and contains exactly 48 product rows', async () => {
      const csvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_PRODUCT_COST_COVERAGE.csv');
      const raw = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = raw.split(/\r?\n/);

      assert.strictEqual(lines.length, 49, 'CSV must have 1 header line + 48 product lines = 49 lines');

      const expectedHeader = '"Product ID","SKU","Product Name","Category","Supplier Cost Status","Current Cost (NGN)","Evidence Reference","Quotation Date","Freshness Status","Outstanding Validation Issues"';
      assert.strictEqual(lines[0], expectedHeader, 'Header row must match canonical schema');
    });

    await test('2.2: Every commercial item has MISSING_COST status, empty cost, and no quotation received', async () => {
      const csvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_PRODUCT_COST_COVERAGE.csv');
      const raw = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = raw.split(/\r?\n/).slice(1);

      for (const line of lines) {
        const cols = line.split('","').map(c => c.replace(/(^"|"$)/g, ''));
        assert.strictEqual(cols.length, 10, 'Each row must have 10 columns');

        const [id, sku, name, category, status, cost, ref, qDate, freshness, issues] = cols;

        assert.strictEqual(status, 'MISSING_COST', `Product ${sku} must have status MISSING_COST`);
        assert.strictEqual(cost, '', `Product ${sku} current cost must be empty (unpopulated)`);
        assert.strictEqual(freshness, 'NO_QUOTATION_RECEIVED', `Product ${sku} freshness must be NO_QUOTATION_RECEIVED`);
        assert.ok(issues.includes('Blocked:'), `Product ${sku} issues must state blocked reason`);
      }
    });

    await test('2.3: Zero archived benchmark items (SG-10K-HYBRID-NG) are present in coverage CSV', async () => {
      const csvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_PRODUCT_COST_COVERAGE.csv');
      const raw = fs.readFileSync(csvPath, 'utf8');

      assert.strictEqual(raw.includes('SG-10K-HYBRID-NG'), false, 'Archived benchmark SKU must not appear in product coverage CSV');
    });

    // ---------------------------------------------------------------------------
    // 3. SOLAR PACKAGE BOM READINESS CSV AUDIT
    // ---------------------------------------------------------------------------
    console.log('\n--- 3. Solar Package BOM Readiness CSV Audit (6 Packages) ---');

    await test('3.1: BOM CSV contains header + exactly 6 solar package rows with INCOMPLETE status', async () => {
      const csvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_BOM_READINESS.csv');
      const raw = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = raw.split(/\r?\n/);

      assert.strictEqual(lines.length, 7, 'BOM CSV must contain 1 header line + 6 package lines = 7 lines');

      const expectedHeader = '"Package Identifier","Package Name","Retail Price (NGN)","Current BOM Revision","Completeness Status","Missing Cost Line Count","Finance Review Status","Reviewer Identity","Review Timestamp","Final Approval Status","Outstanding Blockers"';
      assert.strictEqual(lines[0], expectedHeader, 'BOM CSV header must match canonical schema');

      for (let i = 1; i <= 6; i++) {
        const cols = lines[i].split('","').map(c => c.replace(/(^"|"$)/g, ''));
        assert.strictEqual(cols.length, 11, 'Each BOM row must have 11 columns');
        const [pkgId, pkgName, price, rev, completeness, missingLines, reviewStatus, reviewer, reviewTime, approvalStatus, blockers] = cols;

        assert.strictEqual(completeness, 'INCOMPLETE', `Package ${pkgId} must have completeness status INCOMPLETE`);
        assert.ok(blockers.includes('Blocked:'), `Package ${pkgId} must document blockers`);
      }
    });

    await test('3.2: Packages with test revisions (24 & 25) explicitly identify test credentials and blocked status', async () => {
      const csvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_BOM_READINESS.csv');
      const raw = fs.readFileSync(csvPath, 'utf8');

      assert.ok(raw.includes('"24"'), 'Package 24 must be present');
      assert.ok(raw.includes('"25"'), 'Package 25 must be present');
      assert.ok(raw.includes('fin_stage28_'), 'Package 24 test fixture reviewer must be identified');
      assert.ok(raw.includes('fin_stage841_'), 'Package 25 test fixture reviewer must be identified');
    });

    // ---------------------------------------------------------------------------
    // 4. CONTROL VERIFICATION MATRIX AUDIT
    // ---------------------------------------------------------------------------
    console.log('\n--- 4. Control Verification Matrix Audit (14 Controls) ---');

    await test('4.1: Control verification report verifies all 14 mandatory controls', async () => {
      const mdPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_CONTROL_VERIFICATION.md');
      const content = fs.readFileSync(mdPath, 'utf8');

      assert.ok(content.includes('14 OF 14 CONTROLS VERIFIED'), 'Report must declare all 14 controls verified');

      for (let i = 1; i <= 14; i++) {
        assert.ok(content.includes(`| **${i}** |`), `Control ${i} must be documented in the matrix table`);
      }

      // Verify specific architectural safeguards mentioned
      assert.ok(content.includes('normalizeSku'), 'SKU normalization must be referenced');
      assert.ok(content.includes('evaluateQuotationFreshness'), 'Freshness evaluation must be referenced');
      assert.ok(content.includes('Two-person rule violation'), 'Two-person rule must be referenced');
      assert.ok(content.includes('applyPriceImport'), 'Concurrency lock and recovery must be referenced');
    });

    // ---------------------------------------------------------------------------
    // 5. READINESS AUDIT REPORT CONTENT & DECISION INTEGRITY
    // ---------------------------------------------------------------------------
    console.log('\n--- 5. Readiness Audit Report & Decision Integrity ---');

    await test('5.1: Readiness report classifies project as BLOCKED BY MISSING EVIDENCE', async () => {
      const mdPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_ADMIN_STAGE_8_5_1_READINESS_AUDIT.md');
      const content = fs.readFileSync(mdPath, 'utf8');

      assert.ok(content.includes('READINESS CLASSIFICATION: BLOCKED BY MISSING EVIDENCE'), 'Classification must be BLOCKED BY MISSING EVIDENCE');
      assert.ok(content.toUpperCase().includes('MANDATORY STOP COMPLIANCE'), 'Report must enforce mandatory stop compliance');
      assert.ok(content.includes('Total Product Documents') && content.includes('118'), 'Total products must be reported as 118');
      assert.ok(content.includes('Active Commercial Products') && content.includes('48'), 'Active commercial products must be reported as 48');
      assert.ok(content.includes('Archived Benchmark Products') && content.includes('70'), 'Benchmark products must be reported as 70');
    });

    await test('5.2: DECISIONS.md records ADR-022 documenting Stage 8.5.1 audit outcome', async () => {
      const decisionsPath = path.join(__dirname, '..', 'DECISIONS.md');
      const content = fs.readFileSync(decisionsPath, 'utf8');

      assert.ok(content.includes('### ADR-022: Supplier Cost Activation Readiness and Evidence Audit Outcome (Stage 8.5.1)'), 'ADR-022 must be recorded in DECISIONS.md');
      assert.ok(content.includes('BLOCKED BY MISSING EVIDENCE'), 'ADR-022 must record BLOCKED BY MISSING EVIDENCE');
    });

    await test('5.3: PROJECT_PROGRESS.md reflects Stage 8.5.1 in Current Stage and Stage 32 in History', async () => {
      const progPath = path.join(__dirname, '..', 'PROJECT_PROGRESS.md');
      const content = fs.readFileSync(progPath, 'utf8');

      assert.ok(content.includes('**Administrator Stage 8.5.1: Supplier Cost Activation Readiness and Evidence Audit**'), 'Current Stage must be Stage 8.5.1');
      assert.ok(content.includes('### Stage 32 (Admin Stage 8.5.1): Supplier Cost Activation Readiness and Evidence Audit'), 'Stage 32 must be in Stage History');
    });

    // ---------------------------------------------------------------------------
    // 6. LIVE DATABASE INVARIANCE AUDIT
    // ---------------------------------------------------------------------------
    console.log('\n--- 6. Live Database Invariance Audit (MongoDB Atlas) ---');

    await test('6.1: Product catalog counts and cost fields are strictly invariant', async () => {
      const totalCount = await Product.countDocuments({});
      assert.strictEqual(totalCount, 118, 'Total products must remain exactly 118');

      const activeCount = await Product.countDocuments({ published: 1 });
      assert.strictEqual(activeCount, 48, 'Active commercial products must remain exactly 48');

      const benchmarkCount = await Product.countDocuments({ published: 0 });
      assert.strictEqual(benchmarkCount, 70, 'Archived benchmark products must remain exactly 70');

      const activeWithCost = await Product.countDocuments({ published: 1, cost_price_ngn: { $gt: 0 } });
      assert.strictEqual(activeWithCost, 0, 'Zero active commercial products must have activated supplier costs');
    });

    await test('6.2: Commercial retail selling prices remain untouched', async () => {
      const p1 = await Product.findOne({ id: 1 });
      assert.strictEqual(p1.price_ngn, 245000, 'Product 1 retail price must remain ₦245,000');

      const p2 = await Product.findOne({ id: 2 });
      assert.strictEqual(p2.price_ngn, 1250000, 'Product 2 retail price must remain ₦1,250,000');

      const p3 = await Product.findOne({ id: 3 });
      assert.strictEqual(p3.price_ngn, 1850000, 'Product 3 retail price must remain ₦1,850,000');
    });

    await test('6.3: Orders, customers, quotes, and enquiries counts are strictly invariant', async () => {
      const orderCount = await Order.countDocuments({});
      assert.strictEqual(orderCount, 412, 'Order count must remain exactly 412');

      const customerCount = await User.countDocuments({ role: 'customer' });
      assert.strictEqual(customerCount, 310, 'Customer count must remain exactly 310');

      const quoteCount = await Quote.countDocuments({});
      assert.strictEqual(quoteCount, 182, 'Sizing quote count must remain exactly 182');

      const enquiryCount = await Enquiry.countDocuments({});
      assert.strictEqual(enquiryCount, 147, 'Enquiry count must remain exactly 147');
    });

  } finally {
    console.log('\n========================================================================');
    console.log(`STAGE 30.2 TEST EXECUTION SUMMARY:`);
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
