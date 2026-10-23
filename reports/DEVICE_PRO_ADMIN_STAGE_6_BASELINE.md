# DEVICE PRO Admin System — Stage 6 Baseline Assessment
## Supplier Price Review, Approval & Controlled Application

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_6_BASELINE.md`  
**Audit Date:** October 23, 2026  
**Auditor / Engineer:** Lead Platform Security & Systems Architect  
**Purpose:** Pre-implementation baseline assessment, canonical supplier cost field resolution, database health verification, lifecycle status model definition, and safety constraints prior to executing Stage 6 (Supplier Price Review, Approval, and Controlled Application).  

---

## 1. Executive Summary & Purpose

Before designing and implementing the Stage 6 review, approval, and controlled application workflow, an in-depth audit of the existing codebase, live MongoDB Atlas cluster, data models, API endpoints, role authorizations, and test suites was conducted.

### Core Discoveries:
1. **Catalog Integrity & Document Distribution**:
   - Total MongoDB Atlas product documents: **117**
   - **Active Products (`published: 1`)**: Exactly **48 products**, each with a verified unique SKU representing the authentic commercial store catalog.
   - **Archived / Inactive Records (`published: 0`)**: Exactly **69 documents**, of which all 69 share the benchmark SKU `SG-10K-HYBRID-NG`.
   - **Active SKU Collisions**: **0**. There are zero duplicate SKUs in the active store catalog.
   - **Archived SKU Collisions**: **1 SKU (`SG-10K-HYBRID-NG`)**, shared across all 69 inactive benchmark documents. Under no circumstance may any import row match or update these archived documents.
2. **Canonical Supplier Cost Field Resolution**:
   - Inspection of `db/mongo/models.js`, `db/mongo/repository.js`, `public/js/admin.js`, and `tests/stage23_admin_products.test.js` proves that **`cost_price_ngn` is the canonical database field** established in Stage 4 for tracking commercial purchase/supplier cost.
   - In MongoDB Atlas, products currently populated with cost values use `cost_price_ngn`. Zero products exist with `supplier_cost_ngn`.
   - In `lib/price-import-engine.js`, the row mapping checked `matchedProduct.supplier_cost_ngn || 0`, which caused current costs to display as `0` for products that store `cost_price_ngn`.
   - **Architectural Decision**: `cost_price_ngn` is formally designated as the canonical field on `Product`. For robust backward compatibility, the engine, repositories, and APIs will read both (`prod.cost_price_ngn ?? prod.supplier_cost_ngn ?? 0`) and populate `cost_price_ngn` as the primary persistent attribute.
3. **Strict Separation of Supplier Cost vs. Retail Selling Price**:
   - `price_ngn` represents the customer-facing retail selling price.
   - `cost_price_ngn` represents confidential business acquisition cost.
   - In checkout, cart, quotations, and public APIs (`/api/products`), order calculations rely strictly on `price_ngn`. Public endpoints strictly project out `cost_price_ngn`.
   - Applying an approved supplier cost must **only mutate `cost_price_ngn`** and must NEVER alter `price_ngn`, promotional pricing, stock quantity, or publication status.
4. **Transaction & Database Consistency Support**:
   - Verification script `scratch/test_transactions.js` confirmed that the live MongoDB Atlas shard replica set **supports multi-document ACID transactions** (`mongoose.startSession()`).
   - We will implement both multi-document transactions where appropriate and robust per-row idempotent atomic operations (`$set`, version/timestamp checks) to guarantee zero partial corruption or race conditions.
5. **Existing Import Lifecycle (Stage 5 Baseline)**:
   - Stage 5 created `PriceImport` with status strictly set to `analysed`.
   - Stage 6 must define and enforce the explicit lifecycle:
     `analysed → awaiting_approval → approved_for_application → applying → successfully_applied` (with exception states: `partially_applied`, `failed`, `cancelled`).
6. **Pre-Implementation Test Health**:
   - Stage 24 (Price Import Infrastructure): **34 / 34 PASSED (100%)**
   - Stage 23 (Product Management & Catalog Operations): **23 / 23 PASSED (100%)**
   - Stage 22 (Admin Shell & IA): **26 / 26 PASSED (100%)**
   - Stage 21 (Admin Authz & Sessions): **19 / 19 PASSED (100%)**
   - Stage 20 (Secure Password Recovery): **19 / 19 PASSED (100%)**
   - Total passing test assertions across all suites: **121 / 121 (0 failures)**.

---

## 2. Detailed Database & Catalog Baseline

A direct query against the MongoDB Atlas cluster (`devicepro` database) yielded the following metrics:

| Metric | Atlas Value | Notes |
| :--- | :---: | :--- |
| **Total Product Documents** | **117** | Total documents in `products` collection |
| **Active Catalog (`published: 1`)** | **48** | Authentic commercial store catalog |
| **Archived Documents (`published: 0`)** | **69** | 69 inactive benchmark documents |
| **Distinct Active SKUs** | **48** | 100% unique SKUs across active products |
| **Active SKU Duplicates** | **0** | Zero collisions in live active catalog |
| **Archived Duplicate SKU** | `SG-10K-HYBRID-NG` | Shared by 69 inactive benchmark records |
| **Products with `cost_price_ngn`** | **4** | Created/updated during Stage 4 verification |
| **Products with `supplier_cost_ngn`** | **0** | No documents utilize this legacy name |
| **Total `price_imports` Documents** | **0** | Clean baseline after Stage 5 test cleanup |
| **Total `audit_logs` Documents** | **1,925** | Full historical audit records intact |

---

## 3. Canonical Supplier Cost Field Resolution

### Inspection Findings:
1. **Mongoose Schema (`db/mongo/models.js:29`)**:
   ```javascript
   cost_price_ngn: { type: Number, default: 0 },
   ```
2. **Repository Functions (`db/mongo/repository.js`)**:
   - `createProduct`: validates and stores `cost_price_ngn`.
   - `updateProduct`: restricts and validates `updates.cost_price_ngn`.
   - `getProducts` / `getProductById`: projects out `{ cost_price_ngn: 0 }` for public/unauthorized roles; exposes `cost_price_ngn` only when `includeSupplierCost: true` (for `superadmin` and `admin`).
3. **Admin Dashboard (`public/js/admin.js`)**:
   - Edit product modal binds `document.getElementById('edit-prod-cost').value = prod.cost_price_ngn || ''`.
   - Saves updates via `payload.cost_price_ngn = Math.round(Number(costRaw))`.
4. **Automated Tests (`tests/stage23_admin_products.test.js`)**:
   - Reqs 6, 11, 15, 16 test `cost_price_ngn` access control and confidentiality.

### Decision & Backward Compatibility Strategy:
- **Canonical Field:** `cost_price_ngn` on `Product`.
- **Engine Adjustment:** Update `lib/price-import-engine.js` line 530 and line 613 to read:
  ```javascript
  matched_current_cost_ngn: matchedProduct ? (matchedProduct.cost_price_ngn ?? matchedProduct.supplier_cost_ngn ?? 0) : null
  ```
- **Application Logic:** When applying approved supplier cost updates, the server atomically updates `Product.updateOne({ id: productId }, { $set: { cost_price_ngn: approvedCost, updated_at: new Date() } })`.
- **API Responses:** In administrative product and import endpoints, return both `cost_price_ngn` and `supplier_cost_ngn` (as an alias) so any third-party or frontend component expecting either field operates seamlessly.

---

## 4. Controlled Import Workflow & State Machine

Stage 6 implements the following formal finite state machine for price imports:

```
[ Upload & Parse ]
        │
        ▼
   (analysed)
        │
        ▼  [POST /api/admin/price-imports/:id/review]
 (awaiting_approval)
        │
        ├────────────────────────────────┐
        ▼ [POST .../approve]             ▼ [POST .../cancel]
(approved_for_application)          (cancelled)
        │
        ▼ [POST .../apply]
    (applying)
        │
        ├────────────────────────┬────────────────────────┐
        ▼                        ▼                        ▼
(successfully_applied)   (partially_applied)           (failed)
```

### State Definitions & Enforced Constraints:
1. `analysed`: Initial parsed and mapped state created in Stage 5. No products have been evaluated for approval.
2. `awaiting_approval`: An administrator has opened the review panel and inspected rows. Summary diffs, cost increases/decreases, and threshold warnings are computed.
3. `approved_for_application`: Administrator has explicitly selected eligible rows, acknowledged any high variance warnings, and signed off with approval metadata (`approved_by`, `approved_at`, `approved_rows`).
4. `applying`: The system has locked the import record to prevent concurrent duplicate runs and is executing updates against the catalog.
5. `successfully_applied`: All approved rows were successfully applied to the canonical `cost_price_ngn` field in MongoDB.
6. `partially_applied`: Some approved rows succeeded while others failed (e.g., product deleted or SKU conflict detected at runtime). Failed rows retain descriptive failure reasons; successful rows are marked applied and will not be re-applied.
7. `failed`: Execution failed completely or critical pre-conditions were violated.
8. `cancelled`: Administrator manually cancelled the import prior to application.

**Rejection of Invalid Transitions:**
- Applying an `analysed` import is rejected with HTTP 400.
- Applying an unapproved import is rejected with HTTP 400.
- Re-applying a `successfully_applied` or `cancelled` import is rejected with HTTP 400.

---

## 5. Security & Risk Analysis

### A. Role Permissions Matrix

| Endpoint | Roles Allowed | Forbidden Roles | Behavior on Violation |
| :--- | :---: | :---: | :---: |
| `GET /api/admin/price-imports/:id/review` | `superadmin`, `admin` | `engineer`, `sales`, `customer`, unauth | 403 Forbidden / 401 Unauth |
| `POST /api/admin/price-imports/:id/approve` | `superadmin`, `admin` | `engineer`, `sales`, `customer`, unauth | 403 Forbidden / 401 Unauth |
| `POST /api/admin/price-imports/:id/apply` | `superadmin`, `admin` | `engineer`, `sales`, `customer`, unauth | 403 Forbidden / 401 Unauth |
| `POST /api/admin/price-imports/:id/cancel` | `superadmin`, `admin` | `engineer`, `sales`, `customer`, unauth | 403 Forbidden / 401 Unauth |

### B. High Cost Variance Thresholds
- High Variance Warning: **> 30% increase or decrease** in supplier cost.
- Severe Variance Warning: **> 100% increase or > 50% decrease**.
- Approval of rows with high variance requires an explicit client acknowledgement flag (`acknowledgeHighVariance: true`) in the request body. Requests without this acknowledgement return HTTP 400 detailing which rows exceeded the threshold.

### C. Concurrency & Idempotency Controls
1. **Atomic Status Locking:** Before starting application, the server performs an atomic find-and-modify:
   `PriceImport.findOneAndUpdate({ id: importId, status: 'approved_for_application' }, { $set: { status: 'applying' } })`.
   If another request is already processing the import, the query returns `null` and the second request is safely rejected with HTTP 409 Conflict.
2. **Row-Level Idempotency:** Each row inside `rows_preview` has a distinct `row_number` and `application_status` (`'pending'`, `'applied'`, `'failed'`, `'skipped'`).
   Once a row is marked `'applied'`, subsequent retries will skip it, preventing duplicate price updates or double audit logging.
3. **Immutable Approved Values:** The application endpoint reads the approved cost directly from the stored MongoDB `PriceImport` document (`approved_cost_ngn`). It never accepts proposed prices sent in the client HTTP body, completely neutralizing client-side price tampering.

---

## 6. Baseline Verification Commands & Health Status

The following test suites were executed to establish baseline integrity:
```bash
node tests/stage24_supplier_price_import.test.js    # 34 Passed, 0 Failed
node tests/stage23_admin_products.test.js            # 23 Passed, 0 Failed
node tests/stage22_admin_shell.test.js               # 26 Passed, 0 Failed
node tests/stage21_admin_authz_session.test.js       # 19 Passed, 0 Failed
node tests/stage20_secure_password_recovery.test.js  # 19 Passed, 0 Failed
```
**Total Passing Assertions:** 121  
**Total Failures:** 0  

---

## 7. Next Implementation Steps (Stage 6)

1. **Update Data Models (`db/mongo/models.js`)**:
   - Enhance `priceImportSchema` to store `status` with expanded enum: `['analysed', 'awaiting_approval', 'approved_for_application', 'applying', 'successfully_applied', 'partially_applied', 'failed', 'cancelled']`.
   - Add approval metadata fields: `approved_by`, `approved_by_email`, `approved_at`, `approved_row_count`.
   - Add application metadata fields: `applied_by`, `applied_by_email`, `applied_at`, `applied_row_count`, `failed_row_count`, `skipped_row_count`.
   - Enhance row schema with `current_cost_ngn`, `proposed_cost_ngn`, `approved_cost_ngn`, `cost_diff_ngn`, `cost_diff_percent`, `variance_warning`, `approval_status`, `application_status`, `application_error`, `applied_at`.
2. **Repository Layer (`db/mongo/repository.js` & `db/database.js`)**:
   - Add `reviewPriceImport(importId)`.
   - Add `approvePriceImportRows(importId, approvedRowNumbers, user, acknowledgeHighVariance)`.
   - Add `applyPriceImport(importId, user)`.
   - Add `cancelPriceImport(importId, user)`.
3. **Backend API Endpoints (`server.js`)**:
   - `GET /api/admin/price-imports/:id/review`
   - `POST /api/admin/price-imports/:id/approve`
   - `POST /api/admin/price-imports/:id/apply`
   - `POST /api/admin/price-imports/:id/cancel`
4. **Audit Trail**:
   - Record `SUBMIT_PRICE_IMPORT_REVIEW`, `APPROVE_PRICE_IMPORT`, `APPLY_PRICE_IMPORT`, `PRICE_IMPORT_APPLIED_ROW`, `PRICE_IMPORT_FAILED_ROW`, `CANCEL_PRICE_IMPORT`.
5. **Frontend Review & Approval Console (`public/admin.html`, `public/js/admin.js`, `public/css/admin.css`)**:
   - Integrate review & approval modal into Panel 3 and Panel 13.
   - Show row checkboxes, diff calculations, visual variance pills, select/deselect all, approval confirmation dialog, and application execution progress.
6. **Automated Test Suite (`tests/stage25_supplier_price_application.test.js`)**:
   - Verify all 40 requirements across Review, Approval, Application, Concurrency, and Regressions.
