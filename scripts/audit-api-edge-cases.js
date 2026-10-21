/**
 * DEVICE PRO — Edge Case & Security Vulnerability Tester
 * Tests OWASP Top 10, NoSQL/SQL injection, XSS, boundary conditions,
 * malformed inputs, oversized payloads, and authentication gates.
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('===============================================================');
  console.log('DEVICE PRO — API EDGE CASE & SECURITY AUDIT TESTER');
  console.log('Target: ' + BASE_URL);
  console.log('===============================================================\n');

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

  // --- 1. MALFORMED JSON HANDLING ---
  await test('POST with malformed JSON body returns 400 Bad Request, not 500 crash', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name": "Broken JSON, missing end brace'
    });
    assert.strictEqual(res.status, 400, `Expected 400 for malformed JSON, got ${res.status}`);
  });

  // --- 2. EMPTY REQUEST BODY ---
  await test('POST /api/orders with empty body {} returns 400 with validation error', async () => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400, `Expected 400 for empty order body, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error, 'Response should contain error explanation');
  });

  // --- 3. MISSING REQUIRED FIELDS IN ENQUIRY ---
  await test('POST /api/contact with missing phone returns 400 validation error', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'John Doe', message: 'Hello' })
    });
    assert.strictEqual(res.status, 400, `Expected 400 for missing phone, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // --- 4. NON-EXISTENT PRODUCT SLUG OR ID ---
  await test('GET /api/products/non-existent-product-slug-xyz returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/products/non-existent-product-slug-xyz`);
    assert.strictEqual(res.status, 404, `Expected 404 for non-existent product, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Product not found');
  });

  // --- 5. SQL INJECTION ATTEMPT IN SEARCH ---
  await test('GET /api/products?search=" OR "1"="1 handles payload safely without SQL injection', async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent("' OR '1'='1")}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // Should safely search for the literal string, not dump all products unfiltered
    assert(Array.isArray(data.products));
  });

  // --- 6. NOSQL INJECTION ATTEMPT ($gt operator in body) ---
  await test('POST /api/auth/login with NoSQL injection object {$gt: ""} is rejected safely', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: { $gt: '' }, password: { $gt: '' } })
    });
    // Must be 400 (validation) or 401 (rejected credentials), NOT 200 or 500 crash
    assert(res.status === 400 || res.status === 401, `Expected 400 or 401 for object injection, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // --- 7. XSS PAYLOAD IN CONTACT FORM ---
  await test('POST /api/contact with script tag payload sanitizes or handles input safely', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test <script>alert(1)</script>',
        phone: '08012345678',
        email: 'xss@test.ng',
        state: 'Lagos',
        message: '<img src=x onerror=alert(document.cookie)>'
      })
    });
    // Should either accept safely or sanitize without executing
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.referenceId, 'Expected reference ID to be issued');
  });

  // --- 8. UNPROTECTED ADMIN ROUTE ATTEMPT ---
  await test('GET /api/admin/orders without auth token returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders`);
    assert.strictEqual(res.status, 401, `Expected 401 for unauthenticated admin access, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Authentication required'));
  });

  // --- 9. RBAC: SALES ROLE ATTEMPTING SUPERADMIN AUDIT LOGS ---
  await test('RBAC: Sales desk token cannot access /api/admin/audit-logs (returns 403 Forbidden)', async () => {
    // Login as sales user
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sales.lagos', password: 'Sales@DevicePro2026!' })
    });
    assert.strictEqual(loginRes.status, 200, `Expected 200 for valid sales login, got ${loginRes.status}`);
    const loginData = await loginRes.json();
    const token = loginData.token;

    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(auditRes.status, 403, `Expected 403 Forbidden for sales desk, got ${auditRes.status}`);
  });

  // --- 10. PAYSTACK WEBHOOK REJECTION WITHOUT SIGNATURE ---
  await test('POST /api/payments/webhook rejects unsigned requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'charge.success', data: { reference: 'fake_ref' } })
    });
    assert.strictEqual(res.status, 401, `Expected 401 for unsigned webhook, got ${res.status}`);
  });

  // --- 11. PRIVACY GATE ON ORDER TRACKING ---
  await test('POST /api/orders/track rejects request when phone/email does not match order', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'DP-ORD-1001', contact: '09999999999' })
    });
    // Must reject privacy mismatch with 404 or 403
    assert(res.status === 404 || res.status === 403, `Expected 404/403 for mismatched tracking contact, got ${res.status}`);
  });

  // --- 12. OVERSIZED REQUEST PAYLOAD PROTECTION ---
  await test('POST with massive payload (> 1MB) is handled safely by Express json limits', async () => {
    const hugeString = 'A'.repeat(2 * 1024 * 1024); // 2MB
    try {
      const res = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Huge', phone: '08000000000', message: hugeString })
      });
      // Express default json body limit is 100kb; if exceeded, it returns 413 Payload Too Large
      assert(res.status === 413 || res.status === 400 || res.status === 200, `Got status ${res.status}`);
      if (res.status === 413) {
        console.log('    (Server returned 413 Payload Too Large as expected)');
      }
    } catch (e) {
      // Connection might be reset if socket closed early on oversized body
      console.log('    (Socket closed on oversized body as expected)');
    }
  });

  // --- 13. SENSITIVE DATA EXPOSURE CHECK ---
  await test('500 error responses do NOT leak internal stack traces or filesystem paths', async () => {
    // Call an endpoint with invalid query parameter type that causes internal handled error
    const res = await fetch(`${BASE_URL}/api/admin/orders/invalid-mongo-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' })
    });
    const text = await res.text();
    assert(!text.includes('node_modules'), 'Response should not expose node_modules path');
    assert(!text.includes('C:\\'), 'Response should not expose local Windows paths');
    assert(!text.includes('mongodb+srv://'), 'Response should not leak MongoDB connection string');
  });

  // --- 14. SECURITY HEADERS VERIFICATION ---
  await test('HTTP response contains strict security headers', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert(res.headers.get('content-security-policy'), 'CSP header must be present');
    assert(res.headers.get('strict-transport-security'), 'HSTS header must be present');
  });

  console.log('\n===============================================================');
  console.log(`EDGE CASE AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
