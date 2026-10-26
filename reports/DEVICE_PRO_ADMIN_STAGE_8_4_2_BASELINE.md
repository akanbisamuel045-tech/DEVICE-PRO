# DEVICE PRO Admin System — Stage 8.4.2 Baseline Inspection Report

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_8_4_2_BASELINE.md`  
**Assessment Date:** October 26, 2026  
**Auditor:** Systems & Security Architecture Lead (Pair-Programming Agent)  
**Purpose:** Pre-intake baseline inspection, catalog audit, intake route verification, and readiness assessment prior to establishing a supplier cost baseline for DEVICE PRO's active commercial catalog.  
**Governing Mandate:** Zero modification of application code, product data, supplier costs, retail prices, stock, orders, customers, quotes, or enquiries; no production deployment; Stage 8.5 unstarted; stop if genuine quotations are unavailable.

---

## 1. Executive Summary

In accordance with Owner Directive OD-8.4.2 and the Stage 8.4.2 roadmap, an exhaustive baseline inspection was conducted to establish the pre-intake state of the DEVICE PRO platform before processing supplier quotations.

### Core Baseline Findings:
1. **Catalog Composition:**
   - **Total Product Documents:** Exactly **118** in MongoDB Atlas.
   - **Active Commercial Products:** Exactly **48** items (`published: 1`, IDs 1–48) across 6 categories.
   - **Soft-Archived Benchmark Records:** Exactly **70** documents (`published: 0`, IDs 49–118, all sharing SKU `SG-10K-HYBRID-NG`), preserved intact per Owner Decision OD-8.1.
   - **Turnkey Solar Packages:** Exactly **6** packages (IDs 23, 24, 25, 26, 27, 48).
2. **Current Supplier Cost Status:**
   - **Commercial Products with Activated Supplier Cost:** Exactly **0 of 48** (`cost_price_ngn: null/0`).
   - **Catalog Invariant:** 100% of commercial catalog products currently lack an approved supplier acquisition cost baseline.
   - **Pricing Invariant:** Retail selling prices (`price_ngn`) range from ₦18,000 to ₦12,500,000 and remain strictly untampered. Retail prices are never substituted for supplier costs.
3. **Genuine Quotation Availability Assessment:**
   - A deep filesystem audit confirmed that **zero genuine distributor quotation files** (`.xlsx`, `.csv`) have been submitted to the workspace.
   - Only the two approved blank master templates exist in `templates/`:
     - `templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx`
     - `templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv`
   - In strict compliance with Section 2 ("*If genuine supplier quotations are not available, stop at the readiness and intake stage. Report exactly what evidence is missing.*"), this stage documents quotation intake readiness and establishes the missing evidence requirements without inventing mock supplier data.
4. **Intake Infrastructure Verification:**
   - Verified that `server.js` supports `POST /api/admin/price-imports/intake` (aliased with `/upload`) with strict authentication (`requireAuth`), authorization (`requireRole('superadmin', 'admin')`), and Multer 4MB memory bounds.
   - Verified that `lib/price-import-engine.js` enforces exact normalized SKU matching against active commercial products, excludes benchmark records, validates 30-day freshness windows (WAT/UTC+1), rejects calendar rollover dates (e.g. 2026-04-31), flags ambiguous dates (e.g. 04/05/2026), and strictly restricts currency to NGN.
5. **Business Records Baseline:**
   - Total Orders: **412** (410 legitimate business orders + 2 Stage 23 test fixtures, as forensically clarified in `reports/DEVICE_PRO_ADMIN_STAGE_8_4_1_INVARIANCE_CLARIFICATION.md`).
   - Customer Accounts (`role: 'customer'`): **310** (308 legitimate accounts + 2 test fixtures).
   - Sizing Quotes: **182**.
   - Customer Enquiries: **147**.
   - Persistent `PriceImport` Documents: **0**.

---

## 2. Quantitative Database Inventory

Direct read-only inspection was executed against the active MongoDB Atlas cluster (`database: devicepro`) and compared with the local SQLite fallback (`data/products.db`):

| Entity / Metric | MongoDB Atlas (`devicepro`) | SQLite Fallback (`data/products.db`) | Baseline Assessment |
| :--- | :---: | :---: | :--- |
| **Total Product Documents** | **118** | 113 | 48 active commercial + 70 archived benchmarks in Mongo. |
| **Active Commercial Products** | **48** | 48 | Legitimate catalog visible on public storefront (`published: 1`). |
| **Archived Benchmark Records** | **70** | 65 | Retained per OD-8.1 (`published: 0`, SKU: `SG-10K-HYBRID-NG`). |
| **Turnkey Solar Packages** | **6** | 6 | Commercial packages (IDs 23, 24, 25, 26, 27, 48). |
| **Active Products with Supplier Cost** | **0** | 0 | Exactly 0 active products have `cost_price_ngn > 0`. |
| **Total Orders** | **412** | 566 | 410 legitimate + 2 Stage 23 test fixtures. |
| **Customer Accounts (`role: customer`)** | **310** | 349 | 308 legitimate + 2 test fixtures. |
| **Administrative Staff Accounts** | **6** | 3 | 3 primary staff (admin, engineer, sales) + 3 test accounts. |
| **Sizing Quotes** | **182** | 223 | Untouched and invariant. |
| **Customer Enquiries** | **147** | 150 | Untouched and invariant. |
| **Persistent `PriceImport` Records** | **0** | 0 | 0 active price import documents in MongoDB Atlas. |
| **Existing Package BOM Records** | **2** | 0 | Package 24 and Package 25 (created in Stages 8.4/8.4.1). |

---

## 3. Active Commercial Catalog Breakdown (48 Products)

The 48 active commercial products span 6 commercial categories:

| Category Slug | Category Label | Count | Sample SKUs | Supplier Cost Status |
| :--- | :--- | :---: | :--- | :---: |
| `solar-panels` | Solar Panels | 7 | `JKM-550M-72HL4`, `CS7N-660MB-AG`, `JAM72S30-545/MR` | `cost_price_ngn: null/0` |
| `inverters` | Inverters & Power Conditioning | 10 | `GW-SPH5000-TL-BL-UP`, `SUN-8K-SG01LP1-EU`, `PMP482505010` | `cost_price_ngn: null/0` |
| `batteries` | Energy Storage Systems | 7 | `PYL-US3000C-48V`, `FL-LPBF48200-H`, `HITH-ESS-15K-300AH` | `cost_price_ngn: null/0` |
| `accessories` | Balance of System & Electrical | 11 | `SM-RMS-ALUM-6P`, `MC4-CBL-4MM-100M`, `TOMZN-ATS-63A` | `cost_price_ngn: null/0` |
| `portable-power` | Portable Power Stations | 7 | `EF-DELTA-1000W`, `EF-DELTA2-MAX`, `ITEL-PT-1000W` | `cost_price_ngn: null/0` |
| `solar-packages` | Turnkey Solar Packages | 6 | `DP-PKG-2KVA`, `DP-PKG-3.5KVA`, `DP-PKG-5KVA`, `DP-PKG-10KVA` | `cost_price_ngn: null/0` |
| **TOTAL** | — | **48** | — | **0 / 48 with costs** |

### Verified Hardware vs Package Distinction:
- **42 Discrete Hardware Components:** IDs 1–22, 28–47. These represent discrete physical components sourced from equipment distributors.
- **6 Turnkey Solar Packages:** IDs 23, 24, 25, 26, 27, 48. These represent assembled solutions whose cost is deterministically derived from their constituent Bill of Materials (BOM) hardware lines, installation labour, and logistics tariffs. Packages cannot be matched as hardware lines (circular reference prevention).

---

## 4. Intake Gateway & Engine Verification

### 4.1 Route & Access Control
- **Endpoint:** `POST /api/admin/price-imports/intake` (aliased with `/upload`).
- **Authentication:** `requireAuth` (valid Bearer JWT session token required).
- **Authorization:** `requireRole('superadmin', 'admin')`. Non-administrative roles (customer: 403, engineer: 403, sales: 403, unauthenticated: 401) are strictly rejected.
- **Upload Constraints:** Multer in-memory storage; maximum 4.0 MB per file; single file per request.
- **Accepted Formats:** Excel workbooks (`.xlsx`, `.xls`) and RFC 4180 CSV (`.csv`).

### 4.2 Pre-Validation Engine Rules (`lib/price-import-engine.js`)
- **SKU Matching:** Normalized exact uppercase comparison against active commercial products (`published: 1`) only.
- **Benchmark Exclusion:** All 70 soft-archived Sungrow benchmark documents (`sku: 'SG-10K-HYBRID-NG'`, `published: 0`) are strictly excluded from automatic matching.
- **Freshness Window:** Evaluated against a 30-calendar-day business window in West Africa Time (WAT / UTC+1). Quotations > 30 days old are classified as `stale` with required human review flags.
- **Date Robustness:** Calendar rollover dates (e.g. `2026-04-31` or non-leap year `2025-02-29`) are strictly rejected. Ambiguous date formats (e.g. `04/05/2026`) without explicit `options.dateFormat` are rejected with `isAmbiguous: true`.
- **Currency:** Strict NGN restriction. Non-NGN currencies (USD, EUR, GBP, CNY) are strictly rejected with zero implicit foreign exchange conversion.
- **Price Bounds:** Negative prices, zero prices, non-numeric strings, and excessive values (> ₦100,000,000,000) are flagged as `invalid_price`.
- **Formula Injection:** Excel and CSV formula characters (`=`, `+`, `-`, `@`) are neutralized during ingestion.
- **Multi-Supplier Comparison:** `compareSupplierQuotations` groups multiple quotations by SKU and displays side-by-side variance without auto-selecting a winning supplier.

---

## 5. Cost Baseline & BOM Safeguards Baseline

The application enforces the following architectural safeguards:
1. **Missing Cost Semantics:** Missing supplier costs are stored as `null`, never as zero (`0`).
2. **Retail Price Integrity:** Commercial retail selling prices (`price_ngn`) are never substituted for supplier acquisition costs.
3. **BOM Completeness Guard:** Any BOM containing one or more components with `unit_cost_ngn: null` is classified as `incomplete` (`is_costing_complete: false`), and gross margin calculations are strictly disabled.
4. **Approval Block:** Incomplete BOMs strictly reject formal approval (HTTP 400 `BOM_INCOMPLETE`).
5. **Dual-Authorization:** Stage 8.4.1 dual authorization (Step 1 Finance Review + Step 2 Distinct Superadmin Approval) remains enforced for all BOM approval operations.
6. **Zero Cost Application on Intake:** Ingesting or comparing supplier quotations creates only `analysed` imports. Under no circumstances does quotation intake activate catalog supplier costs.

---

## 6. Genuine Quotation Readiness & Missing Evidence Gap

### 6.1 Readiness Summary
The technical infrastructure, database schemas, intake gateways, validation algorithms, date parsers, multi-supplier comparison matrices, and security controls are **100% operational, fully tested, and ready to ingest supplier quotations**.

### 6.2 Missing Evidence Identified
As of October 26, 2026:
- **0 supplier quotation files** have been received from commercial distributors.
- **48 of 48 commercial products** are missing genuine supplier acquisition quotes.
- The procurement and commercial operations teams must obtain authentic, dated, NGN-denominated quotation spreadsheets or CSVs from certified Tier-1 distributors for:
  1. **Solar Panels:** Jinko Solar, Canadian Solar, JA Solar, Longi Solar, Trina Solar, Felicity Solar, Luminous.
  2. **Inverters:** Growatt, Deye, Victron Energy, SRNE, Sungrow, Luminous, PRAG, Felicity Solar.
  3. **Batteries:** Pylontech, Felicity Solar, Hithium, Deye, Luminous, Growatt.
  4. **Balance of System / Accessories:** Solar Mount, MC4, Schneider Electric, TOMZN, SUNTREE.
  5. **Portable Power Stations:** EcoFlow, itel, ColaSolar.

---

## 7. Baseline Audit Certification

| Metric | Pre-Test Baseline | Current Status | Verification State |
| :--- | :---: | :---: | :--- |
| **Total Products** | 118 | 118 | Invariant |
| **Active Commercial Products** | 48 | 48 | Invariant |
| **Archived Benchmark Products** | 70 | 70 | Invariant |
| **Commercial Products with Supplier Cost** | 0 | 0 | Invariant (0 active costs) |
| **Orders** | 412 | 412 | Invariant |
| **Customers** | 310 | 310 | Invariant |
| **Quotes** | 182 | 182 | Invariant |
| **Enquiries** | 147 | 147 | Invariant |
| **Production Deployments** | 0 | 0 | Confirmed 0 deployments |
| **Stage 8.5 Status** | Unstarted | Unstarted | Confirmed untouched |

**Baseline Status:** **VERIFIED & CERTIFIED**
