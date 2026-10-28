/**
 * DEVICE PRO — Stage 13 Automated Test Suite
 * Covers:
 * 1. Cart & Checkout Order Processing (Delivery fee calculation, state assignment, items JSON)
 * 2. Safe Public Order Lookup & Tracking (/api/orders/:orderNumber)
 * 3. Administrative Authentication & Role-Based Access Control (RBAC)
 * 4. Order, Quote & Enquiry Lifecycle State Transitions
 * 5. Equipment Catalogue CRUD (Add, Edit price/stock, Archive)
 * 6. Tamper-Evident Audit Logging and Database Backup
 * 7. HTML Route Delivery (/checkout, /order-confirmation, /admin)
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('DEVICE PRO — STAGE 13: CART, CHECKOUT & ADMIN TEST SUITE');
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
  async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
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

  let superadminToken = '';
  let engineerToken = '';
  let salesToken = '';
  let testOrderNumber = '';
  let testOrderId = null;
  let testQuoteRef = '';
  let testQuoteId = null;
  let testEnquiryId = null;
  let createdProductId = null;

  // -------------------------------------------------------------------------
  // 1. STATIC HTML ROUTES
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Static HTML Page Delivery ---');

  await test('GET /checkout returns 200 HTML with Checkout markup', async () => {
    const res = await request('/checkout');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Complete Your Solar Order'));
    assert.ok(res.body.includes('id="checkout-form"'));
    assert.ok(res.body.includes('/js/cart.js'));
  });

  await test('GET /order-confirmation returns 200 HTML with Pro-Forma Invoice markup', async () => {
    const res = await request('/order-confirmation');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Thank You for Your Order!'));
    assert.ok(res.body.includes('id="printable-invoice"'));
  });

  await test('GET /admin returns 200 HTML with Operations Console', async () => {
    const res = await request('/admin');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('STAFF OPERATIONS PORTAL'));
    assert.ok(res.body.includes('id="admin-auth-view"'));
    assert.ok(res.body.includes('id="admin-dashboard-view"'));
  });

  // -------------------------------------------------------------------------
  // 2. COMMERCE CART & ORDER CHECKOUT FLOW
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Cart & Checkout Order Processing ---');

  await test('POST /api/orders creates Lagos order with ₦15,000 delivery fee', async () => {
    const orderPayload = {
      customerName: 'Engr. Damilola Alabi',
      customerPhone: '+234 803 555 1234',
      customerEmail: 'damilola.alabi@test.ng',
      deliveryAddress: 'Plot 14, Admiralty Way, Lekki Phase 1',
      deliveryState: 'Lagos',
      items: [
        {
          id: 1,
          slug: 'jinko-monocrystalline-solar-panel-550w',
          name: 'Jinko Solar 550W Bifacial Panel',
          price: 245000,
          quantity: 4
        },
        {
          id: 2,
          slug: 'growatt-hybrid-inverter-5kw',
          name: 'Growatt 5kW Hybrid Inverter',
          price: 1250000,
          quantity: 1
        }
      ],
      paymentMethod: 'transfer'
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order.order_number.startsWith('DP-ORD-'));
    assert.strictEqual(res.body.order.delivery_fee_ngn, 15000);
    // Subtotal: 4 * 245000 (980,000) + 1,250,000 = 2,230,000 (or +10% = 2,453,000). Total = subtotal + 15,000.
    assert.ok([2230000, 2453000].includes(res.body.order.subtotal_ngn));
    assert.ok([2245000, 2468000].includes(res.body.order.total_ngn));
    assert.strictEqual(res.body.order.order_status, 'pending');

    testOrderNumber = res.body.order.order_number;
    testOrderId = res.body.order.id;
  });

  await test('POST /api/orders creates Outside-Lagos order with ₦35,000 delivery fee', async () => {
    const orderPayload = {
      customerName: 'Chief Emeka Okeke',
      customerPhone: '+234 802 333 9876',
      customerEmail: 'emeka@enugu-industries.com',
      deliveryAddress: '18 Independence Layout',
      deliveryState: 'Enugu',
      items: [
        {
          id: 3,
          slug: 'pylontech-lithium-battery-48v-100ah',
          name: 'Pylontech 48V 100Ah LiFePO4 Battery',
          price: 1850000,
          quantity: 2
        }
      ],
      paymentMethod: 'transfer'
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.order.delivery_fee_ngn, 35000);
    // Subtotal: 2 * 1,850,000 = 3,700,000 (or +10% = 4,070,000). Total = subtotal + 35,000.
    assert.ok([3700000, 4070000].includes(res.body.order.subtotal_ngn));
    assert.ok([3735000, 4105000].includes(res.body.order.total_ngn));
  });

  await test('POST /api/orders rejects order without items', async () => {
    const invalidPayload = {
      customerName: 'Incomplete Test',
      customerPhone: '+234 800 000 0000',
      deliveryAddress: 'Victoria Island',
      deliveryState: 'Lagos',
      items: []
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(invalidPayload)
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('GET /api/orders/:orderNumber provides safe customer tracking', async () => {
    const res = await request(`/api/orders/${testOrderNumber}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.orderNumber, testOrderNumber);
    assert.strictEqual(res.body.order.customerName, 'Engr. Damilola Alabi');
    assert.strictEqual(res.body.order.orderStatus, 'pending');
    assert.strictEqual(res.body.order.paymentStatus, 'pending');
    assert.strictEqual(res.body.order.itemCount, 2);
    // Confirm internal admin notes and IP address are NOT leaked
    assert.strictEqual(res.body.order.admin_notes, undefined);
    assert.strictEqual(res.body.order.ip_address, undefined);
  });

  // -------------------------------------------------------------------------
  // 3. STAFF AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Staff Authentication & RBAC Controls ---');

  await test('POST /api/auth/login authenticates Superadmin', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@DevicePro2026!'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'superadmin');
    assert.ok(res.body.token);
    superadminToken = res.body.token;
  });

  await test('POST /api/auth/login authenticates Lead Engineer', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'engineer.babatunde',
        password: 'Engineer@DevicePro2026!'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'engineer');
    assert.ok(res.body.token);
    engineerToken = res.body.token;
  });

  await test('POST /api/auth/login authenticates Sales Desk', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'sales.lagos',
        password: 'Sales@DevicePro2026!'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'sales');
    assert.ok(res.body.token);
    salesToken = res.body.token;
  });

  await test('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'WrongPassword2026!'
      })
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('GET /api/auth/me returns authenticated user identity', async () => {
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'admin');
    assert.strictEqual(res.body.user.role, 'superadmin');
  });

  await test('Protected admin endpoints reject unauthenticated access with 401', async () => {
    const res = await request('/api/admin/orders');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('RBAC: Non-superadmin cannot access audit logs (403 Forbidden)', async () => {
    const res = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${salesToken}` }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('RBAC: Non-superadmin cannot trigger database backup (403 Forbidden)', async () => {
    const res = await request('/api/admin/backup', {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('RBAC: Superadmin can access audit logs (200 OK)', async () => {
    const res = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.logs));
    assert.ok(res.body.logs.length > 0);
  });

  await test('RBAC: Superadmin can export verified database backup (200 OK)', async () => {
    const res = await request('/api/admin/backup', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.backup.backupFile);
    assert.ok(res.body.backup.sizeBytes > 0);
  });

  // -------------------------------------------------------------------------
  // 4. ORDER, QUOTE & ENQUIRY LIFECYCLE MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Operational State Transitions & Auditing ---');

  await test('PATCH /api/admin/orders/:id updates order status to confirmed & verified', async () => {
    const res = await request(`/api/admin/orders/${testOrderId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        orderStatus: 'confirmed',
        paymentStatus: 'verified',
        notes: 'Zenith Bank corporate transfer verified by Lagos sales desk.'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.order.order_status, 'confirmed');
    assert.strictEqual(res.body.order.payment_status, 'verified');
    assert.ok(res.body.order.admin_notes.includes('Zenith Bank'));
  });

  await test('Create Solar Quote and transition status via PATCH /api/admin/quotes/:id', async () => {
    // 1. Submit quote
    const quoteRes = await request('/api/quotes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pastor Tunde Bakare',
        phone: '+234 805 777 8899',
        email: 'pastor@church-hub.org',
        state: 'Ogun',
        propertyType: 'Place of Worship',
        sector: 'commercial',
        packageName: '15kVA Commercial Solar Package',
        indicativeInverterKva: 15,
        indicativeBatteryKwh: 30.72,
        indicativeSolarKwp: 13.2
      })
    });

    assert.strictEqual(quoteRes.status, 201);
    testQuoteRef = quoteRes.body.quote.reference_id;
    testQuoteId = quoteRes.body.quote.id;

    // 2. Engineer reviews quote
    const updateRes = await request(`/api/admin/quotes/${testQuoteId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: JSON.stringify({
        status: 'under_review',
        notes: 'Engr. Babatunde completed roof structural assessment. High capacity truss confirmed.'
      })
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.quote.status, 'under_review');
  });

  await test('Create Contact Enquiry and transition status via PATCH /api/admin/enquiries/:id', async () => {
    // 1. Submit enquiry
    const enqRes = await request('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alhaji Musa Danjuma',
        phone: '+234 803 111 2233',
        email: 'danjuma@kano-coldchain.com',
        state: 'Kano',
        subject: 'Industrial Cold Storage Solar Inverter Sizing',
        message: 'Looking for 50kVA industrial microgrid proposal for tomato cold storage.'
      })
    });

    assert.strictEqual(enqRes.status, 201);
    testEnquiryId = enqRes.body.enquiry.id;

    // 2. Update to in_progress
    const updateRes = await request(`/api/admin/enquiries/${testEnquiryId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        status: 'in_progress',
        notes: 'Assigned to Northern regional engineering representative.'
      })
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.enquiry.status, 'in_progress');
  });

  // -------------------------------------------------------------------------
  // 5. EQUIPMENT CATALOGUE CRUD & STOCK CONTROL
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Equipment Catalogue CRUD Operations ---');

  await test('GET /api/admin/products returns full catalogue with search & category filter', async () => {
    const res = await request('/api/admin/products?category=inverters', {
      headers: { Authorization: `Bearer ${salesToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.length > 0);
    assert.ok(res.body.products.every(p => p.category === 'inverters'));
  });

  await test('POST /api/admin/products adds a new equipment SKU', async () => {
    const newSku = {
      name: 'Sungrow 10kW Commercial Hybrid Inverter',
      category: 'inverters',
      brand: 'Sungrow',
      sku: 'SG-10K-HYBRID-NG',
      price_ngn: 2450000,
      power_rating: '10kW',
      power_tier: '5kw_10kw',
      specifications: '10kW • Three Phase • 98.4% Max Efficiency • Dual MPPT',
      stock_status: 'in_stock'
    };

    const res = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify(newSku)
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.sku, 'SG-10K-HYBRID-NG');
    assert.strictEqual(res.body.product.price_ngn, 2450000);
    createdProductId = res.body.product.id;
  });

  await test('PATCH /api/admin/products/:id updates price and stock status', async () => {
    const res = await request(`/api/admin/products/${createdProductId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        price_ngn: 2350000,
        previous_price_ngn: 2450000,
        stock_status: 'low_stock'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.product.price_ngn, 2350000);
    assert.strictEqual(res.body.product.previous_price_ngn, 2450000);
    assert.strictEqual(res.body.product.stock_status, 'low_stock');
  });

  await test('DELETE /api/admin/products/:id archives equipment SKU', async () => {
    const res = await request(`/api/admin/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // -------------------------------------------------------------------------
  // 6. AUDIT TRAIL VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Tamper-Evident Audit Trail Integrity ---');

  await test('Audit trail recorded all operational actions with user attributions', async () => {
    const res = await request('/api/admin/audit-logs?limit=50', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    const actions = res.body.logs.map(l => l.action);

    assert.ok(actions.includes('CREATE_ORDER'), 'Missing CREATE_ORDER audit action');
    assert.ok(actions.includes('UPDATE_ORDER_STATUS'), 'Missing UPDATE_ORDER_STATUS audit action');
    assert.ok(actions.includes('CREATE_QUOTE'), 'Missing CREATE_QUOTE audit action');
    assert.ok(actions.includes('UPDATE_QUOTE_STATUS'), 'Missing UPDATE_QUOTE_STATUS audit action');
    assert.ok(actions.includes('CREATE_PRODUCT'), 'Missing CREATE_PRODUCT audit action');
    assert.ok(actions.includes('UPDATE_PRODUCT'), 'Missing UPDATE_PRODUCT audit action');
    assert.ok(actions.includes('DELETE_PRODUCT'), 'Missing DELETE_PRODUCT audit action');
  });

  // Teardown: Safely cleanup records created by this specific test execution
  try {
    const { connectMongo } = require('../db/mongo/connection');
    const { Product, Order, Quote, Enquiry } = require('../db/mongo/models');
    await connectMongo();
    if (createdProductId) {
      await Product.deleteOne({ id: createdProductId });
    }
    if (testOrderId) {
      await Order.deleteOne({ id: testOrderId });
    }
    if (testQuoteId) {
      await Quote.deleteOne({ id: testQuoteId });
    }
    if (testEnquiryId) {
      await Enquiry.deleteOne({ id: testEnquiryId });
    }
  } catch (cleanErr) {
    console.warn('Test teardown notice:', cleanErr.message);
  }

  // Summary
  console.log('\n===============================================================');
  console.log(`STAGE 13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
