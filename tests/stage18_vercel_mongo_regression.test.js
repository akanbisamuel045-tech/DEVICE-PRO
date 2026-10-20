/**
 * DEVICE PRO — Stage 18 Automated Test Suite:
 * Vercel Serverless Architecture, MongoDB Atlas Connection Caching,
 * Cloud SQLite Isolation, and Edge Routing Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { connectMongo, isMongoConnected } = require('../db/mongo/connection');
const db = require('../db/database');

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 18: VERCEL SERVERLESS & MONGODB REGRESSION SUITE');
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

  // --- 1. MongoDB Atlas Connectivity & Connection Pooling ---
  console.log('--- 1. MongoDB Atlas Connectivity & Connection Caching ---');

  await test('MongoDB Atlas connects successfully and readyState is 1 (Connected)', async () => {
    const conn = await connectMongo();
    assert(conn, 'MongoDB connection should not be null');
    assert.strictEqual(conn.readyState, 1, 'MongoDB readyState should be 1 (connected)');
    assert(isMongoConnected(), 'isMongoConnected() should return true');
  });

  await test('Successive connectMongo() calls return identical cached connection promise', async () => {
    const conn1 = await connectMongo();
    const conn2 = await connectMongo();
    assert.strictEqual(conn1, conn2, 'Connection instances should be reused (singleton/cached)');
  });

  // --- 2. Dual-Engine Dispatcher & Cloud SQLite Isolation ---
  console.log('\n--- 2. Dual-Engine Dispatcher & Cloud SQLite Isolation ---');

  await test('getCategories() retrieves valid categories from MongoDB Atlas', async () => {
    const cats = await db.getCategories();
    assert(Array.isArray(cats), 'Categories should be an array');
    assert(cats.length >= 6, `Expected at least 6 categories, got ${cats.length}`);
    const slugs = cats.map(c => c.slug);
    assert(slugs.includes('solar-panels'), 'Must contain solar-panels');
    assert(slugs.includes('inverters'), 'Must contain inverters');
    assert(slugs.includes('batteries'), 'Must contain batteries');
  });

  await test('getProducts() retrieves paginated products with facets from Atlas', async () => {
    const result = await db.getProducts({ limit: 10 });
    assert(result, 'Products result should not be null');
    assert(result.products, 'Result should have products array');
    assert(result.products.length <= 10, 'Products count should respect limit');
    assert(result.total >= 48, `Expected at least 48 total products, got ${result.total}`);
  });

  await test('getProductBySlug() finds existing product in MongoDB Atlas', async () => {
    const prod = await db.getProductBySlug('jinko-monocrystalline-solar-panel-550w');
    assert(prod, 'Product should be found by slug');
    assert.strictEqual(prod.slug, 'jinko-monocrystalline-solar-panel-550w');
    assert(prod.price_ngn > 0, 'Price must be positive');
  });

  await test('getPackages() retrieves turnkey solar packages from Atlas', async () => {
    const packages = await db.getPackages();
    assert(Array.isArray(packages), 'Packages should be an array');
    assert(packages.length >= 4, `Expected at least 4 packages, got ${packages.length}`);
  });

  // --- 3. Serverless Entrypoint (api/index.js) ---
  console.log('\n--- 3. Serverless Entrypoint (api/index.js) ---');

  await test('api/index.js handler exports an async function', () => {
    const handler = require('../api/index');
    assert.strictEqual(typeof handler, 'function', 'Handler must be a function');
  });

  // --- 4. Vercel Configuration & Routing Rules ---
  console.log('\n--- 4. Vercel Configuration & Static Routing Rules ---');

  await test('vercel.json has cleanUrls enabled', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    assert.strictEqual(vercelConfig.cleanUrls, true, 'cleanUrls must be true for edge HTML routing');
  });

  await test('vercel.json maps API rewrites to /api', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    const apiRewrite = vercelConfig.rewrites.find(r => r.source === '/api/(.*)');
    assert(apiRewrite, 'Must have rewrite for /api/(.*)');
    assert.strictEqual(apiRewrite.destination, '/api');
  });

  await test('vercel.json configures dynamic product, package, and project routes', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    const sources = vercelConfig.rewrites.map(r => r.source);
    assert(sources.includes('/products/:slug'), 'Must rewrite /products/:slug');
    assert(sources.includes('/packages/:slug'), 'Must rewrite /packages/:slug');
    assert(sources.includes('/projects/:slug'), 'Must rewrite /projects/:slug');
  });

  // --- 5. Static Assets & Edge File Integrity ---
  console.log('\n--- 5. Static Assets & Edge File Integrity ---');

  await test('public/favicon.ico exists and has valid size', () => {
    const favPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    assert(fs.existsSync(favPath), 'public/favicon.ico must exist on disk');
    const stats = fs.statSync(favPath);
    assert(stats.size > 0, 'public/favicon.ico must not be empty');
  });

  await test('public/sitemap.xml and public/robots.txt exist', () => {
    const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    const robotsPath = path.join(__dirname, '..', 'public', 'robots.txt');
    assert(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
    assert(fs.existsSync(robotsPath), 'public/robots.txt must exist');
  });

  await test('All 15 customer-facing and administrative HTML templates exist in public/', () => {
    const requiredHtml = [
      'index.html', 'products.html', 'product-detail.html', 'packages.html',
      'solutions.html', 'projects.html', 'calculator.html', 'savings-calculator.html',
      'checkout.html', 'order-confirmation.html', 'tracking.html', 'about.html',
      'faq.html', 'contact.html', 'admin.html', 'privacy-policy.html',
      'terms.html', 'shipping-policy.html'
    ];
    for (const file of requiredHtml) {
      const p = path.join(__dirname, '..', 'public', file);
      assert(fs.existsSync(p), `Missing required HTML file: public/${file}`);
    }
  });

  // --- 6. Security & Secrets Hygiene ---
  console.log('\n--- 6. Security & Secrets Hygiene ---');

  await test('.gitignore strictly ignores .env and sensitive environment files', () => {
    const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
    assert(gitignore.includes('.env'), '.gitignore must ignore .env');
  });

  await test('.env.example contains no hardcoded credentials or passwords', () => {
    const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
    assert(!envExample.includes('akanbisamuel045'), '.env.example must not contain real MongoDB username');
    assert(!envExample.includes('Samuelll'), '.env.example must not contain real MongoDB password');
    assert(envExample.includes('<username>'), '.env.example must use placeholder <username>');
    assert(envExample.includes('<password>'), '.env.example must use placeholder <password>');
  });

  console.log('\n========================================================================');
  console.log(`STAGE 18 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite runner crashed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
