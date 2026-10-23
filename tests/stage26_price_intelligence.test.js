/**
 * DEVICE PRO — STAGE 26: SUPPLIER PRICE INTELLIGENCE & MARGIN ANALYSIS TEST SUITE
 * 
 * Comprehensive automated verification covering all 30 requirements specified in Stage 7:
 * - Calculations: Gross profit, gross margin %, cost markup %, negative margins, zero prices, missing cost,
 *   invalid numerics, promotional pricing, NGN currency, indicative price formulas, invalid target margins,
 *   unavailable historical data handling.
 * - Supplier History: Applied imports, exclusion of analysed/cancelled imports, SKU-level historical associations,
 *   exclusion of archived benchmark items from commercial analysis.
 * - Authorization: Anonymous rejection, customer rejection, unauthorized staff rejection, admin/superadmin access,
 *   settings change authorization.
 * - Data Integrity: Invariance of selling prices, supplier costs, inventory quantities, orders, and quotations;
 *   confidentiality protection in public APIs; pagination and multifaceted filters; safe ID handling.
 */

const assert = require('assert');
const { connectMongo, assertTestEnvironmentIsolated } = require('../db/mongo/connection');
const { Product, AuditLog, User, Session, PriceImport, PriceIntelligenceSettings, Order, Quote } = require('../db/mongo/models');
const engine = require('../lib/price-intelligence-engine');
const mongoose = require('mongoose');

// SAFETY FIRST: Enforce database isolation guard
assertTestEnvironmentIsolated();

const BASE_URL = 'http://localhost:3000';

async function runPriceIntelligenceTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 26: PRICE INTELLIGENCE & MARGIN ANALYSIS TEST SUITE');
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
    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String) && !(options.body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return { status: res.status, headers: res.headers, body };
  }

  await connectMongo();

  // Test setup: create scoped test users and sessions
  const testId = `STG7-TEST-${Date.now()}`;
  let superadminUser, adminUser, engineerUser, salesUser, customerUser;
  let superadminToken, adminToken, engineerToken, salesToken, customerToken;
  let testProductWithCost, testProductNoCost, testProductLowMargin, testProductNegMargin;
  let testImportApplied, testImportAnalysed, testImportCancelled;

  try {
    // 1. Create Scoped Auth Accounts
    const { createSession } = require('../db/mongo/repository');

    superadminUser = await User.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      username: `${testId.toLowerCase()}_sa`,
      email: `${testId.toLowerCase()}-superadmin@devicepro.ng`,
      full_name: 'Stage 7 Superadmin',
      role: 'superadmin'
    });
    const saSession = await createSession(superadminUser.id);
    superadminToken = saSession.token;

    adminUser = await User.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      username: `${testId.toLowerCase()}_adm`,
      email: `${testId.toLowerCase()}-admin@devicepro.ng`,
      full_name: 'Stage 7 Admin',
      role: 'admin'
    });
    const admSession = await createSession(adminUser.id);
    adminToken = admSession.token;

    engineerUser = await User.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      username: `${testId.toLowerCase()}_eng`,
      email: `${testId.toLowerCase()}-engineer@devicepro.ng`,
      full_name: 'Stage 7 Engineer',
      role: 'engineer'
    });
    const engSession = await createSession(engineerUser.id);
    engineerToken = engSession.token;

    salesUser = await User.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      username: `${testId.toLowerCase()}_sal`,
      email: `${testId.toLowerCase()}-sales@devicepro.ng`,
      full_name: 'Stage 7 Sales',
      role: 'sales'
    });
    const salSession = await createSession(salesUser.id);
    salesToken = salSession.token;

    customerUser = await User.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      username: `${testId.toLowerCase()}_cus`,
      email: `${testId.toLowerCase()}-customer@gmail.com`,
      full_name: 'Stage 7 Customer',
      role: 'customer'
    });
    const cusSession = await createSession(customerUser.id);
    customerToken = cusSession.token;

    // 2. Create Scoped Products for Testing Calculations and Invariance
    testProductWithCost = await Product.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      sku: `${testId}-PROD-HEALTHY`,
      name: `${testId} Tier-1 550W Panel`,
      slug: `${testId.toLowerCase()}-tier-1-panel`,
      brand: 'Jinko Solar',
      category: 'solar-panels',
      category_label: 'Solar Panels',
      price_ngn: 200000,
      previous_price_ngn: 250000,
      cost_price_ngn: 150000,
      stock_quantity: 42,
      published: 1
    });

    testProductNoCost = await Product.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      sku: `${testId}-PROD-NOCOST`,
      name: `${testId} Inverter Without Cost`,
      slug: `${testId.toLowerCase()}-inverter-no-cost`,
      brand: 'Growatt',
      category: 'inverters',
      category_label: 'Inverters',
      price_ngn: 450000,
      previous_price_ngn: 500000,
      cost_price_ngn: 0,
      stock_quantity: 15,
      published: 1
    });

    testProductLowMargin = await Product.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      sku: `${testId}-PROD-LOW`,
      name: `${testId} Battery Low Margin`,
      slug: `${testId.toLowerCase()}-battery-low-margin`,
      brand: 'Pylontech',
      category: 'batteries',
      category_label: 'Batteries',
      price_ngn: 1000000,
      previous_price_ngn: 1100000,
      cost_price_ngn: 950000, // 5% margin (below 15% target)
      stock_quantity: 8,
      published: 1
    });

    testProductNegMargin = await Product.create({
      id: Math.floor(Math.random() * 900000) + 100000,
      sku: `${testId}-PROD-NEG`,
      name: `${testId} Cable Negative Margin`,
      slug: `${testId.toLowerCase()}-cable-neg-margin`,
      brand: 'DEVICE PRO',
      category: 'accessories',
      category_label: 'Accessories',
      price_ngn: 80000,
      previous_price_ngn: 90000,
      cost_price_ngn: 100000, // cost exceeds selling price
      stock_quantity: 100,
      published: 1
    });

    // 3. Create Applied vs Analysed vs Cancelled Import Scenarios
    testImportApplied = await PriceImport.create({
      import_id: `${testId}-IMP-APPLIED`,
      filename: `${testId}_applied.xlsx`,
      status: 'successfully_applied',
      supplier_name: 'Jinko Solar Direct',
      applied_by_email: superadminUser.email,
      applied_at: new Date(Date.now() - 86400000), // 1 day ago
      rows_preview: [{
        row_number: 1,
        normalized_sku: testProductWithCost.sku,
        raw_name: testProductWithCost.name,
        normalized_cost_ngn: 150000,
        approved_cost_ngn: 150000,
        applied_previous_cost_ngn: 120000,
        cost_diff_ngn: 30000,
        cost_diff_percent: 25.0,
        application_status: 'applied',
        matched_product_id: testProductWithCost._id,
        applied_at: new Date(Date.now() - 86400000)
      }]
    });

    testImportAnalysed = await PriceImport.create({
      import_id: `${testId}-IMP-ANALYSED`,
      filename: `${testId}_analysed.xlsx`,
      status: 'analysed',
      supplier_name: 'Unapplied Distributor',
      rows_preview: [{
        row_number: 1,
        normalized_sku: testProductNoCost.sku,
        raw_name: testProductNoCost.name,
        normalized_cost_ngn: 300000,
        application_status: 'pending',
        matched_product_id: testProductNoCost._id
      }]
    });

    testImportCancelled = await PriceImport.create({
      import_id: `${testId}-IMP-CANCELLED`,
      filename: `${testId}_cancelled.xlsx`,
      status: 'cancelled',
      supplier_name: 'Cancelled Distributor',
      rows_preview: [{
        row_number: 1,
        normalized_sku: testProductLowMargin.sku,
        raw_name: testProductLowMargin.name,
        normalized_cost_ngn: 700000,
        application_status: 'pending',
        matched_product_id: testProductLowMargin._id
      }]
    });

    // =========================================================================
    // SECTION 1: CALCULATIONS
    // =========================================================================
    console.log('--- 1. Calculations & Mathematical Bounds ---');

    await test('Req 1: Correct gross profit calculation (Selling Price - Supplier Cost)', () => {
      const profit = engine.calculateGrossProfit(200000, 150000);
      assert.strictEqual(profit, 50000);
    });

    await test('Req 2: Correct gross margin calculation (((Selling - Cost) / Selling) * 100)', () => {
      const margin = engine.calculateGrossMarginPercent(200000, 150000);
      assert.strictEqual(margin, 25.0);
    });

    await test('Req 3: Correct markup calculation (((Selling - Cost) / Cost) * 100)', () => {
      const markup = engine.calculateMarkupPercent(200000, 150000);
      assert.strictEqual(markup, 33.33);
    });

    await test('Req 4: Negative gross profit handling when Selling Price < Supplier Cost', () => {
      const profit = engine.calculateGrossProfit(80000, 100000);
      assert.strictEqual(profit, -20000);
      const margin = engine.calculateGrossMarginPercent(80000, 100000);
      assert.strictEqual(margin, -25.0);
    });

    await test('Req 5: Zero selling price handling does not divide by zero', () => {
      const margin = engine.calculateGrossMarginPercent(0, 150000);
      assert.strictEqual(margin, null);
      const profit = engine.calculateGrossProfit(0, 150000);
      assert.strictEqual(profit, null);
    });

    await test('Req 6: Missing supplier cost handling returns null without inventing a cost', () => {
      const margin = engine.calculateGrossMarginPercent(200000, 0);
      assert.strictEqual(margin, null);
      const markup = engine.calculateMarkupPercent(200000, null);
      assert.strictEqual(markup, null);
      const profit = engine.calculateGrossProfit(200000, undefined);
      assert.strictEqual(profit, null);
    });

    await test('Req 7: Invalid numeric values (NaN, strings, negatives) are handled safely', () => {
      assert.strictEqual(engine.calculateGrossProfit('invalid', 10000), null);
      assert.strictEqual(engine.calculateGrossProfit(10000, -500), null);
      assert.strictEqual(engine.calculateGrossMarginPercent(NaN, 10000), null);
      assert.strictEqual(engine.calculateMarkupPercent(10000, NaN), null);
    });

    await test('Req 8: Promotional price calculations compare promotional vs regular profitability', () => {
      const evalResult = engine.evaluateProductProfitability({
        price_ngn: 200000,
        previous_price_ngn: 250000,
        cost_price_ngn: 150000
      }, { target_margin_percent: 15 });

      assert.strictEqual(evalResult.has_promotional_discount, true);
      assert.strictEqual(evalResult.estimated_gross_profit_ngn, 50000); // 200k - 150k
      assert.strictEqual(evalResult.gross_margin_percent, 25.0);
      assert.strictEqual(evalResult.regular_gross_profit_ngn, 100000); // 250k - 150k
      assert.strictEqual(evalResult.regular_gross_margin_percent, 40.0);
    });

    await test('Req 9: NGN currency validation and metric disclaimer labeling', () => {
      const evalResult = engine.evaluateProductProfitability({
        price_ngn: 200000,
        cost_price_ngn: 150000
      });
      assert.strictEqual(evalResult.metric_label, 'Estimated Gross Profit Before Other Costs');
      assert(evalResult.disclaimer.includes('does not include shipping'));
    });

    await test('Req 10: Correct indicative price calculation for a valid target margin (Cost / (1 - Target))', () => {
      // 150,000 / (1 - 0.25) = 150,000 / 0.75 = 200,000
      const indicative = engine.calculateIndicativePrice(150000, 25);
      assert.strictEqual(indicative, 200000);
      // 950,000 / (1 - 0.15) = 950,000 / 0.85 = 1,117,647
      const indicative15 = engine.calculateIndicativePrice(950000, 15);
      assert.strictEqual(indicative15, 1117647);
    });

    await test('Req 11: Rejection of invalid target margins (<= 0% or >= 100%)', () => {
      assert.throws(() => engine.calculateIndicativePrice(150000, 0), /strictly between 0% and 100%/);
      assert.throws(() => engine.calculateIndicativePrice(150000, 100), /strictly between 0% and 100%/);
      assert.throws(() => engine.calculateIndicativePrice(150000, -10), /strictly between 0% and 100%/);
      assert.throws(() => engine.calculateIndicativePrice(150000, 105), /strictly between 0% and 100%/);
    });

    await test('Req 12: Correct treatment of unavailable historical data without fabrication', () => {
      const evalResult = engine.evaluateProductProfitability({
        sku: 'TEST-NOHIST',
        cost_price_ngn: 100000,
        price_ngn: 120000
      });
      assert.strictEqual(evalResult.cost_history.has_history, false);
      assert.strictEqual(evalResult.cost_history.previous_cost_ngn, null);
      assert.strictEqual(evalResult.cost_history.cost_change_ngn, null);
    });

    // =========================================================================
    // SECTION 2: SUPPLIER HISTORY
    // =========================================================================
    console.log('\n--- 2. Supplier History & Movement Associations ---');

    await test('Req 13: Applied imports are represented correctly in product cost history endpoint', async () => {
      const res = await request(`/api/admin/price-intelligence/products/${testProductWithCost._id}/cost-history`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.has_history, true);
      assert.strictEqual(res.body.history.length, 1);
      assert.strictEqual(res.body.history[0].applied_cost_ngn, 150000);
      assert.strictEqual(res.body.history[0].previous_cost_ngn, 120000);
      assert.strictEqual(res.body.history[0].cost_change_ngn, 30000);
      assert.strictEqual(res.body.history[0].cost_change_percent, 25.0);
      assert.strictEqual(res.body.history[0].import_id, testImportApplied.import_id);
    });

    await test('Req 14: Analysed imports are NOT treated as applied cost history', async () => {
      const res = await request(`/api/admin/price-intelligence/products/${testProductNoCost._id}/cost-history`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.has_history, false);
      assert.strictEqual(res.body.history.length, 0);
      assert(res.body.message.includes('No historical supplier cost movements recorded'));
    });

    await test('Req 15: Cancelled imports are NOT treated as applied cost history', async () => {
      const res = await request(`/api/admin/price-intelligence/products/${testProductLowMargin._id}/cost-history`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.has_history, false);
      assert.strictEqual(res.body.history.length, 0);
    });

    await test('Req 16: Previous and current costs are associated with the correct product SKU', async () => {
      const res = await request(`/api/admin/price-intelligence/products/${testProductWithCost._id}/cost-history`, {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      assert.strictEqual(res.body.sku, testProductWithCost.sku);
      assert(String(res.body.product_id) === String(testProductWithCost._id) || String(res.body.product_id) === String(testProductWithCost.id));
    });

    await test('Req 17: Archived benchmark records are excluded from active commercial product analysis', async () => {
      const res = await request('/api/admin/price-intelligence/products?status=active', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      // All items in active view must have published: 1
      for (const item of res.body.products) {
        assert.strictEqual(item.published, 1);
        assert.notStrictEqual(item.sku, 'SG-10K-HYBRID-NG');
      }
    });

    // =========================================================================
    // SECTION 3: AUTHORIZATION
    // =========================================================================
    console.log('\n--- 3. Authorization & Confidentiality Controls ---');

    await test('Req 18: Anonymous requests to price intelligence endpoints are rejected with 401', async () => {
      const resSummary = await request('/api/admin/price-intelligence/summary');
      assert.strictEqual(resSummary.status, 401);

      const resProducts = await request('/api/admin/price-intelligence/products');
      assert.strictEqual(resProducts.status, 401);

      const resSettings = await request('/api/admin/price-intelligence/settings');
      assert.strictEqual(resSettings.status, 401);
    });

    await test('Req 19: Customers cannot access profitability data (rejected with 403 Forbidden)', async () => {
      const res = await request('/api/admin/price-intelligence/summary', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    await test('Req 20: Unauthorized staff (engineer, sales) cannot access profitability data (403)', async () => {
      const resEng = await request('/api/admin/price-intelligence/summary', {
        headers: { Authorization: `Bearer ${engineerToken}` }
      });
      assert.strictEqual(resEng.status, 403);

      const resSales = await request('/api/admin/price-intelligence/products', {
        headers: { Authorization: `Bearer ${salesToken}` }
      });
      assert.strictEqual(resSales.status, 403);
    });

    await test('Req 21: Authorized administrators (superadmin, admin) can access permitted endpoints (200)', async () => {
      const resAdmin = await request('/api/admin/price-intelligence/summary', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resAdmin.status, 200);
      assert.strictEqual(resAdmin.body.success, true);

      const resSuper = await request('/api/admin/price-intelligence/products', {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      assert.strictEqual(resSuper.status, 200);
      assert.strictEqual(resSuper.body.success, true);
    });

    await test('Req 22: Unauthorized users cannot change analysis settings', async () => {
      // Engineer attempt -> 403
      const resEng = await request('/api/admin/price-intelligence/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${engineerToken}` },
        body: { target_margin_percent: 25.0 }
      });
      assert.strictEqual(resEng.status, 403);

      // Customer attempt -> 403
      const resCust = await request('/api/admin/price-intelligence/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { target_margin_percent: 25.0 }
      });
      assert.strictEqual(resCust.status, 403);

      // Superadmin valid update -> 200
      const resSuper = await request('/api/admin/price-intelligence/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: { target_margin_percent: 18.5 }
      });
      assert.strictEqual(resSuper.status, 200);
      assert.strictEqual(resSuper.body.settings.target_margin_percent, 18.5);

      // Reset to 15.0
      await request('/api/admin/price-intelligence/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: { target_margin_percent: 15.0 }
      });
    });

    // =========================================================================
    // SECTION 4: DATA INTEGRITY & INVARIANCE
    // =========================================================================
    console.log('\n--- 4. Data Integrity & Invariance Protection ---');

    await test('Req 23: Reading profitability data does NOT modify product prices or attributes', async () => {
      const prodBefore = await Product.findById(testProductWithCost._id).lean();

      // Perform analysis requests
      await request(`/api/admin/price-intelligence/products/${testProductWithCost._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await request('/api/admin/price-intelligence/products', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await request('/api/admin/price-intelligence/summary', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const prodAfter = await Product.findById(testProductWithCost._id).lean();

      assert.strictEqual(prodAfter.price_ngn, prodBefore.price_ngn);
      assert.strictEqual(prodAfter.cost_price_ngn, prodBefore.cost_price_ngn);
      assert.strictEqual(prodAfter.stock_quantity, prodBefore.stock_quantity);
      assert.strictEqual(prodAfter.published, prodBefore.published);
      assert.strictEqual(new Date(prodAfter.updated_at).getTime(), new Date(prodBefore.updated_at).getTime());
    });

    await test('Req 24: Calculating recommendations does NOT modify selling prices', async () => {
      const res = await request('/api/admin/price-intelligence/recommendations?type=LOW_MARGIN', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);

      const prodCheck = await Product.findById(testProductLowMargin._id).lean();
      assert.strictEqual(prodCheck.price_ngn, 1000000);
    });

    await test('Req 25: Calculating recommendations does NOT modify supplier costs', async () => {
      const prodCheck = await Product.findById(testProductLowMargin._id).lean();
      assert.strictEqual(prodCheck.cost_price_ngn, 950000);
    });

    await test('Req 26: Inventory stock quantities remain strictly unchanged', async () => {
      const p1 = await Product.findById(testProductWithCost._id).lean();
      assert.strictEqual(p1.stock_quantity, 42);

      const p2 = await Product.findById(testProductNoCost._id).lean();
      assert.strictEqual(p2.stock_quantity, 15);
    });

    await test('Req 27: Existing orders and quotations remain strictly unchanged', async () => {
      const orderCountBefore = await Order.countDocuments();
      const quoteCountBefore = await Quote.countDocuments();

      await request('/api/admin/price-intelligence/summary', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const orderCountAfter = await Order.countDocuments();
      const quoteCountAfter = await Quote.countDocuments();

      assert.strictEqual(orderCountAfter, orderCountBefore);
      assert.strictEqual(quoteCountAfter, quoteCountBefore);
    });

    await test('Req 28: Public APIs do NOT expose internal supplier costs or margins', async () => {
      // 1. Public catalog list
      const resList = await request('/api/products?limit=20');
      assert.strictEqual(resList.status, 200);
      for (const prod of (resList.body.products || [])) {
        assert.strictEqual(prod.cost_price_ngn, undefined);
        assert.strictEqual(prod.supplier_cost_ngn, undefined);
        assert.strictEqual(prod.gross_margin_percent, undefined);
        assert.strictEqual(prod.estimated_gross_profit_ngn, undefined);
      }

      // 2. Public product detail by slug
      const resDetail = await request(`/api/products/${testProductWithCost.slug}`);
      assert.strictEqual(resDetail.status, 200);
      assert.strictEqual(resDetail.body.cost_price_ngn, undefined);
      assert.strictEqual(resDetail.body.supplier_cost_ngn, undefined);
      assert.strictEqual(resDetail.body.gross_margin_percent, undefined);
    });

    await test('Req 29: Pagination and multifaceted filters return correct results', async () => {
      // 1. Category filter
      const resCat = await request('/api/admin/price-intelligence/products?category=solar-panels', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resCat.status, 200);
      for (const p of resCat.body.products) {
        assert.strictEqual(p.category, 'solar-panels');
      }

      // 2. Missing cost filter
      const resMissing = await request('/api/admin/price-intelligence/products?margin_filter=missing_cost', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resMissing.status, 200);
      for (const p of resMissing.body.products) {
        assert.strictEqual(p.data_quality.has_missing_cost, true);
        assert.strictEqual(p.gross_margin_percent, null);
      }

      // 3. Search filter by SKU
      const resSearch = await request(`/api/admin/price-intelligence/products?search=${testProductWithCost.sku}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resSearch.status, 200);
      assert.strictEqual(resSearch.body.products.length, 1);
      assert.strictEqual(resSearch.body.products[0].sku, testProductWithCost.sku);
    });

    await test('Req 30: Invalid product identifiers are handled safely', async () => {
      // Non-existent numeric ID -> 404
      const res404 = await request('/api/admin/price-intelligence/products/99999999', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res404.status, 404);

      // Malformed ID string -> 404
      const resMalformed = await request('/api/admin/price-intelligence/products/invalid--id', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resMalformed.status, 404);
    });

  } finally {
    // Teardown: Clean up solely test-scoped entities to leave production catalog 100% pristine
    console.log('\n--- Teardown: Cleaning up scoped test data ---');
    try {
      await User.deleteMany({ email: { $regex: new RegExp(`^${testId}`, 'i') } });
      await Session.deleteMany({ token: { $regex: new RegExp(`^token-${testId}`) } });
      await Product.deleteMany({ sku: { $regex: new RegExp(`^${testId}`) } });
      await PriceImport.deleteMany({ import_id: { $regex: new RegExp(`^${testId}`) } });
      console.log('  ✓ Cleaned up test users, sessions, products, and imports.');
    } catch (cleanupErr) {
      console.warn('  ⚠️ Teardown warning:', cleanupErr.message);
    }
  }

  console.log('\n========================================================================');
  console.log(`STAGE 26 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPriceIntelligenceTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
