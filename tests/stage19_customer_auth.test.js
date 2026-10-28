/**
 * DEVICE PRO — Stage 19: Customer & Staff Authentication Test Suite
 * Covers:
 * 1. Clean URLs for auth pages (/login, /register, /forgot-password, /reset-password)
 * 2. Public registration validation, password strength rules, and duplicate email handling
 * 3. Strict RBAC role enforcement (customers cannot self-assign admin)
 * 4. Customer login with email/username and rememberMe cookie handling
 * 5. Session authentication via Bearer token and HttpOnly devicepro_session cookie
 * 6. Profile retrieval (/api/auth/me) without sensitive data leakage
 * 7. Secure password reset request flow with anti-enumeration protection
 * 8. Password reset execution with token validation
 * 9. Session logout and cookie invalidation
 * 10. Google OAuth unconfigured graceful degradation
 */

const assert = require('assert');
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('DEVICE PRO — STAGE 19: CUSTOMER & STAFF AUTHENTICATION TESTS');
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

  // --- 1. Clean URL Routes ---
  console.log('--- 1. Clean Auth Page URLs ---');

  await test('GET /login serves login.html with status 200', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('DEVICE PRO'), 'Page must contain brand name');
    assert(html.includes('id="login-form"'), 'Page must contain login form');
  });

  await test('GET /register serves register.html with status 200', async () => {
    const res = await fetch(`${BASE_URL}/register`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('id="register-form"'), 'Page must contain register form');
  });

  await test('GET /forgot-password serves forgot-password.html with status 200', async () => {
    const res = await fetch(`${BASE_URL}/forgot-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('id="forgot-form"'), 'Page must contain forgot form');
  });

  await test('GET /reset-password serves reset-password.html with status 200', async () => {
    const res = await fetch(`${BASE_URL}/reset-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('id="reset-form"'), 'Page must contain reset form');
  });

  // --- 2. Registration Validation & RBAC ---
  console.log('\n--- 2. Customer Registration & Security ---');

  await test('Rejects registration with missing full name', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Full name'));
  });

  await test('Rejects registration with invalid email format', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: 'invalid-email-format',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('Rejects registration with weak password (missing special char / number)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: 'weakpass@example.com',
        password: 'lowercaseonly'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Password must include') || data.error.includes('characters long'));
  });

  const timestamp = Date.now();
  const testEmail = `customer_${timestamp}@devicepro.test`;
  const testPassword = 'StrongPassword2026!';
  let createdUserId = null;
  let sessionToken = null;
  let sessionCookie = null;

  await test('Successfully registers customer and sets HttpOnly session cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Amina Danjuma',
        email: testEmail,
        phone: '+234 803 388 2268',
        password: testPassword,
        role: 'admin' // Attempt privilege escalation: must be ignored and forced to 'customer'
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'customer', 'Role must strictly remain customer');
    assert.strictEqual(data.user.email, testEmail);
    assert(data.token, 'Must return session token');
    createdUserId = data.user.id;
    sessionToken = data.token;

    // Check Set-Cookie
    const cookieHeader = res.headers.get('set-cookie');
    assert(cookieHeader, 'Must set Set-Cookie header');
    assert(cookieHeader.includes('devicepro_session='), 'Cookie name must be devicepro_session');
    assert(cookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert(cookieHeader.includes('SameSite=Lax'), 'Cookie must be SameSite=Lax');

    const match = cookieHeader.match(/devicepro_session=([^;]+)/);
    sessionCookie = match ? match[1] : null;
  });

  await test('Rejects duplicate email registration with 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another Person',
        email: testEmail.toUpperCase(), // Test case insensitivity
        password: 'AnotherPassword123!'
      })
    });
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('already exists'));
  });

  // --- 3. Login & Session Cookies ---
  console.log('\n--- 3. Customer Sign-In & Cookies ---');

  await test('Rejects login with invalid password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!'
      })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('Successfully signs in using email and rememberMe', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        rememberMe: true
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail);
    assert.strictEqual(data.user.role, 'customer');
    assert(data.token);

    const cookieHeader = res.headers.get('set-cookie');
    assert(cookieHeader.includes('devicepro_session='));
    assert(cookieHeader.includes('Max-Age=2592000'), 'Remember Me must set 30-day max-age (2592000s)');
  });

  // --- 4. Profile & Cookie Authentication ---
  console.log('\n--- 4. Authentication Middleware (Cookie & Header) ---');

  await test('GET /api/auth/me authenticates via Bearer header', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail);
    assert(!data.user.password_hash, 'Must not leak password hash');
    assert(!data.user.salt, 'Must not leak password salt');
  });

  await test('GET /api/auth/me authenticates via devicepro_session cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `devicepro_session=${sessionCookie}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail);
  });

  await test('GET /api/auth/me rejects request without token/cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    assert.strictEqual(res.status, 401);
  });

  // --- 5. Password Reset Flow ---
  console.log('\n--- 5. Password Reset Flow ---');

  let resetToken = null;

  await test('POST /api/auth/forgot-password dispatches verification code with anti-enumeration', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes('verification code') || data.message.includes('password reset instructions'));

    // Retrieve dispatched verification code from email service test mailbox
    const { getLastTestEmail } = require('../lib/email-service');
    const sentEmail = getLastTestEmail();
    assert(sentEmail, 'Verification email must be captured in test mailbox');
    assert(sentEmail.code, 'Sent email must contain 6-digit verification code');

    // Verify 6-digit code to generate secure reset authorization token
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: sentEmail.code
      })
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.success, true);
    assert(verifyData.resetToken, 'Verification must yield a resetToken');
    resetToken = verifyData.resetToken;
  });

  await test('POST /api/auth/forgot-password returns identical success for non-existent email', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_account_9988@domain.xyz' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes('verification code') || data.message.includes('password reset instructions'));
  });

  const newPassword = 'NewSecretPassword2026!';

  await test('POST /api/auth/reset-password updates password with valid token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: newPassword
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  await test('Cannot reuse same reset token (single-use enforcement)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: 'AnotherPassword999!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('Can log in with new password and old password is now invalid', async () => {
    // Old password fails
    const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    assert.strictEqual(oldLoginRes.status, 401);

    // New password succeeds
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword
      })
    });
    assert.strictEqual(newLoginRes.status, 200);
    const data = await newLoginRes.json();
    assert.strictEqual(data.success, true);
  });

  // --- 6. Google OAuth Graceful Degradation ---
  console.log('\n--- 6. Google OAuth Degradation ---');

  await test('GET /api/auth/google returns 503 or redirect when credentials unconfigured', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      headers: { Accept: 'application/json' }
    });
    // In unconfigured state, returns 503 Service Unavailable with clear reason
    assert([503, 302].includes(res.status), `Expected 503 or 302, got ${res.status}`);
    if (res.status === 503) {
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.error.includes('Google OAuth is not configured'));
    }
  });

  // --- 7. Logout Flow ---
  console.log('\n--- 7. Logout & Cookie Cleared ---');

  await test('POST /api/auth/logout revokes session and clears cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Cookie: `devicepro_session=${sessionCookie}`
      }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const cookieHeader = res.headers.get('set-cookie');
    assert(cookieHeader, 'Must set cookie clearing header');
    assert(cookieHeader.includes('devicepro_session='), 'Must clear devicepro_session');
    assert(cookieHeader.includes('Expires=Thu, 01 Jan 1970') || cookieHeader.includes('Max-Age=0'));
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
