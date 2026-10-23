# DEVICE PRO Admin System — Stage 7 Baseline Assessment
## Supplier Price Intelligence, Margin Analysis & Controlled Pricing Recommendations

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_7_BASELINE.md`  
**Audit Date:** October 23, 2026  
**Auditor / Engineer:** Lead Platform Security & Systems Architect  
**Purpose:** Pre-implementation baseline audit of database schema, catalog pricing architecture, available historical data, missing attributes, calculation limitations, role permissions, and Stage 6 approval gate verification prior to Stage 7 implementation.

---

## 1. Executive Summary & Purpose

Before writing any implementation code for Stage 7 (Supplier Price Intelligence and Margin Analysis), an exhaustive audit of the existing codebase, live MongoDB Atlas cluster, catalog schemas, historical import logs, role-based authorization controls, and test suites was conducted.

### Core Discoveries:
1. **Catalog Integrity & Document Distribution**:
   - Total catalog products in MongoDB Atlas: **117**
   - **Active Commercial Products (`published: 1`)**: Exactly **48 products**, each with a verified unique SKU and active customer selling price (`price_ngn > 0`).
   - **Archived Benchmark Records (`published: 0`)**: Exactly **69 documents**, all sharing the benchmark SKU `SG-10K-HYBRID-NG`. Under no circumstance may these benchmark records be included in commercial profitability analysis.
   - **Active SKU Collisions**: **0**.
2. **Canonical Supplier Cost Field Resolution**:
   - `cost_price_ngn` is the canonical database field on `Product` (confirmed by ADR-014 in Stage 6).
   - In MongoDB Atlas, currently 0 active catalog products have a populated supplier cost (`cost_price_ngn > 0`), as all 48 active products have `cost_price_ngn: 0` or unpopulated fields from initial catalog migration.
   - **Crucial Rule**: The intelligence engine must NOT invent or estimate supplier costs. Products with missing or zero supplier costs must be explicitly categorized as `Data Quality: Missing Supplier Cost`, with margin and gross profit displayed as **Unavailable**.
3. **Customer Selling Price & Promotional Pricing**:
   - `price_ngn` represents the active customer retail selling price.
   - `previous_price_ngn` represents the regular pre-discount selling price (populated on all 48 active products, e.g., ₦275,000 regular vs ₦245,000 promotional).
   - When a valid supplier cost is present, profitability must be calculable against both the active selling price (`price_ngn`) and the regular selling price (`previous_price_ngn`).
4. **Historical Price Import Records**:
   - Total `PriceImport` documents in MongoDB Atlas: **0** (clean baseline following automated test teardowns).
   - The platform contains no applied historical supplier imports on live commercial items. Therefore, historical cost movements (previous vs current supplier cost) must be honestly reported as **Unavailable** rather than fabricating sample movements.
5. **Strict Analytical Invariance**:
   - Stage 7 is strictly an analytical and advisory intelligence engine.
   - Under no circumstances will Stage 7 modify `price_ngn`, `cost_price_ngn`, `previous_price_ngn`, stock quantities, orders, quotes, or product publication status.
6. **Existing Test Suite Baseline**:
   - 7 test suites (Stages 20 through 25-Security) currently execute with **182 passed, 0 failed (100% pass rate)**.
7. **Stage Gate Status**:
   - Stage 6 has been completed, hardened, and verified with 61 dedicated automated tests.
   - Stage 6 is awaiting formal project owner approval.
   - In compliance with Section 2 of the Stage 7 specification, **no Stage 7 production code will be implemented until explicit owner approval is received**.

---

## 2. Live Database & Schema Audit Findings

A direct read-only query against the MongoDB Atlas cluster (`ac-smg7i0k-shard-00-02.6puyijc.mongodb.net/devicepro`) confirmed the following catalog state:

| Catalog Attribute | Atlas Value | Analysis / Governance |
| :--- | :---: | :--- |
| **Total Product Documents** | **117** | Total raw documents in `products` collection |
| **Active Commercial Items (`published: 1`)** | **48** | Authentic commercial store catalog |
| **Archived Benchmark Items (`published: 0`)** | **69** | Benchmark items (`SG-10K-HYBRID-NG`); strictly excluded from active analysis |
| **Active Products with `price_ngn > 0`** | **48** | 100% of active catalog has valid customer selling prices |
| **Active Products with `cost_price_ngn > 0`** | **0** | All 48 active items currently have `cost_price_ngn: 0` or missing |
| **Active Products with `previous_price_ngn > 0`** | **48** | All 48 items have promotional/regular discount comparison data |
| **Distinct Commercial Categories** | **6** | `accessories`, `batteries`, `inverters`, `portable-power`, `solar-packages`, `solar-panels` |
| **Distinct Brands** | **18** | Canadian Solar, Deye, EcoFlow, Felicity Solar, Growatt, JA Solar, Jinko Solar, Longi, Luminous, Pylontech, Sungrow, Trina Solar, Victron, etc. |
| **Completed `PriceImport` Documents** | **0** | Clean baseline after test cleanup; no live supplier price lists currently applied |
| **Historical `AuditLog` Records** | **2,095** | Full audit history intact, capturing previous analysis actions |
| **Orders & Quotes Count** | **389 Orders, 180 Quotes** | Fully intact; must never be mutated or affected by price intelligence |

---

## 3. Product Schema & Field Audit

### 3.1 Field Inventory & Definitions

```javascript
// Product Schema (db/mongo/models.js)
{
  id: { type: Number, index: true },
  sku: { type: String, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  brand: { type: String, index: true },
  category: { type: String, required: true, index: true },
  category_label: { type: String },
  price_ngn: { type: Number, required: true },             // Customer Retail Selling Price
  previous_price_ngn: { type: Number },                    // Regular / Pre-Discount Selling Price
  cost_price_ngn: { type: Number, default: 0 },            // Canonical Supplier Cost (Confidential)
  stock_status: { type: String, default: 'in_stock' },
  stock_quantity: { type: Number, default: 50 },
  published: { type: Number, default: 1, index: true },    // 1 = Active, 0 = Inactive / Archived
  updated_at: { type: Date }
}
```

### 3.2 Canonical Supplier Cost Resolution
- In Stage 4 and Stage 6, `cost_price_ngn` was formally established as the canonical supplier cost field (ADR-014).
- In public endpoints (`/api/products`, `/api/products/:slug`), `cost_price_ngn` is strictly projected out (`{ cost_price_ngn: 0 }`).
- In administrative endpoints (`/api/admin/products/:id`), `cost_price_ngn` is returned only for authorized roles (`superadmin`, `admin`).
- For backward compatibility with any legacy imports, the engine reads `cost_price_ngn ?? supplier_cost_ngn ?? 0`.

---

## 4. Mathematical Calculations & Critical Limitations

### 4.1 Estimated Gross Profit Before Other Costs
- **Formula:**
  $$\text{Gross Profit (NGN)} = \text{Selling Price} - \text{Supplier Cost}$$
- **Validation Guard:** Valid only when $\text{Supplier Cost} > 0$ and $\text{Selling Price} > 0$. If supplier cost is missing, 0, or null, gross profit is marked as **Unavailable**.
- **Promotional Contrast:** If `previous_price_ngn` is present and greater than `price_ngn`, the engine will calculate:
  - Promotional Gross Profit: $\text{price\_ngn} - \text{cost\_price\_ngn}$
  - Regular Gross Profit: $\text{previous\_price\_ngn} - \text{cost\_price\_ngn}$

### 4.2 Gross Margin Percentage
- **Formula:**
  $$\text{Gross Margin \%} = \left(\frac{\text{Selling Price} - \text{Supplier Cost}}{\text{Selling Price}}\right) \times 100$$
- **Division by Zero Guard:** If $\text{Selling Price} \le 0$, margin is marked as **Unavailable** (never returns `NaN`, `Infinity`, or throws an error).

### 4.3 Cost Markup Percentage
- **Formula:**
  $$\text{Markup \%} = \left(\frac{\text{Selling Price} - \text{Supplier Cost}}{\text{Supplier Cost}}\right) \times 100$$
- **Division by Zero Guard:** If $\text{Supplier Cost} \le 0$, markup is marked as **Unavailable**.
- **Distinction Notice:** Markup (profit as % of cost) and Margin (profit as % of selling price) are distinct metrics and clearly labeled as separate table columns.

### 4.4 Indicative Selling Price for Review
- **Formula:**
  $$\text{Indicative Selling Price} = \frac{\text{Supplier Cost}}{1 - \text{Target Margin Decimal}}$$
  *(e.g., Target Margin of 25% $\rightarrow$ $\frac{\text{Supplier Cost}}{1 - 0.25} = \frac{\text{Supplier Cost}}{0.75}$)*
- **Validation Guard:** Valid only when $0 < \text{Target Margin} < 100$ and $\text{Supplier Cost} > 0$. Target margins $\le 0\%$ or $\ge 100\%$ must be rejected with HTTP 400.
- **Advisory Labeling:** The calculated price is strictly labeled **"Indicative Price for Review"**. It is NEVER saved to the database, published to the storefront, or applied to customer orders.

### 4.5 Financial Disclosure & Scope Limitations
- Gross Profit reflects only $\text{Selling Price} - \text{Supplier Cost}$.
- It does **not** include:
  - Import customs duties, port clearing, or demurrage.
  - Inter-state or last-mile freight / shipping.
  - Paystack payment gateway processing fees (1.5% + ₦100).
  - Engineering installation and certified technician labor.
  - Warranty reserves and replacement provisioning.
  - Company overheads, corporate tax, or operational expenditures.
- **Mandatory UI Label:** The metric will always be displayed as **"Estimated Gross Profit Before Other Costs"** with an accompanying explanatory disclosure.

---

## 5. Advisory Recommendation Rules

The intelligence engine will evaluate products against a deterministic set of configurable business rules to generate transparent recommendations:

| Recommendation Rule | Condition | Explanation / Advice |
| :--- | :--- | :--- |
| `MISSING_COST` | `cost_price_ngn <= 0` or missing | Supplier cost is unpopulated. Margin cannot be determined; update supplier cost via price import or catalog management. |
| `INVALID_SELLING_PRICE` | `price_ngn <= 0` | Retail selling price is invalid or zero; requires immediate catalog price review. |
| `NEGATIVE_MARGIN` | `cost_price_ngn > price_ngn` | Selling price is below supplier acquisition cost. Immediate selling price review recommended to prevent losses. |
| `LOW_MARGIN` | `Gross Margin % < Target Margin %` (default: 15%) | Margin is below target threshold. Indicative selling price generated for review. |
| `HEALTHY_MARGIN` | `Gross Margin % >= Target Margin %` | Profit margin is aligned with target pricing parameters. |
| `COST_INCREASED` | Latest applied supplier cost > previous cost | Supplier cost increased in latest applied import. Review retail selling price to maintain target margin. |

---

## 6. Role Authorization & Privacy Protection

| Role | Access to Price Intelligence Summary & Products | Access to Modify Margin Settings | Expose Supplier Cost in API |
| :--- | :---: | :---: | :---: |
| `superadmin` | ✅ Allowed | ✅ Allowed | ✅ Yes |
| `admin` | ✅ Allowed | ✅ Allowed | ✅ Yes |
| `engineer` | ❌ Rejected (403 Forbidden) | ❌ Rejected (403 Forbidden) | ❌ No |
| `sales` | ❌ Rejected (403 Forbidden) | ❌ Rejected (403 Forbidden) | ❌ No |
| `staff` | ❌ Rejected (403 Forbidden) | ❌ Rejected (403 Forbidden) | ❌ No |
| `customer` | ❌ Rejected (403 Forbidden) | ❌ Rejected (403 Forbidden) | ❌ No |
| Anonymous | ❌ Rejected (401 Unauthorized) | ❌ Rejected (401 Unauthorized) | ❌ No |

---

## 7. Existing Test Coverage Baseline

A verification run of all foundational test suites demonstrates 100% stability across the platform:

```
tests/stage20_secure_password_recovery.test.js    19 passed    0 failed
tests/stage21_admin_authz_session.test.js         19 passed    0 failed
tests/stage22_admin_shell.test.js                 26 passed    0 failed
tests/stage23_admin_products.test.js              23 passed    0 failed
tests/stage24_supplier_price_import.test.js       34 passed    0 failed
tests/stage25_supplier_price_application.test.js  40 passed    0 failed
tests/stage25_security_verification.test.js       21 passed    0 failed
-----------------------------------------------------------------------
TOTAL REGRESSION HEALTH:                          182 passed   0 failed
```

---

## 8. Proposed Stage 7 Implementation Architecture

Upon receiving explicit owner approval, Stage 7 will be implemented in the following modular components:

1. **Analytical Engine (`lib/price-intelligence-engine.js`)**:
   - Pure, stateless mathematical calculation functions:
     - `calculateGrossProfit(sellingPrice, costPrice)`
     - `calculateGrossMarginPercent(sellingPrice, costPrice)`
     - `calculateMarkupPercent(sellingPrice, costPrice)`
     - `calculateIndicativePrice(costPrice, targetMarginPercent)`
     - `evaluateProductProfitability(product, settings)`
     - `calculateCatalogSummaryMetrics(products, settings)`
2. **Repository Layer (`db/mongo/repository.js` & `db/database.js`)**:
   - `getPriceIntelligenceSummary(options)`: Aggregates catalog-wide KPIs (active products, complete data, missing cost, negative margin, low margin).
   - `getPriceIntelligenceProducts(filterOptions)`: Filtered, paginated, and enriched product list with server-calculated profitability metrics.
   - `getProductCostHistory(productId)`: Gathers genuine historical supplier price changes from applied `PriceImport` records and `AuditLog`.
   - `getPriceIntelligenceSettings()` & `updatePriceIntelligenceSettings()`: Stores configurable target margin and alert thresholds.
3. **REST API Endpoints (`server.js`)**:
   - `GET /api/admin/price-intelligence/summary`
   - `GET /api/admin/price-intelligence/products`
   - `GET /api/admin/price-intelligence/products/:id`
   - `GET /api/admin/price-intelligence/products/:id/cost-history`
   - `GET /api/admin/price-intelligence/settings`
   - `PATCH /api/admin/price-intelligence/settings`
4. **Administrative User Interface (`public/admin.html`, `public/css/admin.css`, `public/js/admin.js`)**:
   - New Section 6 tab: **"Price Intelligence & Margins"** in the administrative sidebar shell.
   - Metric cards: Total Active Products, Complete Pricing Data, Missing Supplier Cost, Low Margin Alerts, Negative Margin Alerts.
   - Interactive data table with filters for Category, Brand, Margin Health, Missing Cost, and Search.
   - Indicative price simulation drawer/modal.
5. **Comprehensive Test Suite (`tests/stage26_price_intelligence.test.js`)**:
   - 30 focused test assertions covering calculations, zero/negative bounds, indicative prices, role authorization, supplier history, and zero-mutation invariance.

---

## 9. Stage Gate Assessment & Stop Condition

### Gate Verification Status
- **Stage 6 Status:** Completed, independently audited, hardened with MongoDB session transactions and concurrency protections, and committed to git (`commit 3562b7a`).
- **Owner Approval Status:** **Pending explicit owner approval.**
- **Stage Gate Rule (Section 2):**  
  > *"If Stage 6 has not been explicitly approved, do not implement Stage 7. Prepare a short readiness assessment and stop for approval."*

### Recommendation
Stage 6 is verified and ready for formal sign-off. The Stage 7 baseline audit is complete, and the implementation architecture is fully defined.

**Current Action:** STOPPED. Awaiting explicit project owner approval before implementing Stage 7 code.
