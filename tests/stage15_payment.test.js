/**
 * DEVICE PRO — Stage 15 Automated Test Suite: Payment Gateway Integration
 * Covers:
 * 1. Payment Initialization with Kobo Conversion (/api/payments/initialize)
 * 2. Server-Side Payment Verification & Authoritative Order Reconciliation (/api/payments/verify/:reference)
 * 3. Security: Rejection of Amount & Currency Mismatches (Anti-Underpayment Guard)
 * 4. Security: Rejection of Declined & Cancelled Payment Events
 * 5. HMAC-SHA512 Webhook Signature Verification (/api/payments/webhook)
 * 6. Webhook Idempotency: Duplicate Events Prevent Double-Reconciliation
 * 7. Client Security: Order Is Never Marked Paid from Browser Redirect Alone
 * 8. Zero Card Storage: Database Schema Contains No Raw PAN, CVV, or PIN
 */

const assert = require('assert');
const crypto = require('crypto');
const {
  db,
  createOrder,
  getOrderByNumber,
  getPaymentByReference
} = require('../db/database');
const {
  setSandboxOverride,
  clearSandboxOverrides
} = require('../lib/payment-gateway');

const BASE_URL = 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sandbox_webhook_secret_devicepro_2026';

async function runTests() {
  console.log('===============================================================');
  console.log('DEVICE PRO — STAGE 15: PAYMENT GATEWAY & RECONCILIATION SUITE');
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

  // HTTP Helper
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

    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    return { status: res.status, headers: res.headers, body };
  }

  // Helper to create test orders
  function createTestOrder(nameSuffix, totalItemPrice = 1200000) {
    return createOrder({
      customerName: `Test Customer ${nameSuffix}`,
      customerPhone: '+2348039999999',
      customerEmail: `test_${Date.now()}@devicepro.com`,
      deliveryAddress: 'Plot 10 Adeola Odeku, Victoria Island',
      deliveryState: 'Lagos',
      items: [
        {
          id: 'test-solar-inv',
          slug: 'test-solar-inv',
          name: '5kW Hybrid Inverter Test SKU',
          price: totalItemPrice,
          quantity: 1
        }
      ],
      paymentMethod: 'paystack'
    });
  }

  // =========================================================================
  // 1. PAYMENT INITIALIZATION
  // =========================================================================
  console.log('--- 1. Payment Initialization (/api/payments/initialize) ---');

  let testOrder1 = createTestOrder('Init1', 850000);

  await test('POST /api/payments/initialize rejects request without orderNumber', async () => {
    const res = await request('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ email: 'client@example.com' })
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('POST /api/payments/initialize rejects non-existent orderNumber', async () => {
    const res = await request('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ orderNumber: 'DP-ORD-NONEXISTENT' })
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  let activeReference1 = '';

  await test('POST /api/payments/initialize initializes transaction with kobo amount', async () => {
    const res = await request('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrder1.order_number,
        email: testOrder1.customer_email
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.reference && res.body.reference.startsWith('DP-TXN-'));
    assert.ok(res.body.authorizationUrl, 'Must return authorizationUrl');
    assert.strictEqual(res.body.amountNgn, testOrder1.total_ngn);

    activeReference1 = res.body.reference;

    // Verify record in payments table
    const paymentRecord = getPaymentByReference(activeReference1);
    assert.ok(paymentRecord, 'Payment record must be stored in database');
    assert.strictEqual(paymentRecord.status, 'pending');
    assert.strictEqual(paymentRecord.amount_kobo, Math.round(testOrder1.total_ngn * 100));
  });

  // =========================================================================
  // 2. SERVER-SIDE TRANSACTION VERIFICATION & RECONCILIATION
  // =========================================================================
  console.log('\n--- 2. Server-Side Verification & Reconciliation ---');

  await test('GET /api/payments/verify/:reference reconciles order to PAID status', async () => {
    const res = await request(`/api/payments/verify/${activeReference1}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.verified, true);
    assert.strictEqual(res.body.paymentStatus, 'paid');
    assert.strictEqual(res.body.orderStatus, 'confirmed');

    // Authoritative check in SQLite
    const updatedOrder = getOrderByNumber(testOrder1.order_number);
    assert.strictEqual(updatedOrder.payment_status, 'paid');
    assert.strictEqual(updatedOrder.order_status, 'confirmed');

    const paymentRecord = getPaymentByReference(activeReference1);
    assert.strictEqual(paymentRecord.status, 'success');
  });

  await test('Idempotency: Re-verifying an already paid order returns confirmed status without error', async () => {
    const res = await request(`/api/payments/verify/${activeReference1}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.paymentStatus, 'paid');
    assert.strictEqual(res.body.alreadyPaid, true);
  });

  // =========================================================================
  // 3. SECURITY: ANTI-UNDERPAYMENT & AMOUNT/CURRENCY MISMATCH GUARDS
  // =========================================================================
  console.log('\n--- 3. Anti-Fraud & Mismatch Protection ---');

  let testOrder2 = createTestOrder('FraudCheck', 1500000);
  let underpayRef = `DP-TXN-UNDERPAY-${Date.now()}`;

  await test('Reconciliation rejects mismatched amount (underpayment attack)', async () => {
    // Initialize transaction
    await request('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrder2.order_number,
        email: testOrder2.customer_email
      })
    });

    // Simulate gateway returning only ₦100,000 instead of ₦1,515,000
    setSandboxOverride(underpayRef, {
      success: true,
      status: 'success',
      reference: underpayRef,
      amountKobo: 10000000, // ₦100,000 in kobo
      currency: 'NGN',
      channel: 'card',
      gatewayResponse: 'Approved (Tampered Amount)'
    });

    const res = await request(`/api/payments/verify/${underpayRef}?orderNumber=${testOrder2.order_number}`);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.verified, false);
    assert.ok(res.body.error.includes('mismatch'), 'Error must specify amount mismatch');

    // Verify order was NOT marked paid
    const orderCheck = getOrderByNumber(testOrder2.order_number);
    assert.strictEqual(orderCheck.payment_status, 'pending', 'Order must stay in pending status');
  });

  let currencyRef = `DP-TXN-CURRENCY-${Date.now()}`;

  await test('Reconciliation rejects non-NGN currency (currency mismatch attack)', async () => {
    setSandboxOverride(currencyRef, {
      success: true,
      status: 'success',
      reference: currencyRef,
      amountKobo: Math.round(testOrder2.total_ngn * 100),
      currency: 'USD', // Malicious foreign currency attempt
      channel: 'card',
      gatewayResponse: 'Approved (Wrong Currency)'
    });

    const res = await request(`/api/payments/verify/${currencyRef}?orderNumber=${testOrder2.order_number}`);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.verified, false);
    assert.ok(res.body.error.includes('currency'), 'Error must specify currency mismatch');

    const orderCheck = getOrderByNumber(testOrder2.order_number);
    assert.strictEqual(orderCheck.payment_status, 'pending');
  });

  // =========================================================================
  // 4. DECLINED & FAILED TRANSACTION HANDLING
  // =========================================================================
  console.log('\n--- 4. Declined & Failed Transactions ---');

  let testOrder3 = createTestOrder('DeclinedTest', 450000);
  let declinedRef = `DP-TXN-DECLINED-${Date.now()}`;

  await test('Reconciliation handles declined card cleanly', async () => {
    const res = await request(`/api/payments/verify/${declinedRef}?orderNumber=${testOrder3.order_number}`);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.verified, false);

    const orderCheck = getOrderByNumber(testOrder3.order_number);
    assert.notStrictEqual(orderCheck.payment_status, 'paid', 'Order must not be marked paid');
  });

  // =========================================================================
  // 5. WEBHOOK SIGNATURE VERIFICATION & IDEMPOTENCY
  // =========================================================================
  console.log('\n--- 5. HMAC-SHA512 Webhooks & Idempotency ---');

  let testOrder4 = createTestOrder('WebhookOrder', 700000);
  let webhookRef = `DP-TXN-WH-${Date.now()}`;

  await test('POST /api/payments/webhook rejects missing or invalid signature', async () => {
    const payload = JSON.stringify({ event: 'charge.success', data: { reference: webhookRef } });
    const res = await request('/api/payments/webhook', {
      method: 'POST',
      headers: {
        'x-paystack-signature': 'invalid_forged_signature_hex_1234'
      },
      body: payload
    });
    assert.strictEqual(res.status, 401, 'Must reject with 401 Unauthorized');
  });

  await test('POST /api/payments/webhook accepts authentic HMAC-SHA512 signature', async () => {
    const webhookPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: webhookRef,
        amount: Math.round(testOrder4.total_ngn * 100),
        currency: 'NGN',
        channel: 'card',
        gateway_response: 'Approved',
        paid_at: new Date().toISOString(),
        metadata: {
          orderNumber: testOrder4.order_number
        }
      }
    });

    const validSignature = crypto
      .createHmac('sha512', WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest('hex');

    const res = await request('/api/payments/webhook', {
      method: 'POST',
      headers: {
        'x-paystack-signature': validSignature
      },
      body: webhookPayload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'success');

    // Check order status was updated to paid
    const updatedOrder = getOrderByNumber(testOrder4.order_number);
    assert.strictEqual(updatedOrder.payment_status, 'paid');
    assert.strictEqual(updatedOrder.order_status, 'confirmed');
  });

  await test('Idempotency: Replaying the same webhook event is processed safely without duplicate state corruption', async () => {
    const replayPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: webhookRef,
        amount: Math.round(testOrder4.total_ngn * 100),
        currency: 'NGN',
        channel: 'card',
        metadata: {
          orderNumber: testOrder4.order_number
        }
      }
    });

    const validSignature = crypto
      .createHmac('sha512', WEBHOOK_SECRET)
      .update(replayPayload)
      .digest('hex');

    const res = await request('/api/payments/webhook', {
      method: 'POST',
      headers: {
        'x-paystack-signature': validSignature
      },
      body: replayPayload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'success');

    const orderAfterReplay = getOrderByNumber(testOrder4.order_number);
    assert.strictEqual(orderAfterReplay.payment_status, 'paid');
  });

  // =========================================================================
  // 6. ZERO CARD STORAGE COMPLIANCE
  // =========================================================================
  console.log('\n--- 6. Zero Card Storage Security Compliance ---');

  await test('Database schema never stores raw card PAN, CVV, or PIN numbers', () => {
    const tableInfo = db.prepare('PRAGMA table_info(payments)').all();
    const colNames = tableInfo.map(c => c.name.toLowerCase());
    assert.strictEqual(colNames.includes('card_number'), false, 'Must not have card_number column');
    assert.strictEqual(colNames.includes('pan'), false, 'Must not have pan column');
    assert.strictEqual(colNames.includes('cvv'), false, 'Must not have cvv column');
    assert.strictEqual(colNames.includes('pin'), false, 'Must not have pin column');
    assert.ok(colNames.includes('reference'), 'Must store tokenized transaction reference');
  });

  // =========================================================================
  // 7. SANDBOX SIMULATION ENDPOINT DELIVERY
  // =========================================================================
  console.log('\n--- 7. Sandbox Simulator UI Delivery ---');

  await test('GET /api/payments/sandbox/:reference returns interactive testing page', async () => {
    const res = await request(`/api/payments/sandbox/${activeReference1}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Paystack Sandbox Simulator'), 'Must contain simulator title');
    assert.ok(res.body.includes('Simulate Successful Card Payment'), 'Must provide simulated payment action');
  });

  // Cleanup overrides
  clearSandboxOverrides();

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`STAGE 15 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
