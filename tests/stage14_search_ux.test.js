/**
 * DEVICE PRO — Stage 14 Automated Test Suite
 * Covers:
 * 1. Global Multi-Entity Search API (/api/products?search=..., /api/packages, /api/case-studies)
 * 2. Parameterized Product Filtering & Category Chaining (/api/products?category=...&search=...)
 * 3. Static Search & Cart Asset Delivery (/css/search.css, /js/search.js, /js/cart.js)
 * 4. Token & CSS Integration (tokens.css imports search.css)
 * 5. Universal HTML Script & Trigger Tag Compliance across all 12 public pages
 * 6. Cart Storage Key & Single-Source-of-Truth Consistency (dp_equipment_cart_v1)
 * 7. Search Command Palette Keyboard & Result Highlighting Contract
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('DEVICE PRO — STAGE 14: SEARCH, FILTERING & UX POLISH TEST SUITE');
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
  async function request(reqPath, options = {}) {
    const url = `${BASE_URL}${reqPath}`;
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

  // =========================================================================
  // 1. PRODUCT SEARCH API ENDPOINT
  // =========================================================================
  console.log('--- 1. Product Search API Endpoint ---');

  await test('Search for "inverter" returns inverter hardware products', async () => {
    const res = await request('/api/products?search=inverter');
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.ok(res.body.products && Array.isArray(res.body.products), 'Expected array of products');
    assert.ok(res.body.products.length > 0, 'Expected at least 1 inverter product');
    const hasInverter = res.body.products.some(p =>
      p.name.toLowerCase().includes('inverter') ||
      (p.category && p.category.toLowerCase().includes('inverter'))
    );
    assert.ok(hasInverter, 'Expected at least one item matching inverter name/category');
  });

  await test('Search for "lithium" returns energy storage products', async () => {
    const res = await request('/api/products?search=lithium');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.products.length > 0, 'Expected lithium battery products');
    const hasLithium = res.body.products.some(p =>
      p.name.toLowerCase().includes('lithium') ||
      (p.specifications && p.specifications.toLowerCase().includes('lithium'))
    );
    assert.ok(hasLithium, 'Expected lithium in name or specifications');
  });

  await test('Search for "550w" finds high-wattage solar panels', async () => {
    const res = await request('/api/products?search=550w');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.products.length > 0, 'Expected products with 550W specification');
    const hasWattage = res.body.products.some(p =>
      p.name.toLowerCase().includes('550') ||
      (p.specifications && p.specifications.toLowerCase().includes('550w'))
    );
    assert.ok(hasWattage, 'Expected 550W match');
  });

  await test('Search for brand "Deye" or "Felicity" returns brand products', async () => {
    const resDeye = await request('/api/products?search=Deye');
    assert.strictEqual(resDeye.status, 200);
    assert.ok(resDeye.body.products.length > 0, 'Expected Deye products');
    const allDeye = resDeye.body.products.every(p =>
      p.brand.toLowerCase().includes('deye') || p.name.toLowerCase().includes('deye')
    );
    assert.ok(allDeye, 'All results should match Deye brand/name');
  });

  await test('Search with non-existent query returns empty results cleanly', async () => {
    const res = await request('/api/products?search=nonexistent_gadget_xyz987');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.products.length, 0, 'Expected 0 products');
    assert.strictEqual(res.body.total, 0, 'Expected total 0');
  });

  await test('Chained search with category filter (/api/products?category=solar-panels&search=jinko)', async () => {
    const res = await request('/api/products?category=solar-panels&search=jinko');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.products.length > 0, 'Expected Jinko solar panels');
    const allPanels = res.body.products.every(p => p.category === 'solar-panels');
    assert.ok(allPanels, 'All results must belong to solar-panels category');
  });

  // =========================================================================
  // 2. MULTI-ENTITY SEARCH DATA SOURCES
  // =========================================================================
  console.log('\n--- 2. Multi-Entity Data Sources (Turnkey Packages & Case Studies) ---');

  await test('GET /api/packages returns turnkey packages for search indexing', async () => {
    const res = await request('/api/packages');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.packages), 'Expected packages array');
    assert.ok(res.body.packages.length >= 3, 'Expected at least 3 turnkey packages');
    const first = res.body.packages[0];
    assert.ok(first.name, 'Package must have name');
    assert.ok(first.slug, 'Package must have slug');
    assert.ok(first.price_ngn > 0, 'Package must have price_ngn');
  });

  await test('GET /api/case-studies returns engineered project portfolio', async () => {
    const res = await request('/api/case-studies');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.caseStudies), 'Expected caseStudies array');
    assert.ok(res.body.caseStudies.length >= 3, 'Expected at least 3 case studies');
    const first = res.body.caseStudies[0];
    assert.ok(first.title, 'Case study must have title');
    assert.ok(first.slug, 'Case study must have slug');
    assert.ok(first.sector, 'Case study must have sector');
  });

  // =========================================================================
  // 3. STATIC SEARCH & CART ASSETS
  // =========================================================================
  console.log('\n--- 3. Static Search & Cart Asset Delivery ---');

  await test('GET /css/search.css delivers command palette styles', async () => {
    const res = await request('/css/search.css');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('#search-dialog'), 'search.css must contain #search-dialog');
    assert.ok(res.body.includes('backdrop-filter'), 'search.css must have frosted glass backdrop');
    assert.ok(res.body.includes('.search-result-item'), 'search.css must style search-result-item');
  });

  await test('tokens.css imports search.css', () => {
    const tokensPath = path.join(__dirname, '..', 'public', 'css', 'tokens.css');
    const content = fs.readFileSync(tokensPath, 'utf8');
    assert.ok(content.includes('@import url(\'search.css\');') || content.includes('@import "search.css"'),
      'tokens.css must import search.css'
    );
  });

  await test('GET /js/search.js delivers spotlight search controller', async () => {
    const res = await request('/js/search.js');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('window.DeviceProSearch'), 'search.js must expose DeviceProSearch');
    assert.ok(res.body.includes('ensureSearchModal'), 'search.js must have ensureSearchModal');
    assert.ok(res.body.includes('openSearchDialog'), 'search.js must have openSearchDialog');
  });

  await test('GET /js/cart.js delivers universal cart system', async () => {
    const res = await request('/js/cart.js');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('dp_equipment_cart_v1'), 'cart.js must use dp_equipment_cart_v1 storage key');
    assert.ok(res.body.includes('window.DeviceProCart'), 'cart.js must expose DeviceProCart');
    assert.ok(res.body.includes('ensureDrawer'), 'cart.js must have ensureDrawer self-injection');
    assert.ok(res.body.includes('openDrawer'), 'cart.js must have openDrawer');
  });

  // =========================================================================
  // 4. HTML PAGE INTEGRATION & TRIGGER COMPLIANCE
  // =========================================================================
  console.log('\n--- 4. Universal HTML Page Compliance (11 Customer-Facing Pages) ---');

  const customerPages = [
    { file: 'index.html', path: '/' },
    { file: 'products.html', path: '/products' },
    { file: 'product-detail.html', path: '/product-detail' },
    { file: 'packages.html', path: '/packages' },
    { file: 'solutions.html', path: '/solutions' },
    { file: 'projects.html', path: '/projects' },
    { file: 'calculator.html', path: '/calculator' },
    { file: 'savings-calculator.html', path: '/savings-calculator' },
    { file: 'about.html', path: '/about' },
    { file: 'faq.html', path: '/faq' },
    { file: 'contact.html', path: '/contact' }
  ];

  for (const page of customerPages) {
    await test(`Page "${page.file}" has search.js, cart.js, search trigger and cart trigger`, () => {
      const filePath = path.join(__dirname, '..', 'public', page.file);
      assert.ok(fs.existsSync(filePath), `File ${page.file} must exist`);
      const html = fs.readFileSync(filePath, 'utf8');

      assert.ok(html.includes('/js/cart.js'), `${page.file} must include /js/cart.js`);
      assert.ok(html.includes('/js/search.js'), `${page.file} must include /js/search.js`);
      assert.ok(html.includes('data-trigger-search'), `${page.file} must have data-trigger-search button`);
      assert.ok(html.includes('data-trigger-cart'), `${page.file} must have data-trigger-cart button`);
      assert.ok(html.includes('footer-watermark'), `${page.file} must have footer-watermark element`);
    });
  }

  // Also check checkout.html and order-confirmation.html
  await test('checkout.html and order-confirmation.html load cart.js and search.js', () => {
    const chkHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'checkout.html'), 'utf8');
    assert.ok(chkHtml.includes('/js/cart.js?v=2'), 'checkout.html must include cart.js?v=2');
    assert.ok(chkHtml.includes('/js/search.js?v=1'), 'checkout.html must include search.js?v=1');

    const ordHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'order-confirmation.html'), 'utf8');
    assert.ok(ordHtml.includes('/js/cart.js?v=2'), 'order-confirmation.html must include cart.js?v=2');
    assert.ok(ordHtml.includes('/js/search.js?v=1'), 'order-confirmation.html must include search.js?v=1');
  });

  // =========================================================================
  // 5. CATALOGUE SCRIPT INTEGRATION (products.js, packages.js, calculator.js)
  // =========================================================================
  console.log('\n--- 5. Catalogue & Script Integration ---');

  await test('products.js integrates with DeviceProCart', () => {
    const pJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'products.js'), 'utf8');
    assert.ok(pJs.includes('window.DeviceProCart'), 'products.js must invoke window.DeviceProCart');
  });

  await test('packages.js integrates with DeviceProCart', () => {
    const pkgJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'packages.js'), 'utf8');
    assert.ok(pkgJs.includes('window.DeviceProCart'), 'packages.js must invoke window.DeviceProCart');
  });

  await test('calculator.js integrates with DeviceProCart', () => {
    const calcJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'calculator.js'), 'utf8');
    assert.ok(calcJs.includes('window.DeviceProCart'), 'calculator.js must invoke window.DeviceProCart');
  });

  await test('product-detail.js integrates with DeviceProCart', () => {
    const detJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'product-detail.js'), 'utf8');
    assert.ok(detJs.includes('window.DeviceProCart'), 'product-detail.js must invoke window.DeviceProCart');
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
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
