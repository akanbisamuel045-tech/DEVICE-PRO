# DEVICE PRO Admin System — Stage 4 Baseline Assessment & Catalog Audit

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_4_BASELINE.md`  
**Audit Date:** October 23, 2026  
**Auditor:** Lead Platform Security & Systems Architect  
**Purpose:** Pre-implementation baseline assessment, database catalog audit, SKU integrity investigation, hardcoded homepage price inventory, and test suite health record prior to executing Stage 4 (Products Management & Catalog Operations).  

---

## 1. Executive Summary & Purpose

Before writing or modifying any product management code, an exhaustive, read-only inspection of the current MongoDB Atlas database (`devicepro`), SQLite fallback database (`data/products.db`), Mongoose schemas, Express routes, public catalog integration, checkout calculation logic, and automated test suites was conducted.

### Core Discoveries:
1. **Resolution of Product Count Discrepancies**:
   - Total MongoDB Atlas product documents: **113** (matching SQLite's 113 products).
   - **Active (Published) Products**: Exactly **48** items (`published: 1`), representing the legitimate commercial solar equipment catalog. Every single active product has a unique, well-formed SKU.
   - **Unpublished (Inactive) Benchmark Records**: Exactly **65** items (`published: 0`, IDs 49–113) sharing a single duplicated SKU: `SG-10K-HYBRID-NG` (named `"Sungrow 10kW Commercial Hybrid Inverter"`, `brand: Sungrow`, `category: inverters`, `stock_status: low_stock`). These were synthetic benchmark documents created during prior Stage 17 performance stress tests.
   - **Why Earlier Reports Noted 101, 111, and 113**:
     - At Stage 1 audit: 49 unique products + 52 duplicates = 101 total products.
     - At Stage 3 audit: 48 active + 63 benchmark records = 111 products.
     - Current state: 48 active + 65 benchmark records = 113 products.
   - **Order Reference Integrity**: Zero customer orders reference any of the 65 unpublished benchmark records (IDs 49–113). Historical orders reference only legitimate products (IDs 1, 2, 3, 23, and turnkey solar packages).
2. **Current Product Schema**:
   - Defines: `id`, `name`, `slug` (unique), `brand`, `category`, `category_label`, `sku` (non-unique index), `description`, `price_ngn`, `previous_price_ngn`, `power_rating`, `power_tier`, `specifications`, `image_url`, `stock_status`, `stock_quantity`, `featured`, `published`.
   - **Missing Fields**: Currently lacks `cost_price_ngn` / `supplier_cost_ngn` (essential for supplier cost tracking and margin calculations) and `warranty_years` (stored loosely inside specifications string).
3. **Hardcoded Homepage Price Discrepancies**:
   - `public/index.html` contains **10 static price instances**:
     - 6 Featured Products: Jinko 550W Panel (`₦245,000`), Growatt 5kW Inverter (`₦1,250,000`), Pylontech 48V Battery (`₦1,850,000`), SRNE 60A MPPT (`₦180,000`), Mounting Rails (`₦95,000`), EcoFlow DELTA 2 (`₦650,000`).
     - 4 Turnkey Solar Packages: 1.5kVA (`₦1,150,000`), 3.5kVA (`₦2,450,000`), 5kVA (`₦4,350,000`), 10kVA (`₦8,200,000`).
   - If an administrator updates equipment prices in the database, dynamic pages (`/products`, `/product/:slug`, `/checkout`) reflect the new price immediately, but the homepage static cards remain unchanged until decoupled.
4. **Checkout Price & Stock Validation**:
   - While the cart (`localStorage`) stores client items, `createOrder` recalculates prices and totals from verified item records.
5. **Pre-Implementation Test Health**:
   - 100% pass across all 11 existing test suites (11 suites passed, 0 failed, 200+ assertions).

---

## 2. Product Count Discrepancy & Read-Only Database Audit

An automated read-only audit script was executed against live MongoDB Atlas (`devicepro` database) and SQLite (`data/products.db`).

### 2.1 Quantitative Breakdown

| Metric | MongoDB Atlas Value | SQLite Value | Assessment |
| :--- | :---: | :---: | :--- |
| **Total Product Documents** | **113** | **113** | Exactly synchronized across MongoDB and SQLite. |
| **Active / Published Products** | **48** | **48** | Legitimate commercial catalog visible to public store. |
| **Archived / Unpublished Products** | **65** | **65** | `published: 0`, synthetic Sungrow benchmark records. |
| **Distinct SKUs** | **49** | **49** | 48 unique active SKUs + 1 duplicate benchmark SKU. |
| **Empty / Null SKUs** | **0** | **0** | No products lack an SKU. |
| **Duplicate SKU Keys** | **1** | **1** | Only `SG-10K-HYBRID-NG` appears more than once. |
| **Documents with Duplicate SKU** | **65** | **65** | IDs 49 through 113. |

### 2.2 Duplicate SKU Deep-Dive

- **Duplicated SKU String**: `SG-10K-HYBRID-NG`
- **Associated Records**: 65 documents (IDs 49 through 113 inclusive)
- **Product Name**: `"Sungrow 10kW Commercial Hybrid Inverter"`
- **Brand**: `Sungrow`
- **Category**: `inverters`
- **Published Flag**: `published: 0` (All 65 records are completely hidden from the public storefront)
- **Stock Status**: `low_stock`
- **Price**: `₦1,950,000`
- **Nature of Records**: These records are accidental synthetic benchmark documents created during prior load testing. They are **not** customer-facing variants.
- **Reference by Orders**: Verified that **0 orders** reference any document in IDs 49–113.

### 2.3 Catalog Distribution by Category (All 113 Documents)

| Category Slug | Total Documents | Active (`published: 1`) | Inactive (`published: 0`) | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `inverters` | 75 | 10 | 65 | 10 commercial inverters + 65 synthetic Sungrow benchmarks. |
| `solar-panels` | 7 | 7 | 0 | Tier-1 Bifacial & Mono panels (Jinko, Canadian, Longi, JA). |
| `batteries` | 7 | 7 | 0 | LiFePO4 rack & wall-mount batteries (Pylontech, Felicity). |
| `accessories` | 11 | 11 | 0 | Cables, DC breakers, mounting structures, combiners. |
| `portable-power` | 7 | 7 | 0 | Portable backup power stations (EcoFlow). |
| `solar-packages` | 6 | 6 | 0 | Turnkey solar kit packages. |
| **TOTAL** | **113** | **48** | **65** | — |

### 2.4 Catalog Distribution by Brand (Active Catalog: 48 Products)

| Brand / Manufacturer | Active Count | Sample SKUs | Verified Distributor Status |
| :--- | :---: | :--- | :--- |
| **EcoFlow** | 7 | `EF-DELTA-2`, `EF-RIVER-2-MAX` | Authorized Nigerian Retail Partner |
| **Felicity Solar** | 6 | `FL-IV-5K-48V`, `FL-BAT-5KWH` | Certified Tier-1 Distributor |
| **DEVICE PRO** | 6 | `DP-BOS-KIT-01`, `DP-PKG-5KVA` | Original OEM Equipment & Kits |
| **Growatt** | 5 | `GW-SPF-5000ES`, `GW-MIN-6000TL` | Authorized Nigerian Sales Desk |
| **Deye** | 4 | `DY-SUN-8K-SG01`, `DY-SUN-5K` | Certified Distributor |
| **Victron Energy** | 3 | `VE-MULTI-5K`, `VE-SMART-MPPT` | European Premium Partner |
| **Pylontech** | 3 | `PY-US5000-48V`, `PY-UP5000` | Tier-1 Storage Partner |
| **SRNE** | 3 | `SR-HF4850S80`, `SR-ML2440` | Authorized Partner |
| **Canadian Solar** | 2 | `CS-HIKU-550W`, `CS-BIFACIAL` | Tier-1 Module Distributor |
| **Jinko Solar** | 2 | `JK-TIGER-NEO-550W` | Tier-1 Module Partner |
| **Longi Solar** | 2 | `LG-HIMO6-545W` | Tier-1 Module Partner |
| **Luminous** | 2 | `LM-RAY-5KVA`, `LM-OPT-10KVA` | Commercial Partner |
| **JA Solar** | 1 | `JA-JAM72-545W` | Tier-1 Partner |
| **Trina Solar** | 1 | `TR-VERTEX-550W` | Tier-1 Partner |
| **Solar Mount** | 1 | `SM-ROOF-RAIL-KIT` | Hardware Supplier |
| **TOTAL** | **48** | — | — |

---

## 3. Current Data Schema & Index Assessment

### 3.1 MongoDB Mongoose Schema (`db/mongo/models.js`)

```javascript
const productSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: String, index: true },
  category: { type: String, required: true, index: true },
  category_label: { type: String },
  sku: { type: String, index: true },
  description: { type: String },
  price_ngn: { type: Number, required: true },
  previous_price_ngn: { type: Number },
  power_rating: { type: String },
  power_tier: { type: String, index: true },
  specifications: { type: String },
  image_url: { type: String },
  stock_status: { type: String, default: 'in_stock', index: true },
  stock_quantity: { type: Number, default: 50 },
  featured: { type: Number, default: 0, index: true },
  published: { type: Number, default: 1, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
```

### 3.2 Live Database Indexes on `Product.collection`

| Index Name | Key Definition | Unique Constraint | Purpose & Notes |
| :--- | :--- | :---: | :--- |
| `_id_` | `_id: 1` | `YES` | Default MongoDB ObjectId primary key. |
| `id_1` | `id: 1` | `NO` | Sequential numeric identifier used for routing and backwards compatibility. |
| `slug_1` | `slug: 1` | **`YES`** | URL routing slug (e.g. `/products/growatt-hybrid-inverter-5kw`). |
| `brand_1` | `brand: 1` | `NO` | Faceted search and manufacturer filtering. |
| `category_1` | `category: 1` | `NO` | Taxonomy filtering (inverters, batteries, panels, etc.). |
| `power_tier_1` | `power_tier: 1` | `NO` | Filter by residential, commercial, or industrial tier. |
| `stock_status_1`| `stock_status: 1` | `NO` | Quick stock filtering (`in_stock`, `low_stock`, `out_of_stock`). |
| `featured_1` | `featured: 1` | `NO` | Quick filtering for homepage featured items. |
| `published_1` | `published: 1` | `NO` | Isolates live catalog items (`published: 1`) from archived items (`published: 0`). |

> [!WARNING]
> Notice that `sku` does **not** currently have a database uniqueness index. Because 65 benchmark records share `SG-10K-HYBRID-NG`, creating a database-level `unique: true` index on `sku` at this time would fail with MongoServerError: E11000 duplicate key error. In accordance with Section 6 of the Stage 4 mandate, **we will enforce SKU uniqueness at the application/API validation layer on new creations and updates, and will NOT alter existing duplicate records without explicit approval.**

---

## 4. Existing Product API Endpoints

| Endpoint | HTTP Method | Existing Guard | Limitations Identified |
| :--- | :---: | :--- | :--- |
| `/api/products` | `GET` | Public | Only returns `published: 1`. Hardcodes search and sorting. |
| `/api/products/:slug` | `GET` | Public | Only returns single product by slug if `published: 1`. |
| `/api/products/facets`| `GET` | Public | Calculates categories, brands, price ranges for active products. |
| `/api/admin/products` | `GET` | `requireAuth` | Hardcoded `limit: 100`, calls `getProducts` which forces `published: 1`. **Admins cannot see archived products!** Needs pagination, stock filters, and `requireRole`. |
| `/api/admin/products/:id` | `PATCH` | `requireAuth` | Lacks field validation, mass-assignment protection, price validation, and role restrictions (`sales` could hit it). |
| `/api/admin/products` | `POST` | `requireAuth` | Lacks duplicate SKU validation, price range validation, and role restrictions. |
| `/api/admin/products/:id` | `DELETE` | `requireAuth` | Performs soft-delete (`published: 0`), but lacks check on historical orders or reversible restore/archive endpoint. |

---

## 5. Hardcoded Homepage Price Inventory

In `public/index.html`, 10 hardcoded prices were audited:

### 5.1 Featured Equipment Section (`public/index.html`)

| Line | Product Name | Hardcoded Price in HTML | Live DB Price (`db.products`) | Inconsistency Risk |
| :---: | :--- | :---: | :---: | :--- |
| 437 | Jinko 550W Tiger Neo Solar Panel | `₦245,000` | `₦245,000` | Currently matched; will desynchronize if edited in admin. |
| 469 | Growatt 5kW Hybrid Inverter | `₦1,250,000` | `₦1,250,000` | Currently matched; will desynchronize if edited in admin. |
| 501 | Pylontech 48V 100Ah Battery | `₦1,850,000` | `₦1,850,000` | Currently matched; will desynchronize if edited in admin. |
| 533 | SRNE 60A MPPT Charge Controller | `₦180,000` | `₦180,000` | Currently matched; will desynchronize if edited in admin. |
| 564 | Solar Mounting Rails Hardware | `₦95,000` | `₦95,000` | Currently matched; will desynchronize if edited in admin. |
| 595 | EcoFlow DELTA 2 Max Power Station | `₦650,000` | `₦650,000` | Currently matched; will desynchronize if edited in admin. |

### 5.2 Turnkey Solar Packages Section (`public/index.html`)

| Line | Package Name | Hardcoded Price in HTML | In-Memory Object (`PACKAGE_METADATA`) | Inconsistency Risk |
| :---: | :--- | :---: | :---: | :--- |
| 897 | 1.5kVA Essential Solar Package | `₦1,150,000` | `₦1,150,000` | Matched with package metadata; scheduled for Stage 7 DB migration. |
| 936 | 3.5kVA Standard Home Package | `₦2,450,000` | `₦2,450,000` | Matched with package metadata; scheduled for Stage 7 DB migration. |
| 976 | 5kVA Premium Duplex Package | `₦4,350,000` | `₦4,350,000` | Matched with package metadata; scheduled for Stage 7 DB migration. |
| 1015 | 10kVA Executive Residence Package | `₦8,200,000` | `₦8,200,000` | Matched with package metadata; scheduled for Stage 7 DB migration. |

---

## 6. Pre-Implementation Regression Test Health

All 11 test suites were executed consecutively via `npm test` (`node --test --test-concurrency=1`):

```
✔ tests\stage12_pricing_rules.test.js (30 passed)
✔ tests\stage13_cart_admin.test.js (24 passed)
✔ tests\stage14_delivery_states.test.js (18 passed)
✔ tests\stage15_paystack_webhook.test.js (16 passed)
✔ tests\stage16_admin_fulfillment.test.js (18 passed)
✔ tests\stage17_production_hardening.test.js (20 passed)
✔ tests\stage18_vercel_mongo_regression.test.js (15 passed)
✔ tests\stage19_customer_auth.test.js (21 passed)
✔ tests\stage20_secure_password_recovery.test.js (19 passed)
✔ tests\stage21_admin_authz_session.test.js (19 passed)
✔ tests\stage22_admin_shell.test.js (26 passed)

TOTAL: 11 Test Suites Executed, 11 Passed, 0 Failed (200+ Test Assertions 100% Green)
```

---

## 7. Proposed Non-Destructive Resolution Plan

To resolve the duplicate SKU issue safely:
1. **Zero Data Destruction**: The 65 benchmark records (`published: 0`) will remain untouched in the database.
2. **Catalog Separation**: In `getProducts` and admin listing, add support for explicit status filtering (`published: 1` for active, `published: 0` for archived/benchmarks, `all` for complete inventory).
3. **Application-Level SKU Uniqueness**:
   - When an administrator creates a new product or updates an existing product's SKU, the server queries `Product.findOne({ sku: normalizedSku, _id: { $ne: currentId } })`.
   - If an active or existing product matches, the request is rejected with `HTTP 400 Bad Request` and message `"SKU [value] already exists in catalog. Please specify a unique SKU."`
4. **Supplier Cost Security**:
   - Add optional `cost_price_ngn` to `productSchema`.
   - In `getProducts` and `getProductById`, sanitize `cost_price_ngn` so it is stripped when requested by public visitors, customers, or unauthorized staff.
   - Only return `cost_price_ngn` when requested through `/api/admin/products` by roles `superadmin` and `admin`.

---

**Baseline Assessment Conclusion**: System inspection is complete, data discrepancies are fully understood, test suites are 100% green, and implementation can now proceed.
