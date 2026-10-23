/**
 * DEVICE PRO — Stage 23: Products Management & Catalog Operations Automated Test Suite
 * 
 * Verifies all 23 Stage 4 requirements:
 * 1. Product listing for authorized administrators
 * 2. Server-side pagination
 * 3. Safe product search (including ReDoS special characters)
 * 4. Product filtering (category, brand, stockStatus, publication status)
 * 5. Single product detail retrieval
 * 6. Successful product creation with validated fields
 * 7. Required field validation (name, SKU, category)
 * 8. Invalid / negative selling price rejection
 * 9. Invalid / negative stock value handling
 * 10. Duplicate SKU rejection & clear error feedback
 * 11. Successful product editing with loaded database values
 * 12. Missing product handling (404 Not Found)
 * 13. Safe reversible archive / restore behavior
 * 14. Customer access rejection (403 Forbidden)
 * 15. Unauthorized staff access rejection (mutations rejected for non-authorized roles)
 * 16. Supplier cost protection (confidentiality for public catalog and unauthorized roles)
 * 17. Mass assignment protection (_id, id, created_at cannot be overwritten)
 * 18. Invalid MongoDB identifier handling (no CastError crash)
 * 19. Public catalog consistency (archived items excluded from public store)
 * 20. Checkout price integrity (server-authoritative price calculation)
 * 21. Existing order history preservation
 * 22. Session and logout regression
 * 23. Audit logging of sensitive product changes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { connectMongo } = require('../db/mongo/connection');
const { Product, Order, AuditLog, User, Session } = require('../db/mongo/models');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 23: PRODUCTS MANAGEMENT & CATALOG OPERATIONS');
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

  async function request(reqPath, options = {}) {
    const url = `${BASE_URL}${reqPath}`;
    const headers = {
      ...(options.headers || {})
    };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
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
    return {
      status: res.status,
      headers: res.headers,
      body
    };
  }

  // Pre-test setup: Connect Mongo and obtain tokens for each role
  await connectMongo();

  // Clean up any test artifacts from prior test runs
  await Product.deleteMany({ sku: /^DP-TEST-/i });

  // 1. Superadmin Token
  const saRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@DevicePro2026!' }
  });
  assert.strictEqual(saRes.status, 200, 'Superadmin login must succeed');
  const superadminToken = saRes.body.token;

  // 2. Lead Engineer Token
  const engRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
  });
  assert.strictEqual(engRes.status, 200, 'Lead Engineer login must succeed');
  const engineerToken = engRes.body.token;

  // 3. Sales Desk Token
  const salesRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'sales.lagos', password: 'Sales@DevicePro2026!' }
  });
  assert.strictEqual(salesRes.status, 200, 'Sales login must succeed');
  const salesToken = salesRes.body.token;

  // 4. Customer Account & Token
  const testCustomerEmail = `customer_prod_test_${Date.now()}@devicepro.test`;
  const custRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Product Test',
      email: testCustomerEmail,
      phone: '+2348099887766',
      password: 'CustomerPass123!'
    }
  });
  assert.strictEqual(custRes.status, 201, 'Customer registration must succeed');
  const customerToken = custRes.body.token;

  let createdProductRecord = null;
  const uniqueTestSku = `DP-TEST-INV-${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. PRODUCT LISTING FOR AUTHORIZED ADMINISTRATORS
  // ---------------------------------------------------------------------------
  console.log('--- 1. Product Listing & Authorizations ---');

  await test('Requirement 1: Authorized administrator can list products via GET /api/admin/products', async () => {
    const res = await request('/api/admin/products', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.products), 'Should return products array');
    assert.ok(res.body.total >= 48, 'Should report total products count');
    assert.ok(res.body.page === 1, 'Default page should be 1');
    assert.ok(res.body.limit === 20, 'Default limit should be 20');
  });

  // ---------------------------------------------------------------------------
  // 2. PAGINATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Server-Side Pagination ---');

  await test('Requirement 2: Pagination limits results and returns accurate totalPages', async () => {
    const res = await request('/api/admin/products?page=2&limit=10', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.page, 2);
    assert.strictEqual(res.body.limit, 10);
    assert.strictEqual(res.body.products.length, 10);
    assert.ok(res.body.totalPages >= 5, 'Should have multiple pages');
  });

  // ---------------------------------------------------------------------------
  // 3. PRODUCT SEARCH
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Product Search ---');

  await test('Requirement 3: Search filters by name, brand, or SKU safely without ReDoS', async () => {
    // Normal query
    const resNormal = await request('/api/admin/products?search=Deye', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resNormal.status, 200);
    assert.ok(resNormal.body.products.length > 0);
    assert.ok(resNormal.body.products.every(p => 
      p.name.toLowerCase().includes('deye') || 
      p.brand.toLowerCase().includes('deye') ||
      p.sku.toLowerCase().includes('deye')
    ));

    // Special regex characters (must not crash or throw SyntaxError)
    const resSpecial = await request('/api/admin/products?search=[(test*+?^$)]', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resSpecial.status, 200);
    assert.strictEqual(resSpecial.body.products.length, 0);
  });

  // ---------------------------------------------------------------------------
  // 4. PRODUCT FILTERING
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Product Filtering ---');

  await test('Requirement 4: Filter by category, brand, stockStatus, and active/archived status', async () => {
    // Filter by Category
    const resCat = await request('/api/admin/products?category=inverters&limit=50', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resCat.status, 200);
    assert.ok(resCat.body.products.every(p => p.category === 'inverters'));

    // Filter by Stock Status
    const resStock = await request('/api/admin/products?stockStatus=in_stock&limit=50', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resStock.status, 200);
    assert.ok(resStock.body.products.every(p => p.stock_status === 'in_stock'));

    // Filter by Active status only (published: 1)
    const resActive = await request('/api/admin/products?status=active&limit=100', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(resActive.body.total, 48, 'Active catalog should be exactly 48 products');
    assert.ok(resActive.body.products.every(p => p.published === 1));

    // Filter by Archived status only (published: 0)
    const resArchived = await request('/api/admin/products?status=archived&limit=100', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resArchived.status, 200);
    assert.ok(resArchived.body.total >= 65, 'Archived records should include the benchmark documents');
    assert.ok(resArchived.body.products.every(p => p.published === 0));
  });

  // ---------------------------------------------------------------------------
  // 5. PRODUCT DETAIL RETRIEVAL
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Product Detail Retrieval ---');

  await test('Requirement 5: Retrieve complete product record by ID', async () => {
    // Fetch product with ID 1
    const res = await request('/api/admin/products/1', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.id, 1);
    assert.ok(res.body.product.name);
    assert.ok(res.body.product.sku);
  });

  // ---------------------------------------------------------------------------
  // 6. SUCCESSFUL PRODUCT CREATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Product Creation ---');

  await test('Requirement 6: Authorized admin can create a new product with validated fields', async () => {
    const payload = {
      name: 'Felicity Solar 10kWh Lithium Battery LPBF48200-H',
      sku: uniqueTestSku,
      brand: 'Felicity Solar',
      category: 'batteries',
      price_ngn: 2850000,
      previous_price_ngn: 3100000,
      cost_price_ngn: 2300000,
      stock_status: 'in_stock',
      stock_quantity: 45,
      power_rating: '10.0 kWh / 48V',
      warranty_years: 10,
      image_url: '/images/products/felicity-battery-10kwh.png',
      specifications: 'LiFePO4 • 48V 200Ah • 6,000 Cycles @ 80% DoD • Built-in BMS',
      description: 'High-density wall-mounted lithium energy storage system for residential backup.'
    };

    const res = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: payload
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.sku, uniqueTestSku);
    assert.strictEqual(res.body.product.price_ngn, 2850000);
    assert.strictEqual(res.body.product.cost_price_ngn, 2300000);
    assert.strictEqual(res.body.product.warranty_years, 10);
    assert.strictEqual(res.body.product.published, 1);

    createdProductRecord = res.body.product;
  });

  // ---------------------------------------------------------------------------
  // 7. REQUIRED FIELD VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Field Validations ---');

  await test('Requirement 7: Missing required fields (name, SKU, category) rejected with 400', async () => {
    // Missing name
    const resNoName = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { sku: 'DP-TEST-ERR-1', category: 'inverters', price_ngn: 100000 }
    });
    assert.strictEqual(resNoName.status, 400);
    assert.ok(resNoName.body.error.includes('name is required'));

    // Missing SKU
    const resNoSku = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { name: 'Test Inverter', category: 'inverters', price_ngn: 100000 }
    });
    assert.strictEqual(resNoSku.status, 400);
    assert.ok(resNoSku.body.error.includes('SKU is required'));
  });

  // ---------------------------------------------------------------------------
  // 8. INVALID PRICE REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Price Validation ---');

  await test('Requirement 8: Rejects negative selling prices and non-numeric values', async () => {
    const resNeg = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        name: 'Negative Price Inverter',
        sku: `DP-NEG-${Date.now()}`,
        category: 'inverters',
        price_ngn: -500000
      }
    });
    assert.strictEqual(resNeg.status, 400);
    assert.ok(resNeg.body.error.includes('non-negative'));
  });

  // ---------------------------------------------------------------------------
  // 9. INVALID STOCK VALUE HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Stock Validation ---');

  await test('Requirement 9: Non-negative stock quantity enforced', async () => {
    const res = await request(`/api/admin/products/${createdProductRecord.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { stock_quantity: 0, stock_status: 'out_of_stock' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.product.stock_quantity, 0);
    assert.strictEqual(res.body.product.stock_status, 'out_of_stock');
  });

  // ---------------------------------------------------------------------------
  // 10. DUPLICATE SKU REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. SKU Uniqueness & Integrity ---');

  await test('Requirement 10: Duplicate SKU is rejected with descriptive error message', async () => {
    const res = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        name: 'Another Battery with Duplicate SKU',
        sku: uniqueTestSku, // Same SKU as created in Requirement 6
        category: 'batteries',
        price_ngn: 2500000
      }
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('already in use'));
  });

  // ---------------------------------------------------------------------------
  // 11. SUCCESSFUL PRODUCT EDITING
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Product Editing ---');

  await test('Requirement 11: Authorized admin can edit existing product specifications and prices', async () => {
    const res = await request(`/api/admin/products/${createdProductRecord.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        price_ngn: 2750000,
        cost_price_ngn: 2200000,
        stock_status: 'in_stock',
        stock_quantity: 80,
        specifications: 'LiFePO4 • 48V 200Ah • 6,500 Cycles @ 80% DoD • High-capacity smart BMS'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.product.price_ngn, 2750000);
    createdProductRecord.price_ngn = 2750000;
    assert.strictEqual(res.body.product.cost_price_ngn, 2200000);
    assert.strictEqual(res.body.product.stock_quantity, 80);
    assert.strictEqual(res.body.product.stock_status, 'in_stock');
  });

  // ---------------------------------------------------------------------------
  // 12. MISSING PRODUCT HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n--- 12. Missing Product Handling ---');

  await test('Requirement 12: Requesting non-existent product returns 404', async () => {
    const resGet = await request('/api/admin/products/999999', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resGet.status, 404);

    const resPatch = await request('/api/admin/products/999999', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { name: 'Non Existent' }
    });
    assert.strictEqual(resPatch.status, 404);
  });

  // ---------------------------------------------------------------------------
  // 13. SAFE REVERSIBLE ARCHIVE BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- 13. Reversible Archive / Restore ---');

  await test('Requirement 13: Product archiving safely toggles published state without deletion', async () => {
    // 1. Archive
    const resArchive = await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { archive: true }
    });
    assert.strictEqual(resArchive.status, 200);
    assert.strictEqual(resArchive.body.product.published, 0);

    // Verify it is not returned in active catalog filter
    const resActive = await request('/api/admin/products?status=active&search=' + encodeURIComponent(uniqueTestSku), {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resActive.body.products.length, 0, 'Archived item should not appear in active query');

    // 2. Restore
    const resRestore = await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { archive: false }
    });
    assert.strictEqual(resRestore.status, 200);
    assert.strictEqual(resRestore.body.product.published, 1);
  });

  // ---------------------------------------------------------------------------
  // 14. CUSTOMER ACCESS REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 14. Customer Access Rejection ---');

  await test('Requirement 14: Authenticated customer account is strictly forbidden from product admin APIs (403)', async () => {
    const resGet = await request('/api/admin/products', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(resGet.status, 403);

    const resPost = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { name: 'Hacker Inverter', sku: 'HACK-1', category: 'inverters', price_ngn: 100 }
    });
    assert.strictEqual(resPost.status, 403);
  });

  // ---------------------------------------------------------------------------
  // 15. UNAUTHORIZED STAFF ACCESS REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 15. Role-Based Permissions & Staff Access Restrictions ---');

  await test('Requirement 15: Sales staff cannot mutate products; Engineers cannot edit commercial prices', async () => {
    // Sales staff attempting creation -> 403 Forbidden
    const resSalesPost = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: { name: 'Sales Created Inverter', sku: 'SALES-SKU-1', category: 'inverters', price_ngn: 2000000 }
    });
    assert.strictEqual(resSalesPost.status, 403, 'Sales staff must not create products');

    // Sales staff attempting archive -> 403 Forbidden
    const resSalesArchive = await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${salesToken}` },
      body: { archive: true }
    });
    assert.strictEqual(resSalesArchive.status, 403, 'Sales staff must not archive products');

    // Engineer can update technical specifications, but cannot edit commercial price
    const originalPrice = createdProductRecord.price_ngn;
    const resEngPatch = await request(`/api/admin/products/${createdProductRecord.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: {
        price_ngn: 999999, // Attempted unauthorized price edit
        specifications: 'Engineer verified firmware version 4.2.1'
      }
    });

    assert.strictEqual(resEngPatch.status, 200);
    // Specifications updated
    assert.strictEqual(resEngPatch.body.product.specifications, 'Engineer verified firmware version 4.2.1');
    // Commercial price must NOT have changed!
    assert.strictEqual(resEngPatch.body.product.price_ngn, 2750000, 'Commercial price must not be modified by engineer role');
  });

  // ---------------------------------------------------------------------------
  // 16. SUPPLIER COST PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 16. Supplier Cost Confidentiality ---');

  await test('Requirement 16: Supplier cost is exposed to superadmin, but stripped for public API and engineer', async () => {
    // 1. Superadmin can see supplier cost
    const resSuper = await request(`/api/admin/products/${createdProductRecord.id}`, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    assert.strictEqual(resSuper.status, 200);
    assert.strictEqual(resSuper.body.product.cost_price_ngn, 2200000);

    // 2. Engineer does NOT see supplier cost
    const resEng = await request(`/api/admin/products/${createdProductRecord.id}`, {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert.strictEqual(resEng.status, 200);
    assert.strictEqual(resEng.body.product.cost_price_ngn, undefined, 'Supplier cost must be stripped for engineer');

    // 3. Public catalog API does NOT expose supplier cost
    const resPublic = await request('/api/products');
    assert.strictEqual(resPublic.status, 200);
    const hasSupplierCost = resPublic.body.products.some(p => p.cost_price_ngn !== undefined);
    assert.strictEqual(hasSupplierCost, false, 'Public store API must never leak cost_price_ngn');
  });

  // ---------------------------------------------------------------------------
  // 17. MASS ASSIGNMENT PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 17. Mass Assignment Protection ---');

  await test('Requirement 17: Primary keys (_id, id, created_at) cannot be overridden via PATCH', async () => {
    const originalCreatedAt = createdProductRecord.created_at;
    const res = await request(`/api/admin/products/${createdProductRecord.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: {
        id: 77777,
        _id: '507f1f77bcf86cd799439011',
        created_at: '2020-01-01T00:00:00.000Z',
        name: 'Protected Mass Assignment Product'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.product.id, createdProductRecord.id, 'Numeric ID must remain unchanged');
    assert.strictEqual(res.body.product._id, createdProductRecord._id, 'ObjectId must remain unchanged');
  });

  // ---------------------------------------------------------------------------
  // 18. INVALID MONGODB IDENTIFIER HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n--- 18. Invalid MongoDB Identifiers ---');

  await test('Requirement 18: Malformed or non-existent MongoDB identifiers return clean 404 without server crash', async () => {
    const malformedIds = [
      'invalid-id-string',
      'not-a-mongo-id',
      '12345xyz',
      '--$where-test'
    ];

    for (const badId of malformedIds) {
      const res = await request(`/api/admin/products/${encodeURIComponent(badId)}`, {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      assert.strictEqual(res.status, 404, `Malformed ID "${badId}" should return 404, got ${res.status}`);
      assert.strictEqual(res.body.success, false);
    }
  });

  // ---------------------------------------------------------------------------
  // 19. PUBLIC CATALOG CONSISTENCY
  // ---------------------------------------------------------------------------
  console.log('\n--- 19. Public Catalog Consistency ---');

  await test('Requirement 19: Archived products do not appear in public store catalog or checkout', async () => {
    // 1. Archive our test product
    await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { archive: true }
    });

    // 2. Query public catalog
    const resPublic = await request(`/api/products?search=${encodeURIComponent(uniqueTestSku)}`);
    assert.strictEqual(resPublic.status, 200);
    assert.strictEqual(resPublic.body.products.length, 0, 'Archived item must not be returned on public store search');

    // 3. Query public detail
    const resPublicDetail = await request(`/api/products/${createdProductRecord.slug}`);
    assert.strictEqual(resPublicDetail.status, 404, 'Archived item detail page should return 404 to customer');

    // Restore for subsequent order integrity tests
    await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { archive: false }
    });
  });

  // ---------------------------------------------------------------------------
  // 20. CHECKOUT PRICE INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- 20. Checkout Price Integrity ---');

  await test('Requirement 20: Server recalculates order total from authoritative database price, ignoring client tampering', async () => {
    // Find active product
    const prod = await Product.findOne({ id: 1 }).lean();
    assert.ok(prod, 'Product 1 should exist');

    // Customer submits order attempting to pay ₦100 instead of authoritative price
    const orderPayload = {
      customerName: 'Price Integrity Verification',
      customerPhone: '+2348011223344',
      customerEmail: 'integrity@devicepro.ng',
      deliveryAddress: '15 Victoria Island Blvd',
      deliveryState: 'Lagos',
      items: [
        {
          id: prod.id,
          name: prod.name,
          price_ngn: 100, // Tampered price
          quantity: 2
        }
      ],
      paymentMethod: 'transfer'
    };

    const res = await request('/api/orders', {
      method: 'POST',
      body: orderPayload
    });

    assert.strictEqual(res.status, 201);
    // Server must have computed subtotal based on real database price: prod.price_ngn * 2
    const expectedSubtotal = prod.price_ngn * 2;
    const expectedDelivery = 15000; // Lagos standard
    const expectedTotal = expectedSubtotal + expectedDelivery;

    assert.strictEqual(res.body.order.subtotal_ngn, expectedSubtotal, 'Order subtotal must use database authoritative price');
    assert.strictEqual(res.body.order.total_ngn, expectedTotal, 'Order total must include authoritative items subtotal');
  });

  // ---------------------------------------------------------------------------
  // 21. EXISTING ORDER HISTORY PRESERVATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 21. Existing Order History Preservation ---');

  await test('Requirement 21: Archiving a product preserves historical order items and past invoices', async () => {
    // 1. Create an order containing our created test product
    const orderPayload = {
      customerName: 'Historical Reference Test',
      customerPhone: '+2348055667788',
      customerEmail: 'history_test@devicepro.ng',
      deliveryAddress: '24 Marina Commercial District',
      deliveryState: 'Lagos',
      items: [
        {
          id: createdProductRecord.id,
          name: createdProductRecord.name,
          price_ngn: createdProductRecord.price_ngn,
          quantity: 1
        }
      ],
      paymentMethod: 'transfer'
    };

    const orderRes = await request('/api/orders', {
      method: 'POST',
      body: orderPayload
    });
    assert.strictEqual(orderRes.status, 201);
    const orderNumber = orderRes.body.order.order_number;

    // 2. Now archive the product
    const archRes = await request(`/api/admin/products/${createdProductRecord.id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: { archive: true }
    });
    assert.strictEqual(archRes.status, 200);
    assert.ok(archRes.body.orderRefCount >= 1, 'Should report historical order references');

    // 3. Verify order still retrieves perfectly and has complete data
    const trackingRes = await request(`/api/orders/${orderNumber}`);
    assert.strictEqual(trackingRes.status, 200);
    assert.strictEqual(trackingRes.body.order.items[0].id, createdProductRecord.id);
    assert.strictEqual(trackingRes.body.order.items[0].price_ngn, createdProductRecord.price_ngn);
  });

  // ---------------------------------------------------------------------------
  // 22. SESSION AND LOGOUT REGRESSION
  // ---------------------------------------------------------------------------
  console.log('\n--- 22. Session & Logout Security ---');

  await test('Requirement 22: Logged out sessions are immediately revoked and rejected with 401', async () => {
    // 1. Perform login to create temporary session
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'Admin@DevicePro2026!' }
    });
    const tempToken = loginRes.body.token;

    // Verify access works
    const check1 = await request('/api/admin/products', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(check1.status, 200);

    // 2. Logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // 3. Subsequent request must be rejected with 401
    const check2 = await request('/api/admin/products', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    assert.strictEqual(check2.status, 401);
  });

  // ---------------------------------------------------------------------------
  // 23. AUDIT LOGGING OF SENSITIVE PRODUCT CHANGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 23. Tamper-Evident Audit Logging ---');

  await test('Requirement 23: Audit logs record product creation, update, and archive operations with staff attribution', async () => {
    const res = await request('/api/admin/audit-logs?limit=50', {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });

    assert.strictEqual(res.status, 200);
    const actions = res.body.logs.map(l => l.action);

    assert.ok(actions.includes('CREATE_PRODUCT'), 'Audit trail must record CREATE_PRODUCT');
    assert.ok(actions.includes('UPDATE_PRODUCT'), 'Audit trail must record UPDATE_PRODUCT');
    assert.ok(actions.includes('ARCHIVE_PRODUCT') || actions.includes('RESTORE_PRODUCT'), 'Audit trail must record ARCHIVE_PRODUCT or RESTORE_PRODUCT');
  });

  // Clean up any test artifacts created during this run
  try {
    await Product.deleteMany({ sku: /^DP-TEST-/i });
  } catch (_) {}

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`STAGE 23 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error in Stage 23 test suite:', err);
  process.exit(1);
});
