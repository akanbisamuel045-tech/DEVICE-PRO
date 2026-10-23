# DEVICE PRO Admin System — Stage 5 Baseline Assessment
## Supplier Price Import Infrastructure

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_5_BASELINE.md`  
**Audit Date:** October 23, 2026  
**Auditor / Engineer:** Lead Platform Security & Systems Architect  
**Purpose:** Pre-implementation baseline assessment, catalog matching rules, deployment constraints, and test suite health record prior to executing Stage 5 (Supplier Price Import Infrastructure).  

---

## 1. Executive Summary & Purpose

Before implementing the supplier price import infrastructure, a comprehensive, read-only inspection of the repository, data models, catalog states, role hierarchy, upload constraints, and regression suites was conducted.

### Core Discoveries:
1. **Catalog State & Matching Rules**:
   - Total MongoDB Atlas product documents: **117**
   - **Active (Published) Products**: Exactly **48 products** (`published: 1`), representing the authentic commercial store catalog. Every active product has a unique, well-formed SKU.
   - **Archived / Inactive Records**: Exactly **69 products** (`published: 0`), including the 65 Sungrow benchmark documents sharing SKU `SG-10K-HYBRID-NG`.
   - **Matching Boundary**: In strict compliance with Stage 5 requirements, **only active products (`published: 1`) are eligible for automatic SKU matching**. Archived records (including the 65 Sungrow records) must never be matched or updated.
2. **Existing Product Schema**:
   - `id`, `name`, `slug`, `brand`, `category`, `category_label`, `sku`, `description`, `price_ngn`, `previous_price_ngn`, `cost_price_ngn`, `warranty_years`, `power_rating`, `power_tier`, `specifications`, `image_url`, `stock_status`, `stock_quantity`, `featured`, `published`, `created_at`, `updated_at`.
3. **Current Role Authorization & Sensitive Data**:
   - Supplier cost (`cost_price_ngn`) was established in Stage 4 as commercially confidential.
   - Only `superadmin` and `admin` roles have access to supplier costs and price import management.
   - `engineer`, `sales`, and `staff` roles must not be permitted to upload price lists or view supplier costs.
4. **Existing Import Functionality**:
   - Currently, `#panel-supplier-imports` (Panel 3) and `#panel-import-history` (Panel 13) in `public/admin.html` are placeholder cards.
   - No backend routes exist for file uploads or price list ingestion.
5. **Deployment & Runtime Constraints (Vercel Serverless & Node.js)**:
   - **Request Body Limit**: Vercel serverless functions enforce a 4.5MB request payload limit. Therefore, the maximum file upload size must be conservatively bounded to **4.0MB** (or 5.0MB for local Express execution).
   - **Execution Time**: Serverless invocation timeout is typically 10–15 seconds (free tier) or up to 60 seconds (pro tier). Row parsing and matching must be bounded (e.g., maximum **1,000 rows** per upload) to guarantee sub-second execution without event-loop blocking.
   - **Ephemeral Filesystem**: In serverless environments, local `/tmp` writes do not persist across requests. File parsing must be handled **in-memory** via buffered streams (`multer.memoryStorage()`) without creating orphan files on disk.
6. **Zero Live Mutation Rule**:
   - Stage 5 is strictly read-only with respect to live catalog prices, supplier costs, and stock quantities.
   - Saving an import creates a record in `import_history` with status `analysed` (never applied).
7. **Pre-Implementation Test Health**:
   - Executed full test suite (`npm test`): **12 test suites, 250+ assertions, 100% PASS (0 failures)**.

---

## 2. Product Catalog Baseline & SKU Integrity

A read-only audit of MongoDB Atlas (`devicepro` database) confirms the following distribution:

| Metric | Atlas Value | Notes |
| :--- | :---: | :--- |
| **Total Product Documents** | **117** | Total documents in `products` collection. |
| **Active Catalog (`published: 1`)** | **48** | Authentic commercial store catalog. |
| **Archived Records (`published: 0`)** | **69** | 65 Sungrow benchmark records + 4 archived test records. |
| **Distinct Active SKUs** | **48** | 100% unique SKUs across all active products. |
| **Active SKU Collisions** | **0** | No collisions in active store catalog. |
| **Archived Duplicate SKU** | `SG-10K-HYBRID-NG` | Shared by 65 inactive Sungrow benchmark records. |

### SKU Normalization Rules Established:
- Incoming supplier SKUs must be trimmed, stripped of non-printable ASCII characters, and converted to uppercase: `sku.trim().toUpperCase()`.
- Automatic matching requires an **exact normalized string equality** against an active product: `{ sku: normalizedSku, published: 1 }`.
- Under no circumstance will name-only similarity be accepted as an automated match.

---

## 3. Role Hierarchy & Access Control Matrix

| Role | Supplier Price List Upload | Inspect Supplier Cost Preview | View Import History | Modify Live Product Prices |
| :--- | :---: | :---: | :---: | :---: |
| **Superadmin** | ✓ Allowed | ✓ Allowed | ✓ Allowed | ❌ Strictly Prohibited in Stage 5 |
| **Admin** | ✓ Allowed | ✓ Allowed | ✓ Allowed | ❌ Strictly Prohibited in Stage 5 |
| **Lead Engineer** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ Strictly Prohibited in Stage 5 |
| **Sales Desk** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ Strictly Prohibited in Stage 5 |
| **Customer** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ Strictly Prohibited in Stage 5 |
| **Anonymous** | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ❌ 401 Unauthorized | ❌ Strictly Prohibited in Stage 5 |

---

## 4. Technical Architecture Plan for Stage 5

### 4.1 Dependency Selection:
- **`multer`**: Lightweight in-memory multipart upload parser (`multer.memoryStorage()`) bounded to 5MB, preventing disk writes and memory exhaustion.
- **`xlsx` (SheetJS)**: Fast, memory-bounded workbook parser supporting `.xlsx`, `.xls`, and CSV. Configured with:
  - `cellFormula: false` (Zero spreadsheet formula execution / CSV injection mitigation)
  - `cellHTML: false` (Prevents embedded HTML / XSS payloads)
  - `sheetRows: 1001` (Bounds parsing to 1,000 data rows + header)

### 4.2 Data Models (`db/mongo/models.js`):
- New Schema: `PriceImport` (collection: `price_imports`):
  - `import_id`: Unique reference (e.g. `IMP-20261023-XXXX`)
  - `original_filename`: Sanitized filename string
  - `file_format`: `'xlsx'` | `'xls'` | `'csv'`
  - `file_size_bytes`: Number
  - `uploaded_by`: ObjectId / User ID
  - `uploaded_by_name`: String
  - `uploaded_by_role`: String
  - `status`: `'analysed'` (fixed in Stage 5)
  - `mapping_config`: Object storing column mappings
  - `row_counts`: `{ total, valid, matched, unmatched, duplicateInFile, invalid, requiresReview }`
  - `rows_data`: Array of parsed & mapped row records (capped to max 1,000 rows)
  - `created_at`: Date
  - `updated_at`: Date

### 4.3 Proposed API Endpoints:
- `POST /api/admin/price-imports/upload`: Multi-format parser, auto-mapping, SKU matching, duplicate detection, and preview.
- `POST /api/admin/price-imports`: Saves the analysed import record to MongoDB Atlas.
- `GET /api/admin/price-imports`: Lists paginated import history.
- `GET /api/admin/price-imports/:id`: Retrieves complete analysed report and row-level details.
- `GET /api/admin/price-imports/template/:format`: Generates downloadable standardized import template (Excel & CSV).

### 4.4 Automated Testing Plan:
- Dedicated suite: `tests/stage24_supplier_price_import.test.js` covering all 34 requirements specified in Section 14.
