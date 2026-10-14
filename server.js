const express = require('express');
const path = require('path');
const { getProducts, getProductBySlug, getProductById, getPackages, getPackageBySlug, db } = require('./db/database');

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

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Products catalog with filtering, sorting, search, and pagination
app.get('/api/products', (req, res) => {
  try {
    const result = getProducts(req.query);

    // Get aggregated categories & counts
    const catRows = db.prepare(`
      SELECT category, category_label, COUNT(*) as count 
      FROM products 
      WHERE published = 1 
      GROUP BY category, category_label
      ORDER BY count DESC
    `).all();

    // Get aggregated brands & counts
    const brandRows = db.prepare(`
      SELECT brand, COUNT(*) as count 
      FROM products 
      WHERE published = 1 
      GROUP BY brand 
      ORDER BY count DESC
    `).all();

    // Get price bounds
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
    res.status(500).json({ success: false, error: 'Failed to retrieve products catalogue' });
  }
});

// API: Single product detail by slug
app.get('/api/products/:slug', (req, res) => {
  try {
    const product = getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get related products in same category
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

// API: Quotation request submission
app.post('/api/quote', (req, res) => {
  const { name, phone, type, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone are required.' });
  }
  console.log(`[QUOTE REQUEST RECEIVED] Name: ${name}, Phone: ${phone}, Type: ${type}, Notes: ${notes}`);
  res.status(201).json({
    success: true,
    message: 'Your solar consultation request has been successfully recorded. A DevicePro technical engineer will contact you shortly.',
    referenceId: 'DP-' + Math.floor(100000 + Math.random() * 900000)
  });
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

// Specific HTML Page Routes
app.get('/packages', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get('/packages.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get('/pricing.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'packages.html'));
});

app.get('/solutions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'solutions.html'));
});

app.get('/solutions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'solutions.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/products.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/products/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
});

app.get('/product-detail.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
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
