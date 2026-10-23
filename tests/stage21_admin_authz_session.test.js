/**
 * DEVICE PRO — Stage 21: Administrator Authorisation, Session Security & Regression Suite
 * 
 * Verifies:
 * 1. Authentication:
 *    - Valid login works for staff and customer accounts
 *    - Invalid credentials return 401
 *    - Session persistence across independent database lookups (no in-memory store dependency)
 *    - Expired sessions are rejected
 *    - Logout revokes the session and cookie
 *    - Tampered / invalid cookie HMAC signatures are rejected
 * 
 * 2. Authorisation (RBAC):
 *    - Unauthenticated requests to /api/admin/* return 401 Unauthorized
 *    - Authenticated customer accounts to /api/admin/* return 403 Forbidden (reads & mutations)
 *    - Authorised administrators can access permitted endpoints
 *    - Superadmin-only endpoints (/api/admin/audit-logs, /api/admin/backup) reject other staff
 *    - Client-supplied role tampering (e.g., in profile update or body payload) is ignored
 * 
 * 3. Regression:
 *    - Customer login / logout flows remain functional
 *    - Public catalog browsing (/api/products) works
 *    - Customer order placement and safe tracking remain intact
 *    - Customer account endpoints (/api/auth/me) return valid profile data
 */

const assert = require('assert');
const crypto = require('crypto');
const { connectMongo } = require('../db/mongo/connection');
const { User, Session, Order } = require('../db/mongo/models');
const { getSessionUser, createSession, revokeSession } = require('../db/mongo/repository');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('DEVICE PRO — STAGE 21: ADMIN AUTHORISATION & SESSIONS');
  console.log('================================================================\n');

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

  async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const res = await fetch(url, {
      ...options,
      headers
    });
    let body = null;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = text;
    }
    return {
      status: res.status,
      headers: res.headers,
      body
    };
  }

  // Pre-test setup
  await connectMongo();

  // Create or retrieve a test customer account
  const testCustomerEmail = `cust_stage21_${Date.now()}@devicepro.test`;
  const testCustomerPassword = 'CustPassword@2026!';
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Amina Test Customer',
      email: testCustomerEmail,
      password: testCustomerPassword,
      phone: '+234 803 111 2233'
    })
  });
  assert.strictEqual(regRes.status, 201, 'Customer registration should succeed');

  let customerToken = regRes.body.token;
  let superadminToken = '';
  let salesToken = '';

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION & SESSION PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('--- 1. Authentication & Session Persistence ---');

  await test('A user can log in with valid credentials (Superadmin)', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@DevicePro2026!'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'superadmin');
    assert.ok(res.body.token);
    superadminToken = res.body.token;
  });

  await test('A user can log in with valid credentials (Sales Desk)', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'sales.lagos',
        password: 'Sales@DevicePro2026!'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'sales');
    assert.ok(res.body.token);
    salesToken = res.body.token;
  });

  await test('A customer can log in with valid credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testCustomerEmail,
        password: testCustomerPassword
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'customer');
    assert.ok(res.body.token);
    customerToken = res.body.token;
  });

  await test('Invalid credentials are rejected with 401', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'IncorrectPassword999!'
      })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Valid session works across independently initialised instances via MongoDB Atlas', async () => {
    // Calling getSessionUser directly simulates an independent server worker loading the session from DB
    const user = await getSessionUser(superadminToken);
    assert.ok(user, 'Session must be retrievable from MongoDB Atlas');
    assert.strictEqual(user.username, 'admin');
    assert.strictEqual(user.role, 'superadmin');
  });

  await test('Expired sessions are rejected by getSessionUser and API', async () => {
    // Create an explicitly expired session directly in Atlas
    const expToken = crypto.randomBytes(32).toString('hex');
    const expHash = crypto.createHash('sha256').update(expToken).digest('hex');
    const expiredSession = new Session({
      token_hash: expHash,
      user_id: 1,
      expires_at: new Date(Date.now() - 3600000) // 1 hour ago
    });
    await expiredSession.save();

    const result = await getSessionUser(expToken);
    assert.strictEqual(result, null, 'Expired session must return null');

    const apiRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${expToken}` }
    });
    assert.strictEqual(apiRes.status, 401);
  });

  await test('Logout invalidates the session in MongoDB Atlas', async () => {
    // Log in a temporary customer session
    const tempLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testCustomerEmail,
        password: testCustomerPassword
      })
    });
    const tempToken = tempLogin.body.token;
    assert.ok(tempToken);

    // Verify it works
    const checkBefore = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(checkBefore.status, 200);

    // Logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // Verify subsequent call is rejected
    const checkAfter = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(checkAfter.status, 401);
  });

  await test('Tampered cookie HMAC signature is rejected', async () => {
    // Cookie format: s:<token>.<hmac>
    const tamperedCookie = `devicepro_session=s%3A${superadminToken}.invalidsignature12345`;
    const res = await request('/api/auth/me', {
      headers: { Cookie: tamperedCookie }
    });
    assert.strictEqual(res.status, 401, 'Tampered cookie signature must be rejected with 401');
  });

  // ---------------------------------------------------------------------------
  // 2. AUTHORISATION & ROLE-BASED ACCESS CONTROL
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Authorisation & Role-Based Access Control ---');

  await test('Unauthenticated users cannot access administrative endpoints (401)', async () => {
    const endpoints = [
      '/api/admin/stats',
      '/api/admin/orders',
      '/api/admin/products',
      '/api/admin/quotes',
      '/api/admin/enquiries'
    ];
    for (const ep of endpoints) {
      const res = await request(ep);
      assert.strictEqual(res.status, 401, `Expected 401 for unauthenticated ${ep}, got ${res.status}`);
      assert.strictEqual(res.body.success, false);
    }
  });

  await test('Authenticated customers cannot access administrative endpoints (403 Forbidden)', async () => {
    const endpoints = [
      '/api/admin/stats',
      '/api/admin/orders',
      '/api/admin/products',
      '/api/admin/quotes',
      '/api/admin/enquiries'
    ];
    for (const ep of endpoints) {
      const res = await request(ep, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      assert.strictEqual(res.status, 403, `Expected 403 for customer on ${ep}, got ${res.status}`);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('privilege') || res.body.error.toLowerCase().includes('forbidden'));
    }
  });

  await test('Authenticated customers cannot perform administrative mutations (POST/PATCH/DELETE) (403 Forbidden)', async () => {
    // Attempt product creation as customer
    const createRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        name: 'Hacked Product',
        slug: 'hacked-product',
        price_ngn: 1000
      })
    });
    assert.strictEqual(createRes.status, 403, 'Customer cannot create product');

    // Attempt order status modification as customer
    const updateRes = await request('/api/admin/orders/1', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        status: 'completed'
      })
    });
    assert.strictEqual(updateRes.status, 403, 'Customer cannot modify orders');
  });

  await test('Authorised administrators can access permitted endpoints (200 OK)', async () => {
    const statsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsRes.body.success, true);
    assert.ok(statsRes.body.stats !== undefined);

    const ordersRes = await request('/api/admin/orders', {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    assert.strictEqual(ordersRes.status, 200);
    assert.strictEqual(ordersRes.body.success, true);
    assert.ok(Array.isArray(ordersRes.body.orders));
  });

  await test('Non-superadmin cannot access Super Admin only operations (403 Forbidden)', async () => {
    const auditRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    assert.strictEqual(auditRes.status, 403);
    assert.strictEqual(auditRes.body.success, false);

    const backupRes = await request('/api/admin/backup', {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    assert.strictEqual(backupRes.status, 403);
    assert.strictEqual(backupRes.body.success, false);
  });

  await test('Superadmin can access Super Admin only operations (200 OK)', async () => {
    const auditRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    assert.strictEqual(auditRes.body.success, true);
    assert.ok(Array.isArray(auditRes.body.logs));
  });

  await test('Client cannot self-escalate role via profile update payload', async () => {
    const profileRes = await request('/api/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        fullName: 'Amina Danjuma Escalate',
        role: 'superadmin' // Attacker attempting role tampering
      })
    });
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.body.user.role, 'customer', 'Role must remain customer');

    // Confirm against /api/auth/me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(meRes.body.user.role, 'customer');
  });

  // ---------------------------------------------------------------------------
  // 3. REGRESSION CHECKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Regression Checks ---');

  await test('Product browsing remains functional (/api/products)', async () => {
    const res = await request('/api/products');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.length > 0);
  });

  await test('Single product detail retrieval works (/api/products/:slug)', async () => {
    const res = await request('/api/products/pylontech-lithium-battery-48v-100ah');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.slug, 'pylontech-lithium-battery-48v-100ah');
    assert.ok(res.body.product.price_ngn > 0);
  });

  await test('Order placement and delivery fee calculation remain intact (/api/orders)', async () => {
    const orderPayload = {
      customerName: 'Regression Test Customer',
      customerPhone: '+234 809 999 8888',
      customerEmail: 'regression@devicepro.test',
      deliveryAddress: '24 Awolowo Road, Ikoyi',
      deliveryState: 'Lagos',
      items: [
        {
          id: 3,
          slug: 'pylontech-lithium-battery-48v-100ah',
          name: 'Pylontech 48V 100Ah LiFePO4 Battery',
          price: 1850000,
          quantity: 1
        }
      ],
      paymentMethod: 'transfer'
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.delivery_fee_ngn, 15000); // Lagos delivery
    assert.strictEqual(res.body.order.total_ngn, 1865000);

    // Verify safe customer order tracking
    const trackRes = await request(`/api/orders/${res.body.order.order_number}`);
    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.order.customerName, 'Regression Test Customer');
  });

  await test('Customer account functionality remains intact (/api/auth/me)', async () => {
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, testCustomerEmail);
    assert.strictEqual(res.body.user.role, 'customer');
    assert.strictEqual(res.body.user.password_hash, undefined);
    assert.strictEqual(res.body.user.salt, undefined);
  });

  console.log('\n================================================================');
  console.log(`STAGE 21 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
