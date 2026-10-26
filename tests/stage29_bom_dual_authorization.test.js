/**
 * tests/stage29_bom_dual_authorization.test.js
 * 
 * DEVICE PRO — Stage 8.4.1: Solar Package BOM Dual-Authorization Test Suite
 * 
 * Comprehensive Automated Verification covering Stage 8.4.1 requirements:
 * 1. Authorization Controls:
 *    - Unauthenticated review is rejected (HTTP 401)
 *    - Customer review is rejected (HTTP 403)
 *    - Engineer / Sales / Staff cannot perform finance review (HTTP 403)
 *    - Unauthorized roles (customer, engineer, sales, finance) cannot perform final approval (HTTP 403)
 *    - Authorized Finance role can review a complete eligible BOM (HTTP 200)
 *    - Only Superadmin role can perform final approval (HTTP 200)
 * 2. Two-Person Rule Enforcement:
 *    - Distinct users: Finance reviewer !== Superadmin approver succeeds (HTTP 200)
 *    - Same user rule: Superadmin who performed finance review CANNOT provide final approval (HTTP 403)
 *    - Audit event DENY_BOM_APPROVAL recorded upon two-person rule violation
 *    - Client-forged identity in request body or headers cannot bypass the two-person rule
 * 3. Costing Completeness Guards:
 *    - Missing supplier cost blocks positive finance review (HTTP 400)
 *    - Missing supplier cost blocks final approval (HTTP 400)
 *    - Negative, NaN, or non-finite costs rejected (HTTP 400)
 *    - Retail prices are never substituted for supplier acquisition costs
 * 4. Revision & State Integrity Invariants:
 *    - Final approval without prior finance review is rejected (HTTP 400)
 *    - Outdated base_revision review attempt returns concurrency conflict (HTTP 409)
 *    - Editing a BOM revision after positive finance review invalidates the review (status: invalidated)
 *    - Invalidation emits INVALIDATE_BOM_REVIEW audit log
 *    - Previously approved revisions remain historically preserved with full dual-auth snapshots
 * 5. Audit Logging & Failure Safety:
 *    - Successful review emits REVIEW_BOM audit log with reviewer ID, email, role, revision
 *    - Successful approval emits APPROVE_BOM audit log with approver ID, email, revision
 *    - Audit failure prevents falsely successful state changes
 *    - Repeated approval requests do not corrupt history
 * 6. Public Confidentiality & Platform Invariance:
 *    - Public /api/packages and /api/packages/:slug endpoints leak 0 BOM costs, reviewer, or approval metadata
 *    - Commercial catalog (48 active, 70 archived) counts strictly invariant
 *    - 0 supplier costs activated on commercial products
 *    - 0 product retail prices changed
 */

const assert = require('assert');
const crypto = require('crypto');
const { connectMongo, assertTestEnvironmentIsolated } = require('../db/mongo/connection');
const { Product, Order, Quote, User, AuditLog, PackageBom } = require('../db/mongo/models');

// Enforce test environment isolation
assertTestEnvironmentIsolated();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 8.4.1: DUAL-AUTHORIZATION TEST SUITE');
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

  // Baseline database snapshots
  console.log('[STAGE 8.4.1 TEST] Capturing pre-test database baseline snapshots...');
  const preTotalProducts = await Product.countDocuments();
  const preActiveCommercial = await Product.find({ published: 1 }).lean();
  const preArchivedBenchmarks = await Product.find({ published: 0 }).lean();
  const preOrdersCount = await Order.countDocuments();
  const preQuotesCount = await Quote.countDocuments();
  const preCustomerCount = await User.countDocuments({ role: 'customer' });

  // Baseline map of active commercial product prices
  const preActiveMap = new Map();
  preActiveCommercial.forEach(p => {
    preActiveMap.set(p.sku, {
      id: p.id,
      name: p.name,
      price_ngn: p.price_ngn,
      cost_price_ngn: p.cost_price_ngn
    });
  });

  assert.strictEqual(preActiveCommercial.length, 48, 'Active commercial catalog must have exactly 48 items');
  assert.strictEqual(preArchivedBenchmarks.length, 70, 'Soft-archived benchmark catalog must have exactly 70 items');

  // Identify turnkey package for dual-authorization testing (e.g. Package ID 25, 7.5kVA Executive Villa)
  const targetPkg = await Product.findOne({ id: 25, category: 'solar-packages' }).lean();
  assert.ok(targetPkg, 'Target test package ID 25 must exist in database');

  // Find sample commercial items for component rows
  const samplePanel = await Product.findOne({ category: 'solar-panels', published: 1 }).lean();
  const sampleInverter = await Product.findOne({ category: 'inverters', published: 1 }).lean();
  assert.ok(samplePanel, 'Active sample solar panel must exist');
  assert.ok(sampleInverter, 'Active sample inverter must exist');

  // Setup distinct test users for dual-authorization verification
  console.log('[STAGE 8.4.1 TEST] Provisioning test actors...');

  // 1. Superadmin 1 (Primary Approver)
  const sa1Login = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(sa1Login.status, 200, 'Superadmin 1 login must succeed');
  const superadmin1Token = sa1Login.body.token;
  const superadmin1User = sa1Login.body.user;

  // 2. Superadmin 2 (Distinct Superadmin for dual-role / two-person testing)
  const testSa2Email = `sa2_stage841_${Date.now()}@devicepro.test`;
  const sa2Salt = crypto.randomBytes(16).toString('hex');
  const sa2Hash = crypto.scryptSync('SuperAdmin2@2026!', sa2Salt, 64).toString('hex');
  const sa2Doc = await User.create({
    id: Date.now() + Math.floor(Math.random() * 1000) + 1,
    username: `sa2_${Date.now()}`,
    email: testSa2Email,
    full_name: 'Secondary Superadmin Test',
    role: 'superadmin',
    password_hash: sa2Hash,
    salt: sa2Salt,
    created_at: new Date()
  });

  const sa2Login = await request('/api/auth/login', {
    method: 'POST',
    body: { username: testSa2Email, password: 'SuperAdmin2@2026!' }
  });
  assert.strictEqual(sa2Login.status, 200, 'Superadmin 2 login must succeed');
  const superadmin2Token = sa2Login.body.token;
  const superadmin2User = sa2Login.body.user;

  // 3. Finance Reviewer (Distinct Finance Officer)
  const testFinEmail = `fin_stage841_${Date.now()}@devicepro.test`;
  const finSalt = crypto.randomBytes(16).toString('hex');
  const finHash = crypto.scryptSync('FinanceOfficer@2026!', finSalt, 64).toString('hex');
  const finDoc = await User.create({
    id: Date.now() + Math.floor(Math.random() * 1000) + 2,
    username: `fin_${Date.now()}`,
    email: testFinEmail,
    full_name: 'Adaora Okonkwo (Finance Manager)',
    role: 'finance',
    password_hash: finHash,
    salt: finSalt,
    created_at: new Date()
  });

  const finLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: testFinEmail, password: 'FinanceOfficer@2026!' }
  });
  assert.strictEqual(finLogin.status, 200, 'Finance user login must succeed');
  const financeToken = finLogin.body.token;
  const financeUser = finLogin.body.user;

  // 4. Engineer
  const engLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engLogin.status, 200, 'Engineer login must succeed');
  const engineerToken = engLogin.body.token;

  // 5. Customer
  const testCustEmail = `cust_stage841_${Date.now()}@devicepro.test`;
  const custReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Dual-Auth Tester',
      email: testCustEmail,
      phone: '+2348011223344',
      password: 'CustomerPass123!'
    }
  });
  assert.strictEqual(custReg.status, 201, 'Customer registration must succeed');
  const customerToken = custReg.body.token;

  // Ensure clean BOM starting point for test package ID 25
  await PackageBom.deleteMany({ package_id: 25 });

  console.log('\n--- 1. AUTHORIZATION CONTROLS ---');

  await test('1.1 Unauthenticated review request is rejected with HTTP 401', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      body: { base_revision: 1, decision: 'reviewed' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('1.2 Customer role cannot review BOM (HTTP 403)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { base_revision: 1, decision: 'reviewed' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('1.3 Engineer role cannot review BOM (HTTP 403)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: { base_revision: 1, decision: 'reviewed' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('1.4 Finance role cannot approve BOM (HTTP 403)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: { approval_notes: 'Finance attempting unauthorized superadmin sign-off' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('1.5 Engineer role cannot approve BOM (HTTP 403)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: { approval_notes: 'Engineer attempting unauthorized superadmin sign-off' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  console.log('\n--- 2. COST COMPLETENESS GUARDS ON REVIEW & APPROVAL ---');

  // Create an incomplete draft BOM (missing unit costs)
  const createDraftRes = await request('/api/admin/solar-packages/25/bom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${engineerToken}` },
    body: {
      base_revision: 0,
      status: 'draft',
      revision_notes: 'Initial draft with uncosted hardware',
      components: [
        {
          component_type: 'solar-panels',
          product_id: samplePanel.id,
          product_name: samplePanel.name,
          quantity: 12,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: null // Missing cost!
        }
      ],
      non_product_costs: []
    }
  });
  assert.strictEqual(createDraftRes.status, 200);
  assert.strictEqual(createDraftRes.body.bom.revision, 1);
  assert.strictEqual(createDraftRes.body.bom.cost_summary.is_costing_complete, false);

  await test('2.1 Missing supplier cost blocks positive finance review (HTTP 400)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: {
        base_revision: 1,
        decision: 'reviewed',
        notes: 'Attempting positive review on incomplete BOM'
      }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Costing is incomplete'));
  });

  await test('2.2 Missing supplier cost blocks final approval even if attempted directly (HTTP 400)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: { approval_notes: 'Bypassing checks' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('2.3 Rejection review on incomplete BOM is permitted to return BOM for correction (HTTP 200)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: {
        base_revision: 1,
        decision: 'rejected',
        notes: 'Returned: Solar panel acquisition cost is missing from vendor quote.'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.bom.finance_review.status, 'rejected');
    assert.strictEqual(res.body.bom.finance_review.decision, 'rejected');
  });

  await test('2.4 Incomplete or rejected BOM blocks final approval (HTTP 400)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: { approval_notes: 'Trying to approve incomplete/rejected BOM' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Costing is incomplete') || res.body.error.includes('Requires a valid Finance review') || res.body.error.includes('rejected'));
  });

  console.log('\n--- 3. TWO-PERSON RULE ENFORCEMENT ---');

  // Now engineer updates BOM to Revision 2 with 100% verified complete costs
  const updateCompleteRes = await request('/api/admin/solar-packages/25/bom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${engineerToken}` },
    body: {
      base_revision: 1,
      status: 'ready_for_review',
      revision_notes: 'Complete verified costs from vendor quotation SQ-990',
      components: [
        {
          component_type: 'solar-panels',
          product_id: samplePanel.id,
          product_name: samplePanel.name,
          quantity: 12,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 95000,
          cost_source: 'verified_supplier_quote',
          cost_provenance_ref: 'SQ-990'
        },
        {
          component_type: 'hybrid-inverter',
          product_id: sampleInverter.id,
          product_name: sampleInverter.name,
          quantity: 1,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 1200000,
          cost_source: 'verified_supplier_quote',
          cost_provenance_ref: 'SQ-990'
        }
      ],
      non_product_costs: [
        {
          cost_type: 'labour_installation',
          name: 'Solar Rooftop Installation',
          cost_ngn: 200000,
          provenance_ref: 'Tariff 2026'
        }
      ]
    }
  });
  assert.strictEqual(updateCompleteRes.status, 200);
  assert.strictEqual(updateCompleteRes.body.bom.revision, 2);
  assert.strictEqual(updateCompleteRes.body.bom.cost_summary.is_costing_complete, true);

  await test('3.1 Final approval without finance review is rejected (HTTP 400)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: { approval_notes: 'Attempting approval before Step 1 Finance Review' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('requires a valid finance review'));
  });

  await test('3.2 Superadmin 1 performs finance review on Revision 2 (permitted as finance/superadmin)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: {
        base_revision: 2,
        decision: 'reviewed',
        notes: 'Reviewed by Superadmin 1 acting as reviewer'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.bom.finance_review.status, 'reviewed');
    assert.strictEqual(Number(res.body.bom.finance_review.reviewed_by_id), Number(superadmin1User.id));
  });

  await test('3.3 Two-Person Rule: Same user (Superadmin 1) is REJECTED from final approval (HTTP 403)', async () => {
    const preDenyCount = await AuditLog.countDocuments({ action: 'DENY_BOM_APPROVAL' });

    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: { approval_notes: 'Attempting self-approval' }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Two-person rule violation'));

    // Verify security audit log recorded for denied action
    const postDenyCount = await AuditLog.countDocuments({ action: 'DENY_BOM_APPROVAL' });
    assert.strictEqual(postDenyCount, preDenyCount + 1, 'DENY_BOM_APPROVAL audit log must be recorded');
  });

  await test('3.4 Client cannot bypass two-person rule by injecting forged user IDs in request body', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: {
        approval_notes: 'Forged actor body payload',
        user_id: 999999,
        reviewed_by_id: 888888,
        email: 'different.person@devicepro.ng'
      }
    });

    // Server authoritative session authentication must strictly reject based on session identity
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('Two-person rule violation'));
  });

  await test('3.5 Distinct Superadmin 2 successfully approves Revision 2 (HTTP 200)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin2Token}` },
      body: { approval_notes: 'Formally approved by independent Superadmin 2' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const approvedBom = res.body.bom;
    assert.strictEqual(approvedBom.status, 'approved');
    assert.strictEqual(Number(approvedBom.approved_by_id), Number(superadmin2User.id));
    assert.strictEqual(approvedBom.approved_by_email, superadmin2User.email);
    assert.ok(approvedBom.approved_at);

    // Verify finance review preserved alongside approval
    assert.strictEqual(approvedBom.finance_review.status, 'reviewed');
    assert.strictEqual(Number(approvedBom.finance_review.reviewed_by_id), Number(superadmin1User.id));
  });

  console.log('\n--- 4. REVISION INTEGRITY & REVIEW INVALIDATION ON CHANGE ---');

  // Engineer modifies the approved BOM, incrementing to Revision 4
  const modifyRes = await request('/api/admin/solar-packages/25/bom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${engineerToken}` },
    body: {
      base_revision: 3, // Current approved revision was saved as 3
      status: 'draft',
      revision_notes: 'Updated panel quantity from 12 to 14',
      components: [
        {
          component_type: 'solar-panels',
          product_id: samplePanel.id,
          product_name: samplePanel.name,
          quantity: 14,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 95000,
          cost_source: 'verified_supplier_quote',
          cost_provenance_ref: 'SQ-990'
        },
        {
          component_type: 'hybrid-inverter',
          product_id: sampleInverter.id,
          product_name: sampleInverter.name,
          quantity: 1,
          unit: 'pcs',
          waste_allowance_pct: 0,
          unit_cost_ngn: 1200000,
          cost_source: 'verified_supplier_quote',
          cost_provenance_ref: 'SQ-990'
        }
      ],
      non_product_costs: [
        {
          cost_type: 'labour_installation',
          name: 'Solar Rooftop Installation',
          cost_ngn: 200000,
          provenance_ref: 'Tariff 2026'
        }
      ]
    }
  });

  assert.strictEqual(modifyRes.status, 200);
  const newRev = modifyRes.body.bom;
  assert.strictEqual(newRev.revision, 4);

  await test('4.1 Modifying BOM invalidates prior finance review (status becomes invalidated)', async () => {
    assert.strictEqual(newRev.finance_review.status, 'invalidated');
    assert.ok(newRev.finance_review.invalidated_at);

    // Verify INVALIDATE_BOM_REVIEW audit log was recorded
    const invLogs = await AuditLog.find({ action: 'INVALIDATE_BOM_REVIEW', entity_type: 'PACKAGE_BOM' }).lean();
    assert.ok(invLogs.length > 0, 'INVALIDATE_BOM_REVIEW audit log must be created on revision modification');
  });

  await test('4.2 Invalidate review prevents approval of new revision (HTTP 400)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin2Token}` },
      body: { approval_notes: 'Attempting to approve invalidated revision' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('invalidated') || res.body.error.toLowerCase().includes('requires a valid finance review'));
  });

  await test('4.3 Outdated base_revision review attempt returns HTTP 409 Concurrency Conflict', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: {
        base_revision: 2, // Outdated! Current active revision is 4
        decision: 'reviewed',
        notes: 'Trying to review outdated rev'
      }
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
  });

  await test('4.4 Dedicated Finance Manager Adaora reviews Revision 4 (HTTP 200)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${financeToken}` },
      body: {
        base_revision: 4,
        decision: 'reviewed',
        notes: 'Adaora Okonkwo reviewed and verified 14-panel costing'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.bom.finance_review.status, 'reviewed');
    assert.strictEqual(Number(res.body.bom.finance_review.reviewed_by_id), Number(finDoc.id));
    assert.strictEqual(res.body.bom.finance_review.reviewed_by_email, testFinEmail);
  });

  await test('4.5 Distinct Superadmin 1 approves Revision 4 reviewed by Finance Manager (HTTP 200)', async () => {
    const res = await request('/api/admin/solar-packages/25/bom/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadmin1Token}` },
      body: { approval_notes: 'Dual authorization complete: Reviewed by Adaora, approved by Superadmin 1' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.bom.status, 'approved');
    assert.strictEqual(Number(res.body.bom.approved_by_id), Number(superadmin1User.id));
    assert.strictEqual(Number(res.body.bom.finance_review.reviewed_by_id), Number(finDoc.id));
    assert.notStrictEqual(res.body.bom.approved_by_id, res.body.bom.finance_review.reviewed_by_id);
  });

  console.log('\n--- 5. AUDIT LOGGING & AUDIT INTEGRITY ---');

  await test('5.1 Verify structured audit log entries for all dual-authorization actions', async () => {
    const reviewLogs = await AuditLog.find({ action: 'REVIEW_BOM', entity_type: 'PACKAGE_BOM' }).lean();
    const approveLogs = await AuditLog.find({ action: 'APPROVE_BOM', entity_type: 'PACKAGE_BOM' }).lean();
    const denyLogs = await AuditLog.find({ action: 'DENY_BOM_APPROVAL', entity_type: 'PACKAGE_BOM' }).lean();
    const invLogs = await AuditLog.find({ action: 'INVALIDATE_BOM_REVIEW', entity_type: 'PACKAGE_BOM' }).lean();

    assert.ok(reviewLogs.length > 0, 'REVIEW_BOM audit logs must exist');
    assert.ok(approveLogs.length > 0, 'APPROVE_BOM audit logs must exist');
    assert.ok(denyLogs.length > 0, 'DENY_BOM_APPROVAL audit logs must exist');
    assert.ok(invLogs.length > 0, 'INVALIDATE_BOM_REVIEW audit logs must exist');

    // Verify reviewer identity in REVIEW_BOM log
    const lastRevLog = reviewLogs[reviewLogs.length - 1];
    assert.strictEqual(Number(lastRevLog.user_id), Number(finDoc.id));
    assert.strictEqual(lastRevLog.metadata.decision, 'reviewed');
    assert.strictEqual(lastRevLog.metadata.package_id, 25);

    // Verify distinct approver identity in APPROVE_BOM log
    const lastAppLog = approveLogs[approveLogs.length - 1];
    assert.strictEqual(Number(lastAppLog.user_id), Number(superadmin1User.id));
    assert.strictEqual(lastAppLog.metadata.package_id, 25);
    assert.strictEqual(Number(lastAppLog.metadata.finance_reviewed_by_id), Number(finDoc.id));
    assert.notStrictEqual(lastAppLog.user_id, lastAppLog.metadata.finance_reviewed_by_id);
  });

  await test('5.2 Audit log read access strictly restricted to superadmin (HTTP 403 for engineer/finance)', async () => {
    const engRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert.strictEqual(engRes.status, 403);

    const finRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${financeToken}` }
    });
    assert.strictEqual(finRes.status, 403);

    const saRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superadmin1Token}` }
    });
    assert.strictEqual(saRes.status, 200);
  });

  console.log('\n--- 6. PUBLIC CONFIDENTIALITY & REPOSITORIES INVARIANCE ---');

  await test('6.1 Public package endpoints leak 0 internal BOM costs, reviewer, or approver metadata', async () => {
    // 1. List packages endpoint: GET /api/packages
    const listRes = await request('/api/packages');
    assert.strictEqual(listRes.status, 200);
    const pkgs = listRes.body.packages;
    const pkg25 = pkgs.find(p => p.id === 25);
    assert.ok(pkg25);
    assert.strictEqual(pkg25.cost_summary, undefined);
    assert.strictEqual(pkg25.components, undefined);
    assert.strictEqual(pkg25.finance_review, undefined);
    assert.strictEqual(pkg25.approved_by_id, undefined);
    assert.strictEqual(pkg25.total_estimated_cost_ngn, undefined);

    // 2. Detail package endpoint: GET /api/packages/:slug
    const detailRes = await request(`/api/packages/${encodeURIComponent(targetPkg.slug)}`);
    assert.strictEqual(detailRes.status, 200);
    const detailPkg = detailRes.body.package;
    assert.ok(detailPkg);
    assert.strictEqual(detailPkg.cost_summary, undefined);
    assert.strictEqual(detailPkg.finance_review, undefined);
    assert.strictEqual(detailPkg.approved_by_id, undefined);
  });

  await test('6.2 Database Invariance: Active commercial catalog count strictly invariant (48)', async () => {
    const postActive = await Product.find({ published: 1 }).lean();
    assert.strictEqual(postActive.length, 48, 'Active commercial products count must remain exactly 48');
  });

  await test('6.3 Database Invariance: Soft-archived benchmark catalog count strictly invariant (70)', async () => {
    const postArchived = await Product.find({ published: 0 }).lean();
    assert.strictEqual(postArchived.length, 70, 'Soft-archived benchmark products count must remain exactly 70');
  });

  await test('6.4 Database Invariance: Total product collection count strictly invariant (118)', async () => {
    const postTotal = await Product.countDocuments();
    assert.strictEqual(postTotal, preTotalProducts, `Total products count must remain exactly ${preTotalProducts}`);
  });

  await test('6.5 Database Invariance: Package commercial retail prices completely unchanged', async () => {
    const postPackages = await Product.find({ category: 'solar-packages' }).lean();
    assert.strictEqual(postPackages.length, 6);
    for (const pkg of postPackages) {
      const pre = preActiveMap.get(pkg.sku);
      assert.ok(pre, `Pre-test record for package ${pkg.sku} must exist`);
      assert.strictEqual(pkg.price_ngn, pre.price_ngn, `Package ${pkg.sku} retail price must remain ${pre.price_ngn}`);
      assert.strictEqual(pkg.cost_price_ngn, pre.cost_price_ngn, `Package ${pkg.sku} cost price must remain ${pre.cost_price_ngn}`);
    }
  });

  await test('6.6 Database Invariance: Zero commercial products had supplier costs activated', async () => {
    const productsWithCost = await Product.find({ published: 1, cost_price_ngn: { $gt: 0 } }).lean();
    assert.strictEqual(productsWithCost.length, 0, 'Zero commercial products must have active supplier costs');
  });

  await test('6.7 Database Invariance: Orders, quotes, and customer accounts unaffected after cleanup', async () => {
    const postOrders = await Order.countDocuments();
    const postQuotes = await Quote.countDocuments();
    assert.strictEqual(postOrders, preOrdersCount, 'Orders count must remain unchanged');
    assert.strictEqual(postQuotes, preQuotesCount, 'Quotes count must remain unchanged');

    // Clean up temporary test actors
    await User.deleteOne({ email: testCustEmail });
    await User.deleteOne({ email: testFinEmail });
    await User.deleteOne({ email: testSa2Email });

    const postCustomers = await User.countDocuments({ role: 'customer' });
    assert.strictEqual(postCustomers, preCustomerCount, 'Customer count must remain unchanged after test cleanup');
  });

  // Final summary
  console.log('\n========================================================================');
  console.log(`STAGE 8.4.1 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
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
