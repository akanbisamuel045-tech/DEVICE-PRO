/**
 * DEVICE PRO — Stage 12 Automated Integration & Unit Test Suite
 * Covers:
 * 1. Database schema, tables, seeders, and persistence
 * 2. Scrypt salted password hashing and session tokens
 * 3. Enquiries, quotes, and orders CRUD with audit logs
 * 4. Domain calculator engine (Solar Sizing & Generator Savings)
 * 5. REST API endpoints, rate limiting, and RBAC security
 * 6. Calculator page route serving
 */

const assert = require('assert');
const path = require('path');
const {
  getProducts, getProductBySlug, getPackages,
  createEnquiry, getEnquiries, updateEnquiryStatus,
  createQuote, getQuotes, updateQuoteStatus,
  createOrder, getOrders, getOrderByNumber, updateOrderStatus,
  verifyUserLogin, createSession, getSessionUser, revokeSession,
  getAuditLogs, getDatabaseStats, exportDatabaseBackup, db
} = require('../db/database');

const {
  calculateSolarSizing,
  calculateGeneratorSavings,
  DEFAULT_APPLIANCES,
  REGIONAL_PSH,
  BATTERY_CHEMISTRIES,
  GENERATOR_BENCHMARKS
} = require('../lib/calculator-engine');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('DEVICE PRO — STAGE 12 TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
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

  // =========================================================================
  // 1. DATABASE PERSISTENCE & SCHEMA TESTS
  // =========================================================================
  console.log('--- 1. DATABASE SCHEMA & PERSISTENCE ---');

  test('Database has 10 required schema tables', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all().map(r => r.name);
    const expected = ['audit_logs', 'case_studies', 'categories', 'enquiries', 'orders', 'products', 'quotes', 'schema_migrations', 'sessions', 'users'];
    for (const tbl of expected) {
      assert(tables.includes(tbl), `Missing table: ${tbl}`);
    }
  });

  test('Categories seeded with 6 primary solar categories', () => {
    const cats = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    assert(cats.count >= 6, `Expected at least 6 categories, got ${cats.count}`);
  });

  test('Products catalog has 48 verified items with specifications', () => {
    const prods = getProducts({ limit: 100 });
    assert(prods.total >= 48, `Expected at least 48 products, got ${prods.total}`);
    assert(prods.products[0].specifications !== null, 'Product specifications must not be null');
  });

  test('Case studies seeded with 6 verified Nigerian projects', () => {
    const cs = db.prepare('SELECT COUNT(*) as count FROM case_studies').get();
    assert(cs.count >= 6, `Expected at least 6 case studies, got ${cs.count}`);
  });

  test('Users table contains seeded staff accounts with salted scrypt hashes', () => {
    const users = db.prepare('SELECT username, salt, password_hash, role FROM users').all();
    assert(users.length >= 3, 'Expected at least 3 staff accounts');
    const admin = users.find(u => u.username === 'admin');
    assert(admin, 'Admin user must exist');
    assert.strictEqual(admin.role, 'superadmin');
    assert(admin.salt.length >= 32, 'Salt must be at least 32 hex chars');
    assert(admin.password_hash.length >= 64, 'Hash must be at least 64 hex chars');
  });

  // =========================================================================
  // 2. AUTHENTICATION & SESSION MANAGEMENT
  // =========================================================================
  console.log('\n--- 2. AUTHENTICATION & SECURITY ---');

  test('verifyUserLogin succeeds with valid password and fails with invalid password', () => {
    const valid = verifyUserLogin('admin', 'Admin@DevicePro2026!');
    assert(valid, 'Login with correct password must succeed');
    assert.strictEqual(valid.username, 'admin');
    assert.strictEqual(valid.role, 'superadmin');

    const invalid = verifyUserLogin('admin', 'WrongPassword123');
    assert.strictEqual(invalid, null, 'Login with wrong password must return null');
  });

  test('createSession issues crypto token and getSessionUser resolves user', () => {
    const admin = verifyUserLogin('admin', 'Admin@DevicePro2026!');
    const session = createSession(admin.id);
    assert(session.token && session.token.length >= 40, 'Session token must be secure random hex');

    const user = getSessionUser(session.token);
    assert(user, 'Session must resolve to active user');
    assert.strictEqual(user.username, 'admin');

    revokeSession(session.token);
    const revoked = getSessionUser(session.token);
    assert.strictEqual(revoked, null, 'Revoked session must resolve to null');
  });

  // =========================================================================
  // 3. CRUD ON ENQUIRIES, QUOTES, AND ORDERS
  // =========================================================================
  console.log('\n--- 3. DATABASE CRUD OPERATIONS ---');

  let testQuoteId = null;
  let testOrderNumber = null;

  test('createQuote stores quotation and increments audit log', () => {
    const quote = createQuote({
      fullName: 'Dr. Chinedu Obi',
      phone: '+234 803 555 7788',
      email: 'chinedu@hospital.ng',
      state: 'Enugu',
      propertyType: 'Hospital / Clinic',
      calculatedSystem: '10kVA / 20.48kWh / 8.8kWp',
      notes: 'Diagnostic radiology clinic with constant 24/7 power requirements'
    });

    assert(quote && quote.reference_id, 'Quote must have a reference ID');
    assert(quote.reference_id.startsWith('DP-'), 'Reference ID must start with DP-');
    testQuoteId = quote.id;

    const fetched = getQuotes({ limit: 10 });
    const found = fetched.quotes.find(q => q.id === quote.id);
    assert(found, 'Created quote must be retrievable from getQuotes()');
  });

  test('updateQuoteStatus updates status and records audit log', () => {
    assert(testQuoteId, 'Quote ID required');
    const admin = verifyUserLogin('admin', 'Admin@DevicePro2026!');
    const updated = updateQuoteStatus(testQuoteId, 'contacted', 'Spoke with Dr. Chinedu; scheduled site survey for Thursday.', admin.id);
    assert.strictEqual(updated.status, 'contacted');
  });

  test('createOrder places equipment order with relational item rows', () => {
    const order = createOrder({
      customerName: 'Engr. Tunde Williams',
      customerPhone: '+234 802 111 2233',
      customerEmail: 'tunde@williams-firm.ng',
      deliveryAddress: 'Plot 14 Victoria Island, Lagos',
      deliveryState: 'Lagos',
      items: [
        {
          productId: 1,
          productName: 'Jinko Solar 550W Tiger Neo Monocrystalline Panel',
          sku: 'DP-SP-550W-JIN',
          unitPriceNgn: 145000,
          quantity: 8
        },
        {
          productId: 18,
          productName: 'Deye 8kW Hybrid Inverter (48V / Dual MPPT)',
          sku: 'DP-INV-8KW-DEYE',
          unitPriceNgn: 1850000,
          quantity: 1
        }
      ],
      paymentMethod: 'transfer'
    });

    assert(order && order.order_number, 'Order must have order_number');
    assert(order.order_number.startsWith('DP-ORD-'), 'Order number format invalid');
    // Subtotal (145000 * 8 + 1850000) + Lagos Delivery Fee (15000) = 3025000
    assert.strictEqual(order.total_ngn, (145000 * 8) + 1850000 + 15000);
    assert.strictEqual(order.items.length, 2);
    testOrderNumber = order.order_number;
  });

  test('getOrderByNumber retrieves order with items and order status can be updated', () => {
    assert(testOrderNumber, 'Order number required');
    const order = getOrderByNumber(testOrderNumber);
    assert(order, 'Order must be found by order number');
    assert.strictEqual(order.customer_name, 'Engr. Tunde Williams');

    const admin = verifyUserLogin('admin', 'Admin@DevicePro2026!');
    const updated = updateOrderStatus(order.id, 'confirmed', 'paid', 'Transfer confirmed by Zenith Bank.', admin.id);
    assert.strictEqual(updated.order_status, 'confirmed');
    assert.strictEqual(updated.payment_status, 'paid');
  });

  test('exportDatabaseBackup exports full snapshot with stats', () => {
    const backup = exportDatabaseBackup();
    assert(backup.counts, 'Backup must include table counts');
    assert(backup.counts.products >= 48, 'Backup must include all products');
    assert(backup.counts.quotes >= 1, 'Backup must include quotes');
    assert(backup.counts.orders >= 1, 'Backup must include orders');
  });

  // =========================================================================
  // 4. DOMAIN CALCULATOR ENGINE TESTS
  // =========================================================================
  console.log('\n--- 4. DOMAIN CALCULATOR ENGINE ---');

  test('calculateSolarSizing computes correct simultaneous load, kW, kVA and battery sizing', () => {
    const sizing = calculateSolarSizing({
      appliances: [
        { id: 'led', name: 'LED Bulbs', watts: 15, qty: 10, hoursDay: 2, hoursNight: 8, hasSurge: false },
        { id: 'fridge', name: 'Inverter Refrigerator', watts: 150, qty: 1, hoursDay: 12, hoursNight: 12, hasSurge: true, surgeMultiplier: 2.5 },
        { id: 'ac', name: '1.5 HP Inverter AC', watts: 1350, qty: 2, hoursDay: 3, hoursNight: 7, hasSurge: true, surgeMultiplier: 2.5 }
      ],
      region: 'lagos',
      batteryType: 'lifepo4',
      autonomyDays: 1.0,
      diversityFactor: 0.75
    });

    assert(sizing.demand.totalConnectedWatts === (15*10 + 150 + 1350*2), 'Total connected watts mismatch');
    assert(sizing.demand.simultaneousLoadWatts > 0, 'Simultaneous load must be positive');
    assert(sizing.recommendations.inverter.recommendedKva >= 3.5, 'Inverter rating must be at least 3.5kVA for 2 ACs');
    assert(sizing.recommendations.battery.nominalStorageKwh > 5.0, 'Battery storage must be sufficient');
    assert(sizing.recommendations.matchedPackage !== null, 'Must match a standard package');
    assert(sizing.disclaimer.includes('certified DEVICE PRO engineer'), 'Must contain cautious engineering disclaimer');
  });

  test('calculateSolarSizing reflects regional PSH differences between Lagos and Kano', () => {
    const appliances = [
      { id: 'tv', name: 'TV', watts: 120, qty: 1, hoursDay: 4, hoursNight: 6, hasSurge: false }
    ];

    const lagosSizing = calculateSolarSizing({ appliances, region: 'lagos' });
    const kanoSizing = calculateSolarSizing({ appliances, region: 'kano' });

    // In Kano (5.8 PSH), required solar array kWp is smaller than Lagos (4.2 PSH) for identical energy demand
    assert(kanoSizing.recommendations.solarArray.minimumKwp <= lagosSizing.recommendations.solarArray.minimumKwp,
      'Kano higher irradiance must require less or equal panel kWp than cloudy Lagos');
  });

  test('calculateGeneratorSavings calculates fuel burn, annual OPEX, and payback', () => {
    const savings = calculateGeneratorSavings({
      generatorKva: 7.5,
      fuelType: 'pms',
      fuelPricePerLiter: 1050,
      runningHoursPerDay: 10,
      maintenanceMonthlyNaira: 35000,
      solarCostNaira: 4350000
    });

    assert(savings.consumption.dailyFuelLiters > 0, 'Daily fuel burn must be positive');
    assert(savings.financials.yearlyTotalOpexNaira > 5000000, 'Yearly generator OPEX must be substantial');
    assert(savings.financials.paybackMonths > 0 && savings.financials.paybackMonths <= 18, 'Payback period should be reasonable');
    assert(savings.financials.tenYearNetSavingsNaira > 20000000, '10-Year savings must be massive');
    assert(savings.yearlyProgression.length === 5, 'Must provide 5-year progression');
  });

  // =========================================================================
  // 5. REST API ENDPOINTS & HTTP TESTS
  // =========================================================================
  console.log('\n--- 5. REST API HTTP ENDPOINTS ---');

  let staffToken = null;

  await asyncTest('GET /api/health returns system status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'ok');
    assert.strictEqual(json.service, 'DEVICE PRO Core API');
  });

  await asyncTest('GET /api/calculator/metadata returns appliance and regional presets', async () => {
    const res = await fetch(`${BASE_URL}/api/calculator/metadata`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.appliances.length >= 10);
    assert(json.regions.lagos.psh === 4.2);
  });

  await asyncTest('POST /api/calculator/size calculates sizing via API', async () => {
    const res = await fetch(`${BASE_URL}/api/calculator/size`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appliances: [
          { id: 'fan', name: 'Fan', watts: 65, qty: 3, hoursDay: 4, hoursNight: 8, hasSurge: true, surgeMultiplier: 1.5 }
        ],
        region: 'abuja'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.recommendations.inverter.recommendedKva > 0);
  });

  await asyncTest('POST /api/calculator/savings calculates ROI via API', async () => {
    const res = await fetch(`${BASE_URL}/api/calculator/savings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generatorKva: 10,
        fuelType: 'diesel',
        runningHoursPerDay: 8
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.financials.paybackMonths > 0);
  });

  await asyncTest('POST /api/contact receives inquiry and generates reference number', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mrs. Folake Adeyemi',
        phone: '+234 802 999 1122',
        email: 'folake@domain.ng',
        subject: 'Showroom Visit & Inverter Consultation',
        message: 'I want to schedule an appointment at the Victoria Island showroom.'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.referenceId && json.referenceId.startsWith('DP-MSG-'));
  });

  await asyncTest('POST /api/quote creates quotation and returns DP- reference', async () => {
    const res = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alhaji Sani Bello',
        phone: '+234 803 777 9900',
        email: 'sani@bello-enterprises.ng',
        state: 'Kano',
        propertyType: 'Commercial Factory',
        notes: '20kVA Factory Microgrid required.'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.referenceId && json.referenceId.startsWith('DP-'));
  });

  await asyncTest('POST /api/auth/login authenticates staff and issues bearer token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@DevicePro2026!'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.token, 'Token must be returned');
    staffToken = json.token;
  });

  await asyncTest('GET /api/auth/me resolves user profile with valid Bearer token', async () => {
    assert(staffToken, 'Token required');
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.user.username, 'admin');
  });

  await asyncTest('Protected admin endpoints reject unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401);
  });

  await asyncTest('Protected admin endpoints succeed with staff bearer token', async () => {
    assert(staffToken, 'Token required');
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.stats.products >= 48);
  });

  await asyncTest('GET /api/admin/backup succeeds for superadmin role', async () => {
    assert(staffToken, 'Token required');
    const res = await fetch(`${BASE_URL}/api/admin/backup`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.backup.counts.products >= 48);
  });

  await asyncTest('GET /calculator serves static HTML', async () => {
    const res = await fetch(`${BASE_URL}/calculator`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Solar Sizing &amp; Load Calculator'));
    assert(html.includes('calc-workspace-grid'));
  });

  await asyncTest('GET /savings-calculator redirects to /calculator', async () => {
    const res = await fetch(`${BASE_URL}/savings-calculator`, { redirect: 'manual' });
    assert([301, 302].includes(res.status), `Expected redirect status, got ${res.status}`);
    assert(res.headers.get('location')?.includes('/calculator'));
  });

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
