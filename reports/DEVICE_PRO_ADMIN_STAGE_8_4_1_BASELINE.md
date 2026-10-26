# DEVICE PRO ADMIN SYSTEM
## STAGE 8.4.1 BASELINE AUDIT REPORT
### Dual-Authorization Inspection for Solar Package BOM Approval

**Date:** 2026-10-26  
**Auditor:** Senior Full Stack Engineer, Database Architect, Security Engineer & QA Lead  
**Scope:** Initial inspection of codebase prior to Stage 8.4.1 implementation  
**Deliverable Path:** `reports/DEVICE_PRO_ADMIN_STAGE_8_4_1_BASELINE.md`

---

### 1. Executive Summary & Objective

In Stage 8.4, DEVICE PRO implemented an administrator-controlled Bill of Materials (BOM) management subsystem for turnkey solar packages (`PackageBom`), providing version-controlled component line item tracking, integer arithmetic, catalog linking with immutable snapshots, and strict missing-cost safeguards.

During the Stage 8.4 owner review, **Decision 3 (OD-8.4.3)** established a mandatory **dual-authorization policy** for BOM approvals:
1. A finance-authorized user reviews the BOM and its documented cost sources.
2. A distinct superadmin provides final approval.
3. The system captures both reviewer and approver identities (stable user ID and email), timestamps, and audit events.
4. The same user cannot perform both steps (even if they possess both roles).
5. Incomplete costing strictly blocks positive review and final approval.

Our prior closure audit noted that the existing code in Stage 8.4 only enforced a **single-step Superadmin approval** (`requireRole('superadmin')`), leaving dual authorization recorded as **pending implementation and owner verification** in [ADR-018](file:///c:/Users/USER/Desktop/DEVICE%20PRO/DECISIONS.md#L285-L335) and [PROJECT_PROGRESS.md](file:///c:/Users/USER/Desktop/DEVICE%20PRO/PROJECT_PROGRESS.md#L970-L1010).

This baseline audit inspects the existing codebase to verify the precise architectural baseline before any implementation changes are made.

---

### 2. Route & RBAC Inspection (`server.js`)

#### 2.1 Existing BOM Endpoints in `server.js`
- `GET /api/admin/solar-packages`: Lists turnkey packages with BOM summary. Protected by `requireAuth, requireRole('superadmin', 'admin', 'engineer')`.
- `GET /api/admin/solar-packages/:id/bom`: Retrieves package BOM, line items, and eligible catalog products. Protected by `requireAuth, requireRole('superadmin', 'admin', 'engineer')`.
- `POST /api/admin/solar-packages/:id/bom`: Saves a new BOM revision. Protected by `requireAuth, requireRole('superadmin', 'admin', 'engineer')`.
- `POST /api/admin/solar-packages/:id/bom/approve`: Single-step approval endpoint. Protected by `requireAuth, requireRole('superadmin')`.
- **Finding — Missing Review Route**: Currently, **no finance review route exists**. There is no `POST /api/admin/solar-packages/:id/bom/review` endpoint.

#### 2.2 Administrative Role Definitions & Middleware
- Global administrative roles array in `server.js` (line 220):
  ```javascript
  const ADMIN_ROLES = ['admin', 'superadmin', 'engineer', 'sales', 'staff'];
  ```
- Global `/api/admin` barrier (line 459):
  ```javascript
  app.use('/api/admin', requireAuth, (req, res, next) => {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: Insufficient administrative privileges.'
      });
    }
    next();
  });
  ```
- **Finding — Role Membership**:
  - `finance` is recognized in `DEVICE_PRO_ARCHITECTURE.md` §13.2 ("Finance or reconciliation staff") and referenced in `DECISIONS.md` (ADR-018), but has not yet been registered in `ADMIN_ROLES` or `ALLOWED_ADMIN_ROLES` in `scripts/provision-admin.js`.
  - Database census shows existing user accounts:
    - `customer`: 309
    - `engineer`: 1 (`engineer.babatunde`)
    - `sales`: 1 (`sales.chidi`)
    - `superadmin`: 1 (`admin`)
  - To support the finance review step, the role dictionary must recognize `finance` as an authorized administrative role under `ADMIN_ROLES` and `ADMIN_SECTION_PERMISSIONS['solar-packages']`.
  - Authorized finance review role must be explicitly checked using `requireRole('finance', 'superadmin')` or a dedicated finance permission, while ensuring the **two-person rule** strictly prohibits the same person from performing both review and approval.

---

### 3. Schema & Data Model Inspection (`db/mongo/models.js`)

#### 3.1 Current `packageBomSchema`
The schema currently contains:
- `bom_id`: String (e.g. `BOM-PKG-DP-PKG-5KVA`)
- `package_id`: Number (e.g. `24`)
- `package_sku`, `package_name`, `package_slug`
- `revision`: Number (default: 1)
- `status`: String enum `['draft', 'incomplete', 'ready_for_review', 'approved']`
- `currency`: String (default: `'NGN'`)
- `components`: Array of component line objects (with `line_id`, `quantity`, `unit`, `unit_cost_ngn`, `line_cost_ngn`, `cost_source`, `validation_status`, etc.)
- `non_product_costs`: Array of non-product lines (`labour_installation`, `logistics_transport`, etc.)
- `cost_summary`: Object (`is_costing_complete`, `missing_cost_lines_count`, `total_estimated_cost_ngn`, etc.)
- Single-step approval fields:
  - `approved_by_email`: String (default: `null`)
  - `approved_at`: Date (default: `null`)
- `history`: Array of historical snapshot objects storing prior revisions.

#### 3.2 Findings & Data Model Gaps
1. **No Finance Review Fields**: The current schema has no fields to record:
   - `finance_review.status`: `'pending' | 'reviewed' | 'rejected' | 'invalidated'`
   - `finance_review.reviewed_by_id`: Stable user ID
   - `finance_review.reviewed_by_email`: String
   - `finance_review.reviewed_at`: Date
   - `finance_review.decision`: `'approved' | 'rejected'`
   - `finance_review.notes`: String
   - `finance_review.revision_reviewed`: Number (the exact revision that was reviewed)
2. **Missing Approver User ID**: The current approval metadata records only `approved_by_email` and `approved_at`, but does not record the stable `approved_by_id` (User ID). Comparing user IDs is essential for the two-person rule (`approver_id !== reviewer_id`) to prevent bypasses where display emails or names match or differ.
3. **History Snapshots**: The embedded `history` array snapshots `revision`, `saved_at`, `saved_by_email`, `status`, `cost_summary`, `components_snapshot`, and `non_product_costs_snapshot`. It must be extended to preserve `finance_review_snapshot` so auditability of historical reviews is never erased.

---

### 4. Data Access Layer Inspection (`db/mongo/repository.js` & `db/database.js`)

#### 4.1 Existing BOM Functions
In `db/mongo/repository.js`:
- `getAdminSolarPackages()`: Aggregates packages with their active BOM summaries.
- `getPackageBom(packageId)`: Loads BOM, line items, cost summary, and eligible active catalog items (`published: 1`, excluding solar packages).
- `savePackageBomRevision(packageId, bomPayload, userContext, reqMeta)`:
  - Validates positive quantities, units, and waste percentages via `lib/bom-engine.js`.
  - Enforces optimistic concurrency (`payload.base_revision === existingBom.revision`).
  - Snapshots existing revision into `existingBom.history`.
  - Increments `revision = revision + 1`.
  - Sets `status` to `'draft'`, `'incomplete'`, or `'ready_for_review'`.
  - Emits `CREATE_BOM` or `UPDATE_BOM_REVISION` audit log.
- `approvePackageBom(packageId, userContext, approvalNotes, reqMeta)`:
  - Verifies package existence.
  - Verifies completeness (`bom.cost_summary.is_costing_complete === true`).
  - Snapshots prior state into `bom.history`.
  - Increments `revision`, sets `status = 'approved'`, records `approved_by_email = userContext.email`.
  - Emits `APPROVE_BOM` audit log.

#### 4.2 Gaps in DAL
1. No `reviewPackageBom(packageId, userContext, reviewData, reqMeta)` method exists.
2. In `savePackageBomRevision`: When an existing BOM is edited, any prior finance review must be invalidated because the new revision contains altered component or cost lines. Currently, there is no invalidation logic.
3. In `approvePackageBom`: The method currently checks only `cost_summary.is_costing_complete`. It does not check:
   - Whether finance review exists.
   - Whether finance review status is `'reviewed'` (or positive decision).
   - Whether the review was performed on the **exact current revision** (`finance_review.revision_reviewed === bom.revision`).
   - Whether `userContext.id !== bom.finance_review.reviewed_by_id` (the distinct user check).

---

### 5. Audit Logging & Failure Handling Inspection (`logAudit`)

#### 5.1 Audit Implementation in `db/mongo/repository.js`
Lines 1807–1831:
```javascript
async function logAudit({ userId = null, action, entityType, entityId = '', details = '', ipAddress = '', metadata = {}, session = null, throwOnError = false }) {
  try {
    const query = AuditLog.findOne().sort({ id: -1 }).select('id').lean();
    if (session) query.session(session);
    const maxDoc = await query;
    const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    const log = new AuditLog({
      id,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      metadata: metadata || {}
    });
    await log.save(session ? { session } : {});
    return log;
  } catch (e) {
    console.error('[AUDIT LOG MONGO ERROR]:', e.message);
    if (throwOnError || session) {
      throw e;
    }
  }
}
```

#### 5.2 Failure Behavior & Transaction Guarantees
- `logAudit` accepts `session` and `throwOnError`.
- When `throwOnError: true` or `session` is provided, any persistence error will rethrow.
- In `savePackageBomRevision` and `approvePackageBom`, `logAudit` is called with default `throwOnError: false` and without transactional rollback if audit fails.
- **Stage 8.4.1 Requirement**: A review or approval must **never falsely appear successful if its required audit record fails**.
- Implementation plan: Wrap review and approval mutations in a safe transactional execution pattern (leveraging `mongoose.startSession()` where supported, with rollback or pre-commit validation so that audit failures abort the operation and return HTTP 500).

---

### 6. Calculation & Completeness Engine (`lib/bom-engine.js`)

#### 6.1 Cost Completeness Rule
In `lib/bom-engine.js`:
- Components lacking verified costs have `unit_cost_ngn: null`, `line_cost_ngn: null`, `cost_source: 'unknown'`, and `validation_status: 'missing_cost'`.
- Missing costs are never defaulted to zero and never copied from retail prices (`price_ngn` / `previous_price_ngn`).
- `cost_summary.is_costing_complete` is strictly `true` only when `totalLinesCount > 0` and `missingCostCount === 0`.
- Gross margin analysis is strictly disabled (`marginAnalysis: null`) unless `is_costing_complete === true`.
- **Finding**: This engine logic is sound and will be reused directly for the finance review validation step.

---

### 7. Test Baseline Inspection (`tests/stage28_solar_package_bom.test.js`)

#### 7.1 Stage 28 Test Structure
- Captures pre-test database baselines (48 active commercial items, 70 archived benchmarks, 118 total products, orders, quotes, customers).
- Authenticates Superadmin (`admin`) and Lead Engineer (`engineer.babatunde`).
- Tests BOM lifecycle, quantity/unit validation, snapshotting, missing cost handling, concurrency (409), and single-step approval.
- 32/32 tests pass.
- **Finding for Stage 8.4.1**:
  - The existing Stage 28 test #4.6 tests single-step Superadmin approval.
  - To prevent regression while upgrading the approval contract, Stage 8.4.1 will introduce a dedicated test suite `tests/stage29_bom_dual_authorization.test.js` validating the full 2-step dual-authorization workflow.
  - In addition, existing Stage 28 tests must remain compatible or be updated to supply a valid finance review fixture if testing approval, ensuring backward compatibility.

---

### 8. Database Architecture & Backend Selection

- **Database Backend**: DEVICE PRO uses MongoDB Atlas (`devicepro` database) as the primary commercial and administrative store (`db/mongo/repository.js`).
- `db/database.js` uses a `dispatch()` wrapper that routes operations to `mongoRepo`.
- SQLite is retained only as an offline legacy fallback.
- Test suites run against the configured MongoDB Atlas test database using strict pre- and post-test invariance assertions to guarantee zero production data corruption.

---

### 9. Proposed Implementation Design for Stage 8.4.1

1. **Role Registration**:
   - Register `'finance'` in `ADMIN_ROLES` in `server.js` and `scripts/provision-admin.js`.
   - Update `ADMIN_SECTION_PERMISSIONS['solar-packages']` to include `'finance'` along with `'superadmin'`, `'admin'`, and `'engineer'`.
2. **Schema Extension (`db/mongo/models.js`)**:
   - Add `finance_review` subdocument to `packageBomSchema`:
     ```javascript
     finance_review: {
       status: { type: String, enum: ['pending', 'reviewed', 'rejected', 'invalidated'], default: 'pending', index: true },
       reviewed_by_id: { type: Number, default: null },
       reviewed_by_email: { type: String, default: null },
       reviewed_at: { type: Date, default: null },
       decision: { type: String, enum: ['approved', 'rejected', null], default: null },
       notes: { type: String, default: '' },
       revision_reviewed: { type: Number, default: null }
     }
     ```
   - Add `approved_by_id: { type: Number, default: null }` alongside `approved_by_email`.
   - Update `history` schema to include `finance_review_snapshot`.
3. **DAL Methods (`db/mongo/repository.js`)**:
   - Implement `reviewPackageBom(packageId, userContext, { decision, notes }, reqMeta)`:
     - Verify user has role `'finance'` or `'superadmin'`.
     - Verify BOM exists and is complete (`cost_summary.is_costing_complete === true`).
     - Reject if costs are missing.
     - Update `finance_review` fields.
     - Emit `REVIEW_BOM` or `REJECT_BOM_REVIEW` audit log with `throwOnError: true`.
   - Update `savePackageBomRevision`:
     - If BOM is edited, reset `finance_review.status = 'invalidated'` (or `'pending'`) for the new revision.
     - Snapshot previous finance review into history.
   - Update `approvePackageBom`:
     - Enforce `bom.finance_review && bom.finance_review.status === 'reviewed'` and `bom.finance_review.decision === 'approved'`.
     - Enforce `bom.finance_review.revision_reviewed === bom.revision` (exact revision match).
     - Enforce `userContext.id !== bom.finance_review.reviewed_by_id` (distinct user rule).
     - Enforce `userContext.role === 'superadmin'`.
     - Emit `APPROVE_BOM` audit log with `throwOnError: true`.
4. **API Endpoints (`server.js`)**:
   - `POST /api/admin/solar-packages/:id/bom/review`: Protected by `requireAuth, requireRole('finance', 'superadmin')`.
   - `POST /api/admin/solar-packages/:id/bom/approve`: Protected by `requireAuth, requireRole('superadmin')`.
5. **UI Updates (`public/admin.html`, `public/js/admin.js`, `public/css/admin.css`)**:
   - Add visual indicators for Finance Review status and Final Approval status.
   - Add `Review BOM (Finance)` button visible to finance/superadmin.
   - Add clear warning/blocker badges if same user attempts approval or if finance review is pending.

---

### 10. Conclusion & Gate Readiness

The initial audit confirms the exact architectural gaps and establishes the precise implementation plan. All checks are documented, and no database mutations or code changes have taken place during this audit.

**Status:** Initial inspection complete. Ready to proceed with Stage 8.4.1 implementation.
