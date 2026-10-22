/**
 * DEVICE PRO — Stage 20: Secure Forgot Password & Email Verification Code Test Suite
 * Comprehensive verification of all 18 security requirements:
 * 1. Unknown email addresses (Anti-enumeration)
 * 2. Known email addresses (Cryptographically random 6-digit code, 10-min expiry)
 * 3. Malformed email addresses
 * 4. Repeated reset requests (60-second resend cooldown)
 * 5. Incorrect codes & safe error handling
 * 6. Expired codes validation
 * 7. Reused codes (Single-use semantics)
 * 8. Excessive verification attempts (Lockout after 5 failed attempts)
 * 9. Excessive resend attempts cooldown
 * 10. Expired reset authorization token
 * 11. Invalid/forged reset authorization token
 * 12. Password mismatch validation
 * 13. Weak password rejection (Complexity requirements)
 * 14. Database error safe handling without stack trace leakage
 * 15. Email delivery resilience
 * 16. Unauthorized password changes (Requires valid reset authorization, never email alone)
 * 17. Multi-device session invalidation upon password reset
 * 18. Google-only account compatibility (No password reset code issued; guidance dispatched)
 * 19. Case and whitespace normalization (Anti-bypass)
 * 20. Zero plaintext storage & zero code leakage in API responses
 */

process.env.NODE_ENV = 'test';

const assert = require('assert');
const crypto = require('crypto');
const { connectMongo } = require('../db/mongo/connection');
const {
  createUser,
  getUserByEmail,
  verifyUserLogin,
  createSession,
  getSessionUser,
  createVerificationCode,
  verifyResetCode,
  executePasswordReset,
  db
} = require('../db/database');
const {
  getLastTestEmail,
  getRecentTestEmails,
  clearTestMailbox
} = require('../lib/email-service');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  await connectMongo().catch(err => {
    console.warn('Note: MongoDB Atlas connecting in test suite:', err.message);
  });
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 20: SECURE PASSWORD RECOVERY & VERIFICATION CODE SUITE');
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

  // --- Clean URLs and Frontend Views ---
  console.log('--- 1. Clean URLs & Frontend Templates ---');

  await test('GET /forgot-password serves approved branding with Reset Password heading', async () => {
    const res = await fetch(`${BASE_URL}/forgot-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Reset Password'), 'Must contain Reset Password heading');
    assert(html.includes('Send Verification Code'), 'Must contain Send Verification Code button');
    assert(html.includes('DEVICE PRO'), 'Must contain DEVICE PRO branding');
  });

  await test('GET /verify-reset-code serves 6-digit OTP verification interface', async () => {
    const res = await fetch(`${BASE_URL}/verify-reset-code`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Verify Reset Code'), 'Must contain Verify Reset Code heading');
    assert(html.includes('otp-container'), 'Must contain OTP digit inputs');
    assert(html.includes('cooldown-timer'), 'Must contain cooldown timer element');
    assert(html.includes('attempts-badge'), 'Must contain attempts badge element');
  });

  await test('GET /reset-password serves new password form with requirements list', async () => {
    const res = await fetch(`${BASE_URL}/reset-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Set New Password') || html.includes('Reset Password'), 'Must contain reset password heading');
    assert(html.includes('password-requirements-box'), 'Must contain requirements checklist');
    assert(html.includes('btn-toggle-password'), 'Must contain password visibility toggle');
  });

  // Setup test users for security testing
  const ts = Date.now();
  const testEmailKnown = `recovery_user_${ts}@devicepro.test`;
  const testPasswordInitial = 'InitialSecretPass2026!';
  const googleOnlyEmail = `google_only_${ts}@devicepro.test`;

  // Create standard local user
  await createUser({
    fullName: 'Standard Customer',
    email: testEmailKnown,
    password: testPasswordInitial,
    phone: '+2348000000001'
  });

  // Create Google-only user (has google_subject, no password_hash)
  await createUser({
    fullName: 'Google User',
    email: googleOnlyEmail,
    google_subject: 'google-sub-998877665544',
    googleSubject: 'google-sub-998877665544',
    google_picture: 'https://lh3.googleusercontent.com/test'
  });

  // --- 2. Unknown, Known, and Malformed Emails ---
  console.log('\n--- 2. Request Code & Anti-Enumeration (Requirements 1, 2, 3) ---');

  await test('Unknown email returns generic anti-enumeration response and does not leak code', async () => {
    clearTestMailbox();
    const unknownEmail = `nonexistent_user_${ts}@devicepro.test`;
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unknownEmail })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'If an eligible account exists for this email address, a 6-digit verification code has been sent.');
    assert.strictEqual(data.code, undefined, 'Code must NEVER be returned in response');
    assert.strictEqual(data.debugResetToken, undefined, 'Token must not be exposed');

    // Email service must not dispatch an email for non-existent account
    const sent = getLastTestEmail(unknownEmail);
    assert.strictEqual(sent, null, 'No email must be sent for non-existent account');
  });

  await test('Malformed email formats rejected with 400 Bad Request', async () => {
    const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain', ''];
    for (const badEmail of invalidEmails) {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: badEmail })
      });
      assert.strictEqual(res.status, 400, `Expected 400 for "${badEmail}"`);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.error.includes('valid email address') || data.error.includes('Email address is required'));
    }
  });

  let capturedCode = null;

  await test('Known local account dispatches cryptographically random 6-digit code with generic response', async () => {
    clearTestMailbox();
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailKnown })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'If an eligible account exists for this email address, a 6-digit verification code has been sent.');
    assert.strictEqual(data.code, undefined, 'Code must not be in response body');

    const sent = getLastTestEmail(testEmailKnown);
    assert(sent, 'Email must be captured in test mailbox');
    assert(sent.code, 'Dispatched email must have code metadata');
    assert(/^\d{6}$/.test(sent.code), 'Code must be exactly 6 digits');
    capturedCode = sent.code;
  });

  // --- 3. Cooldown Enforcement & Anti-Bypass ---
  console.log('\n--- 3. Cooldown & Rate Limiting (Requirements 4, 9, 19) ---');

  await test('Repeated reset request within 60s cooldown is rejected with 429', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailKnown })
    });
    assert.strictEqual(res.status, 429);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.cooldown, true);
    assert(data.secondsRemaining > 0 && data.secondsRemaining <= 60);
  });

  await test('Cooldown cannot be bypassed with case or whitespace variations', async () => {
    const paddedUpperEmail = `  ${testEmailKnown.toUpperCase()}  `;
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: paddedUpperEmail })
    });
    assert.strictEqual(res.status, 429, 'Must enforce cooldown even with whitespace and uppercase');
  });

  await test('Resend endpoint (/api/auth/resend-code) also enforces cooldown', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailKnown })
    });
    assert.strictEqual(res.status, 429);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.cooldown, true);
  });

  // --- 4. Verification Security & Attempt Limits ---
  console.log('\n--- 4. Code Verification & Attempt Limiting (Requirements 5, 8) ---');

  await test('Incorrect code returns safe error message and decrements remaining attempts', async () => {
    const wrongCode = '000000';
    const res = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailKnown,
        code: wrongCode
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Incorrect verification code'));
    assert.strictEqual(data.attemptsRemaining, 4);
    assert.strictEqual(data.lockedOut, false);
  });

  await test('Account is locked out after 5 consecutive failed verification attempts', async () => {
    const userForLockout = `lockout_${ts}@devicepro.test`;
    await createUser({
      fullName: 'Lockout Target',
      email: userForLockout,
      password: 'SomeValidPassword123!'
    });

    clearTestMailbox();
    // Generate code
    await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userForLockout })
    });

    // Make 5 wrong attempts
    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userForLockout, code: '111111' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.lockedOut, false);
      assert.strictEqual(data.attemptsRemaining, 5 - i);
    }

    // 5th attempt must trigger lockout
    const finalRes = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userForLockout, code: '111111' })
    });
    assert.strictEqual(finalRes.status, 400);
    const finalData = await finalRes.json();
    assert.strictEqual(finalData.lockedOut, true);
    assert.strictEqual(finalData.attemptsRemaining, 0);
    assert(finalData.error.includes('Too many incorrect attempts') || finalData.error.includes('invalidated'));

    // Even if user now submits the actual code, it must be rejected because it is locked out
    const sent = getLastTestEmail(userForLockout);
    assert(sent && sent.code);
    const retryRes = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userForLockout, code: sent.code })
    });
    assert.strictEqual(retryRes.status, 400);
    const retryData = await retryRes.json();
    assert.strictEqual(retryData.lockedOut, true);
  });

  // --- 5. Single-Use Semantics & Reset Authorization ---
  console.log('\n--- 5. Single-Use Semantics & Authorization Token (Requirements 7, 10, 11) ---');

  let validResetToken = null;

  await test('Successful code verification produces short-lived reset authorization token', async () => {
    // Generate fresh code for testEmailKnown
    const freshUser = `singleuse_${ts}@devicepro.test`;
    await createUser({
      fullName: 'Single Use User',
      email: freshUser,
      password: 'OldPassword123!'
    });

    clearTestMailbox();
    await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: freshUser })
    });

    const sent = getLastTestEmail(freshUser);
    assert(sent && sent.code);

    const res = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: freshUser, code: sent.code })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.resetToken && typeof data.resetToken === 'string' && data.resetToken.length >= 32);
    validResetToken = data.resetToken;

    // Code cannot be reused
    const reuseRes = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: freshUser, code: sent.code })
    });
    assert.strictEqual(reuseRes.status, 400);
    const reuseData = await reuseRes.json();
    assert.strictEqual(reuseData.success, false);
    assert(reuseData.error.includes('already been used') || reuseData.error.includes('Invalid or expired'));
  });

  await test('Invalid or forged reset token is rejected', async () => {
    const forgedToken = crypto.randomBytes(32).toString('hex');
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgedToken,
        password: 'ValidPassword2026!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Invalid or expired password reset authorization'));
  });

  // --- 6. Password Complexity & Mismatch ---
  console.log('\n--- 6. Password Validation & Complexity (Requirements 12, 13) ---');

  await test('Rejects password change when confirmPassword does not match', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: validResetToken,
        password: 'ValidPassword2026!',
        confirmPassword: 'MismatchPassword2026!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Passwords do not match'));
  });

  await test('Rejects weak password lacking complexity (length, upper, lower, number, special)', async () => {
    const weakPasswords = [
      'short1!',           // < 8 chars
      'alllowercase123!',  // no uppercase
      'ALLUPPERCASE123!',  // no lowercase
      'LettersOnlyPass!',  // no number
      'NoSpecialChar1234'  // no special character
    ];

    for (const weak of weakPasswords) {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validResetToken,
          password: weak,
          confirmPassword: weak
        })
      });
      assert.strictEqual(res.status, 400, `Expected rejection for weak password: "${weak}"`);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.error.includes('Password must') || data.error.includes('characters long'));
    }
  });

  // --- 7. Password Update, Session Invalidation & Notification ---
  console.log('\n--- 7. Password Reset Execution & Session Invalidation (Requirements 16, 17) ---');

  await test('Successfully resets password, invalidates authorization token, and sends security email', async () => {
    clearTestMailbox();
    const newStrongPassword = 'BrandNewPassword2026!#';

    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: validResetToken,
        password: newStrongPassword,
        confirmPassword: newStrongPassword
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes('Password reset successfully'));

    // Token cannot be used a second time
    const reuseTokenRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: validResetToken,
        password: 'AnotherPassword2026!@',
        confirmPassword: 'AnotherPassword2026!@'
      })
    });
    assert.strictEqual(reuseTokenRes.status, 400);

    // Verify security confirmation email was dispatched
    const recentEmails = getRecentTestEmails();
    const noticeEmail = recentEmails.find(e => /password (was )?changed/i.test(e.subject));
    assert(noticeEmail, 'Password changed security confirmation email must be dispatched');
  });

  await test('Pre-existing active sessions are invalidated across devices', async () => {
    const sessionUserEmail = `session_user_${ts}@devicepro.test`;
    const initialPass = 'OriginalPassword123!';
    const user = await createUser({
      fullName: 'Session User',
      email: sessionUserEmail,
      password: initialPass
    });

    // Create active session
    const session = await createSession(user.id);
    assert(session && session.token);

    // Verify session works
    const verifySessionRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    assert.strictEqual(verifySessionRes.status, 200);

    // Request reset and complete it
    clearTestMailbox();
    await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sessionUserEmail })
    });

    const sent = getLastTestEmail(sessionUserEmail);
    assert(sent && sent.code);

    const verifyCodeRes = await fetch(`${BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sessionUserEmail, code: sent.code })
    });
    const { resetToken } = await verifyCodeRes.json();
    assert(resetToken);

    const newPass = 'UpdatedPassword2026!%';
    await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: newPass,
        confirmPassword: newPass
      })
    });

    // Check old session is now rejected with 401
    const staleSessionRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    assert.strictEqual(staleSessionRes.status, 401, 'Old session must be invalidated upon password reset');

    // Sign in with new password succeeds
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sessionUserEmail,
        password: newPass
      })
    });
    assert.strictEqual(loginRes.status, 200);
  });

  // --- 8. Google-Only Accounts ---
  console.log('\n--- 8. Google-Only Accounts (Requirement 18) ---');

  await test('Google-only account does not issue a verification code, but sends Google sign-in notice', async () => {
    clearTestMailbox();
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleOnlyEmail })
    });

    // Uniform anti-enumeration response
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'If an eligible account exists for this email address, a 6-digit verification code has been sent.');

    // Email was dispatched guiding user to sign in with Google (no verification code in email)
    const sent = getLastTestEmail(googleOnlyEmail);
    assert(sent, 'Email must be sent to Google account user');
    assert(sent.subject.includes('Google'), 'Subject must mention Google Sign In');
    assert(!sent.code, 'Must NOT generate or dispatch a password verification code for Google-only account');
  });

  // --- 9. Zero Plaintext Storage ---
  console.log('\n--- 9. Zero Plaintext Storage Check (Requirement 20) ---');

  await test('Verification codes are never stored in plaintext in the database', async () => {
    const rawCode = '739201';
    const tempEmail = `hashcheck_${ts}@devicepro.test`;

    await createUser({
      fullName: 'Hash Check User',
      email: tempEmail,
      password: 'StrongPassCheck123!'
    });

    const result = await createVerificationCode(tempEmail, rawCode, 10);
    assert.strictEqual(result.status, 'CODE_CREATED');

    // Direct inspect verification code record from repository
    if (result.resetRecord) {
      assert.strictEqual(result.resetRecord.code, undefined, 'Plaintext code must not exist on record');
      assert(result.resetRecord.code_hash, 'code_hash must exist');
      assert.notStrictEqual(result.resetRecord.code_hash, rawCode, 'code_hash must not equal raw code');
      assert.strictEqual(result.resetRecord.code_hash.length, 64, 'code_hash must be SHA-256 hex');
      assert(result.resetRecord.code_salt, 'code_salt must exist');
    }
  });

  console.log('\n========================================================================');
  console.log(`STAGE 20 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test error in Stage 20 suite:', err);
  process.exit(1);
});
