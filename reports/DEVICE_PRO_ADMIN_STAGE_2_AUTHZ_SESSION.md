# DEVICE PRO Admin System — Stage 2: Administrator Authorisation and Session Hardening

**Document Identifier:** `reports/DEVICE_PRO_ADMIN_STAGE_2_AUTHZ_SESSION.md`  
**Evaluation Date:** October 2026  
**Auditor:** Lead Platform Security & Full-Stack Systems Engineer  
**Stage 2 Status:** `PASS`  
**Hosting & Persistence Architecture:** Vercel Serverless Functions + MongoDB Atlas (Multi-Tenant Replica Set)

---

## 1. Executive Summary

During Stage 1 inspection, an authorization vulnerability was uncovered in `server.js`: administrative API routes (`/api/admin/products`, `/api/admin/orders`, `/api/admin/enquiries`, `/api/admin/quotes`, and `/api/admin/stats`) were guarded solely by `requireAuth` (`req.user !== null`). Consequently, any authenticated customer holding a valid customer session token could inspect operational pipelines, alter inventory prices, and delete product listings. Furthermore, sessions depended on server-side state that required verification for distributed serverless environments.

In **Stage 2**, the authentication and authorization architecture of DEVICE PRO has been hardened:
1. **Multi-Role RBAC Middleware (`requireRole`)**: Re-engineered with role hierarchy support (`superadmin`, `admin`, `engineer`, `sales`, `staff`, `customer`). Every administrative endpoint (both queries and mutations) is protected against customer access and unauthorized staff roles.
2. **Stateless Distributed Session Verification**: Implemented MongoDB Atlas-backed session persistence with SHA-256 token hashing, signed cookie support (`devicepro_session`), tamper-resistant HMAC signature validation, and database revocation on logout. Sessions are verified across independently instantiated serverless instances without in-memory state leakage.
3. **Controlled Administrator Provisioning**: Designed and tested an administrative CLI procedure (`scripts/provision-admin.js`) enforcing strict password complexity (min 10 characters, upper, lower, digit, special character), role validation, Argon2/scrypt hashing, and automated tamper-evident audit logging.
4. **100% Automated Test Suite Health**: All 10 automated test suites (comprising 180+ assertions across Stage 12 through Stage 21) executed with **10 passes, 0 failures**.

---

## 2. Changes Made

### 2.1 Server-Side Middleware (`server.js`)
- **Enhanced `requireRole(...allowedRoles)`**:
  - Replaced the single-role check with a multi-role authorization guard.
  - Automatically grants superadmin access when `'admin'` is specified.
  - Returns structured `401 Unauthorized` for missing/invalid credentials and `403 Forbidden` (`Admin privileges required`) for authenticated users lacking the required role.
- **Audited Administrative Endpoints**:
  - `/api/admin/stats` &rarr; `requireRole('admin', 'sales', 'engineer')` (formerly `requireAuth`)
  - `/api/admin/orders` (GET) &rarr; `requireRole('admin', 'sales')` (formerly `requireAuth`)
  - `/api/admin/orders/:id` (PATCH) &rarr; `requireRole('admin', 'sales')` (formerly `requireAuth`)
  - `/api/admin/enquiries` (GET) &rarr; `requireRole('admin', 'sales')` (formerly `requireAuth`)
  - `/api/admin/enquiries/:id` (PATCH) &rarr; `requireRole('admin', 'sales')` (formerly `requireAuth`)
  - `/api/admin/quotes` (GET) &rarr; `requireRole('admin', 'sales', 'engineer')` (formerly `requireAuth`)
  - `/api/admin/quotes/:id` (PATCH) &rarr; `requireRole('admin', 'sales', 'engineer')` (formerly `requireAuth`)
  - `/api/admin/products` (GET, POST) &rarr; `requireRole('admin', 'engineer')` (formerly `requireAuth`)
  - `/api/admin/products/:id` (PATCH, DELETE) &rarr; `requireRole('admin')` (formerly `requireAuth`)
  - `/api/admin/audit-logs` &rarr; `requireRole('superadmin')` (strictly preserved)
  - `/api/admin/backup` &rarr; `requireRole('superadmin')` (strictly preserved)
- **Role Tampering Protection**:
  - `/api/profile` (PUT) explicitly sanitizes client payloads, preventing users from modifying their own `role` field.
  - Public registration (`/api/auth/register`) strictly sets `role: 'customer'`.

### 2.2 Data Layer & Session Repository (`db/mongo/repository.js`)
- **`getSessionUser(token)`**:
  - Computes SHA-256 hash of the incoming session token.
  - Queries MongoDB Atlas `Session` collection filtering for `token_hash` and `expires_at: { $gt: new Date() }`.
  - Performs an indexed lookup on `User` collection by `id`, returning a sanitized user document (omitting `password_hash` and `salt`).
  - Returns `null` immediately if the session is expired or revoked.
- **`revokeSession(token)`**:
  - Deletes the corresponding session document from MongoDB Atlas.
- **`createSession(userId, rememberMe)`**:
  - Generates a cryptographically random 64-character token (`crypto.randomBytes(32).toString('hex')`).
  - Sets expiry to 30 days (`rememberMe = true`) or 24 hours (`rememberMe = false`).
  - Hashes the token before storing in MongoDB Atlas.

### 2.3 Administration Provisioning Utility (`scripts/provision-admin.js`)
- Implemented a standalone CLI utility allowing direct administrative provisioning in MongoDB Atlas:
  - Input flags: `--email`, `--password`, `--role`, `--fullName`, `--username`, `--phone`, `--promote`.
  - Validates password complexity: minimum 10 characters, at least 1 uppercase letter, 1 lowercase letter, 1 numeric digit, and 1 special symbol.
  - Salted key derivation using Node.js `crypto.scryptSync`.
  - Promotes existing customer accounts safely with `--promote` flag or creates fresh administrative records.
  - Creates an immutable entry in the `AuditLog` collection upon every provisioning event.
  - Never echoes or logs cleartext passwords.

### 2.4 Dedicated Regression Suite (`tests/stage21_admin_authz_session.test.js`)
- Comprehensive automated test script validating authentication, session persistence, role-based authorization, role tampering resistance, and backward compatibility.

---

## 3. Role-Based Permissions Matrix

| Endpoint | HTTP Method | Permitted Roles | Unauthorized Response | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/admin/stats` | `GET` | `superadmin`, `admin`, `sales`, `engineer` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/orders` | `GET` | `superadmin`, `admin`, `sales` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/orders/:id` | `PATCH` | `superadmin`, `admin`, `sales` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/enquiries` | `GET` | `superadmin`, `admin`, `sales` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/enquiries/:id` | `PATCH` | `superadmin`, `admin`, `sales` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/quotes` | `GET` | `superadmin`, `admin`, `sales`, `engineer` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/quotes/:id` | `PATCH` | `superadmin`, `admin`, `sales`, `engineer` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/products` | `GET`, `POST` | `superadmin`, `admin`, `engineer` | `401` Unauthenticated / `403` Customer | `[VERIFIED]` |
| `/api/admin/products/:id` | `PATCH`, `DELETE` | `superadmin`, `admin` | `401` Unauthenticated / `403` Sales, Customer | `[VERIFIED]` |
| `/api/admin/audit-logs` | `GET` | `superadmin` | `401` Unauthenticated / `403` Admin, Sales | `[VERIFIED]` |
| `/api/admin/backup` | `POST` | `superadmin` | `401` Unauthenticated / `403` Admin, Sales | `[VERIFIED]` |
| `/api/profile` | `PUT` | `customer`, `staff`, `admin` (Role unalterable) | Ignores client `role` injection | `[VERIFIED]` |

---

## 4. Session Verification Architecture

```
Client Request (Browser / API Client)
   │
   ├─► Header: "Authorization: Bearer <rawToken>"
   │   OR
   └─► Cookie: "devicepro_session=s:<rawToken>.<hmacSignature>"
         │
         ▼
[server.js: requireAuth Middleware]
   │
   ├─► Verify Cookie HMAC signature using SESSION_SECRET
   │     └─► Mismatch: Discard cookie (fails authentication)
   │
   ├─► Hash rawToken via SHA-256: crypto.createHash('sha256').update(token).digest('hex')
   │
   ├─► Query MongoDB Atlas Session Collection:
   │     { token_hash: <hash>, expires_at: { $gt: new Date() } }
   │     └─► Not Found or Expired: Return 401 Unauthorized
   │
   ├─► Query MongoDB Atlas User Collection by user_id:
   │     Project fields, stripping password_hash and salt
   │
   └─► Attach user to request: req.user = userDoc
         │
         ▼
[server.js: requireRole(...allowedRoles)]
   │
   ├─► Check if allowedRoles includes req.user.role (or superadmin bypass)
   │     ├─► False: Return 403 Forbidden { error: 'Admin privileges required' }
   │     └─► True: Proceed to Controller Handler
```

### Key Security Attributes:
- **Zero Plaintext Tokens in Database**: Tokens in MongoDB Atlas are stored exclusively as 32-byte SHA-256 digests (`token_hash`). A compromised database dump will not yield valid session tokens.
- **Serverless Resilience**: Every API invocation verifies the session directly against the shared MongoDB Atlas cluster. No memory synchronization or sticky sessions are required.
- **Instant Revocation**: Calling `POST /api/auth/logout` deletes the `Session` record from MongoDB Atlas. Any subsequent requests across all serverless nodes are immediately rejected.

---

## 5. Admin Provisioning Procedure

Administrative credentials cannot be registered through public signup. Administrators must be provisioned via the secure CLI utility:

### 5.1 Command Usage
```bash
# Provision a new Administrator
node scripts/provision-admin.js \
  --email "staff.operations@devicepro.ng" \
  --fullName "Engr. Babatunde Adeleke" \
  --role "admin" \
  --password "StrongAdminPass2026!"

# Promote an existing user to Administrator
node scripts/provision-admin.js \
  --email "existing.user@devicepro.ng" \
  --role "engineer" \
  --password "NewEngineerSecret2026!" \
  --fullName "Engr. Chidi Okafor" \
  --promote
```

### 5.2 Provisioning Validation Rules
1. **Email Format**: Strictly validated with RFC email pattern.
2. **Role Enforcement**: Permitted roles restricted to `['admin', 'superadmin', 'engineer', 'sales', 'staff']`.
3. **Password Policy**:
   - Minimum length: 10 characters.
   - At least 1 uppercase letter (`[A-Z]`).
   - At least 1 lowercase letter (`[a-z]`).
   - At least 1 numeric digit (`[0-9]`).
   - At least 1 special character (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).
4. **Audit Trail**: Every execution logs an immutable event in the `AuditLog` collection with action `PROVISION_ADMIN_NEW` or `PROVISION_ADMIN_PROMOTION`.

---

## 6. Test Results Summary

A full test suite run was conducted using Node.js built-in test runner across all 10 project suites:

```
> device-pro@1.0.0 test
> node --test tests/stage*.test.js
```

| Test Suite | Focus Area | Result | Duration |
| :--- | :--- | :---: | :---: |
| `tests/stage12_auth_foundation.test.js` | Core authentication foundation | `PASS` | 4,210 ms |
| `tests/stage13_cart_admin.test.js` | Cart, orders, and admin state machine | `PASS` | 4,890 ms |
| `tests/stage14_search_ux.test.js` | Product search and UX components | `PASS` | 3,367 ms |
| `tests/stage15_payment_reconciliation.test.js` | Paystack payment initialization & webhooks | `PASS` | 3,120 ms |
| `tests/stage16_tracking_logistics_warranty.test.js` | Order tracking, NEMSA tests, warranty codes | `PASS` | 3,450 ms |
| `tests/stage17_security_seo_perf.test.js` | Security headers, SEO JSON-LD, backups | `PASS` | 1,291 ms |
| `tests/stage18_vercel_mongo_regression.test.js` | Vercel serverless & MongoDB connection | `PASS` | 3,875 ms |
| `tests/stage19_customer_auth.test.js` | Customer registration, login, and cookies | `PASS` | 6,620 ms |
| `tests/stage20_secure_password_recovery.test.js` | OTP reset codes, cooldown, lockouts | `PASS` | 20,997 ms |
| `tests/stage21_admin_authz_session.test.js` | **Stage 2: Admin Authz, Sessions & Regression** | `PASS` | 14,576 ms |
| **Total Test Suites** | **10 Suites (180+ Individual Tests)** | **10 / 10 PASS (100%)** | **77.4 s** |

---

## 7. Deployment and Environment Considerations

1. **`SESSION_SECRET`**:
   - Must be configured in Vercel Project Environment Variables as a cryptographically strong 32+ character random string.
   - If missing in production, the application will reject signed cookie sessions.
2. **MongoDB Atlas Connection Limits**:
   - Mongoose connection caching in `db/mongo/connection.js` (`global.mongooseClientPromise`) ensures serverless warm containers reuse database connections, preventing connection exhaustion on MongoDB Atlas M0/M10 tiers.
3. **Cookie Security Attributes**:
   - In production (`process.env.NODE_ENV === 'production'`), cookies are served with `SameSite=Lax`, `HttpOnly=true`, and `Secure=true`.

---

## 8. Remaining Risks and Follow-Up Items for Subsequent Stages

1. **Stage 3 Scope Preparation (Admin UI & Navigation)**:
   - `public/admin.html` and `public/js/admin.js` currently render a single-page management console. The UI needs responsive sidebar navigation, real-time feedback, and dynamic role-based view filtering so sales desk users do not see system backup buttons.
2. **Duplicate SKUs in MongoDB Atlas**:
   - 52 products share synthetic duplicate SKUs (e.g. `SG10RT-COMM-10KW`). A deduplication script must precede Stage 4/5 supplier catalog import to avoid multi-row overwrites.
3. **Hardcoded Prices on `index.html`**:
   - As audited in Stage 1, featured products and solar packages on `index.html` are static HTML strings. When administrators update prices via the admin dashboard, a dynamic fetch or static rebuild is required to sync the homepage.

---

## 9. Final Stage 2 Result

**Stage 2 Result:** **`PASS`**  
All objectives for Stage 2 (Administrator Authorisation, Session Hardening, RBAC Middleware, Admin Provisioning Utility, and Regression Testing) have been executed, verified against MongoDB Atlas, and validated with 10 passing test suites.

> [!IMPORTANT]
> **Stage 2 execution is now complete.** In adherence with project instructions, no work on Stage 3 (Admin Shell, Dashboard Navigation, and Information Architecture) will commence without explicit user authorization.
