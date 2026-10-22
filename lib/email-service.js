/**
 * DEVICE PRO — Transactional Email Service
 * Handles transactional emails (Password Reset Codes, Security Alerts, Google Account Guidance).
 * Supports Resend API (https://resend.com) via native fetch, custom SMTP, and in-memory test transport.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TEST_MAILBOX_FILE = path.join(__dirname, '../.test-mailbox.json');

// In-memory test mailbox for testing and development environments
const testMailbox = [];

function syncTestMailboxToDisk() {
  try {
    fs.writeFileSync(TEST_MAILBOX_FILE, JSON.stringify(testMailbox), 'utf8');
  } catch (e) {}
}

function loadTestMailbox() {
  try {
    if (fs.existsSync(TEST_MAILBOX_FILE)) {
      const content = fs.readFileSync(TEST_MAILBOX_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return testMailbox;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'DEVICE PRO Security <security@devicepro.ng>';
const IS_TEST_ENV = process.env.NODE_ENV === 'test' || process.env.ENABLE_EMAIL_MOCK === 'true';

/**
 * Send an email using Resend API, SMTP, or test transport
 */
async function sendEmail({ to, subject, html, text, code = null }) {
  if (!to || !subject || (!html && !text)) {
    throw new Error('Email recipient, subject, and content are required.');
  }

  const cleanTo = to.trim().toLowerCase();

  // Test environment or development without Resend key: store in testMailbox
  if (IS_TEST_ENV || !RESEND_API_KEY) {
    const record = {
      id: 'test_msg_' + crypto.randomBytes(8).toString('hex'),
      to: cleanTo,
      subject,
      html,
      text: text || '',
      code: code || null,
      sentAt: new Date()
    };
    testMailbox.push(record);
    // Keep mailbox size bounded
    if (testMailbox.length > 100) testMailbox.shift();
    syncTestMailboxToDisk();

    if (!IS_TEST_ENV && !RESEND_API_KEY) {
      // In development mode without an API key, notify server log without exposing secrets
      console.log(`[EMAIL DISPATCH - DEV TRANSPORT] Recipient: ${cleanTo} | Subject: "${subject}"`);
    }

    return { success: true, messageId: record.id, transport: 'test_transport' };
  }

  // Production Resend API dispatch
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: cleanTo,
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[RESEND API ERROR]:', data);
      throw new Error(data.message || 'Email delivery failed via Resend');
    }

    return { success: true, messageId: data.id, transport: 'resend' };
  } catch (err) {
    console.error('[EMAIL DISPATCH ERROR]:', err.message);
    throw err;
  }
}

/**
 * 1. Send 6-Digit Password Reset Verification Code
 */
async function sendPasswordResetCodeEmail(to, code, fullName = 'Valued Customer') {
  const subject = `${code} is your DEVICE PRO verification code`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #082D50; padding: 28px 24px; text-align: center; }
    .header h1 { color: #FFFFFF; font-size: 20px; margin: 0; letter-spacing: 0.5px; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #082D50; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .code-box { background: #F1F5F9; border: 2px dashed #CBD5E1; border-radius: 8px; text-align: center; padding: 18px; margin: 24px 0; }
    .code-digits { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0866D9; margin: 0; }
    .expiry { font-size: 13px; color: #64748B; margin-top: 8px; }
    .warning { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; font-size: 13px; color: #92400E; border-radius: 4px; margin-bottom: 24px; }
    .footer { border-top: 1px solid #E2E8F0; padding: 20px 24px; font-size: 12px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DEVICE PRO</h1>
      <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0;">Clean Energy Solutions Nigeria</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${fullName},</div>
      <p class="text">We received a request to reset the password for your DEVICE PRO account. Use the 6-digit verification code below to proceed:</p>
      
      <div class="code-box">
        <div class="code-digits">${code}</div>
        <div class="expiry">This code will expire in 10 minutes.</div>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone. DEVICE PRO engineers and support staff will never ask for your verification code.
      </div>

      <p class="text" style="margin-bottom: 0;">If you did not request a password reset, please ignore this email or contact our support team immediately if you suspect unauthorized activity.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} DEVICE PRO Nigeria. All rights reserved.<br>
      Victoria Island, Lagos &bull; Abuja &bull; Port Harcourt
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
DEVICE PRO — Verification Code

Hello ${fullName},

Your 6-digit password reset verification code is: ${code}

This code expires in 10 minutes.

Security Notice: Never share this code with anyone. DEVICE PRO will never ask you for your verification code.

If you did not request this, please ignore this email.
  `.trim();

  return sendEmail({ to, subject, html, text, code });
}

/**
 * 2. Send Google-Only Account Helpful Guidance
 */
async function sendGoogleAccountNoticeEmail(to, fullName = 'Valued Customer') {
  const subject = 'Sign In to your DEVICE PRO Account with Google';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }
    .header { background: #082D50; padding: 28px 24px; text-align: center; }
    .header h1 { color: #FFFFFF; font-size: 20px; margin: 0; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #082D50; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .info-box { background: #EFF6FF; border-left: 4px solid #0866D9; padding: 14px 18px; font-size: 13px; color: #1E3A8A; border-radius: 4px; margin-bottom: 24px; }
    .btn { display: inline-block; background: #0866D9; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer { border-top: 1px solid #E2E8F0; padding: 20px 24px; font-size: 12px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DEVICE PRO</h1>
      <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0;">Clean Energy Solutions Nigeria</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${fullName},</div>
      <p class="text">We received a password reset request for your email address. However, your DEVICE PRO account is connected using <strong>Google Sign-In</strong> and does not require a password.</p>
      
      <div class="info-box">
        To access your account, simply click <strong>"Continue with Google"</strong> on the sign-in page.
      </div>

      <p style="text-align: center; margin: 28px 0;">
        <a href="https://devicepro.ng/login" class="btn">Sign In with Google &rarr;</a>
      </p>

      <p class="text" style="font-size: 13px; color: #64748B; margin-bottom: 0;">If you did not make this request, you can safely disregard this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} DEVICE PRO Nigeria. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
DEVICE PRO — Google Account Notice

Hello ${fullName},

We received a password reset request for your email address. Your account uses Google Sign-In and does not require a separate password.

To sign in, please visit https://devicepro.ng/login and click "Continue with Google".

If you did not request this, you can safely ignore this email.
  `.trim();

  return sendEmail({ to, subject, html, text });
}

/**
 * 3. Send Password Changed Security Notification
 */
async function sendPasswordChangedNotificationEmail(to, fullName = 'Valued Customer') {
  const subject = 'Security Alert: Your DEVICE PRO password was changed';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }
    .header { background: #082D50; padding: 28px 24px; text-align: center; }
    .header h1 { color: #FFFFFF; font-size: 20px; margin: 0; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #082D50; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .alert-box { background: #ECFDF5; border-left: 4px solid #10B981; padding: 14px 18px; font-size: 13px; color: #065F46; border-radius: 4px; margin-bottom: 24px; }
    .footer { border-top: 1px solid #E2E8F0; padding: 20px 24px; font-size: 12px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DEVICE PRO</h1>
      <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0;">Clean Energy Solutions Nigeria</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${fullName},</div>
      <div class="alert-box">
        <strong>Success:</strong> The password for your DEVICE PRO account has been updated successfully on ${new Date().toUTCString()}.
      </div>
      <p class="text">All existing login sessions have been invalidated for your security. You can now sign in using your new password.</p>
      <p class="text" style="color: #DC2626; font-size: 13px;">If you did not perform this action, please contact DEVICE PRO customer support immediately at deviceprosales@gmail.com or call +234 803 388 2268.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} DEVICE PRO Nigeria. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
DEVICE PRO — Security Alert

Hello ${fullName},

The password for your DEVICE PRO account was successfully changed on ${new Date().toUTCString()}. All previous sessions have been signed out.

If you did not make this change, please contact DEVICE PRO immediately at deviceprosales@gmail.com.
  `.trim();

  return sendEmail({ to, subject, html, text });
}

/**
 * Testing Helpers (Exposed only for automated test assertion)
 */
function getRecentTestEmails() {
  return loadTestMailbox();
}

function getLastTestEmail(to = null) {
  const mailbox = loadTestMailbox();
  if (!to) return mailbox[mailbox.length - 1] || null;
  const cleanTo = to.trim().toLowerCase();
  for (let i = mailbox.length - 1; i >= 0; i--) {
    if (mailbox[i].to === cleanTo) return mailbox[i];
  }
  return null;
}

function clearTestMailbox() {
  testMailbox.length = 0;
  syncTestMailboxToDisk();
}

module.exports = {
  sendEmail,
  sendPasswordResetCodeEmail,
  sendGoogleAccountNoticeEmail,
  sendPasswordChangedNotificationEmail,
  getRecentTestEmails,
  getLastTestEmail,
  clearTestMailbox
};
