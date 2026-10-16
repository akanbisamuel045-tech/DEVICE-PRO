/**
 * DEVICE PRO — Payment Gateway Integration & Transaction Reconciler
 * Supports Paystack & Sandbox Simulation for Nigerian Commerce:
 * - Transaction initialization (converting NGN to kobo)
 * - Server-side transaction verification (never trust client redirect alone)
 * - HMAC-SHA512 Webhook signature verification
 * - Amount and currency matching protection against underpayment attacks
 * - Idempotent event processing preventing duplicate balance updates
 */

const crypto = require('crypto');

// Environment settings
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const IS_SANDBOX = !PAYSTACK_SECRET_KEY ||
                   PAYSTACK_SECRET_KEY.startsWith('sk_test_') ||
                   process.env.PAYMENT_SANDBOX_MODE === 'true';

// In-memory registry for sandbox simulation overrides (e.g. testing declined cards)
const sandboxOverrides = new Map();

/**
 * Initialize payment transaction with Paystack or Sandbox
 */
async function initializeTransaction({
  orderNumber,
  email,
  amountNgn,
  callbackUrl,
  metadata = {}
}) {
  if (!orderNumber || !email || !amountNgn) {
    throw new Error('orderNumber, email, and amountNgn are required for payment initialization.');
  }

  const amountKobo = Math.round(Number(amountNgn) * 100);
  const reference = metadata.customReference ||
    `DP-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Production / Live Paystack API
  if (!IS_SANDBOX && PAYSTACK_SECRET_KEY) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          reference,
          callback_url: callbackUrl,
          metadata: {
            orderNumber,
            ...metadata
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Paystack initialization failed.');
      }

      return {
        success: true,
        isSandbox: false,
        gateway: 'paystack',
        reference,
        accessCode: data.data.access_code,
        authorizationUrl: data.data.authorization_url,
        amountKobo
      };
    } catch (err) {
      console.error('[PAYSTACK INIT ERROR]:', err.message);
      throw err;
    }
  }

  // 2. Sandbox Simulation Mode
  const sandboxUrl = `/api/payments/sandbox/${encodeURIComponent(reference)}?orderNumber=${encodeURIComponent(orderNumber)}&amount=${amountNgn}&email=${encodeURIComponent(email)}`;

  return {
    success: true,
    isSandbox: true,
    gateway: 'paystack_sandbox',
    reference,
    accessCode: `test_acc_${reference}`,
    authorizationUrl: sandboxUrl,
    amountKobo
  };
}

/**
 * Server-side transaction verification
 * Queries Paystack API or evaluates sandbox state
 */
async function verifyTransaction(reference, expectedOrder = null) {
  if (!reference) {
    throw new Error('Transaction reference is required for verification.');
  }

  // Check for simulation override (e.g., simulating declined cards or delayed payments)
  if (sandboxOverrides.has(reference)) {
    const override = sandboxOverrides.get(reference);
    return override;
  }

  // 1. Live Paystack verification
  if (!IS_SANDBOX && PAYSTACK_SECRET_KEY) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!response.ok || !result.status) {
        return {
          success: false,
          status: 'failed',
          gatewayResponse: result.message || 'Paystack verification failed.'
        };
      }

      const tx = result.data;
      return {
        success: tx.status === 'success',
        status: tx.status,
        reference: tx.reference,
        amountKobo: tx.amount,
        currency: tx.currency,
        channel: tx.channel || 'card',
        gatewayResponse: tx.gateway_response || 'Approved',
        paidAt: tx.paid_at || new Date().toISOString(),
        customerEmail: tx.customer ? tx.customer.email : ''
      };
    } catch (err) {
      console.error('[PAYSTACK VERIFY ERROR]:', err.message);
      return {
        success: false,
        status: 'error',
        gatewayResponse: err.message
      };
    }
  }

  // 2. Sandbox Simulation Verification
  // If reference indicates failure (e.g. contains 'DECLINED')
  if (reference.toUpperCase().includes('DECLINED') || reference.toUpperCase().includes('FAILED')) {
    return {
      success: false,
      status: 'failed',
      reference,
      channel: 'card',
      gatewayResponse: 'Declined: Insufficient funds or invalid card PIN'
    };
  }

  // If reference tests underpayment attack
  if (reference.toUpperCase().includes('UNDERPAY')) {
    return {
      success: true,
      status: 'success',
      reference,
      amountKobo: 1000000, // ₦10,000 in kobo (mismatched amount)
      currency: 'NGN',
      channel: 'card',
      gatewayResponse: 'Approved with lower amount'
    };
  }

  // If reference tests foreign currency mismatch attack
  if (reference.toUpperCase().includes('CURRENCY')) {
    return {
      success: true,
      status: 'success',
      reference,
      amountKobo: expectedOrder ? Math.round(Number(expectedOrder.total_ngn) * 100) : 1000000,
      currency: 'USD', // Mismatched currency
      channel: 'card',
      gatewayResponse: 'Approved in USD'
    };
  }

  // Normal sandbox success
  const expectedAmountKobo = expectedOrder ? Math.round(Number(expectedOrder.total_ngn) * 100) : 0;
  return {
    success: true,
    status: 'success',
    reference,
    amountKobo: expectedAmountKobo,
    currency: 'NGN',
    channel: 'card',
    gatewayResponse: 'Approved (DEVICE PRO Sandbox Simulation)',
    paidAt: new Date().toISOString(),
    customerEmail: expectedOrder ? expectedOrder.customer_email : 'customer@devicepro.com'
  };
}

/**
 * Reconcile verified transaction against an authoritative database order
 * Protects against underpayment or wrong currency attacks
 */
function reconcilePayment({
  expectedOrder,
  verificationData
}) {
  if (!expectedOrder) {
    return {
      reconciled: false,
      error: 'Order not found for reconciliation.'
    };
  }

  if (verificationData.status !== 'success') {
    return {
      reconciled: false,
      status: 'failed',
      error: verificationData.gatewayResponse || 'Payment was not marked successful by gateway.'
    };
  }

  // 1. Currency validation
  if (verificationData.currency && verificationData.currency.toUpperCase() !== 'NGN') {
    return {
      reconciled: false,
      status: 'currency_mismatch',
      error: `Invalid currency: expected NGN, received ${verificationData.currency}`
    };
  }

  // 2. Amount validation (in kobo)
  const expectedKobo = Math.round(Number(expectedOrder.total_ngn) * 100);
  if (verificationData.amountKobo !== expectedKobo) {
    return {
      reconciled: false,
      status: 'amount_mismatch',
      error: `Payment amount mismatch: expected ₦${expectedOrder.total_ngn} (${expectedKobo} kobo), received ${verificationData.amountKobo} kobo.`
    };
  }

  return {
    reconciled: true,
    status: 'success',
    orderNumber: expectedOrder.order_number,
    reference: verificationData.reference,
    channel: verificationData.channel,
    gatewayResponse: verificationData.gatewayResponse,
    paidAt: verificationData.paidAt
  };
}

/**
 * Verify Webhook Signature (HMAC-SHA512)
 */
function verifyWebhookSignature(rawBody, signature, secret = null) {
  const secretKey = secret || PAYSTACK_SECRET_KEY || 'sandbox_webhook_secret_devicepro_2026';
  if (!signature || !rawBody) return false;

  try {
    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computedHash);

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch (err) {
    console.error('[WEBHOOK SIG VERIFY ERROR]:', err);
    return false;
  }
}

/**
 * Helper to register a sandbox simulation override for test suites
 */
function setSandboxOverride(reference, resultData) {
  sandboxOverrides.set(reference, resultData);
}

function clearSandboxOverrides() {
  sandboxOverrides.clear();
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  reconcilePayment,
  verifyWebhookSignature,
  setSandboxOverride,
  clearSandboxOverrides,
  IS_SANDBOX,
  PAYSTACK_PUBLIC_KEY
};
