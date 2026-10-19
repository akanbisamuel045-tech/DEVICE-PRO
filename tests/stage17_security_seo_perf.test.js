/**
 * DEVICE PRO — Stage 17 Automated Test Suite:
 * Security Hardening, SEO Discovery, Accessibility (WCAG 2.2 AA), Performance & Legal Compliance
 * 
 * Verifies:
 * 1. Dynamic XML Sitemap Generator (/sitemap.xml with exactly 75 URLs: 15 static + 60 dynamic)
 * 2. Search Engine Directives (/robots.txt with allow/disallow policies and sitemap pointer)
 * 3. Security Headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, Referrer-Policy)
 * 4. Compression (gzip Content-Encoding on HTTP responses) & Static Asset Caching
 * 5. Accessibility Framework (WCAG 2.2 AA skip links, :focus-visible, .sr-only, prefers-reduced-motion)
 * 6. Legal & Policy Compliance Pages (/privacy-policy, /terms, /shipping-policy)
 * 7. Schema.org JSON-LD Structured Data (Organization, LocalBusiness, WebSite, FAQPage)
 * 8. Database Health & Backup Verification (PRAGMA integrity_check & exportDatabaseBackup)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { db, exportDatabaseBackup } = require('../db/database');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 17: SECURITY, SEO, A11Y, PERF & REGRESSION TEST SUITE');
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

  // HTTP Helper
  async function request(reqPath, options = {}) {
    const url = `${BASE_URL}${reqPath}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json, text/html, application/xml, */*',
        ...(options.headers || {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    return {
      status: res.status,
      headers: res.headers,
      body
    };
  }

  // =========================================================================
  // 1. DYNAMIC XML SITEMAP GENERATOR
  // =========================================================================
  await test('1.1: GET /sitemap.xml returns HTTP 200 with application/xml', async () => {
    const res = await request('/sitemap.xml');
    assert.strictEqual(res.status, 200, 'Sitemap endpoint must return 200 OK');
    const ct = res.headers.get('content-type') || '';
    assert(ct.includes('xml'), `Content-Type must be XML, got: ${ct}`);
  });

  await test('1.2: Sitemap contains valid XML header and urlset schema', async () => {
    const res = await request('/sitemap.xml');
    assert(res.body.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Must contain XML declaration');
    assert(res.body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Must define valid sitemap schema');
    assert(res.body.includes('</urlset>'), 'Must properly close urlset');
  });

  await test('1.3: Sitemap contains all 14 required static routes with priority & changefreq', async () => {
    const res = await request('/sitemap.xml');
    const staticRoutes = [
      'https://devicepro.ng/',
      'https://devicepro.ng/solutions',
      'https://devicepro.ng/products',
      'https://devicepro.ng/packages',
      'https://devicepro.ng/projects',
      'https://devicepro.ng/calculator',
      'https://devicepro.ng/savings-calculator',
      'https://devicepro.ng/about',
      'https://devicepro.ng/faq',
      'https://devicepro.ng/contact',
      'https://devicepro.ng/tracking',
      'https://devicepro.ng/privacy-policy',
      'https://devicepro.ng/terms',
      'https://devicepro.ng/shipping-policy'
    ];

    for (const route of staticRoutes) {
      assert(res.body.includes(`<loc>${route}</loc>`), `Sitemap must include static route: ${route}`);
    }
  });

  await test('1.4: Sitemap contains exactly 74 URLs (14 static + 48 products + 6 packages + 6 case studies)', async () => {
    const res = await request('/sitemap.xml');
    const urlMatches = res.body.match(/<url>/g) || [];
    assert.strictEqual(urlMatches.length, 74, `Sitemap must contain exactly 74 URLs, found: ${urlMatches.length}`);
  });

  await test('1.5: Static public/sitemap.xml file exists and matches dynamic output', async () => {
    const filePath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    assert(fs.existsSync(filePath), 'public/sitemap.xml file must exist on disk');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const urlMatches = fileContent.match(/<url>/g) || [];
    assert.strictEqual(urlMatches.length, 74, 'Static sitemap must contain 74 URLs');
  });

  // =========================================================================
  // 2. SEARCH ENGINE DIRECTIVES (ROBOTS.TXT)
  // =========================================================================
  await test('2.1: GET /robots.txt returns HTTP 200 with standard search crawler directives', async () => {
    const res = await request('/robots.txt');
    assert.strictEqual(res.status, 200, 'robots.txt must return 200');
    assert(res.body.includes('User-agent: *'), 'Must specify User-agent wildcard');
    assert(res.body.includes('Allow: /'), 'Must allow public index');
  });

  await test('2.2: robots.txt disallows private admin, checkout, and API paths', async () => {
    const res = await request('/robots.txt');
    assert(res.body.includes('Disallow: /admin'), 'Must disallow /admin');
    assert(res.body.includes('Disallow: /checkout'), 'Must disallow /checkout');
    assert(res.body.includes('Disallow: /api/admin/*'), 'Must disallow /api/admin/*');
    assert(res.body.includes('Disallow: /api/payments/*'), 'Must disallow /api/payments/*');
  });

  await test('2.3: robots.txt declares canonical Host and Sitemap location', async () => {
    const res = await request('/robots.txt');
    assert(res.body.includes('Host: https://devicepro.ng'), 'Must specify canonical Host');
    assert(res.body.includes('Sitemap: https://devicepro.ng/sitemap.xml'), 'Must point to sitemap.xml');
  });

  // =========================================================================
  // 3. SECURITY HEADERS & TRANSPORT HARDENING
  // =========================================================================
  await test('3.1: HSTS (Strict-Transport-Security) header is active with 1-year max-age', async () => {
    const res = await request('/');
    const hsts = res.headers.get('strict-transport-security');
    assert(hsts, 'HSTS header must be present');
    assert(hsts.includes('max-age=31536000'), 'HSTS must specify 31536000 seconds (1 year)');
    assert(hsts.includes('includeSubDomains'), 'HSTS must include subdomains');
  });

  await test('3.2: Content-Security-Policy (CSP) header is properly declared', async () => {
    const res = await request('/');
    const csp = res.headers.get('content-security-policy');
    assert(csp, 'CSP header must be present');
    assert(csp.includes("default-src 'self'"), 'CSP must restrict default-src');
    assert(csp.includes('https://js.paystack.co'), 'CSP must allow Paystack script source');
    assert(csp.includes('https://fonts.googleapis.com'), 'CSP must allow Google Fonts style source');
  });

  await test('3.3: X-Content-Type-Options is nosniff and X-Frame-Options is SAMEORIGIN', async () => {
    const res = await request('/');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  });

  await test('3.4: Permissions-Policy and Referrer-Policy are strictly configured', async () => {
    const res = await request('/');
    const permPolicy = res.headers.get('permissions-policy');
    assert(permPolicy, 'Permissions-Policy header must be present');
    assert(permPolicy.includes('microphone=()'), 'Microphone access must be restricted');
    assert(permPolicy.includes('camera=()'), 'Camera access must be restricted');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  // =========================================================================
  // 4. PERFORMANCE & COMPRESSION
  // =========================================================================
  await test('4.1: Express compression middleware compresses JSON and text responses via gzip', async () => {
    const res = await request('/api/products', {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    const encoding = res.headers.get('content-encoding');
    assert.strictEqual(encoding, 'gzip', 'Response must be gzip encoded when client accepts gzip');
  });

  await test('4.2: Static assets caching policy emits Cache-Control on css/js assets', async () => {
    const res = await request('/css/tokens.css');
    const cc = res.headers.get('cache-control') || '';
    assert(cc.includes('public') && cc.includes('max-age=86400'), `Static CSS must have 24h cache-control, got: ${cc}`);
  });

  // =========================================================================
  // 5. ACCESSIBILITY (WCAG 2.2 AA)
  // =========================================================================
  await test('5.1: components.css contains .skip-to-content, :focus-visible, and .sr-only rules', async () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'components.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert(cssContent.includes('.skip-to-content'), 'Must define .skip-to-content styling');
    assert(cssContent.includes(':focus-visible'), 'Must define :focus-visible brand focus ring');
    assert(cssContent.includes('.sr-only'), 'Must define .sr-only accessibility utility');
  });

  await test('5.2: components.css includes @media (prefers-reduced-motion: reduce) safety overrides', async () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'components.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'Must define prefers-reduced-motion media query');
    assert(cssContent.includes('animation-duration: 0.01ms'), 'Must reduce animation duration');
  });

  await test('5.3: Main pages contain skip-to-content link targeting corresponding main container ID', async () => {
    const pages = [
      { file: 'index.html', target: '#main-content' },
      { file: 'privacy-policy.html', target: '#main-content' },
      { file: 'terms.html', target: '#main-content' },
      { file: 'shipping-policy.html', target: '#main-content' },
      { file: 'faq.html', target: '#main-faq' },
      { file: 'products.html', target: '#main-catalogue' },
      { file: 'packages.html', target: '#main-packages' },
      { file: 'calculator.html', target: '#main-calculator' },
      { file: 'solutions.html', target: '#main-solutions' },
      { file: 'projects.html', target: '#main-projects' },
      { file: 'contact.html', target: '#main-contact' }
    ];

    for (const p of pages) {
      const htmlPath = path.join(__dirname, '..', 'public', p.file);
      assert(fs.existsSync(htmlPath), `Page ${p.file} must exist`);
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(
        html.includes(`class="skip-to-content"`) && html.includes(`href="${p.target}"`),
        `${p.file} must have .skip-to-content targeting ${p.target}`
      );
    }
  });

  // =========================================================================
  // 6. LEGAL & POLICY PAGES (NDPR, NDPA 2023, COREN, FREIGHT)
  // =========================================================================
  await test('6.1: GET /privacy-policy returns 200 and covers NDPA 2023, zero raw card storage, and DPO', async () => {
    const res = await request('/privacy-policy');
    assert.strictEqual(res.status, 200, 'Privacy policy must return 200');
    assert(res.body.includes('Nigeria Data Protection Act 2023'), 'Must reference NDPA 2023');
    assert(res.body.includes('Zero Raw Card Storage'), 'Must guarantee zero card storage');
    assert(res.body.includes('dpo@devicepro.ng'), 'Must provide DPO contact email');
    assert(res.body.includes('Paystack'), 'Must reference CBN-licensed payment partner');
  });

  await test('6.2: GET /terms returns 200 and details COREN engineering, Tier-1 warranties, and swap SLA', async () => {
    const res = await request('/terms');
    assert.strictEqual(res.status, 200, 'Terms page must return 200');
    assert(res.body.includes('COREN'), 'Must reference COREN registered engineering standards');
    assert(res.body.includes('NEMSA'), 'Must reference NEMSA electrical safety guidelines');
    assert(res.body.includes('25-Year'), 'Must specify 25-Year solar panel warranty');
    assert(res.body.includes('10-Year'), 'Must specify 10-Year lithium battery warranty');
    assert(res.body.includes('24 to 48 hours') || res.body.includes('24–48'), 'Must declare rapid swap SLA');
  });

  await test('6.3: GET /shipping-policy returns 200 and specifies Nigerian regional lead times & offloading', async () => {
    const res = await request('/shipping-policy');
    assert.strictEqual(res.status, 200, 'Shipping policy must return 200');
    assert(res.body.includes('Lagos Central Depot'), 'Must mention Lagos fulfillment hub');
    assert(res.body.includes('Abuja'), 'Must mention Abuja distribution depot');
    assert(res.body.includes('Port Harcourt'), 'Must mention Port Harcourt distribution hub');
    assert(res.body.includes('24 to 48 hours') || res.body.includes('24–48 hours'), 'Must declare Lagos delivery timeframe');
    assert(res.body.includes('Heavy Goods Offloading'), 'Must provide heavy freight offloading protocol');
  });

  // =========================================================================
  // 7. SCHEMA.ORG JSON-LD STRUCTURED DATA
  // =========================================================================
  await test('7.1: index.html contains valid Organization, LocalBusiness, and WebSite JSON-LD schemas', async () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(match, 'index.html must have a JSON-LD script block');
    const schema = JSON.parse(match[1]);
    assert(schema['@graph'], 'Schema should contain @graph array');

    const org = schema['@graph'].find(item => item['@type'] === 'Organization');
    assert(org, 'Must define Organization schema');
    assert.strictEqual(org.name, 'DEVICE PRO Nigeria Limited');

    const biz = schema['@graph'].find(item => item['@type'] === 'LocalBusiness');
    assert(biz, 'Must define LocalBusiness schema');
    assert.strictEqual(biz.address.addressLocality, 'Lagos');

    const website = schema['@graph'].find(item => item['@type'] === 'WebSite');
    assert(website, 'Must define WebSite schema');
    assert(website.potentialAction, 'WebSite must define SearchAction');
  });

  await test('7.2: faq.html contains valid FAQPage JSON-LD schema', async () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'faq.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(match, 'faq.html must have a JSON-LD script block');
    const schema = JSON.parse(match[1]);
    assert.strictEqual(schema['@type'], 'FAQPage');
    assert(Array.isArray(schema.mainEntity) && schema.mainEntity.length >= 4, 'FAQPage must contain question entities');
  });

  // =========================================================================
  // 8. DATABASE INTEGRITY & BACKUP VERIFICATION
  // =========================================================================
  await test('8.1: SQLite PRAGMA integrity_check passes without errors', async () => {
    const result = db.prepare('PRAGMA integrity_check').get();
    assert.strictEqual(result.integrity_check, 'ok', 'Database integrity check must return "ok"');
  });

  await test('8.2: exportDatabaseBackup creates verified timestamped snapshot', async () => {
    const backup = exportDatabaseBackup();
    assert(backup.success, 'Backup execution must succeed');
    assert(fs.existsSync(backup.backupFile), 'Backup file must exist on disk');
    assert(backup.sizeBytes > 10000, `Backup file must have valid size, got: ${backup.sizeBytes} bytes`);
    assert(backup.counts.products >= 48, `Backup must preserve all products, got: ${backup.counts.products}`);
    // Clean up temporary backup test file
    fs.unlinkSync(backup.backupFile);
  });

  console.log('\n========================================================================');
  console.log(`STAGE 17 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite runner crashed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
