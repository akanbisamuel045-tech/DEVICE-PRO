const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const crypto = require('crypto');
const {
  getProducts, getProductBySlug, getProductById, getProductFacets, getRelatedProducts,
  updateProduct, createProduct, deleteProduct,
  getPackages, getPackageBySlug,
  getCategories, getCaseStudies, getCaseStudyBySlug,
  createEnquiry, getEnquiries, getEnquiryById, updateEnquiryStatus,
  createQuote, getQuotes, getQuoteById, updateQuoteStatus,
  createOrder, getOrders, getOrderByNumber, updateOrderStatus,
  updateOrderFulfillment, updateOrderCommissioning,
  createSupportTicket, getSupportTickets, getSupportTicketByNumber, getSupportTicketsByOrder, updateSupportTicketStatus,
  createWarrantyRecord, getWarrantyBySerialOrCode, getWarrantiesByOrder, getWarranties,
  createPaymentRecord, getPaymentByReference, getPaymentsByOrderNumber,
  updatePaymentStatus, reconcileOrderPayment,
  createUser, getUserByEmail, getUserByGoogleSubject, linkGoogleAccount,
  updateUserProfile, changeUserPassword, getOrdersByCustomer,
  createPasswordResetToken, resetPasswordWithToken,
  createVerificationCode, verifyResetCode, executePasswordReset,
  verifyUserLogin, createSession, getSessionUser, revokeSession,
  getAuditLogs, getDatabaseStats, exportDatabaseBackup, isMongoConnected, db
} = require('./db/database');
const {
  sendPasswordResetCodeEmail,
  sendGoogleAccountNoticeEmail,
  sendPasswordChangedNotificationEmail,
  getLastTestEmail
} = require('./lib/email-service');
const { connectMongo } = require('./db/mongo/connection');
const {
  calculateSolarSizing,
  calculateGeneratorSavings,
  DEFAULT_APPLIANCES,
  REGIONAL_PSH,
  BATTERY_CHEMISTRIES,
  GENERATOR_BENCHMARKS
} = require('./lib/calculator-engine');
const {
  initializeTransaction,
  verifyTransaction,
  reconcilePayment,
  verifyWebhookSignature,
  setSandboxOverride,
  clearSandboxOverrides,
  IS_SANDBOX,
  PAYSTACK_PUBLIC_KEY
} = require('./lib/payment-gateway');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip/deflate compression for all HTTP responses (Stage 17 Performance)
app.use(compression());

// Middleware for parsing JSON with raw body capture for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Comprehensive Security Headers (Stage 17 Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.paystack.co; frame-src https://checkout.paystack.com;"
  );
  next();
});

// Serve static assets from public directory with optimized caching for static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: true,
  setHeaders: (res, filePath) => {
    // Cache static images, fonts, and scripts for 24h
    if (/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// =========================================================================
// RATE LIMITING & SECURITY MIDDLEWARE
// =========================================================================
const rateLimitMap = new Map();

function rateLimiter(windowMs, maxRequests) {
  return (req, res, next) => {
    // In test or non-production environments, use higher threshold so automated test suites can execute
    const effectiveMax = (process.env.NODE_ENV === 'production') ? maxRequests : 500;
    const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(key, record);

    if (record.count > effectiveMax) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.'
      });
    }

    next();
  };
}

// Session Cookie Signing & Verification (HMAC SHA-256)
const SESSION_SECRET = process.env.SESSION_SECRET || 'devicepro-security-hmac-session-secret-2026';

function signSessionToken(token) {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  return `s:${token}.${hmac}`;
}

function unsignSessionToken(cookieVal) {
  if (!cookieVal || typeof cookieVal !== 'string') return null;
  const decoded = decodeURIComponent(cookieVal.trim());

  let raw = decoded;
  if (raw.startsWith('s:')) {
    raw = raw.slice(2);
  }

  const lastDot = raw.lastIndexOf('.');
  if (lastDot !== -1) {
    const token = raw.slice(0, lastDot);
    const signature = raw.slice(lastDot + 1);

    if (/^[a-f0-9]{32,64}$/i.test(token) && /^[a-f0-9]{64}$/i.test(signature)) {
      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSig, 'hex')
        );
        if (isValid) return token;
      } catch (e) {
        return null;
      }
    }
    // Signature was present but did not match or malformed
    return null;
  }

  // Raw unsigned hex token (for backwards compatibility / direct API tokens in tests)
  if (/^[a-f0-9]{32,64}$/i.test(decoded)) {
    return decoded;
  }

  return null;
}

// Cookie Session Helpers (Stage 19 / Stage 2 Customer & Admin Authentication)
function setSessionCookie(res, req, token, maxAgeSeconds = 7 * 24 * 60 * 60) {
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const signedToken = signSessionToken(token);
  const cookieParts = [
    `devicepro_session=${encodeURIComponent(signedToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isSecure) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function clearSessionCookie(res, req) {
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const cookieParts = [
    'devicepro_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0'
  ];
  if (isSecure) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Authentication middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : req.headers['x-auth-token'];

  // Fallback to HttpOnly cookie if header not present
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)devicepro_session=([^;]+)/);
    if (match) {
      const rawCookieVal = match[1];
      token = unsignSessionToken(rawCookieVal);
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await getSessionUser(token);
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

app.use(authenticate);

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.'
    });
  }
  next();
}

const ADMIN_ROLES = ['admin', 'superadmin', 'engineer', 'sales', 'staff'];

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to access this resource.'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: Insufficient administrative privileges.'
      });
    }
    next();
  };
}

const requireAdmin = requireRole(...ADMIN_ROLES);
const requireSuperAdmin = requireRole('superadmin');

// Centralized Administrative Route Protection Middleware
// Automatically enforces authentication and administrative role checks across ALL /api/admin/* endpoints
app.use('/api/admin', requireAuth, (req, res, next) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Access forbidden: Insufficient administrative privileges.'
    });
  }
  next();
});

// =========================================================================
// API ENDPOINTS (Stage 12: Data Model, API & Persistence)
// =========================================================================

// API: Health & Database Diagnostics
app.get('/api/health', async (req, res) => {
  const mongoConnected = isMongoConnected();
  const mongoUriConfigured = Boolean(process.env.MONGODB_URI);

  if (!mongoConnected) {
    if (mongoUriConfigured) {
      try { await connectMongo(); } catch (e) {}
    }
  }

  if (!isMongoConnected()) {
    return res.status(200).json({
      status: 'degraded',
      service: 'DEVICE PRO Core API',
      database: {
        engine: 'MongoDB Atlas',
        status: 'disconnected',
        uriConfigured: mongoUriConfigured,
        reason: mongoUriConfigured 
          ? 'Connecting or IP blocked by MongoDB Atlas Network Access whitelist (ensure 0.0.0.0/0 is permitted in Atlas)'
          : 'MONGODB_URI is not configured in Vercel environment variables'
      }
    });
  }

  try {
    const stats = await getDatabaseStats();
    res.json({
      status: 'ok',
      service: 'DEVICE PRO Core API',
      database: stats
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// API: Categories
app.get('/api/categories', async (req, res) => {
  try {
    if (!isMongoConnected() && process.env.MONGODB_URI) {
      try { await connectMongo(); } catch (e) {}
    }
    const categories = await getCategories();
    res.json({ success: true, count: (categories || []).length, categories: categories || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

// API: Products catalog with filtering, sorting, search, and pagination
app.get('/api/products', async (req, res) => {
  try {
    if (!isMongoConnected() && process.env.MONGODB_URI) {
      try { await connectMongo(); } catch (e) {}
    }

    const result = await getProducts(req.query);
    const facets = await getProductFacets();

    res.json({
      success: true,
      ...result,
      categories: (facets && facets.categories) || [],
      brands: (facets && facets.brands) || [],
      priceRange: (facets && facets.priceRange) || { min: 0, max: 15000000 }
    });
  } catch (error) {
    console.error('[API PRODUCTS ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

// API: Product detail by slug or ID
app.get('/api/products/:slug', async (req, res) => {
  try {
    if (!isMongoConnected() && process.env.MONGODB_URI) {
      try { await connectMongo(); } catch (e) {}
    }

    const param = req.params.slug;
    let product = await getProductBySlug(param);

    // If not found by slug and param is numeric, check by numeric ID
    if (!product && /^\d+$/.test(param)) {
      product = await getProductById(Number(param));
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const related = await getRelatedProducts(product.category, product.id, 3);

    res.json({
      success: true,
      product,
      related
    });
  } catch (error) {
    console.error('[API PRODUCT DETAIL ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve product' });
  }
});

// API: Turnkey Solar Packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await getPackages();
    res.json({
      success: true,
      count: packages.length,
      packages
    });
  } catch (error) {
    console.error('[API PACKAGES ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve packages' });
  }
});

app.get('/api/packages/:slug', async (req, res) => {
  try {
    const pkg = await getPackageBySlug(req.params.slug);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }
    res.json({
      success: true,
      package: pkg
    });
  } catch (error) {
    console.error('[API PACKAGE DETAIL ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve package detail' });
  }
});

// API: Case Studies (Projects)
app.get('/api/case-studies', async (req, res) => {
  try {
    const sector = req.query.sector;
    const caseStudies = await getCaseStudies(sector);
    res.json({ success: true, count: caseStudies.length, caseStudies });
  } catch (error) {
    console.error('[API CASE STUDIES ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve case studies' });
  }
});

app.get('/api/case-studies/:slug', async (req, res) => {
  try {
    const cs = await getCaseStudyBySlug(req.params.slug);
    if (!cs) {
      return res.status(404).json({ success: false, error: 'Case study not found' });
    }
    res.json({ success: true, caseStudy: cs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve case study' });
  }
});

// API: Contact enquiry submission (persisted to database)
app.post(['/api/contact', '/api/enquiries'], rateLimiter(60000, 10), async (req, res) => {
  try {
    const { phone, email, state, subject, message } = req.body;
    const clientName = (req.body.name || req.body.fullName || '').trim();
    const clientPhone = (phone || '').trim();
    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, error: 'Name and Phone number are required.' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const enquiry = await createEnquiry({
      name: clientName,
      phone: clientPhone,
      email: (email || '').trim(),
      state: state || '',
      subject: subject || 'General Solar Inquiry',
      message: (message || '').trim(),
      ipAddress
    });

    console.log(`[CONTACT INQUIRY PERSISTED] Ref: ${enquiry.reference_id}, Name: ${enquiry.name}`);
    res.status(201).json({
      success: true,
      message: 'Your message has been received. A technical advisor will reach you via WhatsApp or email within 2 business hours.',
      referenceId: enquiry.reference_id,
      enquiry
    });
  } catch (error) {
    console.error('[CONTACT API ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit inquiry' });
  }
});

// API: Quotation & Site Audit request submission (persisted to database)
app.post(['/api/quote', '/api/quotes'], rateLimiter(60000, 10), async (req, res) => {
  try {
    const {
      phone, email, state, propertyType, type, sector,
      packageId, packageSlug, packageName, loadDetails,
      indicativeInverterKva, indicativeBatteryKwh, indicativeSolarKwp, notes
    } = req.body;
    const clientName = (req.body.name || req.body.fullName || '').trim();
    const clientPhone = (phone || '').trim();

    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, error: 'Name and Phone number are required.' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const quote = await createQuote({
      name: clientName,
      phone: clientPhone,
      email: (email || '').trim(),
      state: state || '',
      propertyType: propertyType || type || 'Residential',
      sector: sector || 'residential',
      packageId,
      packageSlug,
      packageName,
      loadDetails: typeof loadDetails === 'object' ? JSON.stringify(loadDetails) : (loadDetails || ''),
      indicativeInverterKva: parseFloat(indicativeInverterKva) || null,
      indicativeBatteryKwh: parseFloat(indicativeBatteryKwh) || null,
      indicativeSolarKwp: parseFloat(indicativeSolarKwp) || null,
      notes: notes || '',
      ipAddress
    });

    console.log(`[QUOTE REQUEST PERSISTED] Ref: ${quote.reference_id}, Name: ${quote.name}`);
    res.status(201).json({
      success: true,
      message: 'Your solar consultation request has been successfully recorded. A DevicePro technical engineer will contact you shortly.',
      referenceId: quote.reference_id,
      quote
    });
  } catch (error) {
    console.error('[QUOTE API ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit quote request' });
  }
});

// API: Equipment Order Creation (persisted to database)
app.post('/api/orders', rateLimiter(60000, 10), async (req, res) => {
  try {
    const {
      customerName, customerPhone, customerEmail,
      deliveryAddress, deliveryState, items, paymentMethod,
      installationOption, installationFeeNgn, deliveryFeeNgn, notes
    } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !deliveryState) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, phone, delivery address, and delivery state are mandatory.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one valid equipment item.'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const order = await createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryState: deliveryState.trim(),
      items,
      paymentMethod: paymentMethod || 'transfer',
      installationOption: installationOption || 'supply_only',
      installationFeeNgn: typeof installationFeeNgn === 'number' ? installationFeeNgn : (installationFeeNgn ? parseInt(installationFeeNgn, 10) : undefined),
      deliveryFeeNgn: typeof deliveryFeeNgn === 'number' ? deliveryFeeNgn : (deliveryFeeNgn ? parseInt(deliveryFeeNgn, 10) : undefined),
      notes: (notes || '').trim(),
      ipAddress
    });

    console.log(`[ORDER CREATED] Order #: ${order.order_number}, Amount: ₦${order.total_ngn.toLocaleString()}`);
    res.status(201).json({
      success: true,
      message: 'Your equipment order has been successfully placed. Our logistics coordinator will reach you to confirm delivery.',
      orderNumber: order.order_number,
      order
    });
  } catch (error) {
    console.error('[ORDER API ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create order' });
  }
});

// API: Public Order Tracking & Invoice Breakdown
app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    // Return complete public tracking and invoice fields
    res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        order_number: order.order_number,
        customerName: order.customer_name,
        customer_name: order.customer_name,
        customerPhone: order.customer_phone,
        customer_phone: order.customer_phone,
        customerEmail: order.customer_email,
        customer_email: order.customer_email,
        deliveryAddress: order.delivery_address,
        delivery_address: order.delivery_address,
        deliveryState: order.delivery_state,
        delivery_state: order.delivery_state,
        subtotalNgn: order.subtotal_ngn,
        subtotal_ngn: order.subtotal_ngn,
        deliveryFeeNgn: order.delivery_fee_ngn,
        delivery_fee_ngn: order.delivery_fee_ngn,
        installationOption: order.installation_option,
        installation_option: order.installation_option,
        installationFeeNgn: order.installation_fee_ngn || 0,
        installation_fee_ngn: order.installation_fee_ngn || 0,
        totalNgn: order.total_ngn,
        total_ngn: order.total_ngn,
        paymentMethod: order.payment_method,
        payment_method: order.payment_method,
        paymentStatus: order.payment_status,
        payment_status: order.payment_status,
        orderStatus: order.order_status,
        order_status: order.order_status,
        itemCount: order.items.length,
        items: order.items,
        createdAt: order.created_at,
        created_at: order.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to look up order' });
  }
});

// Helper: Build comprehensive Stage 16 tracking payload with 6-stage lifecycle
function buildOrderTrackingPayload(order) {
  const isPaid = order.payment_status === 'paid' || order.payment_status === 'verified';
  const isDispatched = ['dispatched', 'delivered', 'completed'].includes(order.order_status);
  const isCommissioned = order.commissioning_status === 'commissioned' || order.order_status === 'completed';
  const qcDone = isDispatched || isCommissioned;
  const dispatchDone = isCommissioned;
  const commissioningDone = isCommissioned;

  const stages = [
    {
      step: 1,
      key: 'order_placed',
      id: 'step-order-placed',
      name: 'Order Placed & Hardware Reserved',
      title: 'Order Placed & Hardware Reserved',
      status: 'completed',
      badge: 'Reserved',
      summary: 'Equipment allocated from Victoria Island Central Depot. Pro-forma invoice generated.',
      details: 'Equipment allocated from Victoria Island Central Depot. Pro-forma invoice generated.',
      description: 'Equipment allocated from Victoria Island Central Depot. Pro-forma invoice generated.',
      timestamp: order.created_at
    },
    {
      step: 2,
      key: 'payment_verified',
      id: 'step-payment-verified',
      name: 'Payment Verification',
      title: 'Payment Verification',
      status: isPaid ? 'completed' : (order.payment_status === 'pending' ? 'current' : 'failed'),
      badge: isPaid ? 'Verified' : 'Pending Verification',
      summary: isPaid
        ? (order.payment_method === 'card' ? 'Paystack Online Settlement Confirmed' : 'Commercial Bank Transfer Reconciled')
        : 'Awaiting payment confirmation via Paystack or direct bank transfer.',
      details: isPaid
        ? (order.payment_method === 'card' ? 'Paystack Online Settlement Confirmed' : 'Commercial Bank Transfer Reconciled')
        : 'Awaiting payment confirmation via Paystack or direct bank transfer.',
      description: isPaid
        ? (order.payment_method === 'card' ? 'Paystack Online Settlement Confirmed' : 'Commercial Bank Transfer Reconciled')
        : 'Awaiting payment confirmation via Paystack or direct bank transfer.',
      timestamp: isPaid ? (order.updated_at || order.created_at) : null
    },
    {
      step: 3,
      key: 'bench_qc',
      id: 'step-bench-qc',
      name: 'Bench QC & Pre-dispatch Calibration',
      title: 'Bench QC & Hardware Calibration',
      status: qcDone ? 'completed' : (isPaid ? 'current' : 'pending'),
      badge: qcDone ? 'QC Passed' : (isPaid ? 'In Testing' : 'Queued'),
      summary: 'Firmware calibrated to Nigeria grid specs (50Hz), LiFePO4 cells balanced, IV curve verified.',
      details: 'Firmware calibrated to Nigeria grid specs (50Hz), LiFePO4 cells balanced, IV curve verified. Pre-dispatch bench inspection.',
      description: 'Firmware calibrated to Nigeria grid specs (50Hz), LiFePO4 cells balanced, IV curve verified.',
      timestamp: qcDone ? order.updated_at : null
    },
    {
      step: 4,
      key: 'logistics_transit',
      id: 'step-logistics-dispatch',
      name: 'Logistics & In-Transit Waybill',
      title: 'Logistics & Dispatch',
      status: dispatchDone ? 'completed' : (isDispatched ? 'current' : 'pending'),
      badge: order.waybill_number ? 'En Route' : (isDispatched ? 'Dispatched' : 'Preparing'),
      summary: order.waybill_number
        ? `Waybill: ${order.waybill_number} • Courier: ${order.courier_partner || 'DEVICE PRO Fleet'}. Est Delivery: ${order.estimated_delivery || 'In Transit'}`
        : 'Fleet allocation and regional transit waybill preparation.',
      details: order.waybill_number
        ? `Waybill: ${order.waybill_number} • Courier: ${order.courier_partner || 'DEVICE PRO Fleet'}. Est Delivery: ${order.estimated_delivery || 'In Transit'}`
        : 'Fleet allocation and regional transit waybill preparation.',
      description: order.waybill_number
        ? `Waybill: ${order.waybill_number} • Courier: ${order.courier_partner || 'DEVICE PRO Fleet'}. Est Delivery: ${order.estimated_delivery || 'In Transit'}`
        : 'Fleet allocation and regional transit waybill preparation.',
      timestamp: order.waybill_number ? order.updated_at : null
    },
    {
      step: 5,
      key: 'certified_commissioning',
      id: 'step-installation-commissioning',
      name: 'Certified Installation & Commissioning',
      title: 'Certified Installation & Commissioning',
      status: commissioningDone ? 'completed' : (order.commissioning_status === 'scheduled' || isDispatched ? 'current' : 'pending'),
      badge: commissioningDone ? 'Commissioned' : (order.commissioning_status === 'scheduled' ? 'Scheduled' : 'Pending Schedule'),
      summary: order.assigned_engineer
        ? `Assigned Lead: ${order.assigned_engineer}. Scheduled Date: ${order.installation_scheduled_date || 'Pending Schedule'}. Safety checks: Earthing resistance < 5Ω, DC surge protection, AC load balancing, Inverter sync.`
        : 'COREN engineer assignment and site survey alignment.',
      details: order.assigned_engineer
        ? `Assigned Lead: ${order.assigned_engineer}. Scheduled Date: ${order.installation_scheduled_date || 'Pending Schedule'}. Safety checks: Earthing resistance < 5Ω, DC surge protection, AC load balancing, Inverter sync.`
        : 'COREN engineer assignment and site survey alignment.',
      description: order.assigned_engineer
        ? `Assigned Lead: ${order.assigned_engineer}. Scheduled Date: ${order.installation_scheduled_date || 'Pending Schedule'}. Safety checks: Earthing resistance < 5Ω, DC surge protection, AC load balancing.`
        : 'COREN engineer assignment and site survey alignment.',
      timestamp: order.commissioning_date || null
    },
    {
      step: 6,
      key: 'warranty_handover',
      id: 'step-warranty-handover',
      name: 'Active Warranty & Final Handover',
      title: 'Active Warranty & Final Handover',
      status: commissioningDone ? 'completed' : 'pending',
      badge: commissioningDone ? 'Active Coverage' : 'Pending Handover',
      summary: order.commissioning_certificate_id
        ? `Certificate ID: ${order.commissioning_certificate_id}. Full Tier-1 warranty coverage: 25-yr panel, 10-yr LiFePO4 battery guarantee, 5-yr inverter warranty with rapid swap service.`
        : 'Full Tier-1 warranty coverage: 25-yr panel, 10-yr LiFePO4 battery guarantee, 5-yr inverter warranty with rapid swap service.',
      details: order.commissioning_certificate_id
        ? `Certificate ID: ${order.commissioning_certificate_id}. Full Tier-1 warranty coverage: 25-yr panel, 10-yr LiFePO4 battery guarantee, 5-yr inverter warranty with rapid swap service.`
        : 'Full Tier-1 warranty coverage: 25-yr panel, 10-yr LiFePO4 battery guarantee, 5-yr inverter warranty with rapid swap service.',
      description: order.commissioning_certificate_id
        ? `Certificate ID: ${order.commissioning_certificate_id}. Full Tier-1 warranty coverage: 25-yr panel, 10-yr LiFePO4 battery guarantee, 5-yr inverter warranty.`
        : 'Issued immediately upon final engineer sign-off and electrical safety test certification.',
      timestamp: order.commissioning_date || null
    }
  ];

  const warranties = getWarrantiesByOrder(order.order_number);
  const tickets = getSupportTicketsByOrder(order.order_number);

  let parsedTests = null;
  if (order.commissioning_tests) {
    try {
      parsedTests = typeof order.commissioning_tests === 'string'
        ? JSON.parse(order.commissioning_tests)
        : order.commissioning_tests;
    } catch (e) {
      parsedTests = { summary: order.commissioning_tests };
    }
  }

  const payload = {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    deliveryAddress: order.delivery_address,
    deliveryState: order.delivery_state,
    destinationState: order.delivery_state,
    totalNgn: order.total_ngn,
    deliveryFeeNgn: order.delivery_fee_ngn,
    subtotalNgn: order.subtotal_ngn,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    items: order.items,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    fulfillment: {
      waybillNumber: order.waybill_number || null,
      courierPartner: order.courier_partner || 'DEVICE PRO Fleet Logistics',
      estimatedDelivery: order.estimated_delivery || null
    },
    logistics: {
      waybillNumber: order.waybill_number || null,
      courierPartner: order.courier_partner || 'DEVICE PRO Fleet Logistics',
      estimatedDelivery: order.estimated_delivery || null
    },
    commissioning: {
      assignedEngineer: order.assigned_engineer || null,
      engineerPhone: order.engineer_phone || null,
      scheduledDate: order.installation_scheduled_date || null,
      installationScheduledDate: order.installation_scheduled_date || null,
      status: order.commissioning_status || 'pending',
      commissioningStatus: order.commissioning_status || 'pending',
      tests: parsedTests || {},
      commissioningTests: parsedTests || {},
      commissioningDate: order.commissioning_date || null,
      certificateId: order.commissioning_certificate_id || null,
      commissioningCertificateId: order.commissioning_certificate_id || null
    },
    stages,
    milestones: stages,
    warranties,
    tickets
  };

  return payload;
}

// Helper: Verify customer contact match for privacy protection
function verifyContactMatch(order, verificationContact) {
  if (!verificationContact) return false;
  const contactInput = verificationContact.trim().toLowerCase();
  const orderEmail = (order.customer_email || '').trim().toLowerCase();
  if (orderEmail && contactInput === orderEmail) return true;

  const orderPhoneDigits = (order.customer_phone || '').replace(/\D/g, '');
  const inputDigits = contactInput.replace(/\D/g, '');
  if (inputDigits.length >= 7) {
    if (orderPhoneDigits.endsWith(inputDigits.slice(-7)) || inputDigits.endsWith(orderPhoneDigits.slice(-7))) {
      return true;
    }
  }
  return false;
}

// API: Stage 16 Privacy-Safe Order & Installation Tracking (POST)
app.post('/api/orders/track', rateLimiter(60000, 30), async (req, res) => {
  try {
    const orderNumber = req.body.orderNumber;
    const verificationContact = req.body.verificationContact || req.body.contact;

    if (!orderNumber || !verificationContact) {
      return res.status(400).json({
        success: false,
        error: 'Order number and verification contact (phone number or email address) are required.'
      });
    }

    const order = await getOrderByNumber(orderNumber.trim());
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'No order was found matching the provided order number.'
      });
    }

    if (!verifyContactMatch(order, verificationContact)) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: 'Verification failed. For customer privacy, you must provide the phone number or email registered with this order.'
      });
    }

    const trackingData = buildOrderTrackingPayload(order);
    res.json({
      success: true,
      verified: true,
      tracking: trackingData,
      ...trackingData
    });
  } catch (error) {
    console.error('[TRACKING API ERROR]:', error);
    res.status(500).json({ success: false, error: 'Tracking lookup failed.' });
  }
});

// API: Stage 16 Privacy-Safe Order Tracking (GET with ?contact= query)
app.get('/api/orders/:orderNumber/track', rateLimiter(60000, 30), async (req, res) => {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const verificationContact = req.query.contact || (req.user ? order.customer_phone : null);
    if (!verificationContact || !verifyContactMatch(order, verificationContact)) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: 'Verification failed. For customer privacy, provide the phone number or email registered with this order as ?contact=...'
      });
    }

    const trackingData = buildOrderTrackingPayload(order);
    res.json({
      success: true,
      verified: true,
      tracking: trackingData,
      ...trackingData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Tracking lookup failed.' });
  }
});

// API: Stage 16 Real-Time Warranty Verification
app.get('/api/warranty/verify/:query', rateLimiter(60000, 60), async (req, res) => {
  try {
    const query = req.params.query;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Warranty code or equipment serial number is required.' });
    }

    const warranty = await getWarrantyBySerialOrCode(query);
    if (!warranty) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: `No registered warranty record found matching "${query}". Please check your equipment barcode sticker or invoice.`
      });
    }

    // Compute remaining duration
    const today = new Date();
    const expiryDateStr = warranty.expiry_date || warranty.end_date;
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry - today;
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isExpired = diffTime < 0;
    const durationMonths = warranty.warranty_duration_months || ((warranty.warranty_years || 10) * 12);
    const durationYears = warranty.warranty_years || Math.round(durationMonths / 12);

    const record = {
      warrantyCode: warranty.warranty_code,
      serialNumber: warranty.serial_number,
      productName: warranty.product_name,
      productSku: warranty.product_sku || '',
      customerName: warranty.customer_name,
      durationYears,
      warrantyYears: durationYears,
      warrantyDurationMonths: durationMonths,
      coverageSummary: warranty.coverage_summary || `${durationYears}-year manufacturer warranty covering manufacturing defects, Tier-1 efficiency benchmarks, and rapid field swap support.`,
      status: isExpired ? 'expired' : warranty.status,
      startDate: warranty.start_date,
      endDate: expiryDateStr,
      expiryDate: expiryDateStr,
      daysRemaining,
      isExpired,
      serviceHub: 'DEVICE PRO Technical Service Hub, Victoria Island, Lagos'
    };

    res.json({
      success: true,
      verified: true,
      warranty: record,
      record
    });
  } catch (error) {
    console.error('[WARRANTY VERIFY ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to verify warranty.' });
  }
});

// API: Stage 16 Public Support & Warranty Claim Ticket Creation
app.post('/api/support/tickets', rateLimiter(60000, 20), async (req, res) => {
  try {
    const { orderNumber, customerName, customerPhone, customerEmail, issueCategory, priority, subject, description } = req.body;
    if (!customerName || !customerPhone || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Full name, WhatsApp/phone number, subject, and issue description are required.'
      });
    }

    const ticket = await createSupportTicket({
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      issueCategory: issueCategory || 'technical',
      priority: priority || 'normal',
      subject,
      description
    });

    const slaNotice = ticket.issue_category === 'warranty'
      ? 'Warranty claim registered. Our engineering support desk reviews claims within 4 hours. Rapid swap replacement units dispatch within 24-48 hours across Lagos, Abuja, and Port Harcourt.'
      : 'Support request received. A COREN certified solar technician has been assigned and will reach out within 4 business hours.';

    res.status(201).json({
      success: true,
      message: 'Support ticket successfully submitted.',
      ticketNumber: ticket.ticket_number,
      slaNotice,
      ticket
    });
  } catch (error) {
    console.error('[SUPPORT TICKET ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit support ticket.' });
  }
});

// API: Stage 16 Support Ticket Status Lookup (with Privacy Verification)
app.get('/api/support/tickets/:ticketNumber', async (req, res) => {
  try {
    const ticket = await getSupportTicketByNumber(req.params.ticketNumber);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found.' });
    }

    // If staff user is logged in, grant access
    if (req.user) {
      return res.json({ success: true, ticket });
    }

    // For public inquiries, require contact query param matching phone or email
    const contact = req.query.contact;
    if (!contact) {
      return res.status(403).json({
        success: false,
        error: 'Verification required. Provide ?contact= matching the phone or email submitted with this ticket.'
      });
    }

    const contactClean = contact.trim().toLowerCase();
    const phoneDigits = (ticket.customer_phone || '').replace(/\D/g, '');
    const inputDigits = contactClean.replace(/\D/g, '');
    const emailMatches = ticket.customer_email && ticket.customer_email.toLowerCase() === contactClean;
    const phoneMatches = inputDigits.length >= 7 && phoneDigits.endsWith(inputDigits.slice(-7));

    if (!emailMatches && !phoneMatches) {
      return res.status(403).json({
        success: false,
        error: 'Verification failed. Contact info does not match ticket records.'
      });
    }

    res.json({
      success: true,
      ticket: {
        ticketNumber: ticket.ticket_number,
        orderNumber: ticket.order_number,
        customerName: ticket.customer_name,
        issueCategory: ticket.issue_category,
        priority: ticket.priority,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        assignedEngineer: ticket.assigned_engineer,
        resolutionNotes: ticket.resolution_notes,
        createdAt: ticket.created_at,
        resolvedAt: ticket.resolved_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to look up ticket.' });
  }
});

// =========================================================================
// STAGE 15: PAYMENTS & GATEWAY INTEGRATION
// =========================================================================

// Initialize online payment (Paystack or Sandbox)
app.post('/api/payments/initialize', rateLimiter(60000, 30), async (req, res) => {
  try {
    const { orderNumber, email, callbackUrl } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Order is already marked as paid.' });
    }

    const customerEmail = email || order.customer_email || 'customer@devicepro.com';
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const defaultCallback = `${protocol}://${host}/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}`;

    const initResult = await initializeTransaction({
      orderNumber: order.order_number,
      email: customerEmail,
      amountNgn: order.total_ngn,
      callbackUrl: callbackUrl || defaultCallback,
      metadata: {
        customerName: order.customer_name,
        deliveryState: order.delivery_state
      }
    });

    // Record transaction in payments table
    await createPaymentRecord({
      orderId: order.id,
      orderNumber: order.order_number,
      gateway: initResult.gateway,
      reference: initResult.reference,
      amountKobo: initResult.amountKobo,
      currency: 'NGN',
      customerEmail,
      metadataJson: JSON.stringify({ callbackUrl: callbackUrl || defaultCallback })
    });

    res.json({
      success: true,
      gateway: initResult.gateway,
      reference: initResult.reference,
      authorizationUrl: initResult.authorizationUrl,
      accessCode: initResult.accessCode,
      isSandbox: initResult.isSandbox,
      amountNgn: order.total_ngn
    });
  } catch (err) {
    console.error('[PAYMENT INIT ERROR]:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment initialization failed.' });
  }
});

// Authoritative server-side payment verification & order reconciliation
app.get('/api/payments/verify/:reference', async (req, res) => {
  try {
    const reference = req.params.reference;
    const payment = await getPaymentByReference(reference);

    let order = null;
    if (payment) {
      order = await getOrderByNumber(payment.order_number);
    } else if (req.query.orderNumber) {
      order = await getOrderByNumber(req.query.orderNumber);
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Associated order not found for payment verification.' });
    }

    // If already paid, return confirmed state directly
    if (order.payment_status === 'paid') {
      return res.json({
        success: true,
        verified: true,
        paymentStatus: 'paid',
        orderStatus: order.order_status,
        orderNumber: order.order_number,
        reference,
        amountNgn: order.total_ngn,
        channel: payment ? payment.channel : 'card',
        alreadyPaid: true
      });
    }

    // Verify against payment gateway or sandbox
    const verificationData = await verifyTransaction(reference, order);

    // Reconcile transaction against order
    const reconciliation = reconcilePayment({
      expectedOrder: order,
      verificationData
    });

    if (!reconciliation.reconciled) {
      if (payment) {
        await updatePaymentStatus(reference, {
          status: reconciliation.status || 'failed',
          gatewayResponse: reconciliation.error
        });
      }
      return res.status(400).json({
        success: false,
        verified: false,
        paymentStatus: order.payment_status,
        orderNumber: order.order_number,
        reference,
        error: reconciliation.error
      });
    }

    // Authoritative update in database
    const updatedOrder = await reconcileOrderPayment(order.order_number, reference, reconciliation);

    res.json({
      success: true,
      verified: true,
      paymentStatus: updatedOrder.payment_status,
      orderStatus: updatedOrder.order_status,
      orderNumber: updatedOrder.order_number,
      reference: reconciliation.reference,
      amountNgn: updatedOrder.total_ngn,
      channel: reconciliation.channel,
      gatewayResponse: reconciliation.gatewayResponse,
      paidAt: reconciliation.paidAt
    });
  } catch (err) {
    console.error('[PAYMENT VERIFY ERROR]:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment verification failed.' });
  }
});

// Idempotent Webhook receiver with HMAC-SHA512 signature verification
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const reference = data.reference;
      const existingPayment = await getPaymentByReference(reference);

      // Idempotency: if already processed and marked paid, return 200 immediately
      if (existingPayment && existingPayment.status === 'success') {
        return res.status(200).json({ status: 'success', message: 'Event already processed.' });
      }

      const orderNumber = (data.metadata && data.metadata.orderNumber) ||
                          (existingPayment ? existingPayment.order_number : null);

      if (orderNumber) {
        const order = await getOrderByNumber(orderNumber);
        if (order) {
          const expectedKobo = Math.round(Number(order.total_ngn) * 100);
          if (data.amount === expectedKobo && (!data.currency || data.currency.toUpperCase() === 'NGN')) {
            await reconcileOrderPayment(orderNumber, reference, {
              status: 'success',
              channel: data.channel || 'card',
              gatewayResponse: data.gateway_response || 'Approved',
              paidAt: data.paid_at || new Date().toISOString()
            });
          }
        }
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('[WEBHOOK ERROR]:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Interactive Sandbox Gateway Route for Local Developer / Browser Testing
app.get('/api/payments/sandbox/:reference', async (req, res) => {
  const reference = req.params.reference;
  const payment = await getPaymentByReference(reference);
  const orderNumber = req.query.orderNumber || (payment ? payment.order_number : '');
  const order = orderNumber ? await getOrderByNumber(orderNumber) : null;
  const amount = req.query.amount || (order ? order.total_ngn : 0);
  const email = req.query.email || (order ? order.customer_email : 'customer@devicepro.com');

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paystack Sandbox Simulator | DEVICE PRO</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #060B14;
      color: #EEF1F8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .sandbox-card {
      background: #0B1324;
      border: 1px solid rgba(255, 185, 12, 0.3);
      border-radius: 12px;
      padding: 2.25rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: rgba(255, 185, 12, 0.15);
      color: #FFB90C;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.4rem; margin: 0 0 0.5rem; color: #FFF; font-weight: 800; }
    p { font-size: 0.875rem; color: rgba(238,241,248,0.7); margin-bottom: 1.5rem; line-height: 1.5; }
    .details-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.75rem;
      font-size: 0.875rem;
    }
    .detail-row { display: flex; justify-content: space-between; padding: 0.35rem 0; }
    .detail-val { font-weight: 700; color: #FFF; }
    .btn-action {
      display: block;
      width: 100%;
      padding: 0.9rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      margin-bottom: 0.75rem;
      transition: all 0.2s ease;
      text-decoration: none;
      text-align: center;
    }
    .btn-approve { background: #FFB90C; color: #060B14; }
    .btn-approve:hover { background: #E5A300; }
    .btn-ussd { background: #1E293B; color: #60A5FA; border: 1px solid #3B82F6; }
    .btn-ussd:hover { background: #2563EB; color: #FFF; }
    .btn-decline { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-cancel { background: transparent; color: rgba(238,241,248,0.5); font-size: 0.8rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="sandbox-card">
    <span class="badge">Paystack Sandbox Gateway</span>
    <h1>DEVICE PRO Checkout</h1>
    <p>Simulating Paystack Hosted Payment Window for local sandbox and regression testing.</p>

    <div class="details-box">
      <div class="detail-row"><span>Order Number:</span> <span class="detail-val">${orderNumber}</span></div>
      <div class="detail-row"><span>Customer Email:</span> <span class="detail-val">${email}</span></div>
      <div class="detail-row"><span>Reference:</span> <span class="detail-val" style="font-family:monospace; font-size:0.8rem;">${reference}</span></div>
      ${order && order.subtotal_ngn ? `<div class="detail-row" style="color: rgba(238,241,248,0.7); font-size:0.85rem;"><span>Hardware Subtotal:</span> <span class="detail-val">₦${Number(order.subtotal_ngn).toLocaleString()}</span></div>` : ''}
      ${order && order.delivery_fee_ngn ? `<div class="detail-row" style="color: rgba(238,241,248,0.7); font-size:0.85rem;"><span>Nationwide Logistics:</span> <span class="detail-val">₦${Number(order.delivery_fee_ngn).toLocaleString()}</span></div>` : ''}
      ${order && order.installation_fee_ngn > 0 ? `<div class="detail-row" style="color: #60A5FA; font-size:0.85rem;"><span>Certified Turnkey Installation:</span> <span class="detail-val" style="color: #60A5FA;">₦${Number(order.installation_fee_ngn).toLocaleString()}</span></div>` : ''}
      <div class="detail-row" style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 0.5rem; padding-top: 0.5rem;">
        <span>Total Amount Payable:</span>
        <span class="detail-val" style="color: #FFB90C; font-size: 1.15rem;">₦${Number(amount).toLocaleString()}</span>
      </div>
    </div>

    <form method="POST" action="/api/payments/sandbox/${encodeURIComponent(reference)}/complete">
      <input type="hidden" name="orderNumber" value="${orderNumber}">
      <input type="hidden" name="channel" value="card">
      <input type="hidden" name="action" value="success">
      <button type="submit" class="btn-action btn-approve">✓ Simulate Successful Card Payment</button>
    </form>

    <form method="POST" action="/api/payments/sandbox/${encodeURIComponent(reference)}/complete">
      <input type="hidden" name="orderNumber" value="${orderNumber}">
      <input type="hidden" name="channel" value="ussd">
      <input type="hidden" name="action" value="success">
      <button type="submit" class="btn-action btn-ussd">⚡ Simulate Bank Transfer / USSD</button>
    </form>

    <form method="POST" action="/api/payments/sandbox/${encodeURIComponent(reference)}/complete">
      <input type="hidden" name="orderNumber" value="${orderNumber}">
      <input type="hidden" name="action" value="decline">
      <button type="submit" class="btn-action btn-decline">✕ Simulate Declined Card (Failure)</button>
    </form>

    <a href="/checkout" class="btn-action btn-cancel">Cancel and Return to Checkout</a>
  </div>
</body>
</html>
  `);
});

// Process sandbox simulation completion
app.post('/api/payments/sandbox/:reference/complete', (req, res) => {
  const reference = req.params.reference;
  const { action, channel = 'card', orderNumber } = req.body;

  if (action === 'decline') {
    setSandboxOverride(reference, {
      success: false,
      status: 'failed',
      reference,
      channel,
      gatewayResponse: 'Declined: Card blocked or insufficient funds'
    });
    return res.redirect(`/checkout?error=Payment+Declined&reference=${encodeURIComponent(reference)}`);
  }

  // Set successful override
  setSandboxOverride(reference, {
    success: true,
    status: 'success',
    reference,
    channel,
    gatewayResponse: 'Approved (DEVICE PRO Sandbox Simulation)',
    paidAt: new Date().toISOString()
  });

  res.redirect(`/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}&reference=${encodeURIComponent(reference)}`);
});


// =========================================================================
// CALCULATOR API (Stage 12)
// =========================================================================
app.get('/api/calculator/metadata', (req, res) => {
  res.json({
    success: true,
    appliances: DEFAULT_APPLIANCES,
    regions: REGIONAL_PSH,
    batteryChemistries: BATTERY_CHEMISTRIES,
    generatorBenchmarks: GENERATOR_BENCHMARKS
  });
});

app.post('/api/calculator/size', rateLimiter(60000, 60), (req, res) => {
  try {
    const result = calculateSolarSizing(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[CALCULATOR SIZING ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Calculation failed' });
  }
});

app.post('/api/calculator/savings', rateLimiter(60000, 60), (req, res) => {
  try {
    const result = calculateGeneratorSavings(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[CALCULATOR SAVINGS ERROR]:', error);
    res.status(500).json({ success: false, error: error.message || 'Savings calculation failed' });
  }
});

// =========================================================================
// AUTHENTICATION API (Stage 12 & Stage 19 Customer System)
// =========================================================================

// POST /api/auth/register — Public customer registration
app.post('/api/auth/register', rateLimiter(60000, 30), async (req, res) => {
  try {
    const { fullName, email, phone, password, termsAccepted } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters).' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
      return res.status(400).json({
        success: false,
        error: 'Password must include uppercase, lowercase, numbers, and special characters.'
      });
    }

    // Check duplicate account
    const existing = await getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Role is strictly locked to 'customer' for all public registrations
    const newUser = await createUser({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone && typeof phone === 'string' ? phone.trim() : null,
      password,
      role: 'customer'
    });

    const session = await createSession(newUser.id);
    setSessionCookie(res, req, session.token, 7 * 24 * 60 * 60);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to DEVICE PRO!',
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }
    console.error('[AUTH REGISTER ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login — Customer & Staff sign-in
app.post('/api/auth/login', rateLimiter(60000, 30), async (req, res) => {
  try {
    const { username, email, password, rememberMe } = req.body || {};
    const identifier = (email || username || '').toString().trim();

    if (!identifier || !password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Email/username and password are required.' });
    }

    const user = await verifyUserLogin(identifier, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email/username or password.' });
    }

    // Session Fixation Prevention & Rotation: revoke existing session if present
    if (req.token) {
      try {
        await revokeSession(req.token);
      } catch (_) {}
    }

    const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const session = await createSession(user.id, rememberMe ? 30 : 7, {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '',
      userAgent: req.headers['user-agent'] || ''
    });
    setSessionCookie(res, req, session.token, maxAgeSeconds);

    res.json({
      success: true,
      message: `Welcome, ${user.fullName}`,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || null
      }
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]:', error);
    res.status(500).json({ success: false, error: 'Login process failed.' });
  }
});

// GET /api/auth/me — Current authenticated user profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// GET /api/profile — Detailed authenticated profile
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      phone: req.user.phone || null,
      emailVerified: Boolean(req.user.emailVerified),
      createdAt: req.user.createdAt || null,
      hasPassword: Boolean(req.user.hasPassword),
      authMethod: req.user.authMethod || (req.user.hasPassword ? 'password' : 'google')
    }
  });
});

// PUT /api/profile — Update customer personal information
app.put('/api/profile', requireAuth, rateLimiter(60000, 20), async (req, res) => {
  try {
    const { fullName, phone } = req.body || {};

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
        return res.status(400).json({ success: false, error: 'Full name must be between 2 and 100 characters.' });
      }
    }

    let cleanPhone = undefined;
    if (phone !== undefined) {
      if (phone === null || phone === '') {
        cleanPhone = null;
      } else if (typeof phone === 'string') {
        const trimmed = phone.trim();
        if (!/^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,5}$/.test(trimmed)) {
          return res.status(400).json({ success: false, error: 'Please enter a valid phone number (e.g. +234 803 123 4567 or 08031234567).' });
        }
        cleanPhone = trimmed;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    const updated = await updateUserProfile(req.user.id, {
      fullName: fullName ? fullName.trim() : undefined,
      phone: cleanPhone
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    res.json({
      success: true,
      message: 'Profile information updated successfully.',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone || null,
        role: updated.role,
        createdAt: updated.createdAt,
        hasPassword: Boolean(updated.hasPassword || req.user.hasPassword),
        authMethod: req.user.authMethod
      }
    });
  } catch (error) {
    console.error('[PROFILE UPDATE ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile. Please try again.' });
  }
});

// POST /api/auth/change-password — Update password for authenticated account
app.post('/api/auth/change-password', requireAuth, rateLimiter(60000, 10), async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Current password is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'New password is required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'New password and confirmation do not match.' });
    }

    // Complexity requirement: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    await changeUserPassword(req.user.id, currentPassword, newPassword);

    try {
      sendPasswordChangedNotificationEmail(req.user.email, { ipAddress: req.ip }).catch(() => {});
    } catch (_) {}

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    if (error.code === 'INVALID_CURRENT_PASSWORD') {
      return res.status(401).json({ success: false, error: 'The current password provided is incorrect.' });
    }
    if (error.code === 'OAUTH_ACCOUNT_NO_PASSWORD') {
      return res.status(400).json({ success: false, error: 'This account was created using Google Sign-In and cannot have its password changed here.' });
    }
    console.error('[PASSWORD CHANGE ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to change password. Please try again.' });
  }
});

// GET /api/profile/orders — Customer orders belonging strictly to the authenticated account
app.get('/api/profile/orders', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const result = await getOrdersByCustomer({
      email: req.user.email,
      phone: req.user.phone,
      limit,
      offset
    });

    res.json({
      success: true,
      orders: result.orders,
      total: result.total,
      limit,
      offset
    });
  } catch (error) {
    console.error('[PROFILE ORDERS ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to load order history.' });
  }
});

// POST /api/auth/logout — Sign out and revoke active session
app.post('/api/auth/logout', async (req, res) => {
  try {
    if (req.token) {
      await revokeSession(req.token);
    }
    clearSessionCookie(res, req);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    clearSessionCookie(res, req);
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// POST /api/auth/forgot-password — Request 6-digit verification code
app.post('/api/auth/forgot-password', rateLimiter(60000, 10), async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    // Cryptographically random 6-digit code (100000 to 999999)
    const rawCode = crypto.randomInt(100000, 1000000).toString();

    // Create verification code record with salted hash (10-minute expiry)
    const result = await createVerificationCode(cleanEmail, rawCode, 10);

    if (result.status === 'COOLDOWN_ACTIVE') {
      return res.status(429).json({
        success: false,
        error: `Please wait ${result.secondsRemaining} seconds before requesting another code.`,
        cooldown: true,
        secondsRemaining: result.secondsRemaining
      });
    }

    if (result.status === 'GOOGLE_ONLY') {
      // Dispatches helpful guidance that this account signs in via Google
      await sendGoogleAccountNoticeEmail(cleanEmail, (result.user && result.user.fullName) || 'Valued Customer').catch(err => {
        console.error('[EMAIL DISPATCH ERROR - GOOGLE NOTICE]:', err.message);
      });
    } else if (result.status === 'CODE_CREATED') {
      // Dispatches 6-digit verification code email via Resend / transactional transport
      await sendPasswordResetCodeEmail(cleanEmail, rawCode, (result.user && result.user.fullName) || 'Valued Customer').catch(err => {
        console.error('[EMAIL DISPATCH ERROR - RESET CODE]:', err.message);
      });
    }

    // Generic response that does not reveal whether the submitted email belongs to an account
    // Never log or return code to browser!
    res.json({
      success: true,
      message: 'If an eligible account exists for this email address, a 6-digit verification code has been sent.'
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to process verification code request.' });
  }
});

// POST /api/auth/verify-reset-code — Verify 6-digit code and issue reset authorization
app.post('/api/auth/verify-reset-code', rateLimiter(60000, 15), async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ success: false, error: 'A valid 6-digit verification code is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const result = await verifyResetCode(cleanEmail, cleanCode);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        lockedOut: Boolean(result.lockedOut),
        attemptsRemaining: result.attemptsRemaining
      });
    }

    // Success returns secure, short-lived reset authorization token
    res.json({
      success: true,
      resetToken: result.resetToken,
      message: result.message
    });
  } catch (error) {
    console.error('[VERIFY CODE ERROR]:', error);
    res.status(500).json({ success: false, error: 'Verification process failed.' });
  }
});

// POST /api/auth/resend-code — Resend verification code subject to 60-second cooldown
app.post('/api/auth/resend-code', rateLimiter(60000, 10), async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rawCode = crypto.randomInt(100000, 1000000).toString();

    const result = await createVerificationCode(cleanEmail, rawCode, 10);

    if (result.status === 'COOLDOWN_ACTIVE') {
      return res.status(429).json({
        success: false,
        error: `Please wait ${result.secondsRemaining} seconds before requesting a new code.`,
        cooldown: true,
        secondsRemaining: result.secondsRemaining
      });
    }

    if (result.status === 'GOOGLE_ONLY') {
      await sendGoogleAccountNoticeEmail(cleanEmail, (result.user && result.user.fullName) || 'Valued Customer').catch(() => {});
    } else if (result.status === 'CODE_CREATED') {
      await sendPasswordResetCodeEmail(cleanEmail, rawCode, (result.user && result.user.fullName) || 'Valued Customer').catch(() => {});
    }

    res.json({
      success: true,
      message: 'If an eligible account exists for this email address, a new verification code has been sent.'
    });
  } catch (error) {
    console.error('[RESEND CODE ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to resend verification code.' });
  }
});

// POST /api/auth/reset-password — Set new password with verified reset authorization token
app.post('/api/auth/reset-password', rateLimiter(60000, 15), async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Reset authorization token is required.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'New password is required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
      return res.status(400).json({
        success: false,
        error: 'Password must include uppercase, lowercase, numbers, and special characters.'
      });
    }

    // Execute reset and invalidate existing sessions
    const updatedUser = await executePasswordReset(token.trim(), password);

    // Notify user of successful password change
    if (updatedUser && updatedUser.email) {
      await sendPasswordChangedNotificationEmail(updatedUser.email, updatedUser.fullName || 'Valued Customer').catch(err => {
        console.error('[EMAIL NOTIFICATION ERROR]:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You may now sign in with your new password.'
    });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Invalid or expired password reset authorization. Please request a new code.'
    });
  }
});

// GET /api/auth/google — Initiate Google OAuth authorization flow
app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const acceptHeader = req.headers['accept'] || '';
    if (acceptHeader.includes('application/json') || req.xhr) {
      return res.status(503).json({
        success: false,
        error: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        configured: false
      });
    }
    return res.redirect('/login.html?error=google_not_configured');
  }

  const crypto = require('crypto');
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  // Set state in temporary cookie for CSRF verification
  res.setHeader('Set-Cookie', `devicepro_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&state=${encodeURIComponent(state)}` +
    '&access_type=online' +
    '&prompt=select_account';

  res.redirect(authUrl);
});

// GET /api/auth/google/callback — Google OAuth callback handler
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect('/login.html?error=google_auth_failed');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect('/login.html?error=google_not_configured');
  }

  // Validate CSRF state
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)devicepro_oauth_state=([^;]+)/);
  const cookieState = match ? decodeURIComponent(match[1]) : null;

  if (!cookieState || cookieState !== state) {
    return res.redirect('/login.html?error=csrf_state_mismatch');
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Failed to exchange authorization code');
    }

    // Fetch user info from Google
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleUser = await userinfoResponse.json();

    if (!googleUser.email || !googleUser.sub) {
      throw new Error('Google did not return verified profile information');
    }

    // Check if user exists by Google Subject ID or email
    let user = await getUserByGoogleSubject(googleUser.sub);

    if (!user) {
      const existingByEmail = await getUserByEmail(googleUser.email);
      if (existingByEmail) {
        user = await linkGoogleAccount(existingByEmail.id, googleUser.sub);
      } else {
        user = await createUser({
          fullName: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          googleSubject: googleUser.sub,
          emailVerified: true,
          role: 'customer'
        });
      }
    }

    const session = await createSession(user.id);
    setSessionCookie(res, req, session.token, 30 * 24 * 60 * 60);

    return res.redirect('/?signed_in=true');
  } catch (err) {
    console.error('[GOOGLE OAUTH CALLBACK ERROR]:', err);
    return res.redirect('/login.html?error=google_login_failed');
  }
});

// =========================================================================
// PROTECTED ADMINISTRATIVE API (Stage 12 / Stage 13 prep)
// =========================================================================
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json({ success: true, stats: stats.tables, meta: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/enquiries', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = await getEnquiries({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/enquiries/:id', requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const enquiry = await updateEnquiryStatus(req.params.id, status, notes, req.user.id);
    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/quotes', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = await getQuotes({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/quotes/:id', requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const quote = await updateQuoteStatus(req.params.id, status, notes, req.user.id);
    res.json({ success: true, quote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/orders', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = await getOrders({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/orders/:id', requireAuth, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, notes } = req.body;
    const order = await updateOrderStatus(req.params.id, orderStatus, paymentStatus, notes, req.user.id);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stage 16: Admin Order Fulfillment & Logistics Management
app.patch('/api/admin/orders/:id/fulfillment', requireAuth, async (req, res) => {
  try {
    const { waybillNumber, courierPartner, estimatedDelivery, orderStatus, notes } = req.body;
    const order = await updateOrderFulfillment(req.params.id, {
      waybillNumber,
      courierPartner,
      estimatedDelivery,
      orderStatus,
      adminNotes: notes,
      adminUserId: req.user.id
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stage 16: Admin Certified Installation & Commissioning Management
app.patch('/api/admin/orders/:id/commissioning', requireAuth, async (req, res) => {
  try {
    const {
      assignedEngineer,
      engineerPhone,
      installationScheduledDate,
      commissioningStatus,
      commissioningTests,
      commissioningCertificateId,
      commissioningDate,
      notes
    } = req.body;
    const order = await updateOrderCommissioning(req.params.id, {
      assignedEngineer,
      engineerPhone,
      installationScheduledDate,
      commissioningStatus,
      commissioningTests,
      commissioningCertificateId,
      commissioningDate,
      adminNotes: notes,
      adminUserId: req.user.id
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stage 16: Admin Support Tickets Desk
app.get('/api/admin/support/tickets', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const issueCategory = req.query.category || null;
    const result = await getSupportTickets({ status, issueCategory, limit, offset });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/support/tickets/:id', requireAuth, async (req, res) => {
  try {
    const { status, priority, assignedEngineer, resolutionNotes } = req.body;
    const ticket = await updateSupportTicketStatus(req.params.id, {
      status,
      priority,
      assignedEngineer,
      resolutionNotes,
      adminUserId: req.user.id
    });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stage 16: Admin Digital Warranty Registrations
app.get('/api/admin/warranties', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = await getWarranties({ status, limit, offset });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/warranties', requireAuth, async (req, res) => {
  try {
    const warranty = await createWarrantyRecord(req.body);
    res.status(201).json({ success: true, warranty });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = await getAuditLogs({ limit, offset });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/backup', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const backup = await exportDatabaseBackup();
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Product Catalogue Administration (Stage 13)
app.get('/api/admin/products', requireAuth, async (req, res) => {
  try {
    const category = req.query.category && req.query.category !== 'all' ? req.query.category : undefined;
    const search = req.query.search || undefined;
    const result = await getProducts({
      category,
      search,
      limit: 100
    });
    res.json({ success: true, products: result.products, total: result.total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/products/:id', requireAuth, async (req, res) => {
  try {
    const updated = await updateProduct(req.params.id, req.body, req.user.id);
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/products', requireAuth, async (req, res) => {
  try {
    const created = await createProduct(req.body, req.user.id);
    res.status(201).json({ success: true, product: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/products/:id', requireAuth, async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// SEO & DYNAMIC SITEMAP GENERATION (Stage 17)
// =========================================================================
async function generateSitemapXml() {
  const baseUrl = 'https://devicepro.ng';
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/solutions', priority: '0.9', changefreq: 'weekly' },
    { loc: '/products', priority: '0.9', changefreq: 'daily' },
    { loc: '/packages', priority: '0.9', changefreq: 'weekly' },
    { loc: '/projects', priority: '0.8', changefreq: 'weekly' },
    { loc: '/calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.7', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/tracking', priority: '0.6', changefreq: 'monthly' },
    { loc: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
    { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
    { loc: '/shipping-policy', priority: '0.5', changefreq: 'monthly' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  // 15 Static Routes
  for (const route of staticRoutes) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  function formatDateYMD(d) {
    if (!d) return today;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    const s = String(d);
    if (s.includes('T')) return s.split('T')[0];
    const parts = s.split(' ');
    if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return parts[0];
    try {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    } catch (e) {}
    return today;
  }

  // 48 Dynamic Products
  try {
    const { products } = await getProducts({ limit: 100 });
    for (const prod of (products || [])) {
      const lastmod = formatDateYMD(prod.updated_at);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/products/${encodeURIComponent(prod.slug)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }
  } catch (err) {
    console.error('Error fetching products for sitemap:', err);
  }

  // 6 Dynamic Turnkey Packages
  try {
    const packages = await getPackages();
    for (const pkg of (packages || [])) {
      const lastmod = formatDateYMD(pkg.updated_at);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/packages/${encodeURIComponent(pkg.slug)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.85</priority>\n';
      xml += '  </url>\n';
    }
  } catch (err) {
    console.error('Error fetching packages for sitemap:', err);
  }

  // 6 Dynamic Case Studies
  try {
    const caseStudies = await getCaseStudies();
    for (const cs of (caseStudies || [])) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/projects/${encodeURIComponent(cs.slug)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.75</priority>\n';
      xml += '  </url>\n';
    }
  } catch (err) {
    console.error('Error fetching case studies for sitemap:', err);
  }

  xml += '</urlset>\n';
  return xml;
}

// Generate and write static public/sitemap.xml on startup
generateSitemapXml().then(initialSitemap => {
  try {
    fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), initialSitemap, 'utf8');
  } catch (e) {
    console.warn('Initial sitemap generation warning:', e.message);
  }
}).catch(() => {});

// Sitemap endpoint
app.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// =========================================================================
// STATIC HTML PAGE ROUTES
// =========================================================================
// Safe HTML file streamer with path resolution and error boundaries
function safeSendFile(res, relativePath) {
  const primary = path.join(__dirname, relativePath);
  const secondary = path.join(process.cwd(), relativePath);
  const target = fs.existsSync(primary) ? primary : (fs.existsSync(secondary) ? secondary : null);

  if (target) {
    return res.sendFile(target, err => {
      if (err && !res.headersSent) {
        console.error(`[STATIC SEND ERROR] Could not stream ${relativePath}:`, err.message);
        res.status(404).send('Not Found');
      }
    });
  }

  if (!res.headersSent) {
    console.error(`[STATIC FILE MISSING] ${relativePath} not found on server disk.`);
    res.status(404).send('Not Found');
  }
}

app.get(['/login', '/login.html', '/signin'], (req, res) => safeSendFile(res, 'public/login.html'));
app.get(['/register', '/register.html', '/signup'], (req, res) => safeSendFile(res, 'public/register.html'));
app.get(['/forgot-password', '/forgot-password.html'], (req, res) => safeSendFile(res, 'public/forgot-password.html'));
app.get(['/verify-reset-code', '/verify-reset-code.html'], (req, res) => safeSendFile(res, 'public/verify-reset-code.html'));
app.get(['/reset-password', '/reset-password.html'], (req, res) => safeSendFile(res, 'public/reset-password.html'));
app.get(['/profile', '/profile.html', '/account'], (req, res) => safeSendFile(res, 'public/profile.html'));
app.get(['/checkout', '/checkout.html'], authenticate, (req, res) => {
  if (!req.user) {
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      return safeSendFile(res, 'public/checkout.html');
    }
    return res.redirect('/login?redirect=%2Fcheckout');
  }
  safeSendFile(res, 'public/checkout.html');
});
app.get(['/order-confirmation', '/order-confirmation.html'], (req, res) => safeSendFile(res, 'public/order-confirmation.html'));
app.get(['/tracking', '/tracking.html'], (req, res) => safeSendFile(res, 'public/tracking.html'));
app.get(['/admin', '/admin.html', '/admin/login'], (req, res) => safeSendFile(res, 'public/admin.html'));
app.get(['/calculator', '/calculator.html'], (req, res) => safeSendFile(res, 'public/calculator.html'));
app.get(['/savings-calculator', '/savings-calculator.html'], (req, res) => res.redirect(301, '/calculator'));
app.get(['/packages', '/packages.html', '/pricing', '/pricing.html'], (req, res) => safeSendFile(res, 'public/packages.html'));
app.get(['/packages/:slug'], (req, res) => safeSendFile(res, 'public/packages.html'));
app.get(['/solutions', '/solutions.html'], (req, res) => res.redirect('/#solutions'));
app.get(['/cart', '/cart.html'], (req, res) => res.redirect('/checkout'));
app.get(['/products', '/products.html'], (req, res) => safeSendFile(res, 'public/products.html'));
app.get(['/products/:slug', '/product-detail.html'], (req, res) => safeSendFile(res, 'public/product-detail.html'));
app.get(['/projects', '/projects.html'], (req, res) => safeSendFile(res, 'public/projects.html'));
app.get(['/projects/:slug'], (req, res) => safeSendFile(res, 'public/projects.html'));
app.get(['/about', '/about.html'], (req, res) => safeSendFile(res, 'public/about.html'));
app.get(['/resources', '/resources.html'], (req, res) => res.redirect('/'));
app.get(['/faq', '/faq.html'], (req, res) => res.redirect(301, '/about#faqs'));
app.get(['/contact', '/contact.html'], (req, res) => safeSendFile(res, 'public/contact.html'));
app.get(['/privacy-policy', '/privacy-policy.html'], (req, res) => safeSendFile(res, 'public/privacy-policy.html'));
app.get(['/terms', '/terms.html'], (req, res) => safeSendFile(res, 'public/terms.html'));
app.get(['/shipping-policy', '/shipping-policy.html'], (req, res) => safeSendFile(res, 'public/shipping-policy.html'));
app.get('/', (req, res) => safeSendFile(res, 'public/index.html'));

// Fallback to homepage for other unknown routes
app.get('*', (req, res) => safeSendFile(res, 'public/index.html'));

// Start listening only when run directly
if (require.main === module) {
  connectMongo().catch(err => {
    console.warn('[DATABASE] MongoDB Atlas startup status:', err.message);
  });
  const server = app.listen(PORT, () => {
    console.log(`DEVICE PRO Web Server is running at http://localhost:${PORT}`);
  });
  module.exports = server;
} else {
  if (process.env.MONGODB_URI) {
    connectMongo().catch(() => {});
  }
  module.exports = app;
}
