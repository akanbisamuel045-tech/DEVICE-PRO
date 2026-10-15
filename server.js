const express = require('express');
const path = require('path');
const {
  getProducts, getProductBySlug, getProductById, getPackages, getPackageBySlug,
  getCategories, getCaseStudies, getCaseStudyBySlug,
  createEnquiry, getEnquiries, getEnquiryById, updateEnquiryStatus,
  createQuote, getQuotes, getQuoteById, updateQuoteStatus,
  createOrder, getOrders, getOrderByNumber, updateOrderStatus,
  verifyUserLogin, createSession, getSessionUser, revokeSession,
  getAuditLogs, getDatabaseStats, exportDatabaseBackup, db
} = require('./db/database');
const {
  calculateSolarSizing,
  calculateGeneratorSavings,
  DEFAULT_APPLIANCES,
  REGIONAL_PSH,
  BATTERY_CHEMISTRIES,
  GENERATOR_BENCHMARKS
} = require('./lib/calculator-engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security & caching headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static assets from public directory without aggressive caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: false
}));

// =========================================================================
// RATE LIMITING & SECURITY MIDDLEWARE
// =========================================================================
const rateLimitMap = new Map();

function rateLimiter(windowMs, maxRequests) {
  return (req, res, next) => {
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

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.'
      });
    }

    next();
  };
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-auth-token'];

  if (!token) {
    req.user = null;
    return next();
  }

  const user = getSessionUser(token);
  req.user = user;
  req.token = token;
  next();
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
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Insufficient administrative privileges.' });
    }
    next();
  };
}

// =========================================================================
// API ENDPOINTS (Stage 12: Data Model, API & Persistence)
// =========================================================================

// API: Health & Database Diagnostics
app.get('/api/health', (req, res) => {
  try {
    const stats = getDatabaseStats();
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
app.get('/api/categories', (req, res) => {
  try {
    const categories = getCategories();
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

// API: Products catalog with filtering, sorting, search, and pagination
app.get('/api/products', (req, res) => {
  try {
    const result = getProducts(req.query);

    const catRows = db.prepare(`
      SELECT category, category_label, COUNT(*) as count 
      FROM products 
      WHERE published = 1 
      GROUP BY category, category_label
      ORDER BY count DESC
    `).all();

    const brandRows = db.prepare(`
      SELECT brand, COUNT(*) as count 
      FROM products 
      WHERE published = 1 
      GROUP BY brand 
      ORDER BY count DESC
    `).all();

    const priceRow = db.prepare(`
      SELECT MIN(price_ngn) as min_price, MAX(price_ngn) as max_price 
      FROM products 
      WHERE published = 1
    `).get();

    res.json({
      success: true,
      ...result,
      categories: catRows,
      brands: brandRows,
      priceRange: {
        min: priceRow.min_price || 0,
        max: priceRow.max_price || 15000000
      }
    });
  } catch (error) {
    console.error('[API PRODUCTS ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

// API: Product detail by slug
app.get('/api/products/:slug', (req, res) => {
  try {
    const product = getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const related = db.prepare(`
      SELECT * FROM products 
      WHERE category = ? AND id != ? AND published = 1 
      LIMIT 3
    `).all(product.category, product.id);

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
app.get('/api/packages', (req, res) => {
  try {
    const packages = getPackages();
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

app.get('/api/packages/:slug', (req, res) => {
  try {
    const pkg = getPackageBySlug(req.params.slug);
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
app.get('/api/case-studies', (req, res) => {
  try {
    const sector = req.query.sector;
    const caseStudies = getCaseStudies(sector);
    res.json({ success: true, count: caseStudies.length, caseStudies });
  } catch (error) {
    console.error('[API CASE STUDIES ERROR]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve case studies' });
  }
});

app.get('/api/case-studies/:slug', (req, res) => {
  try {
    const cs = getCaseStudyBySlug(req.params.slug);
    if (!cs) {
      return res.status(404).json({ success: false, error: 'Case study not found' });
    }
    res.json({ success: true, caseStudy: cs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve case study' });
  }
});

// API: Contact enquiry submission (persisted to SQLite database)
app.post(['/api/contact', '/api/enquiries'], rateLimiter(60000, 10), (req, res) => {
  try {
    const { phone, email, state, subject, message } = req.body;
    const clientName = (req.body.name || req.body.fullName || '').trim();
    const clientPhone = (phone || '').trim();
    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, error: 'Name and Phone number are required.' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const enquiry = createEnquiry({
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

// API: Quotation & Site Audit request submission (persisted to SQLite database)
app.post(['/api/quote', '/api/quotes'], rateLimiter(60000, 10), (req, res) => {
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
    const quote = createQuote({
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

// API: Equipment Order Creation (persisted to SQLite database)
app.post('/api/orders', rateLimiter(60000, 10), (req, res) => {
  try {
    const {
      customerName, customerPhone, customerEmail,
      deliveryAddress, deliveryState, items, paymentMethod
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
    const order = createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryState: deliveryState.trim(),
      items,
      paymentMethod: paymentMethod || 'transfer',
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

// API: Public Order Tracking
app.get('/api/orders/:orderNumber', (req, res) => {
  try {
    const order = getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    // Return safe public tracking fields
    res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        deliveryState: order.delivery_state,
        totalNgn: order.total_ngn,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        itemCount: order.items.length,
        items: order.items,
        createdAt: order.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to look up order' });
  }
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
// AUTHENTICATION API (Stage 12)
// =========================================================================
app.post('/api/auth/login', rateLimiter(60000, 5), (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const user = verifyUserLogin(username.trim(), password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const session = createSession(user.id);
    res.json({
      success: true,
      message: `Welcome, ${user.fullName}`,
      token: session.token,
      expiresAt: session.expiresAt,
      user
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]:', error);
    res.status(500).json({ success: false, error: 'Login process failed.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  try {
    revokeSession(req.token);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// =========================================================================
// PROTECTED ADMINISTRATIVE API (Stage 12 / Stage 13 prep)
// =========================================================================
app.get('/api/admin/stats', requireAuth, (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({ success: true, stats: stats.tables, meta: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/enquiries', requireAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = getEnquiries({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/enquiries/:id', requireAuth, (req, res) => {
  try {
    const { status, notes } = req.body;
    const enquiry = updateEnquiryStatus(req.params.id, status, notes, req.user.id);
    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/quotes', requireAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = getQuotes({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/quotes/:id', requireAuth, (req, res) => {
  try {
    const { status, notes } = req.body;
    const quote = updateQuoteStatus(req.params.id, status, notes, req.user.id);
    res.json({ success: true, quote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/orders', requireAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const result = getOrders({ limit, offset, status });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/orders/:id', requireAuth, (req, res) => {
  try {
    const { orderStatus, paymentStatus, notes } = req.body;
    const order = updateOrderStatus(req.params.id, orderStatus, paymentStatus, notes, req.user.id);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('superadmin'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = getAuditLogs({ limit, offset });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/backup', requireAuth, requireRole('superadmin'), (req, res) => {
  try {
    const backup = exportDatabaseBackup();
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// STATIC HTML PAGE ROUTES
// =========================================================================
app.get(['/calculator', '/calculator.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

app.get(['/savings-calculator', '/savings-calculator.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'savings-calculator.html'));
});

app.get(['/packages', '/packages.html', '/pricing', '/pricing.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get(['/solutions', '/solutions.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'solutions.html'));
});

app.get(['/products', '/products.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get(['/products/:slug', '/product-detail.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
});

app.get(['/projects', '/projects.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'projects.html'));
});

app.get(['/about', '/about.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get(['/resources', '/resources.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resources.html'));
});

app.get(['/faq', '/faq.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get(['/contact', '/contact.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback to homepage for other unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`DEVICE PRO Web Server is running at http://localhost:${PORT}`);
});

module.exports = server;
