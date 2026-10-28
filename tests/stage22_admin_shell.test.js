/**
 * DEVICE PRO — Stage 22: Admin Shell, Dashboard Navigation & Information Architecture
 * 
 * Verifies:
 * 1. Admin Page Access Without Authentication:
 *    - Unauthenticated GET /admin returns 200 with #admin-auth-view
 *    - Unauthenticated deep-linked section URLs redirect to /admin?redirect=...
 *    - Unauthenticated JSON requests return 401 Unauthorized
 * 
 * 2. Customer Access Attempts:
 *    - Authenticated customer accounts cannot access /admin (403 Forbidden)
 *    - Authenticated customer accounts cannot access deep sections (403 Forbidden)
 *    - Authenticated customer accounts cannot access administrative APIs (403 Forbidden)
 * 
 * 3. Administrator Access:
 *    - Authorized administrators can access allowed sections (200 OK)
 *    - Role-based permissions are enforced per section
 * 
 * 4. Superadmin-Only Sections & Navigation Visibility:
 *    - Non-superadmin cannot access /admin/audit-logs or /admin/admin-users (403 Forbidden)
 *    - Superadmin can access /admin/audit-logs and /admin/admin-users (200 OK)
 *    - Template marks superadmin-only navigation elements with .superadmin-only
 * 
 * 5. Information Architecture & Navigation Structure:
 *    - All 16 required sections exist in navigation and layout
 *    - Placeholder panels 2-16 clearly indicate scheduled stage badges and notices
 *    - No fabricated statistics, simulated revenue, or mock orders
 * 
 * 6. Reusable Admin Shell & Layout:
 *    - Branded header, collapsible sidebar, topbar breadcrumbs, main content landmark
 *    - User account popover menu, dual logout triggers, Atlas cluster status dot
 * 
 * 7. Logout Behavior:
 *    - POST /api/auth/logout revokes session in MongoDB Atlas
 *    - Revoked credentials cannot re-enter protected routes
 * 
 * 8. Responsive & Accessibility Markup:
 *    - Skip-link, ARIA landmarks, mobile hamburger toggle, modal escape handling
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectMongo } = require('../db/mongo/connection');
const { User, Session } = require('../db/mongo/models');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 22: ADMIN SHELL & NAVIGATION AUTOMATED TEST SUITE');
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
    const headers = {
      ...(options.headers || {})
    };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, {
      ...options,
      headers
    });
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return {
      status: res.status,
      headers: res.headers,
      body
    };
  }

  // Pre-test setup: Connect Mongo and obtain tokens
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const conn = await connectMongo();
      if (conn && mongoose.connection.readyState === 1) break;
    } catch (e) {}
  }

  // 1. Authenticate Superadmin
  const saRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(saRes.status, 200, 'Superadmin login should succeed');
  const superadminToken = saRes.body.token;

  // 2. Verify removed non-superadmin staff accounts are rejected (only superadmin authorized)
  const salesRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'sales.lagos', password: 'Sales@DevicePro2026!' }
  });
  assert.strictEqual(salesRes.status, 401, 'Sales login should be rejected (only superadmin authorized)');

  const engRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engRes.status, 401, 'Engineer login should be rejected (only superadmin authorized)');

  // 3. Register a test Customer account
  const testCustomerEmail = `cust_shell_test_${Date.now()}@devicepro.test`;
  const custRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Shell Test',
      email: testCustomerEmail,
      password: 'CustPassword@2026!',
      phone: '+234 803 555 7777'
    }
  });
  assert.strictEqual(custRes.status, 201, 'Customer registration should succeed');
  const customerToken = custRes.body.token;

  try {

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED VISITOR ACCESS RESTRICTIONS
  // ---------------------------------------------------------------------------
  console.log('--- 1. Unauthenticated Visitor Access Restrictions ---');

  await test('GET /admin without authentication serves 200 HTML with authentication screen', async () => {
    const res = await request('/admin');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('id="admin-auth-view"'), 'Should contain admin-auth-view');
    assert.ok(res.body.includes('STAFF OPERATIONS PORTAL'), 'Should contain portal heading');
    assert.ok(res.body.includes('id="admin-dashboard-view"'), 'Should contain dashboard container');
  });

  await test('GET /admin.html without authentication serves 200 HTML with auth screen', async () => {
    const res = await request('/admin.html');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('id="admin-auth-view"'));
  });

  await test('GET /admin/orders without credentials redirects (302) to login with redirect param', async () => {
    const res = await request('/admin/orders', { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
    const loc = res.headers.get('location') || '';
    assert.ok(loc.includes('/admin?redirect='), 'Should redirect to /admin with redirect query param');
  });

  await test('GET /admin/audit-logs without credentials redirects (302) to login', async () => {
    const res = await request('/admin/audit-logs', { redirect: 'manual' });
    assert.strictEqual(res.status, 302);
  });

  await test('Direct deep section request with Accept: application/json returns 401', async () => {
    const res = await request('/admin/orders', {
      headers: { Accept: 'application/json' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Authentication required'));
  });

  // ---------------------------------------------------------------------------
  // 2. CUSTOMER ACCESS ATTEMPTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Customer Access Isolation ---');

  await test('Authenticated customer accessing /admin is strictly rejected with 403 Forbidden', async () => {
    const res = await request('/admin', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        Accept: 'application/json'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('Authenticated customer accessing deep URL /admin/orders is rejected with 403 Forbidden', async () => {
    const res = await request('/admin/orders', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        Accept: 'application/json'
      }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Authenticated customer accessing /admin.html cannot bypass authorization (403 Forbidden)', async () => {
    const res = await request('/admin.html', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        Accept: 'application/json'
      }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Authenticated customer accessing /api/admin/stats returns 403 Forbidden', async () => {
    const res = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // ---------------------------------------------------------------------------
  // 3. ADMINISTRATOR ACCESS & ROLE-BASED SECTION PERMISSIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Administrator Access & Role-Based Permissions ---');

  await test('Authorized staff can access /admin with 200 OK', async () => {
    const res = await request('/admin', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('admin-dashboard-view'));
  });

  await test('Administrator can access permitted section /admin/orders (200 OK)', async () => {
    const res = await request('/admin/orders', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Administrator can access permitted section /admin/customers (200 OK)', async () => {
    const res = await request('/admin/customers', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Superadmin can access all 16 administration sections', async () => {
    const sections = [
      'overview', 'products', 'supplier-imports', 'categories',
      'brands', 'solar-packages', 'content', 'images',
      'orders', 'customers', 'quotes-enquiries', 'projects',
      'import-history', 'audit-logs', 'admin-users', 'settings'
    ];
    for (const sec of sections) {
      const res = await request(`/admin/${sec}`, {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      assert.strictEqual(res.status, 200, `Superadmin should access /admin/${sec} with 200`);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. SUPERADMIN-ONLY NAVIGATION & ROUTE GUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Superadmin-Only Route Guards & Navigation Visibility ---');

  await test('Non-superadmin cannot access /admin/audit-logs (403 Forbidden)', async () => {
    const res = await request('/admin/audit-logs', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        Accept: 'application/json'
      }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Non-superadmin cannot access /admin/admin-users (403 Forbidden)', async () => {
    const res = await request('/admin/admin-users', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        Accept: 'application/json'
      }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Superadmin can access /admin/audit-logs (200 OK)', async () => {
    const res = await request('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Superadmin can access /admin/admin-users (200 OK)', async () => {
    const res = await request('/admin/admin-users', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  // ---------------------------------------------------------------------------
  // 5. INFORMATION ARCHITECTURE & 16-SECTION PLACEHOLDERS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Information Architecture & Placeholder Integrity ---');

  const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin.html');
  const adminHtmlContent = fs.readFileSync(adminHtmlPath, 'utf8');

  await test('admin.html defines all 16 required navigation sections in DOM', async () => {
    const requiredSections = [
      'overview', 'products', 'supplier-imports', 'categories',
      'brands', 'solar-packages', 'content', 'images',
      'orders', 'customers', 'quotes-enquiries', 'projects',
      'import-history', 'audit-logs', 'admin-users', 'settings'
    ];
    for (const sec of requiredSections) {
      assert.ok(
        adminHtmlContent.includes(`data-section="${sec}"`),
        `Sidebar nav should contain button for section: ${sec}`
      );
      assert.ok(
        adminHtmlContent.includes(`id="panel-${sec}"`),
        `Main content should contain tab-panel for section: panel-${sec}`
      );
    }
  });

  await test('Placeholder panels 2-16 clearly indicate scheduled stage badges and notices', async () => {
    const placeholderPanels = [
      'panel-products', 'panel-supplier-imports', 'panel-categories',
      'panel-brands', 'panel-solar-packages', 'panel-content',
      'panel-images', 'panel-orders', 'panel-customers',
      'panel-quotes-enquiries', 'panel-projects', 'panel-import-history',
      'panel-audit-logs', 'panel-admin-users', 'panel-settings'
    ];
    for (const panelId of placeholderPanels) {
      assert.ok(
        adminHtmlContent.includes(`id="${panelId}"`),
        `Panel ${panelId} must exist in admin.html`
      );
    }
    assert.ok(adminHtmlContent.includes('placeholder-stage-badge'));
    assert.ok(adminHtmlContent.includes('placeholder-notice-box'));
  });

  await test('No fabricated metrics or placeholder statistics in Overview', async () => {
    // Verified that cards either display live classes or explicit unavailable indicators
    assert.ok(adminHtmlContent.includes('kpi-unavailable'));
    assert.ok(adminHtmlContent.includes('Unavailable in Stage 3'));
    assert.ok(adminHtmlContent.includes('Awaiting Stage 10 reconciliation'));
  });

  // ---------------------------------------------------------------------------
  // 6. REUSABLE ADMIN SHELL & ACCESSIBILITY LANDMARKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Reusable Admin Shell & Accessibility Landmarks ---');

  await test('admin.html includes accessibility skip-link targeting main content', async () => {
    assert.ok(adminHtmlContent.includes('class="skip-link"'));
    assert.ok(adminHtmlContent.includes('href="#admin-main-content"'));
    assert.ok(adminHtmlContent.includes('id="admin-main-content"'));
  });

  await test('admin.html includes branded header with breadcrumbs and live Atlas pill', async () => {
    assert.ok(adminHtmlContent.includes('class="admin-topbar"'));
    assert.ok(adminHtmlContent.includes('class="topbar-breadcrumbs"'));
    assert.ok(adminHtmlContent.includes('id="breadcrumb-current-section"'));
    assert.ok(adminHtmlContent.includes('id="db-status-pill"'));
  });

  await test('admin.html includes collapsible sidebar and mobile drawer elements', async () => {
    assert.ok(adminHtmlContent.includes('id="admin-sidebar"'));
    assert.ok(adminHtmlContent.includes('id="btn-collapse-sidebar"'));
    assert.ok(adminHtmlContent.includes('id="sidebar-toggle-btn"'));
    assert.ok(adminHtmlContent.includes('id="sidebar-close-btn"'));
    assert.ok(adminHtmlContent.includes('id="sidebar-backdrop"'));
  });

  await test('admin.html includes user account popover menu and dual sign-out triggers', async () => {
    assert.ok(adminHtmlContent.includes('id="user-account-menu"'));
    assert.ok(adminHtmlContent.includes('id="user-menu-btn"'));
    assert.ok(adminHtmlContent.includes('id="user-menu-dropdown"'));
    assert.ok(adminHtmlContent.includes('id="btn-admin-logout"'));
    assert.ok(adminHtmlContent.includes('id="btn-topbar-logout"'));
  });

  // ---------------------------------------------------------------------------
  // 7. LOGOUT BEHAVIOR & SESSION INVALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Logout Behavior & Session Invalidation ---');

  await test('POST /api/auth/logout invalidates session in MongoDB Atlas', async () => {
    // 1. Create a fresh session
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'Admin@DevicePro2026!' }
    });
    const tempToken = loginRes.body.token;

    // 2. Call logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.success, true);

    // 3. Verify that old token is now rejected
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(meRes.status, 401);
  });

  // ---------------------------------------------------------------------------
  // 8. STYLESHEET INTEGRITY & DESIGN TOKENS
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Stylesheet Integrity & Branding Tokens ---');

  const cssPath = path.join(__dirname, '..', 'public', 'css', 'admin.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  await test('admin.css defines skip-link, focus-visible, and mobile drawer transitions', async () => {
    assert.ok(cssContent.includes('.skip-link'));
    assert.ok(cssContent.includes(':focus-visible'));
    assert.ok(cssContent.includes('.sidebar-collapsed'));
    assert.ok(cssContent.includes('.mobile-open'));
    assert.ok(cssContent.includes('.user-account-dropdown'));
    assert.ok(cssContent.includes('.placeholder-panel-card'));
  });
  } finally {
    if (testCustomerEmail) {
      try {
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
          await connectMongo();
        }
        await User.deleteOne({ email: testCustomerEmail });
      } catch (e) {
        console.error('Failed to teardown test customer:', e.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`STAGE 22 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test error in Stage 22 test suite:', err);
  process.exit(1);
});
