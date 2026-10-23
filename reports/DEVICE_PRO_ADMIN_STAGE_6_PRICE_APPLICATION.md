# DEVICE PRO — ADMIN STAGE 6 REPORT
## Supplier Price Review, Approval and Controlled Application

**Stage:** 6 (Admin Series) / Automated Suite Stage 25  
**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_6_PRICE_APPLICATION.md`  
**Date:** October 2026  
**Environment:** Node.js v26.4.0, Express 4.19.2, MongoDB Atlas (Replica Set Sharded Cluster), Mongoose 8.3.4  
**Status:** ✅ Completed & Awaiting Owner Review (Halted at Stage 6 Completion Gate)

---

### 1. Executive Summary

In accordance with the mandatory Stage 6 objectives, a secure, auditable, and controlled workflow has been implemented for reviewing, approving, and applying supplier price imports to the DEVICE PRO catalog.

The implementation strictly enforces the critical governance boundary:
1. **Analysing or reviewing an import never mutates catalog products.**
2. **Approval must be an explicit, authenticated action executed by an authorized administrator (`superadmin` or `admin`).**
3. **Application is restricted exclusively to explicitly approved rows.**
4. **Supplier costs represent internal purchasing costs (`cost_price_ngn`) and NEVER replace or modify customer retail selling prices (`price_ngn`).**
5. **Product stock quantities, specifications, publication status, active orders, quotations, and turnkey solar packages remain 100% untouched.**

The automated test suite (`tests/stage25_supplier_price_application.test.js`) executed all 40 requirements with a 100% pass rate (40 Passed, 0 Failed). Complete regression suites across Stages 20 through 24 also passed with 100% parity (161 total automated assertions passed, 0 failed). Zero production products were modified during testing, and no production deployment occurred.

---

### 2. Initial Baseline Verification

Prior to implementation, a thorough inspection of the active MongoDB Atlas cluster was performed and documented in `reports/DEVICE_PRO_ADMIN_STAGE_6_BASELINE.md`.

* **Total Product Documents:** 117
* **Active Products (`published: 1`):** 48
* **Archived Benchmark Products (`published: 0`):** 69 (including 65 legacy benchmark documents sharing SKU `SG-10K-HYBRID-NG` safely preserved in archived state)
* **Active Product Duplicate SKUs:** 0
* **MongoDB Atlas Transactions Supported:** Yes (`client.startSession()` supported via replica set)
* **Post-Testing Product Count:** 117 total products (48 active, 69 archived) — 100% identical to baseline, confirming zero production mutation.

---

### 3. Files Created and Modified

#### Files Created:
1. `reports/DEVICE_PRO_ADMIN_STAGE_6_BASELINE.md` — Baseline audit of catalog products, fields, transaction capabilities, and schema consistency.
2. `tests/stage25_supplier_price_application.test.js` — Focused 40-requirement test suite verifying review, approval, application, concurrency, recovery, and RBAC security.
3. `reports/DEVICE_PRO_ADMIN_STAGE_6_PRICE_APPLICATION.md` — Comprehensive Stage 6 engineering completion report.

#### Files Modified:
1. `db/mongo/models.js` — Extended `priceImportSchema` with new lifecycle status enums (`awaiting_approval`, `approved_for_application`, `applying`, `successfully_applied`, `partially_applied`, `failed`, `cancelled`), approval metadata, and row-level diff/variance/approval/application schema fields.
2. `lib/price-import-engine.js` — Implemented `preparePriceImportForReview()`, real-time diff calculations (`cost_diff_ngn`, `cost_diff_percent`), variance detection (`HIGH_VARIANCE_INCREASE`, `HIGH_VARIANCE_DECREASE`), and ineligible row marking.
3. `db/mongo/repository.js` — Implemented and exported `reviewPriceImport()`, `approvePriceImportRows()`, `applyPriceImport()`, and `cancelPriceImport()`. Implemented concurrency control via atomic status transitions, conflict safeguards, and row-level audit event dispatching.
4. `db/database.js` — Added Stage 6 methods to `skipSqlite` set and exported repository functions for dual-engine compatibility.
5. `server.js` — Added authenticated routes:
   - `GET /api/admin/price-imports/:id/review`
   - `POST /api/admin/price-imports/:id/approve`
   - `POST /api/admin/price-imports/:id/apply`
   - `POST /api/admin/price-imports/:id/cancel`
6. `public/admin.html` — Added the Stage 6 Supplier Price Review & Approval Console (`#price-import-review-modal`) and Application Confirmation Dialog (`#price-import-apply-confirm-modal`), and bumped cache buster to `v=3`.
7. `public/css/admin.css` — Added Stage 6 lifecycle badges, diff pills (`.diff-increase`, `.diff-decrease`), high-variance warning indicators, and review table styling.
8. `public/js/admin.js` — Built interactive review modal controller (`openImportReviewModal`), row selection management, high-variance acknowledgment gating, approval execution, confirmation modal handling, and table action button dispatching.
9. `DECISIONS.md` — Appended ADR-014 documenting the canonical supplier cost field resolution and controlled application architecture.
10. `PROJECT_PROGRESS.md` — Updated stage tracking log.

---

### 4. Canonical Supplier Cost Field Resolution

#### Architectural Finding:
An investigation of the repository revealed historical usage of both `cost_price_ngn` and `supplier_cost_ngn`.
* Mongoose `productSchema` defines `cost_price_ngn: { type: Number, min: 0 }`.
* Admin product creation and update routes in `db/mongo/repository.js` and `db/database.js` read and write `cost_price_ngn`.
* Product editing modal form in `public/admin.html` binds to `product-edit-cost` and persists as `cost_price_ngn`.
* Stage 4 catalog tests (`stage23_admin_products.test.js`) explicitly assert `cost_price_ngn`.

#### Resolution & Architectural Decision (ADR-014):
`cost_price_ngn` is officially designated as the **canonical supplier cost field** for DEVICE PRO.
1. All Stage 6 import applications write exclusively to `cost_price_ngn`.
2. For conservative backward compatibility, read operations continue using dual-fallback: `product.cost_price_ngn !== undefined ? product.cost_price_ngn : (product.supplier_cost_ngn || 0)`.
3. Retail selling price (`price_ngn`) remains strictly independent and isolated from supplier purchasing costs.

---

### 5. Import Status Transitions & Lifecycle Workflow

The import lifecycle enforces strict state machine transitions:

```
[ Upload & Analysis ]
         │
         ▼
     analysed
         │  (Admin clicks "Review & Approve" / GET /review)
         ▼
  awaiting_approval
         │  (Admin selects rows & clicks "Approve Selected" / POST /approve)
         ▼
approved_for_application ◄──────┐
         │                      │
         │  (Admin clicks "Apply Prices" / POST /apply)
         ▼                      │
     applying (Atomic Lock)     │
      ├── All rows applied ────► successfully_applied (Terminal)
      ├── Some rows failed ────► partially_applied ────┘ (Eligible for Recovery)
      └── All rows failed  ────► failed (Exception)

* Any state prior to 'successfully_applied' may transition to 'cancelled' via POST /cancel.
```

#### Transition Enforcement Rules:
1. An `analysed` import cannot be directly applied. It must enter `awaiting_approval` and have approved rows.
2. An import with status `successfully_applied` cannot be approved or applied again (returns HTTP 400).
3. A `cancelled` import cannot be approved or applied (returns HTTP 400).
4. An import in `applying` status cannot be concurrently modified (returns HTTP 409 Conflict).
5. Only valid, active products matched to single SKUs can be approved (`is_eligible_for_approval: true`).
6. Unmatched, duplicate, invalid, or archived product rows cannot be approved (returns HTTP 400).

---

### 6. Endpoint Specifications

#### 1. Open Import for Review
* **Route:** `GET /api/admin/price-imports/:id/review`
* **Access:** `requireAuth`, `requireRole('superadmin', 'admin')`
* **Behavior:**
  - Loads import record and current active catalog products (`published: 1`).
  - Re-evaluates matches and computes current cost, proposed cost, absolute diff (`cost_diff_ngn`), and percentage diff (`cost_diff_percent`).
  - Sets `variance_warning` (`HIGH_VARIANCE_INCREASE` / `HIGH_VARIANCE_DECREASE` if diff > 30%).
  - Sets `is_eligible_for_approval` and marks ineligible rows with `approval_status: 'ineligible'`.
  - Transitions import from `analysed` to `awaiting_approval`.
  - Returns complete preview rows and summary metrics.

#### 2. Explicit Row Approval
* **Route:** `POST /api/admin/price-imports/:id/approve`
* **Access:** `requireAuth`, `requireRole('superadmin', 'admin')`
* **Payload:** `{ approvedRowNumbers: [1, 2], acknowledgeHighVariance: boolean, notes: string }`
* **Behavior:**
  - Verifies import status is approvable (`awaiting_approval` or `approved_for_application`).
  - Validates that every selected row belongs to this import and is strictly eligible.
  - If any selected row has high variance (>30%), checks `acknowledgeHighVariance: true`. If false, rejects with HTTP 400 and `highVariance: true`.
  - Marks selected rows as `approval_status: 'approved'` and sets `approved_cost_ngn` to immutable normalized cost.
  - Transitions import status to `approved_for_application`.
  - Records `APPROVE_PRICE_IMPORT` audit event with actor attribution.

#### 3. Controlled Application
* **Route:** `POST /api/admin/price-imports/:id/apply`
* **Access:** `requireAuth`, `requireRole('superadmin', 'admin')`
* **Payload:** `{ rowIds?: number[] }` (optional subset; defaults to all pending approved rows)
* **Behavior:**
  - Performs atomic find-and-modify transition to `applying` to prevent concurrent executions.
  - Iterates through pending approved rows (`approval_status: 'approved'` and `application_status !== 'applied'`).
  - Revalidates catalog state for each row: confirms product exists, remains published (`published: 1`), and catalog SKU matches approved SKU.
  - Updates ONLY `cost_price_ngn` using `{ $set: { cost_price_ngn: newCost, updated_at: new Date() } }`.
  - Sets row `application_status: 'applied'`, `applied_at`, and `applied_previous_cost_ngn`.
  - Records `PRICE_IMPORT_APPLIED_ROW` audit log for each successful update.
  - Updates import status to `successfully_applied` (or `partially_applied` if any row failed).
  - Records `APPLY_PRICE_IMPORT` audit event.

#### 4. Import Cancellation
* **Route:** `POST /api/admin/price-imports/:id/cancel`
* **Access:** `requireAuth`, `requireRole('superadmin', 'admin')`
* **Payload:** `{ reason: string }`
* **Behavior:**
  - Verifies import is not already `successfully_applied`.
  - Sets status to `cancelled`, records `cancelled_by`, timestamp, and reason.
  - Records `CANCEL_PRICE_IMPORT` audit log.

---

### 7. Role and Permission Rules

| Role | Review Import (`GET /review`) | Approve Import (`POST /approve`) | Apply Import (`POST /apply`) | Cancel Import (`POST /cancel`) | Product Public API Visibility |
|---|---|---|---|---|---|
| **Anonymous Visitor** | 401 Unauthorized | 401 Unauthorized | 401 Unauthorized | 401 Unauthorized | Public products only (cost stripped) |
| **Customer** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | Public products only (cost stripped) |
| **Engineer** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | Technical specs only (cost stripped) |
| **Sales Desk** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | Selling prices only (cost stripped) |
| **Admin** | 200 OK | 200 OK | 200 OK | 200 OK | Full catalog & cost visibility |
| **Superadmin** | 200 OK | 200 OK | 200 OK | 200 OK | Full catalog & cost visibility |

---

### 8. Concurrency, Idempotency and Database Consistency

#### Concurrency Protection:
To eliminate race conditions when two administrators attempt to apply the same import simultaneously, an atomic database transition is executed using MongoDB's `findOneAndUpdate`:
```javascript
const importDoc = await PriceImport.findOneAndUpdate(
  {
    ...query,
    status: { $in: ['approved_for_application', 'partially_applied'] }
  },
  { $set: { status: 'applying' } },
  { returnDocument: 'after' }
);
```
If another process has already locked the import, `importDoc` is null, and the server checks the existing document status: if `status === 'applying'`, it returns HTTP 409 Conflict; if `status === 'successfully_applied'`, it returns HTTP 400.

#### Idempotency:
* Each import row maintains persistent lifecycle fields: `approval_status`, `approved_cost_ngn`, and `application_status`.
* Applying an import filters strictly for `r.approval_status === 'approved' && r.application_status !== 'applied'`.
* Retried or duplicate application requests will never reapply an already completed row.

#### Partial Failure and Safe Recovery:
If one row in an import encounters an error (e.g., referenced product was deleted or SKU was modified), the application process:
1. Records the specific failure reason in `row.application_error` and marks `row.application_status = 'failed'`.
2. Continues processing the remaining approved rows without rolling back unrelated successful changes.
3. Sets import lifecycle status to `partially_applied`.
4. Allows administrators to review the error and re-trigger application. On retry, previously successful rows are skipped and only pending/failed rows are processed.

---

### 9. Supplier Cost Versus Retail Selling Price Separation

Throughout review, approval, application, and public store browsing, purchasing costs and retail selling prices remain strictly segregated:
* **Supplier Cost Field:** `cost_price_ngn` (internal purchasing cost).
* **Customer Selling Price Field:** `price_ngn` (authoritative retail price displayed to customers and calculated during checkout).
* **Guaranteed Invariance:** `applyPriceImport` executes an explicit `$set` targeting ONLY `cost_price_ngn` and `updated_at`. `price_ngn`, promotional discounts, inventory stock levels (`stock_quantity`), descriptions, and publication status (`published`) are untouched.
* **Customer Data Privacy:** `GET /api/products` and `GET /api/products/:slug` strip `cost_price_ngn` and `supplier_cost_ngn` before dispatching public payloads.

---

### 10. Tamper-Evident Audit Trail

All critical Stage 6 operations emit structured audit logs to the persistent `AuditLog` collection in MongoDB Atlas:
1. `ANALYSE_PRICE_IMPORT` — Recorded upon file parsing and analysis.
2. `APPROVE_PRICE_IMPORT` — Captures import ID, approved row count, approving admin credentials, notes, and variance acknowledgments.
3. `PRICE_IMPORT_APPLIED_ROW` — Captures product ID, SKU, previous supplier cost, approved new cost, and explicit confirmation that retail selling price remained unchanged.
4. `APPLY_PRICE_IMPORT` — Captures import ID, total applied count, failed count, final status, and staff attribution.
5. `CANCEL_PRICE_IMPORT` — Captures import ID, staff identifier, and administrator cancellation reason.

Audit logs cannot be modified or deleted via ordinary administrative endpoints.

---

### 11. Spreadsheet and Input Safety Verification

1. **Cell Content Sanitization:** Untrusted cell contents from CSV and XLSX files are normalized into numbers and sanitized strings. Formulas (`=`, `@`, `+`, `-`) are never evaluated by the server.
2. **XSS Protection:** All strings rendered in the review modal (`r.raw_name`, `r.raw_sku`, `r.matched_product_sku`) pass through `escapeHtml()` before DOM insertion.
3. **Data Boundary:** Non-numeric prices, negative values, and non-NGN currency codes are identified during analysis and marked ineligible for approval.

---

### 12. Automated Test Suite Execution Results

#### Focused Stage 6 Test Suite: `tests/stage25_supplier_price_application.test.js`
All 40 requirements were verified using isolated test products (`STG6-TEST-...`) and test imports (`STAGE25-TEST-...`). Real production catalog products were never modified.

```
========================================================================
DEVICE PRO — STAGE 25: SUPPLIER PRICE REVIEW, APPROVAL & APPLICATION
========================================================================

--- 1. Review Workflow & Baseline Protection ---
  ✓ PASS: Requirement 1: An analysed import can be opened for review
  ✓ PASS: Requirement 2: Current and proposed supplier costs are displayed correctly
  ✓ PASS: Requirement 3: Absolute and percentage differences are calculated correctly
  ✓ PASS: Requirement 4: Currency is displayed correctly (NGN)
  ✓ PASS: Requirement 5: Invalid rows are clearly identified as ineligible for approval
  ✓ PASS: Requirement 6: Unmatched SKUs cannot be approved
  ✓ PASS: Requirement 7: Duplicate mappings cannot be applied / approved
  ✓ PASS: Requirement 8: Archived products are strictly excluded from approval eligibility
  ✓ PASS: Requirement 9: Review alone does not mutate products
  ✓ PASS: Requirement 10: Retail selling prices remain unchanged during review

--- 2. Explicit Approval Controls & Authorization ---
  ✓ PASS: Requirement 11: An unauthenticated user cannot approve an import (401)
  ✓ PASS: Requirement 12: A customer cannot approve an import (403)
  ✓ PASS: Requirement 13: Unauthorized staff (Engineer & Sales) cannot approve an import (403)
  ✓ PASS: Requirement 14: An authorized administrator can approve eligible selected rows
  ✓ PASS: Requirement 15: Unselected rows remain unapproved
  ✓ PASS: Requirement 16: Invalid rows cannot be approved (400)
  ✓ PASS: Requirement 17: Unsupported currencies cannot be approved (400)
  ✓ PASS: Requirement 18: High variance warnings (>30%) require configured acknowledgement
  ✓ PASS: Requirement 19: A row from another import cannot be approved (400)
  ✓ PASS: Requirement 20: Stored approved values are immutable and protected against payload manipulation
  ✓ PASS: Requirement 21: Approval is recorded in the audit trail (APPROVE_PRICE_IMPORT)
  ✓ PASS: Requirement 22: Repeated approval requests behave safely

--- 3. Controlled Application, Consistency & Concurrency ---
  ✓ PASS: Requirement 23: Application is rejected before approval (400)
  ✓ PASS: Requirement 24: Only approved rows are applied
  ✓ PASS: Requirement 25: Unselected rows remain unchanged
  ✓ PASS: Requirement 26: Supplier costs change to the approved values (cost_price_ngn updated)
  ✓ PASS: Requirement 27: Retail selling prices remain strictly unchanged (price_ngn untouched)
  ✓ PASS: Requirement 28: Stock quantities remain strictly unchanged
  ✓ PASS: Requirement 29: Archived products cannot be modified during application
  ✓ PASS: Requirement 30: Products with changed SKUs or stale values are protected from blind overwrites
  ✓ PASS: Requirement 31: Deleted products are handled safely as application errors without crashing
  ✓ PASS: Requirement 32: Duplicate application requests do not apply a row twice
  ✓ PASS: Requirement 33: Concurrent application requests cannot apply the same import twice (409)
  ✓ PASS: Requirement 34: Interrupted / partially applied import can be recovered safely
  ✓ PASS: Requirement 35: Partial failures are represented accurately with detailed error reasons
  ✓ PASS: Requirement 36: Successful rows are not reapplied during recovery
  ✓ PASS: Requirement 37: Audit records capture previous and new supplier costs (PRICE_IMPORT_APPLIED_ROW)
  ✓ PASS: Requirement 38: Unsupported currency and invalid numeric values are rejected
  ✓ PASS: Requirement 39: Customers cannot read or invoke review, approval, or application endpoints
  ✓ PASS: Requirement 40: Existing product APIs continue to protect supplier cost fields from public exposure

========================================================================
STAGE 25 SUMMARY: 40 Passed, 0 Failed
========================================================================
```

#### Full System Regression & Final Verification Suite Results:
* **Stage 25 Security Verification Suite (`stage25_security_verification.test.js`):** 21/21 Passed (0 Failed)
* **Stage 25 Focused Review & Application Suite (`stage25_supplier_price_application.test.js`):** 40/40 Passed (0 Failed)
* **Stage 24 Supplier Price Import Infrastructure (`stage24_supplier_price_import.test.js`):** 34/34 Passed (0 Failed)
* **Stage 23 Products Management & Catalog Operations (`stage23_admin_products.test.js`):** 23/23 Passed (0 Failed)
* **Stage 22 Admin Shell & Navigation (`stage22_admin_shell.test.js`):** 26/26 Passed (0 Failed)
* **Stage 21 Admin Authorization & Sessions (`stage21_admin_authz_session.test.js`):** 19/19 Passed (0 Failed)
* **Stage 20 Secure Password Recovery (`stage20_secure_password_recovery.test.js`):** 19/19 Passed (0 Failed)
* **Cumulative Pass Count:** **182 Passed, 0 Failed (100% across all 7 test suites)**. Zero regressions detected.

---

### 13. Final Independent Security Audit & Verification

An independent security and safety verification audit was completed and documented in [`reports/DEVICE_PRO_ADMIN_STAGE_6_FINAL_VERIFICATION.md`](file:///c:/Users/USER/Desktop/DEVICE%20PRO/reports/DEVICE_PRO_ADMIN_STAGE_6_FINAL_VERIFICATION.md).
Key audit outcomes:
1. **Database Isolation Guard:** `assertTestEnvironmentIsolated()` added to `db/mongo/connection.js`, preventing destructive test execution on production environments without exposing credentials.
2. **Crash Recovery & Concurrency:** Verified atomic lock acquisition (`409 Conflict` on concurrent collisions) and safe recovery of interrupted/stale locks without re-applying completed rows.
3. **Transaction Consistency:** Encapsulated product cost update, audit logging, and import row persistence within atomic MongoDB session transactions (`throwOnError: true`).
4. **Approval Integrity & Baseline Conflict Detection:** Permanently bound baseline cost at approval time (`approved_previous_cost_ngn`) and rejected stale approvals if active catalog costs changed in the interim.
5. **Audit Metadata:** Extended `AuditLog` schema with structured `metadata` capturing row IDs, previous/new costs, currency, and staff actor attribution.
6. **Cancellation Guards:** Added strict state checks preventing cancellation of in-progress applications (`409`) or already cancelled imports (`400`).

---

### 14. Manual Verification Instructions (Safe Testing Environment)

To manually verify the Stage 6 review and application interface:
1. Ensure the web server is running locally:
   ```bash
   node server.js
   ```
2. Navigate in browser to `http://localhost:3000/admin`.
3. Sign in as Superadmin (`admin` / `Admin@DevicePro2026!`).
4. Select **"Supplier Price Imports"** from the sidebar navigation.
5. Upload a sample supplier price file (`.xlsx` or `.csv`) using the drag-and-drop area.
6. Verify analysis preview displays parsed rows, matching counts, and notice banner. Click **"Save Import Analysis"**.
7. In the **"Recent Supplier Import Analyses"** table, locate the saved import. The status badge displays `ANALYSED` with action button **"Review & Approve"**.
8. Click **"Review & Approve"**:
   - The wide Stage 6 Review Console modal opens (`#price-import-review-modal`).
   - Observe the KPI summary strip, estimated net cost shift indicator, and row diff pills.
   - Test row checkboxes: toggle individual rows, test "Select All Eligible", and "Deselect All".
   - Notice that unmatched, duplicate, and archived items have disabled checkboxes and `INELIGIBLE` badges.
   - If any selected row has >30% variance, notice the elevated variance warning checkbox container.
9. Click **"Approve Selected Rows"**:
   - Status updates to `APPROVED FOR APPLICATION`.
   - The action button in the footer changes to green **"Apply Approved Prices"**.
10. Click **"Apply Approved Prices"**:
    - The confirmation dialog appears (`#price-import-apply-confirm-modal`) displaying the exact count of products to be updated and the strict separation safeguard warning.
    - Click **"Execute Application →"**.
    - Observe application completion alert. Product costs (`cost_price_ngn`) update while retail selling prices (`price_ngn`) and stock remain unchanged.
11. Check **"Audit Logs"** (`/admin/audit-logs`) to verify tamper-evident logs for `APPROVE_PRICE_IMPORT`, `PRICE_IMPORT_APPLIED_ROW`, and `APPLY_PRICE_IMPORT`.

---

### 15. Governance Commitments & Mandatory Boundary Compliance

* **No Production Deployment:** This implementation has been executed, tested, and validated locally against development and integration collections. No deployment to Vercel production has occurred.
* **No Mutation of Live Production Prices:** Zero real production product prices or supplier costs were modified to demonstrate functionality. All tests used isolated documents that were cleaned up upon test completion.
* **Catalog Count Invariance:** The database baseline remains verified at 117 products (48 active, 69 archived).
* **Stage 7 Gate:** Development has stopped. No Stage 7 work has commenced.

---

### 16. Final Recommendation

Stage 6 (Supplier Price Review, Approval and Controlled Application) is fully operational, thoroughly tested, hardened against concurrency, crash, and tampering failure modes, and formally recommended for owner approval.

**Status:** STOPPED. Awaiting project owner's explicit approval before proceeding to Stage 7.

