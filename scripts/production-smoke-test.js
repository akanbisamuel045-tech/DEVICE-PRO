#!/usr/bin/env node
/**
 * DEVICE PRO — Production Smoke Test Suite
 * Validates that all public routes, API endpoints, sitemaps, and security headers respond correctly.
 */

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:3000';

console.log('===============================================================');
console.log('DEVICE PRO — PRODUCTION SMOKE TEST SUITE');
console.log(`Target Host: ${BASE_URL}`);
console.log(`Timestamp:   ${new Date().toISOString()}`);
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ FAIL: ${name}`);
    console.error(`    Details: ${err.message}`);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runSmokeTests() {
  // --- 1. SYSTEM HEALTH & MONITORING ---
  console.log('--- 1. SYSTEM HEALTH & MONITORING ---');
  await test('GET /api/health responds with 200 OK and database status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok', `Expected status "ok", got "${data.status}"`);
    assert(data.database && data.database.tables, 'Missing database table statistics');
  });

  // --- 2. CORE PUBLIC HTML PAGES (14 ROUTES) ---
  console.log('\n--- 2. CORE PUBLIC HTML PAGES (13 ROUTES) ---');
  const pages = [
    { route: '/', title: 'Home' },
    { route: '/solutions', title: 'Solutions' },
    { route: '/products', title: 'Products Catalogue' },
    { route: '/product-detail?id=1', title: 'Product Detail' },
    { route: '/packages', title: 'Turnkey Packages' },
    { route: '/projects', title: 'Projects Portfolio' },
    { route: '/calculator', title: 'Sizing Calculator' },
    { route: '/about', title: 'About Us' },
    { route: '/faq', title: 'FAQs' },
    { route: '/contact', title: 'Contact & Hubs' },
    { route: '/tracking', title: 'Order Tracking & Warranties' },
    { route: '/privacy-policy', title: 'Privacy Policy (NDPA)' },
    { route: '/shipping-policy', title: 'Shipping & Freight Policy' },
    { route: '/login', title: 'Sign In (Customer & Staff)' },
    { route: '/register', title: 'Account Registration' },
    { route: '/forgot-password', title: 'Password Recovery' },
    { route: '/reset-password', title: 'Password Reset' }
  ];

  for (const page of pages) {
    await test(`Page: ${page.title} (${page.route}) returns 200 HTML`, async () => {
      const res = await fetch(`${BASE_URL}${page.route}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const text = await res.text();
      assert(text.length > 500, `Response body too short: ${text.length} bytes`);
      assert(text.includes('<!DOCTYPE html>') || text.includes('<html'), 'Missing HTML doctype');
    });
  }

  // --- 3. COMMERCE & API SERVICES ---
  console.log('\n--- 3. COMMERCE & API SERVICES ---');
  await test('GET /api/products returns catalog list with total count', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.products), 'products must be an array');
    assert(data.products.length > 0, 'products array is empty');
    assert(data.total > 0, 'total must be > 0');
  });

  await test('GET /api/categories returns all 6 solar categories', async () => {
    const res = await fetch(`${BASE_URL}/api/categories`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.categories) && data.categories.length >= 6, `Expected at least 6 categories, got ${data.categories ? data.categories.length : 'none'}`);
  });

  await test('GET /api/packages returns turnkey solar bundles', async () => {
    const res = await fetch(`${BASE_URL}/api/packages`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.packages) && data.packages.length > 0, 'Turnkey packages array is empty');
  });

  await test('GET /api/case-studies returns verified Nigerian installations', async () => {
    const res = await fetch(`${BASE_URL}/api/case-studies`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.caseStudies) && data.caseStudies.length > 0, 'Case studies array is empty');
  });

  await test('POST /api/calculator/size calculates engineering sizing', async () => {
    const payload = {
      region: 'lagos',
      appliances: [
        { name: '1.5HP Inverter AC', watts: 1100, qty: 2, hoursDay: 4, hoursNight: 4 },
        { name: 'LED Lights', watts: 15, qty: 10, hoursDay: 2, hoursNight: 8 }
      ]
    };
    const res = await fetch(`${BASE_URL}/api/calculator/size`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Calculation success must be true');
    assert(data.recommendations && data.recommendations.inverter.recommendedKva > 0, 'Invalid recommendedInverterKva');
    assert(data.recommendations.battery.usableStorageKwh >= 0, 'Invalid usableStorageKwh');
  });

  // --- 4. SEO & SEARCH ENGINE INDEXING ---
  console.log('\n--- 4. SEO & SEARCH ENGINE INDEXING ---');
  await test('GET /sitemap.xml returns valid XML sitemap with 73 URLs', async () => {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const xml = await res.text();
    assert(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Missing XML declaration');
    assert(xml.includes('<urlset'), 'Missing urlset tag');
    const matches = (xml.match(/<loc>/g) || []).length;
    assert(matches === 73, `Expected 73 URLs in sitemap, found ${matches}`);
  });

  await test('GET /robots.txt disallows administrative & checkout paths', async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('User-agent: *'), 'Missing User-agent');
    assert(text.includes('Disallow: /admin'), 'Missing /admin disallow');
    assert(text.includes('Disallow: /checkout'), 'Missing /checkout disallow');
    assert(text.includes('Sitemap:'), 'Missing Sitemap directive');
  });

  // --- 5. SECURITY HEADERS & COMPRESSION ---
  console.log('\n--- 5. SECURITY HEADERS & COMPRESSION ---');
  await test('HTTP response emits strict production security headers', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.headers.get('strict-transport-security'), 'Missing Strict-Transport-Security header');
    assert(res.headers.get('content-security-policy'), 'Missing Content-Security-Policy header');
    assert(res.headers.get('x-content-type-options') === 'nosniff', 'Missing nosniff header');
    assert(res.headers.get('x-frame-options') === 'SAMEORIGIN', 'Missing SAMEORIGIN header');
  });

  await test('Gzip compression is active on text/JSON payloads', async () => {
    const res = await fetch(`${BASE_URL}/api/products`, {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    assert(res.headers.get('content-encoding') === 'gzip', 'Missing gzip Content-Encoding');
  });

  // --- 6. SUMMARY & EXIT CODE ---
  console.log('\n===============================================================');
  console.log(`SMOKE TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} total tests`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('STATUS: ✅ ALL PRODUCTION SMOKE TESTS PASSED CLEANLY\n');
  }
}

runSmokeTests().catch(err => {
  console.error(`FATAL ERROR IN SMOKE TEST RUNNER: ${err.message}`);
  process.exit(1);
});
