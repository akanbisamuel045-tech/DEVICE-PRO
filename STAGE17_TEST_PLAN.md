# DEVICE PRO — Stage 17 Comprehensive Test Plan

**Document ID:** DP-STG17-TP-001  
**Project:** DEVICE PRO (Tier-1 Commercial & Residential Solar Energy Systems)  
**Lifecycle Stage:** Stage 17 — Comprehensive Testing, Security Audit, Debugging & Production Readiness  
**Target Environment:** Local Staging / Test Environment (`http://localhost:3000`)  
**Lead Auditor:** Senior QA, Application Security & Release Readiness Engineer  
**Date:** 2026-10-17  

---

## 1. Test Objectives & Scope

### 1.1 Objectives
The primary objective of this Stage 17 evaluation is to rigorously validate that the DEVICE PRO web platform is technically sound, secure, performant, accessible, and operationally reliable before advancing to Stage 18 (Production Launch).

### 1.2 In-Scope Features & Systems
1. **Public Web Experience:**
   - Universal Navigation, Breadcrumbs, Mobile Drawer, and Shared Footer.
   - 15 Public Core Pages (`/`, `/products`, `/product-detail`, `/packages`, `/solutions`, `/projects`, `/calculator`, `/savings-calculator`, `/about`, `/resources`, `/faq`, `/contact`, `/privacy-policy`, `/terms`, `/shipping-policy`).
2. **Product Catalogue & Search:**
   - Equipment catalogue loading, price formatting in Nigerian Naira (₦), category filtering, brand filtering, multi-keyword search, spotlight command palette (`/css/search.css`, `/js/search.js`), and inventory stock status.
3. **Commerce & Checkout:**
   - Universal Cart drawer (`/js/cart.js`), quantity updates, localStorage persistence, delivery fee calculations (Lagos ₦15,000 vs. Outside Lagos ₦35,000), and pro-forma invoice order generation.
4. **Payment Gateway Integration:**
   - Paystack Sandbox integration, transaction initialization, kobo currency conversion, server-side verification, duplicate payment prevention (idempotency), anti-fraud amount validation, HMAC-SHA512 webhook signature verification, and sandbox simulation interface.
5. **Engineering Calculators:**
   - Dual-mode sizing engine: Appliance-based load analysis, Peak Sunlight Hours (PSH) solar irradiance weighting (Lagos vs. Abuja vs. Kano), inverter kVA sizing, and lithium battery kWh capacity calculation.
   - Generator OPEX & Fuel Savings ROI Engine.
6. **Delivery, Logistics & After-Sales:**
   - Privacy-safe order tracking gate (requiring verified phone or email).
   - 6-Stage Engineering Stepper (Order Verification → Warehouse Staging → Cell Balancing → In Transit → Delivery & Ground Mounting → NEMSA Electrical Commissioning).
   - Digital Warranty Serial Registry and Rapid Swap SLA ticketing.
7. **Administrative & RBAC Operations:**
   - Staff authentication with salted scrypt password hashing and crypto session tokens.
   - Role-Based Access Control: `superadmin`, `lead_engineer`, and `sales_desk`.
   - Equipment catalog CRUD operations, status state transitions, and tamper-evident audit logging.
8. **Security, SEO & Performance:**
   - HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
   - Rate limiting on API routes.
   - Zero raw card storage compliance (NDPA 2023 & PCI-DSS).
   - Dynamic & static XML sitemap (75 URLs) and `robots.txt`.
   - Structured Data JSON-LD schemas.
   - Gzip compression, asset caching headers, and database WAL mode integrity.

### 1.3 Out-of-Scope / Exclusions
- **Live Payment Execution:** Real funds transfer is strictly prohibited. Testing uses synthetic Paystack sandbox mock endpoints and automated fixtures.
- **Destructive Production Tests:** No production customer accounts or orders exist in this environment; all tests run on synthetic test fixtures.
- **Denial-of-Service (DoS) Attacks:** Stress testing is conducted in controlled burst batches only to verify rate limiter boundaries without destabilizing local or shared resources.

---

## 2. Test Environment Specification

| Parameter | Value |
|-----------|-------|
| **Operating System** | Windows 11 Enterprise |
| **Node.js Runtime** | Node.js `v26.4.0` |
| **Package Manager** | npm `11.17.0` |
| **Web Framework** | Express `4.21.2` (with `compression 1.8.2`) |
| **Database Engine** | SQLite (via Node.js native `node:sqlite` `DatabaseSync`) |
| **Database File** | `data/products.db` (with automated timestamped backup to `data/backups/`) |
| **Application URL** | `http://localhost:3000` |
| **Paystack Mode** | Sandbox (`pk_test_...` / `sk_test_...` simulation) |
| **Test Concurrency** | `--test-concurrency=1` (Sequential execution to prevent SQLite lock contention) |

---

## 3. Test Roles & Synthetic Accounts

All tests utilize predefined synthetic staff accounts stored in the local SQLite database:

| Account Identifier | Role | Permissions | Test Coverage Focus |
|-------------------|------|-------------|---------------------|
| `superadmin@devicepro.ng` | `superadmin` | Unrestricted access (Catalog, Orders, Quotes, Tickets, Audit Logs, DB Backups) | Administrative authority, backup export, audit log inspection |
| `engineer@devicepro.ng` | `lead_engineer` | Technical management (Orders, Commissioning, Warranties, Quotes) | Technical sign-offs, NEMSA test records, warranty generation |
| `sales@devicepro.ng` | `sales_desk` | Commercial operations (Quotes, Enquiries, Order Creation) | Quote workflows, customer inquiry transitions, commercial processing |
| `unauthenticated` | None | Public guest | Public catalogue, calculators, tracking gate, cart, checkout |

---

## 4. Test Suites & Execution Matrix

### 4.1 Automated Test Execution Command
```bash
npm test
# Equivalent to: node --test --test-concurrency=1 tests/*.test.js
```

### 4.2 Test Suite Matrix

| Suite ID | File | Test Count | Focus Area |
|----------|------|------------|------------|
| **TS-01** | `tests/stage12_api.test.js` | 28 | Schema, Scrypt Auth, Sizing Engine, Generator ROI, REST Endpoints |
| **TS-02** | `tests/stage13_cart_admin.test.js` | 25 | Cart, Checkout, Order Creation, RBAC Permissions, Catalog CRUD, Audit Logs |
| **TS-03** | `tests/stage14_search_ux.test.js` | 29 | Multi-entity Search, Dynamic Indexing, Universal Page Script Compliance |
| **TS-04** | `tests/stage15_payment.test.js` | 13 | Paystack Sandbox, Idempotency, Anti-Fraud, HMAC-SHA512 Webhooks, Zero Card Storage |
| **TS-05** | `tests/stage16_delivery_support.test.js` | 14 | Privacy Tracking Gate, 6-Stage Stepper, NEMSA Sign-off, Warranties, Swap Tickets |
| **TS-06** | `tests/stage17_security_seo_perf.test.js` | 24 | XML Sitemap, Robots.txt, CSP/HSTS, Gzip, Asset Caching, WCAG Rules, JSON-LD |
| **Total** | **6 Suites** | **133** | **100% Comprehensive Coverage** |

---

## 5. Detailed Test Scenarios

### 5.1 Public Navigation & Page Routing
- **TC-NAV-01:** Verify direct HTTP 200 GET for all 15 core routes.
- **TC-NAV-02:** Verify 404 Not Found response for nonexistent paths (`/non-existent-page`) returning user-friendly HTML and structured status without exposing stack traces.
- **TC-NAV-03:** Verify mobile navigation drawer opens, traps focus, and dismisses on Escape and backdrop click.

### 5.2 Product Search & Catalogue
- **TC-CAT-01:** Verify `/api/products` returns full catalog with pagination, category filter, and brand filter.
- **TC-CAT-02:** Test keyword search for `"inverter"`, `"lithium"`, `"550w"`, `"Deye"`, and `"Felicity"`.
- **TC-CAT-03:** Test chained category and search parameters (`category=solar-panels&search=jinko`).
- **TC-CAT-04:** Verify prices format in Nigerian Naira (₦) with thousand separators.

### 5.3 Cart & Order Processing
- **TC-ORD-01:** Adding items updates universal cart in localStorage.
- **TC-ORD-02:** Calculate delivery fee dynamically (₦15,000 for Lagos; ₦35,000 for Outside Lagos).
- **TC-ORD-03:** POST `/api/orders` rejects empty cart or missing customer fields.
- **TC-ORD-04:** Server re-evaluates item prices from database, preventing client-side price tampering.

### 5.4 Payment Gateway & Reconciliation
- **TC-PAY-01:** POST `/api/payments/initialize` validates order number and initializes Paystack transaction in kobo (`amount * 100`).
- **TC-PAY-02:** GET `/api/payments/verify/:reference` updates order status to `PAID` upon successful provider verification.
- **TC-PAY-03:** Idempotency test: Verify repeated verification requests do not duplicate order or corrupt status.
- **TC-PAY-04:** Anti-fraud test: Reject verification if amount paid does not match order total (underpayment attack).
- **TC-PAY-05:** Anti-fraud test: Reject transactions processed in non-NGN currencies.
- **TC-PAY-06:** HMAC-SHA512 Webhook test: Accept valid cryptographic signature; reject invalid or spoofed signatures.

### 5.5 Engineering Calculators
- **TC-CALC-01:** Solar load calculation: Verify simultaneous watt demand, battery kWh capacity with DoD (Depth of Discharge) margins, and solar array kW sizing.
- **TC-CALC-02:** Regional solar irradiance: Compare Lagos (4.2 PSH) vs. Kano (5.8 PSH) to verify correct regional array sizing.
- **TC-CALC-03:** Generator ROI: Verify fuel consumption formulas against market diesel prices and calculate payback period accurately.

### 5.6 Privacy-Safe Tracking & Logistics
- **TC-TRK-01:** Privacy Gate: Reject order tracking lookups if phone number or email does not match order records.
- **TC-TRK-02:** 6-Stage Fulfillment Stepper: Verify tracking timeline returns all 6 engineering milestones.
- **TC-TRK-03:** Warranty Registry: Lookup equipment warranty by serial number or warranty code.

### 5.7 Staff Authentication & Access Control
- **TC-AUTH-01:** Login with correct credentials returns session token.
- **TC-AUTH-02:** Login with invalid credentials returns 401 Unauthorized with generic error message.
- **TC-AUTH-03:** Protected administrative endpoints reject unauthenticated requests.
- **TC-AUTH-04:** Non-superadmin accounts receive 403 Forbidden when attempting database backups or viewing audit logs.

### 5.8 Security, Performance, SEO & Accessibility
- **TC-SEC-01:** Verify HTTP headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`.
- **TC-SEC-02:** Verify zero credit card numbers, CVVs, or PINs are stored in the database.
- **TC-PERF-01:** Verify responses with `Accept-Encoding: gzip` are compressed.
- **TC-PERF-02:** Verify static CSS/JS files emit `Cache-Control: public, max-age=86400`.
- **TC-SEO-01:** Verify `/sitemap.xml` contains all 75 valid URLs.
- **TC-SEO-02:** Verify `/robots.txt` disallows private administrative and API routes.
- **TC-A11Y-01:** Verify presence of `.skip-to-content` link and `:focus-visible` outlines.

---

## 6. Success & Release Acceptance Criteria

1. **Gate A (Functional Integrity):** All 133 automated tests pass with 0 failures. All core customer journeys function reliably.
2. **Gate B (Security):** Zero Critical or High vulnerabilities. Rate limiting active, CSRF/CORS protections in place, zero raw card storage.
3. **Gate C (Data Integrity):** Database passes `PRAGMA integrity_check`. Automated backups functional.
4. **Gate D (Automated Tests):** 100% test pass rate with sequential runner execution.
5. **Gate E (Responsive Design):** 0px horizontal overflow across all tested viewports (320px to 1920px).
6. **Gate F (Accessibility):** WCAG 2.2 Level AA compliance for interactive elements, focus states, and contrast.
7. **Gate G (Performance):** TTFB < 50ms locally, Gzip compression enabled, static asset caching verified.
8. **Gate H (SEO & Content):** Sitemap, robots.txt, and JSON-LD schemas validated.
9. **Gate I (Recovery & Operations):** Backup generation verified; restore instructions documented.
10. **Gate J (Evidence & Documentation):** All 7 Stage 17 reports completed with verifiable execution data.
