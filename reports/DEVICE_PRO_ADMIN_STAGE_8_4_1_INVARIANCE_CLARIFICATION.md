# DEVICE PRO Admin System — Stage 8.4.1 Invariance Clarification & Discrepancy Investigation Report

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_8_4_1_INVARIANCE_CLARIFICATION.md`  
**Investigation Date:** October 26, 2026  
**Auditor:** Independent Systems & Security Auditor (Pair-Programming Lead)  
**Investigation Scope:** Forensic reconciliation of baseline discrepancy (410 orders / 308 customers vs. 412 orders / 310 customers), database environment identification, test fixture attribution, catalog invariance validation, and production safety confirmation.  
**Governing Mandate:** Read-only inspection; zero modification of application code, product data, supplier costs, prices, stock, orders, customers, quotes, or enquiries; zero records deleted to force counts; no production deployment; Stage 8.5 unstarted.

---

## 1. Executive Summary

A comprehensive, read-only forensic investigation was conducted to determine the root cause of the numerical discrepancy between:
- **Previously Approved Baseline (Stage 8.4):** 410 orders and 308 customer accounts.
- **Latest Completion Report (Stage 8.4.1):** 412 orders and 310 customer accounts.

### Key Forensic Findings:
1. **Database Queried:** Both the 410/308 baseline and the 412/310 current count were queried against the **same database environment**: the live **MongoDB Atlas cluster (`database: devicepro`)**. The SQLite fallback (`data/products.db`) holds legacy/local development records (566 orders, 349 customer accounts) and was not the source of either count.
2. **Origin of the +2 Orders (410 -> 412):**
   - The two additional orders are **100% verified automated test fixtures** created on **Saturday, October 24, 2026 at 14:58:24–14:58:25 WAT** during the execution of `tests/stage23_admin_products.test.js`:
     - Order #411 (`id: 412`, `DP-ORD-245721`): Created by Test 20 ("Checkout Price Integrity") using customer name `"Price Integrity Verification"`.
     - Order #412 (`id: 413`, `DP-ORD-760919`): Created by Test 21 ("Existing Order History Preservation") using customer name `"Historical Reference Test"`.
   - The test suite's teardown block (lines 746–748) cleaned up test products (`Product.deleteMany({ sku: /^DP-TEST-/i })`), but omitted teardown for orders created during Tests 20 and 21.
   - Consequently, the order count in MongoDB Atlas increased from 410 to 412 on October 24 at 14:58 WAT—**before Stage 8.4 verification and Stage 8.4.1 began**. Subsequent Stage 8.4 reports cited the earlier 410 figure from the Stage 8 baseline document without re-querying the database, creating the apparent discrepancy.
3. **Origin of the +2 Customer Accounts (308 -> 310):**
   - The two additional customer accounts are **100% verified automated test fixtures**:
     - Customer #309 (`id: 312`, `customer_prod_test_1792850276569@devicepro.test`, name: `"Customer Product Test"`): Created on **Saturday, October 24, 2026 at 14:57:57 WAT** by `tests/stage23_admin_products.test.js` line 116 (`POST /api/auth/register`), which had no user cleanup in its teardown.
     - Customer #310 (`id: 1793004533694`, `cust_stage841_1793004534579@devicepro.test`, name: `"Customer Dual-Auth Tester"`): Created on **Monday, October 26, 2026 at 09:48:55 WAT** during an initial execution of `tests/stage29_bom_dual_authorization.test.js` that aborted on an assertion before reaching the teardown block in Test 6.7 (`User.deleteOne({ email: testCustEmail })`).
4. **Legitimate Data Integrity:** **Zero genuine customer accounts or genuine business orders were altered, added, or deleted.** The 410 pre-existing orders and 308 pre-existing customer accounts remain 100% intact with zero modifications.
5. **Zero Record Tampering:** In strict compliance with Owner Directive 4, **no records were deleted or altered to force the counts to match**. All test records remain in place for audit inspection.
6. **Commercial Catalog Invariance:** 100% invariant across all 48 active commercial products and 6 turnkey solar packages:
   - Retail selling prices (`price_ngn`): 0 mismatches against pre-implementation baseline.
   - Promotional prices (`previous_price_ngn`): 0 mismatches.
   - Stock quantities (`stock_quantity`): 0 mismatches.
   - Supplier costs applied (`cost_price_ngn > 0`): Exactly 0.
   - Archived benchmark records: Exactly 70 records (`published: 0`, `sku: SG-10K-HYBRID-NG`).
7. **Safety Boundaries:** Confirmed 0 production deployments. Stage 8.5 remains untouched and unstarted.

---

## 2. Database Environment Identification

A direct read-only query was performed against both available database targets in the application repository:

| Entity / Metric | SQLite Fallback (`data/products.db`) | MongoDB Atlas (`devicepro`) | Baseline Report Cited | Stage 8.4.1 Report Cited |
| :--- | :---: | :---: | :---: | :---: |
| **Total Orders** | 566 | **412** | 410 | 412 |
| **Sizing Quotes** | 223 | **182** | 182 | 182 |
| **Customer Accounts (`role: customer`)** | 349 | **310** | 308 | 310 |
| **Total User Accounts (All Roles)** | 352 | **316** | 314 | 316 |
| **Customer Enquiries** | 150 | **147** | 147 | 147 |
| **Total Products** | 113 | **118** | 118 | 118 |
| **Active Commercial Products** | 48 | **48** | 48 | 48 |
| **Archived Benchmark Products** | 65 | **70** | 70 | 70 |

### Verified Fact:
The SQLite database represents a local seed/fallback repository containing 566 orders and 349 customer accounts. Neither the historical 410/308 figures nor the current 412/310 figures originated from SQLite.

Both the historical baseline report (`reports/DEVICE_PRO_ADMIN_STAGE_8_FINAL_VERIFICATION.md`) and the latest completion report (`reports/DEVICE_PRO_ADMIN_STAGE_8_4_1_DUAL_AUTHORIZATION.md`) queried the **live MongoDB Atlas replica cluster (`devicepro` database)**.

---

## 3. Forensic Investigation of the Additional Orders (+2: 410 -> 412)

Read-only inspection of the MongoDB Atlas `Order` collection sorted by creation timestamp and sequence ID revealed the exact details of the final orders:

### Order Record #411 (Collection Document 411, `id: 412`)
- **MongoDB `_id`:** `6adcb980a99023f942f3af00`
- **Internal Sequence ID (`id`):** `412`
- **Order Number:** `DP-ORD-245721`
- **Customer Name:** `Price Integrity Verification`
- **Customer Email:** `integrity@devicepro.ng`
- **Customer Phone:** `+2348011223344`
- **Delivery Address:** `15 Victoria Island Blvd, Lagos`
- **Items:** 2x Jinko Solar 550W Panels (`id: 1`)
- **Subtotal:** ₦490,000 | **Delivery Fee:** ₦15,000 | **Total:** ₦505,000
- **Payment Method:** `transfer` | **Order Status:** `pending`
- **Created Timestamp:** `2026-10-24T13:58:24.378Z` (14:58:24 WAT)
- **Originating Code:** `tests/stage23_admin_products.test.js`, lines 615–635 (Requirement 20: "Checkout Price Integrity").

### Order Record #412 (Collection Document 412, `id: 413`)
- **MongoDB `_id`:** `6adcb981a99023f942f3af02`
- **Internal Sequence ID (`id`):** `413`
- **Order Number:** `DP-ORD-760919`
- **Customer Name:** `Historical Reference Test`
- **Customer Email:** `history_test@devicepro.ng`
- **Customer Phone:** `+2348055667788`
- **Delivery Address:** `24 Marina Commercial District, Lagos`
- **Items:** 1x Test Product (`price_ngn: 2,750,000`)
- **Subtotal:** ₦2,750,000 | **Delivery Fee:** ₦15,000 | **Total:** ₦2,765,000
- **Payment Method:** `transfer` | **Order Status:** `pending`
- **Created Timestamp:** `2026-10-24T13:58:25.570Z` (14:58:25 WAT)
- **Originating Code:** `tests/stage23_admin_products.test.js`, lines 654–674 (Requirement 21: "Archiving a product preserves historical order items").

### Why Did They Remain in the Database?
Inspecting `tests/stage23_admin_products.test.js` lines 745–749 reveals the test teardown block:
```javascript
// Clean up any test artifacts created during this run
try {
  await Product.deleteMany({ sku: /^DP-TEST-/i });
} catch (_) {}
```
The test suite specifically cleaned up test products matching `/^DP-TEST-/i`, but contained no cleanup call for orders created during Tests 20 and 21.

### Chronological Reconciliation:
1. **Saturday, Oct 24, ~13:26 WAT:** Stages 20, 21, and 22 tests concluded. At this exact time, MongoDB Atlas had **410 orders**.
2. **Saturday, Oct 24, 13:30 WAT:** `reports/DEVICE_PRO_ADMIN_STAGE_8_FINAL_VERIFICATION.md` was drafted, documenting the baseline as 410 orders.
3. **Saturday, Oct 24, 14:58 WAT:** `tests/stage23_admin_products.test.js` was executed, creating Order `DP-ORD-245721` (at 14:58:24) and Order `DP-ORD-760919` (at 14:58:25). Total orders in MongoDB Atlas became **412**.
4. **Saturday, Oct 24, evening:** When Stage 8.4 started, `tests/stage27_supplier_baseline_reconciliation.test.js` logged `Total orders: 412` during pre-test checks. However, the accompanying written reports (`DEVICE_PRO_ADMIN_STAGE_8_4_BOM.md`) repeated the earlier narrative text ("Exactly 410 customer orders") from the Stage 8 baseline without re-verifying the database document count.
5. **Monday, Oct 26 (Stage 8.4.1):** When `tests/stage29_bom_dual_authorization.test.js` recorded the live database state, it correctly reported the actual count: **412 orders**.

---

## 4. Forensic Investigation of the Additional Customer Accounts (+2: 308 -> 310)

Read-only inspection of the MongoDB Atlas `User` collection filtered by `{ role: 'customer' }` sorted by creation timestamp revealed the exact details of the final customer accounts:

### Customer Record #309 (Collection Document 309, `id: 312`)
- **MongoDB `_id`:** `6adcb965a99023f942f3aef3`
- **Internal Sequence ID (`id`):** `312`
- **Username / Email:** `customer_prod_test_1792850276569@devicepro.test`
- **Full Name:** `Customer Product Test`
- **Phone:** `+2348099887766`
- **Role:** `customer`
- **Created Timestamp:** `2026-10-24T13:57:57.652Z` (14:57:57 WAT)
- **Originating Code:** `tests/stage23_admin_products.test.js`, lines 116–126:
  ```javascript
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
  ```
- **Explanation:** Created during the same Stage 23 test run that created the two test orders. Because `tests/stage23_admin_products.test.js` lacked user teardown, this test customer persisted in MongoDB Atlas, increasing the customer count from 308 to 309.

### Customer Record #310 (Collection Document 310, `id: 1793004533694`)
- **MongoDB `_id`:** `6adf13f7ff80fd6053cf4573`
- **Internal Sequence ID (`id`):** `1793004533694`
- **Username / Email:** `cust_stage841_1793004534579@devicepro.test`
- **Full Name:** `Customer Dual-Auth Tester`
- **Phone:** `+2348011223344`
- **Role:** `customer`
- **Created Timestamp:** `2026-10-26T08:48:55.216Z` (09:48:55 WAT)
- **Originating Code:** `tests/stage29_bom_dual_authorization.test.js`, lines 193–204:
  ```javascript
  const testCustEmail = `cust_stage841_${Date.now()}@devicepro.test`;
  const custReg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Customer Dual-Auth Tester',
      email: testCustEmail,
      phone: '+2348011223344',
      password: 'CustomerPass123!'
    }
  });
  ```
- **Explanation:** In `tests/stage29_bom_dual_authorization.test.js`, user cleanup is placed in Test 6.7 (`await User.deleteOne({ email: testCustEmail })`). During early development on Monday morning (09:48 WAT), an initial test run encountered an assertion failure on an earlier test and halted immediately (`process.exit(1)`). Because the run halted prematurely, line 685 was never reached for that specific timestamped email (`cust_stage841_1793004534579@devicepro.test`).
- In subsequent successful test runs, fresh timestamped test actors were registered and successfully deleted in Test 6.7, but this single orphaned customer from the aborted run remained, bringing the customer count from 309 to **310**.

### Associated Staff Test Accounts:
From the same interrupted 09:48 WAT test run, two additional non-customer accounts remain in the database:
- `sa2_stage841_1793004532849@devicepro.test` (`role: superadmin`, created 09:48:52 WAT)
- `fin_stage841_1793004533474@devicepro.test` (`role: finance`, created 09:48:53 WAT)
These accounts do not affect the `role: customer` count (310), but bring total user accounts in MongoDB Atlas to 316 (310 customers + 1 admin + 1 engineer + 1 sales + 2 test superadmins + 1 test finance).

---

## 5. Classification Matrix: Legitimate vs. Test Records

| Record Identifier | Entity | Created (WAT) | Customer / Email | Amount / Role | Classification | Originating Source |
| :--- | :---: | :---: | :--- | :--- | :---: | :--- |
| **`id: 1` through `410`** | Orders | Pre-Oct 24 13:26 | Various genuine / seed customers | Various | **Legitimate / Seed** | Production & Seed Datasets |
| **`id: 412` (`DP-ORD-245721`)** | Order | Oct 24 14:58:24 | `Price Integrity Verification` | ₦505,000 | **Test Fixture** | `tests/stage23_admin_products.test.js:616` |
| **`id: 413` (`DP-ORD-760919`)** | Order | Oct 24 14:58:25 | `Historical Reference Test` | ₦2,765,000 | **Test Fixture** | `tests/stage23_admin_products.test.js:655` |
| **`id: 1` through `308`** | Customers | Pre-Oct 24 13:26 | Various genuine / seed customers | `role: customer` | **Legitimate / Seed** | Production & Seed Datasets |
| **`id: 312`** | Customer | Oct 24 14:57:57 | `customer_prod_test_...@devicepro.test` | `role: customer` | **Test Fixture** | `tests/stage23_admin_products.test.js:116` |
| **`id: 1793004533694`** | Customer | Oct 26 09:48:55 | `cust_stage841_...@devicepro.test` | `role: customer` | **Test Fixture** | `tests/stage29_bom_dual_authorization.test.js:193` |

### Verified Finding:
- **Legitimate Customer Accounts:** Exactly **308** (100% unchanged).
- **Legitimate Orders:** Exactly **410** (100% unchanged).
- **Test Fixture Orders:** Exactly **2** (`DP-ORD-245721` and `DP-ORD-760919`).
- **Test Fixture Customers:** Exactly **2** (`customer_prod_test_...` and `cust_stage841_...`).
- **Total In Database:** **412 orders** and **310 customer accounts**.

---

## 6. Strict Non-Destructive Preservation (Directive 4 Compliance)

In strict accordance with Directive 4:
> *"Do not delete or alter any records to force the counts to match."*

- **Zero Deletions:** Neither Order 412, Order 413, Customer 309, Customer 310, nor the orphaned staff accounts were deleted.
- **Zero Modifications:** No record fields were modified, patched, or overwritten.
- **Audit Preservation:** All 412 order documents and 310 customer documents remain in MongoDB Atlas exactly as found, providing 100% reproducible evidence for owner audit.

---

## 7. Current System Counts (Verified Live in MongoDB Atlas)

Executed via direct query on **October 26, 2026 at 10:32 WAT**:

| Entity / Collection | Query Filter | Live Verified Count | Verified Status |
| :--- | :--- | :---: | :--- |
| **Total Products** | `{}` | **118** | Confirmed (48 active + 70 archived benchmarks) |
| **Active Commercial Products** | `{ published: 1 }` | **48** | Confirmed (IDs 1–48) |
| **Archived Benchmark Products** | `{ published: 0 }` | **70** | Confirmed (IDs 49–118, all `SG-10K-HYBRID-NG`) |
| **Turnkey Solar Packages** | `{ category: 'solar-packages' }` | **6** | Confirmed (IDs 23, 24, 25, 26, 27, 48) |
| **Commercial Products with Supplier Cost** | `{ published: 1, cost_price_ngn: { $gt: 0 } }` | **0** | Confirmed (0 active products have supplier costs) |
| **Total Products with Supplier Cost** | `{ cost_price_ngn: { $gt: 0 } }` | **0** | Confirmed (0 products in catalog have supplier costs) |
| **Customer Orders** | `{}` | **412** | Confirmed (410 genuine + 2 Stage 23 test fixtures) |
| **Customer User Accounts** | `{ role: 'customer' }` | **310** | Confirmed (308 genuine + 2 uncleaned test fixtures) |
| **Administrative Staff Accounts** | `{ role: { $ne: 'customer' } }` | **6** | Confirmed (3 primary + 3 test fixtures) |
| **Sizing Quotes** | `{}` | **182** | Confirmed (100% identical to baseline) |
| **Customer Enquiries** | `{}` | **147** | Confirmed (100% identical to baseline) |

---

## 8. Catalog Invariance Verification

A field-by-field comparison was conducted between live MongoDB Atlas products and the saved pre-implementation baseline snapshot (`scratch/active_products.json`):

### 8.1 Active Commercial Products (48 items, IDs 1–48)
- **Retail Selling Prices (`price_ngn`):** **0 mismatches** across all 48 active products.
- **Promotional / Previous Prices (`previous_price_ngn`):** **0 mismatches** across all 48 active products.
- **Stock Quantities (`stock_quantity`):** **0 mismatches** across all 48 active products.
- **Stock Status (`stock_status`):** **0 mismatches** across all 48 active products.
- **SKUs and Categories:** **0 mismatches** across all 48 active products.

### 8.2 Turnkey Solar Packages (6 packages)
All 6 commercial solar system packages retain 100% identical prices and specifications:

| Package ID | Package SKU | System Name | Retail Price (`price_ngn`) | Promotional Price (`previous_price_ngn`) | Invariance Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **27** | `DP-PKG-2KVA` | 2kVA Starter Solar Backup System | ₦1,150,000 | ₦1,280,000 | **100% Invariant** |
| **23** | `DP-PKG-3.5KVA` | 3.5kVA Essential Home Solar System | ₦2,450,000 | ₦2,750,000 | **100% Invariant** |
| **24** | `DP-PKG-5KVA` | 5kVA Premium Duplex Solar Package | ₦4,350,000 | ₦4,850,000 | **100% Invariant** |
| **48** | `DP-PKG-7.5KVA` | 7.5kVA Executive Villa Solar Package | ₦6,450,000 | ₦7,200,000 | **100% Invariant** |
| **25** | `DP-PKG-10KVA` | 10kVA Executive Residence Solar System | ₦8,200,000 | ₦9,100,000 | **100% Invariant** |
| **26** | `DP-PKG-15KVA` | 15kVA Commercial Office Microgrid | ₦12,500,000 | ₦13,800,000 | **100% Invariant** |

### 8.3 Archived Benchmark Products (70 records, IDs 49–118)
- All 70 documents retain `published: 0`.
- All 70 documents retain `sku: 'SG-10K-HYBRID-NG'`.
- All 70 documents retain `cost_price_ngn: 0` / null.
- Zero benchmark records were deleted, modified, or referenced by orders.

---

## 9. Production & Stage 8.5 Verification

### 9.1 Production Deployment Audit
- **Git Commits & Tags:** The repository's git HEAD remains at `bf5163d` (`fix(stage7): complete independent verification...`). No deployment commit, production release tag, or production branch has been created.
- **Hosting Environments:** No deployment actions were executed against Vercel, Cloud Run, or any external hosting provider.
- **Environment:** All activities were executed strictly in the local Node.js development runtime against the MongoDB Atlas development cluster.

### 9.2 Stage 8.5 Status Audit
- **Stage Definition:** Stage 8.5 ("Live Supplier Cost Baseline Activation") governs the formal activation of verified supplier acquisition costs into active catalog records (`Product.cost_price_ngn`).
- **Live Status:**
  - `Product.countDocuments({ published: 1, cost_price_ngn: { $gt: 0 } })` = **0**.
  - `Product.countDocuments({ cost_price_ngn: { $gt: 0 } })` = **0**.
  - No route, script, or automated process has activated supplier costs.
  - Stage 8.5 remains **completely unstarted, unimplemented, and untouched**.

---

## 10. Distinguishing Verified Facts from Limitations & Assumptions

To maintain the highest standard of architectural and audit integrity, verified facts are explicitly distinguished from historical limitations:

### Verified Facts (Empirically Proven by Database & Code Evidence):
1. **Both counts queried MongoDB Atlas:** The SQLite database contains 566 orders and 349 customer accounts and was not the source of either count.
2. **Order 412 is a test fixture:** Order `DP-ORD-245721` was created by `tests/stage23_admin_products.test.js:616` on October 24 at 14:58:24 WAT.
3. **Order 413 is a test fixture:** Order `DP-ORD-760919` was created by `tests/stage23_admin_products.test.js:655` on October 24 at 14:58:25 WAT.
4. **Customer 312 is a test fixture:** Registered by `tests/stage23_admin_products.test.js:116` on October 24 at 14:57:57 WAT.
5. **Customer 1793004533694 is a test fixture:** Registered by `tests/stage29_bom_dual_authorization.test.js:193` on October 26 at 09:48:55 WAT during an interrupted test run.
6. **Legitimate records are 100% invariant:** Exactly 410 legitimate orders and 308 legitimate customer accounts exist in the database and have not been modified.
7. **Commercial catalog prices and stock are 100% invariant:** Zero price, stock, or status mutations across all 48 commercial products and 6 solar packages.
8. **Zero supplier costs activated:** `cost_price_ngn` is 0 across all 118 catalog products.
9. **Zero production deployments occurred.**
10. **Stage 8.5 remains untouched.**

### Documented Historical Limitations:
1. **Report Carry-Forward Practice:** In previous completion reports (specifically `DEVICE_PRO_ADMIN_STAGE_8_4_BOM.md`), the author repeated the baseline figures ("410 orders, 308 customers") from the earlier Stage 8 baseline document without running a fresh count query against MongoDB Atlas. Because `stage23_admin_products.test.js` had already increased the database count to 412 orders and 309 customers at 14:58 WAT on October 24, the written report lagged behind the actual database state until Stage 8.4.1 re-queried the database directly.
2. **Test Suite Teardown Gaps:** `tests/stage23_admin_products.test.js` lacked teardown for created orders and users. `tests/stage29_bom_dual_authorization.test.js` possessed teardown in Test 6.7, but because teardown was placed at the end of the test sequence, any unhandled test failure in earlier assertions bypassed teardown. (Note: Per Directive 4, no test files or database records have been modified during this verification stage).

---

## 11. Conclusion & Recommendations

1. **The discrepancy is completely explained and forensically proven:**
   - 410 legitimate orders + 2 Stage 23 test fixture orders = **412 total orders**.
   - 308 legitimate customers + 1 Stage 23 test customer + 1 Stage 29 aborted test customer = **310 total customers**.
2. **All core business invariants are intact:**
   - Retail prices, promotional prices, inventory stock counts, and benchmark records have experienced **zero mutation**.
   - Zero supplier costs have been applied.
   - Zero customer or order data has been compromised or modified.
3. **Recommendation:**
   - **Accept the count of 412 orders and 310 customer accounts** as the accurate reflection of the live development database state, noting that 410 orders and 308 customer accounts represent legitimate business records.
   - In a future stage (or post-Stage 8.5 maintenance window), test suites can be enhanced with `try...finally` teardown hooks to prevent future test fixture accumulation.

---

**MANDATORY STOP COMPLIANCE:** Read-only verification report completed. No application code, product data, prices, stock, supplier costs, orders, customers, quotes, or enquiries were modified. No production deployment occurred. Stage 8.5 remains untouched. Awaiting owner review and approval.
