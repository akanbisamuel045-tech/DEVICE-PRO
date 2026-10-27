const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const crypto = require('crypto');
const {
  getProducts, getProductBySlug, getProductById, getProductFacets, getRelatedProducts,
  updateProduct, createProduct, deleteProduct, archiveProduct,
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
  logAudit, getAuditLogs, getDatabaseStats, exportDatabaseBackup, isMongoConnected, db,
  createPriceImport, getPriceImports, getPriceImportById, deletePriceImport,
  reviewPriceImport, approvePriceImportRows, applyPriceImport, cancelPriceImport,
  getPriceIntelligenceSettings, updatePriceIntelligenceSettings,
  getPriceIntelligenceProducts, getPriceIntelligenceSummary, getProductCostHistory,
  getAdminSolarPackages, getPackageBom, savePackageBomRevision, reviewPackageBom, approvePackageBom
} = require('./db/database');
const { evaluateProductProfitability } = require('./lib/price-intelligence-engine');
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
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.paystack.co; frame-src https://checkout.paystack.com;"
  );
  next();
});

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

const ADMIN_ROLES = ['admin', 'superadmin', 'engineer', 'sales', 'staff', 'finance'];

// Stage 3: Section permissions matrix for all 16 administration modules
const ADMIN_SECTION_PERMISSIONS = {
  'overview': ['superadmin', 'admin', 'engineer', 'sales', 'staff', 'finance'],
  'products': ['superadmin', 'admin', 'engineer'],
  'supplier-imports': ['superadmin', 'admin'],
  'supplier-price-imports': ['superadmin', 'admin'],
  'categories': ['superadmin', 'admin', 'engineer'],
  'brands': ['superadmin', 'admin', 'engineer'],
  'solar-packages': ['superadmin', 'admin', 'engineer', 'finance'],
  'content': ['superadmin', 'admin'],
  'website-content': ['superadmin', 'admin'],
  'images': ['superadmin', 'admin'],
  'image-manager': ['superadmin', 'admin'],
  'orders': ['superadmin', 'admin', 'sales'],
  'customers': ['superadmin', 'admin', 'sales'],
  'quotes-enquiries': ['superadmin', 'admin', 'sales', 'engineer'],
  'quotes': ['superadmin', 'admin', 'sales', 'engineer'],
  'enquiries': ['superadmin', 'admin', 'sales', 'engineer'],
  'projects': ['superadmin', 'admin', 'engineer'],
  'import-history': ['superadmin', 'admin'],
  'audit-logs': ['superadmin'],
  'admin-users': ['superadmin'],
  'settings': ['superadmin', 'admin']
};

function handleAdminPageRoute(req, res, next) {
  // If request is targeting an API route under /api/admin, let it pass to API handlers
  const fullPath = (req.originalUrl || req.url || req.path || '').split('?')[0].replace(/\/+$/, '') || '/admin';
  if (fullPath.startsWith('/api/') || req.path.startsWith('/api/')) {
    if (typeof next === 'function') return next();
    return;
  }

  // Determine requested section from URL path, e.g. /admin/orders -> 'orders'
  let section = null;
  if (fullPath === '/admin' || fullPath === '/admin.html' || fullPath === '/admin/login') {
    section = 'overview';
  } else {
    const match = fullPath.match(/^\/admin\/([a-zA-Z0-9_-]+)/);
    if (match) {
      section = match[1];
    } else {
      const subMatch = (req.path || '').replace(/\/+$/, '').match(/^\/([a-zA-Z0-9_-]+)/);
      if (subMatch && subMatch[1] && subMatch[1] !== 'admin') {
        section = subMatch[1];
      }
    }
  }

  // 1. Authenticated customer check (strictly denied access to admin console)
  if (req.user && req.user.role === 'customer') {
    if (req.headers['content-type']?.includes('application/json') || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: Insufficient administrative privileges.'
      });
    }
    return res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Forbidden | DEVICE PRO</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-body" style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;">
  <div class="auth-card" style="text-align:center;max-width:480px;">
    <h1 style="color:#EF4444;margin-bottom:0.75rem;font-size:1.75rem;">403 Forbidden</h1>
    <p style="color:var(--color-d-text-muted);margin-bottom:1.5rem;font-size:0.95rem;">
      Access denied: Customer accounts do not have administrative console permissions.
    </p>
    <a href="/" class="btn-auth-submit" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">
      Return to Store
    </a>
  </div>
</body>
</html>`);
  }

  // 2. Unauthenticated visitor check
  if (!req.user) {
    // If requesting the main console landing or login, serve admin.html so staff can authenticate
    if (fullPath === '/admin' || fullPath === '/admin.html' || fullPath === '/admin/login' || (!section || section === 'overview')) {
      return safeSendFile(res, 'public/admin.html');
    }
    // For direct deep-linked section URLs without credentials, require sign in
    if (req.headers['content-type']?.includes('application/json') || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to access this resource.'
      });
    }
    return res.redirect(`/admin?redirect=${encodeURIComponent(req.originalUrl || fullPath)}`);
  }

  // 3. Authenticated administrative user check
  const userRole = req.user.role;
  if (!ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access forbidden: Insufficient administrative privileges.'
    });
  }

  // Check section-specific permissions
  if (section && section !== 'overview') {
    const allowedRoles = ADMIN_SECTION_PERMISSIONS[section];
    if (!allowedRoles) {
      // Unknown section -> redirect to main overview
      return res.redirect('/admin');
    }

    if (!allowedRoles.includes(userRole)) {
      if (req.headers['content-type']?.includes('application/json') || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({
          success: false,
          error: allowedRoles.includes('superadmin') && allowedRoles.length === 1
            ? 'Access forbidden: Superadmin privileges required.'
            : 'Access forbidden: Insufficient administrative privileges for this section.'
        });
      }
      return res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Forbidden | DEVICE PRO</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-body" style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;">
  <div class="auth-card" style="text-align:center;max-width:480px;">
    <h1 style="color:#EF4444;margin-bottom:0.75rem;font-size:1.75rem;">403 Forbidden</h1>
    <p style="color:var(--color-d-text-muted);margin-bottom:1.5rem;font-size:0.95rem;">
      Access forbidden: Your role (${userRole}) does not have permission to access the "${section}" administration section.
    </p>
    <a href="/admin" class="btn-auth-submit" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">
      Return to Admin Overview
    </a>
  </div>
</body>
</html>`);
    }
  }

  // Authorized administrator -> serve admin shell
  safeSendFile(res, 'public/admin.html');
}

// Stage 3 Gatekeeper: Intercept /admin, /admin.html, and /admin/* BEFORE express.static to enforce auth & RBAC
app.use(['/admin', '/admin.html', '/admin/*'], authenticate, handleAdminPageRoute);

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
    const { orderStatus, paymentStatus, notes, waybillNumber, courierPartner, estimatedDelivery } = req.body;
    const order = await updateOrderStatus(req.params.id, orderStatus, paymentStatus, notes, req.user.id);
    if (waybillNumber !== undefined || courierPartner !== undefined || estimatedDelivery !== undefined) {
      try {
        await updateOrderFulfillment(req.params.id, {
          waybillNumber,
          courierPartner,
          estimatedDelivery,
          orderStatus,
          adminNotes: notes,
          adminUserId: req.user.id
        });
      } catch (fulErr) {
        console.warn('[ORDER LOGISTICS SYNC]:', fulErr.message);
      }
    }
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

// Admin Customers Directory & CRM
app.get('/api/admin/customers', requireAuth, requireRole('superadmin', 'admin', 'sales'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const state = req.query.state ? String(req.query.state).trim() : '';
    const offset = (page - 1) * limit;

    let customers = [];
    let total = 0;

    if (isMongoConnected()) {
      const { User: MongoUser, Order: MongoOrder } = require('./db/mongo/models');
      const filter = { role: 'customer' };
      if (search) {
        filter.$or = [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      total = await MongoUser.countDocuments(filter);
      const docs = await MongoUser.find(filter)
        .sort({ created_at: -1, id: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      // Retrieve order aggregates for these customers
      const emails = docs.map(d => d.email).filter(Boolean);
      const orders = await MongoOrder.find({ customer_email: { $in: emails } }).lean();

      customers = docs.map(d => {
        const userOrders = orders.filter(o => o.customer_email === d.email);
        const totalSpent = userOrders.reduce((sum, o) => sum + (o.total_ngn || 0), 0);
        return {
          id: d.id,
          name: d.full_name,
          email: d.email,
          phone: d.phone || '—',
          state: d.state || 'Lagos',
          ordersCount: userOrders.length,
          totalSpentNgn: totalSpent,
          emailVerified: d.email_verified,
          created_at: d.created_at
        };
      });
    } else {
      let query = "SELECT id, full_name as name, email, phone, 'Lagos' as state, email_verified as emailVerified, created_at FROM users WHERE role = 'customer'";
      const params = [];
      if (search) {
        query += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM (${query})`);
      total = countStmt.get(...params)?.count || 0;

      query += " ORDER BY id DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      customers = db.prepare(query).all(...params).map(c => ({
        ...c,
        ordersCount: 0,
        totalSpentNgn: 0
      }));
    }

    res.json({
      success: true,
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Comprehensive Customer Analytics & 360° Tracking
app.get('/api/admin/analytics/customers', requireAuth, requireRole('superadmin', 'admin', 'sales'), async (req, res) => {
  try {
    if (isMongoConnected()) {
      const { User: MongoUser, Order: MongoOrder, Quote: MongoQuote, Enquiry: MongoEnquiry } = require('./db/mongo/models');
      
      const [registeredDocs, orders, quotes, enquiries] = await Promise.all([
        MongoUser.find({ role: 'customer' }).select('id full_name email phone state email_verified created_at').lean(),
        MongoOrder.find().select('order_number customer_name customer_email customer_phone delivery_address delivery_state total_ngn order_status payment_status created_at').lean(),
        MongoQuote.find().select('reference_id name email phone state property_type recommended_package power_kwp battery_kwh status created_at').sort({ created_at: -1 }).lean(),
        MongoEnquiry.find().select('reference_id name email phone subject message status created_at').sort({ created_at: -1 }).lean()
      ]);

      const registeredEmailMap = new Map();
      registeredDocs.forEach(u => {
        if (u.email) registeredEmailMap.set(u.email.toLowerCase().trim(), u);
      });

      const ordersByEmail = new Map();
      let totalRevenue = 0;
      let paidOrdersCount = 0;
      const stateStats = new Map();

      orders.forEach(o => {
        const email = (o.customer_email || 'guest@devicepro.ng').toLowerCase().trim();
        if (!ordersByEmail.has(email)) ordersByEmail.set(email, []);
        ordersByEmail.get(email).push(o);

        const amount = Number(o.total_ngn || 0);
        const isPaid = o.payment_status === 'paid' || o.payment_status === 'verified' || o.order_status === 'completed';
        if (isPaid) {
          totalRevenue += amount;
          paidOrdersCount++;
        }

        const st = o.delivery_state || 'Lagos';
        if (!stateStats.has(st)) {
          stateStats.set(st, { state: st, ordersCount: 0, revenue: 0 });
        }
        const stateObj = stateStats.get(st);
        stateObj.ordersCount++;
        if (isPaid) stateObj.revenue += amount;
      });

      let registeredActiveWithOrders = 0;
      const enhancedRegistered = registeredDocs.map(u => {
        const userEmail = (u.email || '').toLowerCase().trim();
        const userOrders = ordersByEmail.get(userEmail) || [];
        const spent = userOrders.reduce((sum, o) => sum + Number(o.total_ngn || 0), 0);
        if (userOrders.length > 0) registeredActiveWithOrders++;
        return {
          id: u.id,
          name: u.full_name,
          email: u.email,
          phone: u.phone || '—',
          state: u.state || 'Lagos',
          emailVerified: !!u.email_verified,
          ordersCount: userOrders.length,
          totalSpent: spent,
          created_at: u.created_at,
          type: 'registered'
        };
      });

      const guestBuyers = [];
      ordersByEmail.forEach((userOrders, email) => {
        if (!registeredEmailMap.has(email) && email !== 'guest@devicepro.ng') {
          const latestOrder = userOrders[userOrders.length - 1];
          const spent = userOrders.reduce((sum, o) => sum + Number(o.total_ngn || 0), 0);
          guestBuyers.push({
            email: email,
            name: latestOrder.customer_name || 'Guest Customer',
            phone: latestOrder.customer_phone || '—',
            state: latestOrder.delivery_state || 'Lagos',
            address: latestOrder.delivery_address || '—',
            ordersCount: userOrders.length,
            totalSpent: spent,
            latestOrderNumber: latestOrder.order_number,
            latestOrderDate: latestOrder.created_at,
            latestStatus: latestOrder.order_status,
            type: 'guest'
          });
        }
      });

      const repeatBuyersCount = [...ordersByEmail.values()].filter(list => list.length > 1).length;

      return res.json({
        success: true,
        summary: {
          totalRegistered: registeredDocs.length,
          registeredActiveWithOrders,
          registeredInactiveNoOrders: registeredDocs.length - registeredActiveWithOrders,
          guestCustomersCount: guestBuyers.length,
          totalTrackedCustomers: registeredDocs.length + guestBuyers.length,
          totalOrders: orders.length,
          totalQuotes: quotes.length,
          totalEnquiries: enquiries.length,
          repeatBuyersCount,
          totalRevenue,
          averageOrderValue: paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0
        },
        guestBuyers: guestBuyers.sort((a,b) => b.totalSpent - a.totalSpent),
        topRegistered: enhancedRegistered.sort((a,b) => b.totalSpent - a.totalSpent),
        quoteLeads: quotes,
        enquiryLeads: enquiries,
        geographicDistribution: [...stateStats.values()].sort((a,b) => b.ordersCount - a.ordersCount)
      });
    }

    res.json({ success: true, summary: { totalRegistered: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Customer Full 360° Profile Dossier
app.get('/api/admin/customers/:id', requireAuth, requireRole('superadmin', 'admin', 'sales'), async (req, res) => {
  try {
    const identifier = req.params.id;
    let customer = null;
    let orders = [];
    let quotes = [];
    let enquiries = [];

    if (isMongoConnected()) {
      const { User: MongoUser, Order: MongoOrder, Quote: MongoQuote, Enquiry: MongoEnquiry } = require('./db/mongo/models');
      const mongoose = require('mongoose');

      if (identifier.includes('@')) {
        customer = await MongoUser.findOne({ email: identifier.toLowerCase().trim() }).lean();
      } else if (mongoose.Types.ObjectId.isValid(identifier)) {
        customer = await MongoUser.findById(identifier).lean();
      } else if (!isNaN(identifier)) {
        customer = await MongoUser.findOne({ id: Number(identifier) }).lean();
      }

      const email = customer ? customer.email : (identifier.includes('@') ? identifier.toLowerCase().trim() : null);

      if (email) {
        [orders, quotes, enquiries] = await Promise.all([
          MongoOrder.find({ customer_email: { $regex: `^${email}$`, $options: 'i' } }).sort({ created_at: -1 }).lean(),
          MongoQuote.find({ email: { $regex: `^${email}$`, $options: 'i' } }).sort({ created_at: -1 }).lean(),
          MongoEnquiry.find({ email: { $regex: `^${email}$`, $options: 'i' } }).sort({ created_at: -1 }).lean()
        ]);
      }
    }

    if (!customer && orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer record not found' });
    }

    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_ngn || 0), 0);

    res.json({
      success: true,
      customer: {
        id: customer ? customer.id : null,
        name: customer ? customer.full_name : (orders[0]?.customer_name || 'Guest Customer'),
        email: customer ? customer.email : (orders[0]?.customer_email || identifier),
        phone: customer ? (customer.phone || '—') : (orders[0]?.customer_phone || '—'),
        state: customer ? (customer.state || 'Lagos') : (orders[0]?.delivery_state || 'Lagos'),
        address: orders[0]?.delivery_address || '—',
        isRegistered: !!customer,
        emailVerified: customer ? !!customer.email_verified : false,
        created_at: customer ? customer.created_at : orders[0]?.created_at,
        totalOrders: orders.length,
        totalSpentNgn: totalSpent,
        averageOrderValue: orders.length > 0 ? Math.round(totalSpent / orders.length) : 0,
        orders,
        quotes,
        enquiries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Solar Package Quick Edit
app.patch('/api/admin/solar-packages/:id', requireAuth, requireRole('superadmin', 'admin', 'engineer'), async (req, res) => {
  try {
    const canEditPrice = ['superadmin', 'admin'].includes(req.user.role);
    const updated = await updateProduct(req.params.id, req.body, req.user.id, { canEditPrice });
    res.json({ success: true, package: updated, message: 'Solar package updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Brands Directory
app.get('/api/admin/brands', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'sales', 'staff'), async (req, res) => {
  try {
    const facets = await getProductFacets();
    const knownBrands = [
      { name: 'Deye', country: 'China / Global', category: 'Hybrid Inverters & HV Batteries', warranty: '5 - 10 Years', tier1: true, website: 'https://deyeinverter.com', description: 'Industry-leading high voltage hybrid converters and lithium energy storage.' },
      { name: 'Felicity Solar', country: 'China / Nigeria', category: 'LiFePO4 Batteries & Inverters', warranty: '5 - 10 Years', tier1: true, website: 'https://felicitysolar.com', description: 'High-reliability low-voltage wall and rack-mount battery storage units.' },
      { name: 'Growatt', country: 'China / Global', category: 'Smart Converters & String Inverters', warranty: '5 Years', tier1: true, website: 'https://growatt.com', description: 'Award-winning residential and commercial smart solar inverters.' },
      { name: 'Jinko Solar', country: 'China / Global', category: 'Tier-1 Monocrystalline PV Modules', warranty: '12 - 25 Years', tier1: true, website: 'https://jinkosolar.com', description: 'World-record N-Type TOPCon solar panels with high temperature tolerance.' },
      { name: 'Canadian Solar', country: 'Canada / Global', category: 'Tier-1 Mono PERC & Bifacial Modules', warranty: '12 - 25 Years', tier1: true, website: 'https://canadiansolar.com', description: 'Global Tier-1 solar manufacturer renowned for heavy duty yield in high-heat zones.' },
      { name: 'Victron Energy', country: 'Netherlands / Europe', category: 'Industrial Inverter-Chargers & MPPTs', warranty: '5 Years', tier1: true, website: 'https://victronenergy.com', description: 'Heavy duty off-grid power conversion and marine-grade power systems.' },
      { name: 'Must Energy', country: 'China / Nigeria', category: 'Cost-Effective Hybrid Inverters', warranty: '2 - 3 Years', tier1: true, website: 'https://mustpower.com', description: 'Affordable pure sine wave backup and hybrid inverters for homes.' }
    ];

    const catalogBrands = (facets && facets.brands) || [];
    const brandsWithCounts = knownBrands.map(b => {
      const match = catalogBrands.find(cb => cb.name.toLowerCase() === b.name.toLowerCase());
      return {
        ...b,
        productsCount: match ? match.count : 0
      };
    });

    res.json({ success: true, count: brandsWithCounts.length, brands: brandsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Projects / Case Studies
app.get('/api/admin/projects', requireAuth, requireRole('superadmin', 'admin', 'engineer'), async (req, res) => {
  try {
    const projects = await getCaseStudies();
    res.json({ success: true, count: (projects || []).length, projects: projects || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Staff Users Directory (Superadmin Only)
app.get('/api/admin/users', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    let users = [];
    if (isMongoConnected()) {
      const { User: MongoUser } = require('./db/mongo/models');
      users = await MongoUser.find({ role: { $ne: 'customer' } })
        .select('id username email full_name role created_at updated_at')
        .sort({ id: 1 })
        .lean();
    } else {
      users = db.prepare("SELECT id, username, email, full_name, role, created_at FROM users WHERE role != 'customer' ORDER BY id ASC").all();
    }
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Platform Settings
app.get('/api/admin/settings', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    res.json({
      success: true,
      settings: {
        platform: {
          brand: 'DEVICE PRO Nigeria',
          environment: process.env.NODE_ENV || 'production',
          region: 'Nigeria (36 States + FCT Abuja)',
          currency: 'NGN (₦)',
          vatRatePercent: 7.5
        },
        regionalPsh: REGIONAL_PSH,
        generatorBenchmarks: GENERATOR_BENCHMARKS,
        batteryChemistries: BATTERY_CHEMISTRIES,
        paymentGateway: {
          gateway: 'Paystack',
          mode: IS_SANDBOX ? 'Sandbox / Test Mode' : 'Live Production Mode',
          supportedChannels: ['Card (Mastercard / Visa / Verve)', 'Bank Transfer', 'USSD', 'Apple Pay'],
          currency: 'NGN'
        },
        database: {
          status: isMongoConnected() ? 'connected' : 'sqlite_active',
          cluster: 'MongoDB Atlas (Replica Set Sharded Cluster)',
          database: 'devicepro'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Website Content
app.get('/api/admin/content', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    res.json({
      success: true,
      content: {
        hero: {
          title: 'Reliable Solar Power Engineered for Nigerian Homes & Businesses',
          subtitle: 'Tier-1 Inverters, Lithium Storage & Turnkey Solar Systems Designed to Permanently Replace Expensive Fuel Generators.',
          ctaPrimary: 'Calculate Your System Sizing',
          ctaSecondary: 'Book Free Engineering Consultation'
        },
        trustStrip: [
          { title: '100% Genuine OEM Hardware', desc: 'Direct from Deye, Felicity, Jinko & Growatt authorized distributors' },
          { title: '5-10 Year Battery Warranties', desc: 'Verified LiFePO4 6000+ cycle warranties with rapid swap SLA' },
          { title: 'Nationwide Delivery across 36 States', desc: 'Insured logistics via GIG, Red Star & dedicated logistics fleet' },
          { title: 'COREN Accredited Engineers', desc: 'NEMSA compliant commissioning and electrical safety verification' }
        ],
        faqSummary: {
          totalArticles: 14,
          categories: ['Solar Inverters', 'LiFePO4 Storage', 'Installation & Sizing', 'Warranties & Support']
        },
        policies: [
          { name: 'Warranty Registration & RMA Rapid Swap Policy', path: '/warranty' },
          { name: 'Shipping, Delivery & Heavy Logistics Policy', path: '/shipping-policy' },
          { name: 'Returns, Cancellation & Refund Policy', path: '/terms' },
          { name: 'Data Privacy & Customer Security Policy', path: '/privacy-policy' }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Product Catalogue Administration (Stage 4)
// List products with server-side pagination, search, category, stockStatus, status filters, and role-based supplier cost protection
app.get('/api/admin/products', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'sales', 'staff'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const category = req.query.category && req.query.category !== 'all' ? String(req.query.category).trim() : undefined;
    const brand = req.query.brand && req.query.brand !== 'all' ? String(req.query.brand).trim() : undefined;
    const stockStatus = req.query.stockStatus && req.query.stockStatus !== 'all' ? String(req.query.stockStatus).trim() : undefined;
    const status = req.query.status || 'all'; // 'active', 'archived', 'all'
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const sort = req.query.sort || 'featured';

    const includeSupplierCost = ['superadmin', 'admin'].includes(req.user.role);

    const result = await getProducts({
      page,
      limit,
      category,
      brand,
      stockStatus,
      status,
      search,
      sort,
      includeSupplierCost
    });

    res.json({
      success: true,
      products: result.products,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / limit) || 1
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single product details for admin inspection
app.get('/api/admin/products/:id', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'sales', 'staff'), async (req, res) => {
  try {
    const includeSupplierCost = ['superadmin', 'admin'].includes(req.user.role);
    const product = await getProductById(req.params.id, { includeSupplierCost });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product (restricted to superadmin and admin)
app.post('/api/admin/products', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const created = await createProduct(req.body, req.user.id);
    res.status(201).json({ success: true, product: created, message: 'Product created successfully' });
  } catch (error) {
    const statusCode = error.message && (
      error.message.includes('required') ||
      error.message.includes('already in use') ||
      error.message.includes('must be a valid') ||
      error.message.includes('non-negative') ||
      error.message.includes('protocol')
    ) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Update product (restricted to superadmin, admin, and engineer)
app.patch('/api/admin/products/:id', requireAuth, requireRole('superadmin', 'admin', 'engineer'), async (req, res) => {
  try {
    const canEditPrice = ['superadmin', 'admin'].includes(req.user.role);
    const updated = await updateProduct(req.params.id, req.body, req.user.id, { canEditPrice });
    res.json({ success: true, product: updated, message: 'Product updated successfully' });
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    const statusCode = error.message && (
      error.message.includes('required') ||
      error.message.includes('already in use') ||
      error.message.includes('must be a valid') ||
      error.message.includes('non-negative') ||
      error.message.includes('protocol')
    ) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Archive / restore product (restricted to superadmin and admin)
app.post('/api/admin/products/:id/archive', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const archiveState = req.body && req.body.archive !== undefined ? Boolean(req.body.archive) : true;
    const result = await archiveProduct(req.params.id, archiveState, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product / soft-archive endpoint for backwards compatibility
app.delete('/api/admin/products/:id', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// PRODUCT IMAGE UPLOAD & MEDIA ASSET MANAGEMENT
// Allows authorized staff (superadmin, admin, engineer) to upload product photos
// and manage media assets stored in public/images/products.
// =========================================================================

const multer = require('multer');

const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'images', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `prod-${safeBase || 'item'}-${uniqueSuffix}${ext}`);
  }
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Allowed formats: JPG, PNG, WEBP, SVG, GIF.'));
    }
  }
});

function handleProductImageUpload(req, res, next) {
  productImageUpload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds maximum permitted limit of 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'Image upload failed.'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file was uploaded. Please select an image.'
      });
    }
    next();
  });
}

// Upload product image (superadmin, admin, engineer)
app.post('/api/admin/uploads/product-image', requireAuth, requireRole('superadmin', 'admin', 'engineer'), handleProductImageUpload, async (req, res) => {
  try {
    const relativeUrl = `/images/products/${req.file.filename}`;

    await logAudit({
      userId: req.user.id,
      action: 'UPLOAD_PRODUCT_IMAGE',
      entityType: 'product_image',
      details: `Uploaded product photo: ${req.file.filename} (${req.file.originalname}, ${(req.file.size / 1024).toFixed(1)} KB)`
    });

    res.json({
      success: true,
      imageUrl: relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all media images available for products
app.get('/api/admin/uploads/images', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'sales'), async (req, res) => {
  try {
    const productsDir = path.join(__dirname, 'public', 'images', 'products');
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }

    const files = fs.readdirSync(productsDir);
    const images = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) {
        try {
          const stats = fs.statSync(path.join(productsDir, file));
          images.push({
            filename: file,
            url: `/images/products/${file}`,
            size: stats.size,
            modifiedAt: stats.mtime
          });
        } catch (e) {
          // Skip if unreadable
        }
      }
    }

    // Sort newest first
    images.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    res.json({
      success: true,
      images,
      totalCount: images.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// STAGE 5: SUPPLIER PRICE IMPORT INFRASTRUCTURE
// Security Notice: Analysed supplier price data NEVER updates live prices or supplier costs.
// Access is strictly restricted to roles with commercial pricing authority: ['superadmin', 'admin']
// =========================================================================
const {
  processSupplierPriceFile,
  generateImportTemplate,
  generateMasterCatalogTemplate,
  MAX_FILE_SIZE_BYTES,
  MAX_ROW_COUNT
} = require('./lib/price-import-engine');

const priceImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 4 MB maximum
    files: 1
  }
});

function handlePriceUpload(req, res, next) {
  priceImportUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File size exceeds the maximum permitted limit of 4MB (${MAX_FILE_SIZE_BYTES} bytes).`
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed.'
      });
    }
    next();
  });
}

// Download import template in .xlsx or .csv format
app.get('/api/admin/price-imports/template/:format', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const format = (req.params.format || '').toLowerCase();
    if (!['xlsx', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid template format "${req.params.format}". Supported formats: xlsx, csv.`
      });
    }

    const { buffer, contentType, filename } = await generateImportTemplate(format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stage 8.1: Download standardized master catalog quotation template populated with active commercial products
app.get('/api/admin/price-imports/catalog-template/:format', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const format = (req.params.format || '').toLowerCase();
    if (!['xlsx', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid template format "${req.params.format}". Supported formats: xlsx, csv.`
      });
    }

    // Query active catalog products (exclude archived benchmark products)
    const catalogData = await getProducts({ status: 'active', limit: 1000 });
    const allProducts = Array.isArray(catalogData) ? catalogData : (catalogData.products || []);
    const activeCommercial = allProducts.filter(p => p.published === 1 && p.sku !== 'SG-10K-HYBRID-NG' && p.brand !== 'Sungrow Benchmark');

    const { buffer, contentType, filename } = await generateMasterCatalogTemplate(format, activeCommercial);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload and analyze supplier price list without updating live database
app.post(['/api/admin/price-imports/upload', '/api/admin/price-imports/intake'], requireAuth, requireRole('superadmin', 'admin'), handlePriceUpload, async (req, res) => {
  try {
    let fileBuffer = null;
    let originalFilename = '';

    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
      originalFilename = req.file.originalname || 'supplier_price_list';
    } else if (req.body && req.body.fileBase64) {
      fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
      originalFilename = req.body.filename || 'supplier_price_list.xlsx';
    } else if (req.body && typeof req.body.csvText === 'string') {
      fileBuffer = Buffer.from(req.body.csvText, 'utf8');
      originalFilename = req.body.filename || 'supplier_price_list.csv';
    } else {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Please upload an Excel (.xlsx) or CSV (.csv) file.'
      });
    }

    // Parse custom mapping if sent from frontend
    let customMapping = null;
    if (req.body && req.body.mapping) {
      try {
        customMapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid column mapping format. Expected valid JSON.'
        });
      }
    }

    const supplierName = (req.body && req.body.supplierName) ? String(req.body.supplierName).trim() : 'Solar Equipment Supplier';
    const supplierQuoteRef = (req.body && (req.body.supplierQuoteRef || req.body.supplier_quote_ref)) ? String(req.body.supplierQuoteRef || req.body.supplier_quote_ref).trim() : '';
    const quoteDate = req.body ? (req.body.quoteDate || req.body.quote_date) : null;
    const quoteExpiryDate = req.body ? (req.body.quoteExpiryDate || req.body.quote_expiry_date) : null;
    const importSource = (req.body && (req.body.importSource || req.body.import_source)) ? String(req.body.importSource || req.body.import_source).trim() : 'Manual Upload';
    const currency = (req.body && req.body.currency) ? String(req.body.currency).trim().toUpperCase() : 'NGN';

    // Retrieve active catalog products for conservative matching
    const catalogData = await getProducts({ status: 'all', limit: 1000, includeSupplierCost: true });
    const allProducts = Array.isArray(catalogData) ? catalogData : (catalogData.products || []);

    const analysisResult = await processSupplierPriceFile({
      buffer: fileBuffer,
      filename: originalFilename,
      activeProducts: allProducts,
      customMapping,
      supplierName,
      supplierQuoteRef,
      quoteDate,
      quoteExpiryDate,
      importSource,
      currency
    });

    res.json({
      success: true,
      ...analysisResult,
      format: analysisResult.file_format,
      file_format: analysisResult.file_format,
      mappingConfig: analysisResult.active_mapping,
      detectedMapping: analysisResult.detected_mapping,
      availableColumns: analysisResult.headers,
      headers: analysisResult.headers,
      rows: analysisResult.rows,
      rowsPreview: analysisResult.rows,
      notice: 'Import analysed successfully. No live product prices or supplier costs have been changed.'
    });
  } catch (error) {
    const statusCode = error.message && (
      error.message.includes('not supported') ||
      error.message.includes('Unsupported') ||
      error.message.includes('Empty') ||
      error.message.includes('exceeds') ||
      error.message.includes('corrupt') ||
      error.message.includes('Corrupted') ||
      error.message.includes('No valid headers') ||
      error.message.includes('required') ||
      error.message.includes('must contain at least')
    ) ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to process supplier price file'
    });
  }
});

// Save persistent import analysis record (Strictly 'analysed', never applied)
app.post('/api/admin/price-imports', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      filename, supplier_name, file_format, mapping_config, summary, rows_preview, notes,
      supplier_quote_ref, quote_date, quote_expiry_date, import_source, currency, freshness_status, validation_warnings
    } = req.body || {};

    if (!filename || !file_format || !summary) {
      return res.status(400).json({
        success: false,
        error: 'Missing required import analysis payload (filename, file_format, and summary are required).'
      });
    }

    // Ensure rows_preview is bounded and sanitized
    const safeRows = Array.isArray(rows_preview) ? rows_preview.slice(0, 1000) : [];

    const importRecord = await createPriceImport({
      filename: String(filename).trim().slice(0, 255),
      supplier_name: String(supplier_name || 'Generic Supplier').trim().slice(0, 150),
      supplier_quote_ref: supplier_quote_ref ? String(supplier_quote_ref).trim().slice(0, 100) : '',
      quote_date: quote_date ? new Date(quote_date) : null,
      quote_expiry_date: quote_expiry_date ? new Date(quote_expiry_date) : null,
      import_source: import_source ? String(import_source).trim().slice(0, 100) : 'manual_upload',
      currency: currency ? String(currency).trim().toUpperCase().slice(0, 10) : 'NGN',
      freshness_status: (freshness_status && ['fresh', 'stale', 'future_date', 'expired', 'date_missing', 'date_ambiguous'].includes(freshness_status)) ? freshness_status : 'date_missing',
      validation_warnings: Array.isArray(validation_warnings) ? validation_warnings : [],
      file_format: String(file_format).toLowerCase(),
      uploaded_by: req.user.id,
      uploaded_by_email: req.user.email,
      uploaded_by_role: req.user.role,
      status: 'analysed', // Stage 5 restriction: strictly analysed
      mapping_config: typeof mapping_config === 'object' ? mapping_config : {},
      summary: {
        total_rows: Number(summary.total_rows || 0),
        valid_rows: Number(summary.valid_rows || 0),
        matched_rows: Number(summary.matched_rows || 0),
        unmatched_rows: Number(summary.unmatched_rows || 0),
        duplicate_in_file_rows: Number(summary.duplicate_in_file_rows || 0),
        duplicate_in_catalog_rows: Number(summary.duplicate_in_catalog_rows || 0),
        invalid_rows: Number(summary.invalid_rows || 0),
        requires_review_rows: Number(summary.requires_review_rows || 0)
      },
      rows_preview: safeRows,
      notes: notes ? String(notes).slice(0, 500) : ''
    });

    if (typeof logAudit === 'function') {
      await logAudit({
        userId: req.user.id,
        action: 'ANALYSE_PRICE_IMPORT',
        entityType: 'price_import',
        entityId: String(importRecord.id || importRecord._id),
        details: `Saved supplier price analysis for "${importRecord.filename}" (${importRecord.summary.total_rows} rows analysed, ${importRecord.summary.matched_rows} matched). No live prices changed.`,
        ipAddress: req.ip || ''
      });
    }

    res.status(201).json({
      success: true,
      importRecord,
      message: 'Import analysed successfully. No live product prices or supplier costs have been changed.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List price import history with pagination and search
app.get('/api/admin/price-imports', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status || '';
    const format = req.query.format || '';
    const search = req.query.search || '';

    const result = await getPriceImports({ page, limit, status, format, search });
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detailed import record by ID (including preview rows)
app.get('/api/admin/price-imports/:id', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const importRecord = await getPriceImportById(req.params.id);
    if (!importRecord) {
      return res.status(404).json({
        success: false,
        error: 'Price import record not found.'
      });
    }
    res.json({
      success: true,
      importRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revalidate a saved import record against current catalog state
app.post('/api/admin/price-imports/:id/validate', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const importRecord = await getPriceImportById(req.params.id);
    if (!importRecord) {
      return res.status(404).json({
        success: false,
        error: 'Price import record not found.'
      });
    }

    // Retrieve active catalog products
    const catalogData = await getProducts({ status: 'all', limit: 1000, includeSupplierCost: true });
    const allProducts = Array.isArray(catalogData) ? catalogData : (catalogData.products || []);

    const { matchSupplierItemsAgainstCatalog } = require('./lib/price-import-engine');
    const revalidated = matchSupplierItemsAgainstCatalog(importRecord.rows_preview || [], allProducts);

    res.json({
      success: true,
      summary: revalidated.summary,
      rows: revalidated.rows,
      notice: 'Import analysed successfully. No live product prices or supplier costs have been changed.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an import record (restricted to superadmin)
app.delete('/api/admin/price-imports/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const success = await deletePriceImport(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Price import record not found.'
      });
    }
    res.json({
      success: true,
      message: 'Price import record deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// STAGE 6: SUPPLIER PRICE REVIEW, APPROVAL & CONTROLLED APPLICATION
// =========================================================================

// Open a previously analysed import for review (computes diffs, variance, eligibility)
app.get('/api/admin/price-imports/:id/review', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const importRecord = await reviewPriceImport(req.params.id, req.user);
    if (!importRecord) {
      return res.status(404).json({
        success: false,
        error: 'Price import record not found.'
      });
    }

    res.json({
      success: true,
      importRecord,
      notice: 'Reviewing proposed supplier costs. Live product selling prices and supplier costs remain unchanged until explicit approval and application.'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Explicitly approve selected rows for application
app.post('/api/admin/price-imports/:id/approve', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { approvedRowNumbers, rowIds, acknowledgeHighVariance, notes } = req.body || {};
    const rowsToApprove = approvedRowNumbers || rowIds;

    const importRecord = await approvePriceImportRows(req.params.id, {
      approvedRowNumbers: rowsToApprove,
      acknowledgeHighVariance: Boolean(acknowledgeHighVariance),
      notes,
      user: req.user
    });

    res.json({
      success: true,
      importRecord,
      message: 'Supplier costs approved for application. No live prices or costs have been modified yet. Proceed to application to execute.'
    });
  } catch (error) {
    const status = error.statusCode || (error.message.includes('not found') ? 404 : 400);
    const resp = { success: false, error: error.message };
    if (error.highVariance) {
      resp.highVariance = true;
      resp.highVarianceRows = error.highVarianceRows || [];
    }
    res.status(status).json(resp);
  }
});

// Apply approved supplier price changes to live catalog (strictly updates cost_price_ngn only)
app.post('/api/admin/price-imports/:id/apply', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { rowIds, approvedRowNumbers, recoverInterrupted } = req.body || {};
    const result = await applyPriceImport(req.params.id, req.user, {
      rowIds: rowIds || approvedRowNumbers,
      recoverInterrupted: Boolean(recoverInterrupted)
    });
    res.json(result);
  } catch (error) {
    const status = error.statusCode || (error.message.includes('not found') ? 404 : 400);
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel a price import (preventing further review, approval, or application)
app.post('/api/admin/price-imports/:id/cancel', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const result = await cancelPriceImport(req.params.id, req.user, reason);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || (error.message.includes('not found') ? 404 : 400);
    res.status(status).json({ success: false, error: error.message });
  }
});

// =========================================================================
// STAGE 7: SUPPLIER PRICE INTELLIGENCE, MARGIN ANALYSIS & ADVISORY RECOMMENDATIONS
// Access is strictly restricted to commercial pricing authority: ['superadmin', 'admin']
// Analytical endpoints are strictly READ-ONLY and NEVER modify product prices or stock.
// =========================================================================

// Catalog-wide profitability summary metrics
app.get('/api/admin/price-intelligence/summary', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const data = await getPriceIntelligenceSummary();
    res.json({
      success: true,
      ...data
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Searchable, filterable, and paginated product profitability list
app.get('/api/admin/price-intelligence/products', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const status = req.query.status || 'active';
    const margin_filter = req.query.margin_filter || req.query.margin_health || 'all';
    const missing_cost = req.query.missing_cost;
    const cost_increased = req.query.cost_increased;
    const recommendation = req.query.recommendation || '';
    const sort = req.query.sort || 'margin_asc';

    const result = await getPriceIntelligenceProducts({
      page,
      limit,
      search,
      category,
      brand,
      status,
      margin_filter,
      missing_cost,
      cost_increased,
      recommendation,
      sort
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single product profitability and advisory recommendation analysis
app.get('/api/admin/price-intelligence/products/:id', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const product = await getProductById(req.params.id, { includeSupplierCost: true });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    const settings = await getPriceIntelligenceSettings();
    const evaluated = evaluateProductProfitability(product, settings);

    res.json({
      success: true,
      product: evaluated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Historical supplier cost movements from genuine applied imports
app.get('/api/admin/price-intelligence/products/:id/cost-history', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const historyData = await getProductCostHistory(req.params.id);
    if (!historyData) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({
      success: true,
      ...historyData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advisory recommendations list
app.get('/api/admin/price-intelligence/recommendations', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const type = req.query.type || '';

    const result = await getPriceIntelligenceProducts({
      page,
      limit,
      recommendation: type,
      status: 'active'
    });

    res.json({
      success: true,
      ...result,
      notice: 'Recommendations are strictly advisory. No prices have been or will be changed automatically.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current price intelligence settings
app.get('/api/admin/price-intelligence/settings', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const settings = await getPriceIntelligenceSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update price intelligence target margin and thresholds (superadmin only)
app.patch('/api/admin/price-intelligence/settings', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const updated = await updatePriceIntelligenceSettings(req.body, req.user);
    if (typeof logAudit === 'function') {
      try {
        await logAudit({
          userId: req.user.id || req.user._id,
          action: 'UPDATE_PRICE_INTELLIGENCE_SETTINGS',
          entityType: 'price_intelligence_settings',
          entityId: 'default',
          details: `Updated target margin to ${updated.target_margin_percent}% (warning threshold: ${updated.warning_low_margin_threshold}%).`,
          ipAddress: req.ip || ''
        });
      } catch (auditErr) {
        // Safe degradation for MongoDB Atlas test users
      }
    }

    res.json({
      success: true,
      settings: updated,
      message: 'Price intelligence settings updated successfully.'
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

// =========================================================================
// STAGE 8.4: SOLAR PACKAGE BILL OF MATERIALS (BOM) ADMIN ROUTES
// =========================================================================

// 1. List Turnkey Solar Packages with BOM Status Summary
app.get('/api/admin/solar-packages', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'finance'), async (req, res) => {
  try {
    const packages = await getAdminSolarPackages();
    res.json({
      success: true,
      count: packages.length,
      packages
    });
  } catch (error) {
    console.error('[ADMIN SOLAR PACKAGES ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve solar packages with BOM summary' });
  }
});

// 2. Get BOM Details, Components, Revisions, and Eligible Catalog Products for a Package
app.get('/api/admin/solar-packages/:id/bom', requireAuth, requireRole('superadmin', 'admin', 'engineer', 'finance'), async (req, res) => {
  try {
    const result = await getPackageBom(req.params.id);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 3. Save / Update BOM Revision (Superadmin, Admin, Engineer)
app.post('/api/admin/solar-packages/:id/bom', requireAuth, requireRole('superadmin', 'admin', 'engineer'), async (req, res) => {
  try {
    const bom = await savePackageBomRevision(
      req.params.id,
      req.body,
      req.user,
      { ip: req.ip || req.headers['x-forwarded-for'] || '' }
    );
    res.json({
      success: true,
      message: `BOM revision ${bom.revision} saved successfully.`,
      bom
    });
  } catch (error) {
    const status = error.status || error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 4. Formally Review BOM Revision (Finance & Superadmin)
app.post('/api/admin/solar-packages/:id/bom/review', requireAuth, requireRole('finance', 'superadmin'), async (req, res) => {
  try {
    const bom = await reviewPackageBom(
      req.params.id,
      req.user,
      {
        decision: req.body.decision,
        notes: req.body.notes || req.body.review_notes || '',
        base_revision: req.body.base_revision
      },
      { ip: req.ip || req.headers['x-forwarded-for'] || '' }
    );
    res.json({
      success: true,
      message: `BOM revision ${bom.revision} finance review submitted successfully (${bom.finance_review.decision}).`,
      bom
    });
  } catch (error) {
    const status = error.status || error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 5. Formally Approve BOM Revision (Superadmin Only - Dual Authorization Enforced)
app.post('/api/admin/solar-packages/:id/bom/approve', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const approvalNotes = req.body.approval_notes || req.body.notes || '';
    const bom = await approvePackageBom(
      req.params.id,
      req.user,
      approvalNotes,
      { ip: req.ip || req.headers['x-forwarded-for'] || '' }
    );
    res.json({
      success: true,
      message: `BOM revision ${bom.revision} approved successfully by superadmin.`,
      bom
    });
  } catch (error) {
    const status = error.status || error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message });
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
app.get(['/admin', '/admin.html', '/admin/login', '/admin/:section'], authenticate, handleAdminPageRoute);
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
