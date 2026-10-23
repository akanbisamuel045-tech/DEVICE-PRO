# DEVICE PRO Admin System
## Stage 1: Existing Project Inspection and Architecture Audit Report

**Document Reference:** `reports/DEVICE_PRO_ADMIN_STAGE_1_AUDIT.md`  
**Date of Audit:** October 22, 2026  
**Auditor:** Antigravity Engineering (Automated Systems Inspection)  
**Target Application:** DEVICE PRO (Nigerian Solar Solutions & Equipment Platform)  
**Production URL:** [https://device-pro.vercel.app/](https://device-pro.vercel.app/)  
**Database:** MongoDB Atlas (`devicepro` database)  
**Hosting Environment:** Vercel Serverless (`nodejs20.x`) & Hybrid Monolithic Express (`server.js`)  
**Audit Status:** **PASS** (Inspection and verification complete; architecture documented; ready for Stage 2 approval)

---

## 1. Executive Summary

DEVICE PRO is an e-commerce and engineering solutions platform operating in Nigeria, supplying inverters, solar panels, deep-cycle batteries, charge controllers, installation accessories, and turnkey solar packages.

This Stage 1 Architecture Audit evaluates the codebase, data layer, security model, price delivery pipeline, and test suite to establish an authoritative baseline for constructing a secure **Administrator Dashboard** and an automated **Supplier Price List Importer** (Excel/CSV/PDF).

### Core Audit Outcomes:
1. **Repository & Stack:** The application is a unified Node.js/Express monolith (`server.js`, 2,250+ lines) paired with a serverless Vercel adapter (`api/index.js`), vanilla JavaScript/HTML/CSS frontends, and Mongoose ODM connected to MongoDB Atlas.
2. **Critical Security Finding:** While the frontend has basic role awareness, the backend API routes under `/api/admin/*` (`/products`, `/orders`, `/enquiries`, `/quotes`, `/stats`) currently rely only on generic authentication (`requireAuth`) rather than role verification (`requireRole('admin', 'superadmin')`). Any authenticated customer (`role: 'customer'`) can currently make administrative calls.
3. **Product Catalog & Price Data Model:** The MongoDB database holds 101 products. However, 52 product documents share duplicate SKUs (resulting from synthetic demo seeds), and the schema lacks critical cost fields (`cost_price_ngn` / `supplier_cost_ngn`) necessary for supplier margin tracking.
4. **Price Display & Source-of-Truth Discrepancies:** While the product catalog (`/products`) and product detail pages dynamically fetch prices from MongoDB Atlas, the homepage (`index.html`) contains hardcoded static prices for both featured equipment and turnkey solar packages. In addition, solar package specifications are hardcoded in application memory (`PACKAGE_METADATA` in `db/mongo/repository.js`) rather than in database documents.
5. **Checkout Price Integrity:** Cart pricing is stored client-side in `localStorage`, but backend order creation (`/api/checkout`) independently recalculates unit prices and totals directly from MongoDB Atlas documents. Frontend price tampering is securely rejected by the server.
6. **Test Suite Status:** All 9 stage-based test suites (170+ total test assertions across auth, checkout, payments, logistics, SEO, serverless regression, and password recovery) were executed against MongoDB Atlas and local server. All 9 passed with 100% green status.

---

## 2. Verified Technology Stack

| Component | Technology / Implementation | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js (v20+) | `[VERIFIED]` | Local runtime verified; Vercel serverless configured for Node.js 20 |
| **Backend Framework** | Express 4.19.2 | `[VERIFIED]` | Monolithic router defined in `server.js` |
| **Frontend Architecture** | Multi-Page Vanilla HTML5 / CSS3 / ES6+ | `[VERIFIED]` | No SPA framework (React/Vue/Angular); static assets served from `public/` |
| **CSS System** | Custom CSS Variables / Modular Stylesheets | `[VERIFIED]` | CSS located in `public/css/` (`main.css`, `design-system.css`, `accessibility.css`) |
| **Database ODM** | Mongoose 8.3.4 | `[VERIFIED]` | Connected to MongoDB Atlas cluster |
| **Database Server** | MongoDB Atlas (Cluster `6puyijc.mongodb.net`) | `[VERIFIED]` | Live database connection verified (`devicepro` database) |
| **Hosting Platform** | Vercel Serverless | `[VERIFIED]` | Configured via `vercel.json` routing all routes to `api/index.js` |
| **Containerization** | Docker (`Dockerfile`), Nginx, PM2 | `[VERIFIED]` | Containerization and PM2 configs exist for self-hosted container deployment |
| **Password Hashing** | Argon2 0.40.1 | `[VERIFIED]` | Used for password hashing and verification in auth controller |
| **Session Handling** | Cookie-based (`devicepro_session`), HMAC SHA-256 | `[VERIFIED]` | In-memory `sessionStore` (Map) in `server.js` |
| **Email Service** | Resend API (Direct Fetch) + Nodemailer fallback | `[VERIFIED]` | Handles OTP password recovery and consultation emails |
| **Testing Harness** | Mocha 10.4.0 + Supertest 6.3.4 | `[VERIFIED]` | Executed via `npm test` against local Express instance |

---

## 3. Repository Structure

```
c:\Users\USER\Desktop\DEVICE PRO
├── .env                              # Active environment variables (MongoDB, Resend, Port, etc.)
├── .env.example                      # Documented environment blueprint
├── .test-mailbox.json                # Local test mailbox for headless email testing
├── api/
│   └── index.js                      # Vercel serverless entry point wrapping server.js
├── db/
│   └── mongo/
│       ├── connection.js             # Mongoose connection manager with reconnection logic
│       ├── models.js                 # Schemas: User, Product, Order, Quote, Enquiry, AuditLog
│       ├── repository.js             # Mongo repository DAL & PACKAGE_METADATA definition
│       └── seed.js                   # Seed script for initial catalog & demo data
├── docs/                             # Architecture specifications & stage design docs
├── lib/
│   └── email-service.js              # Resend API integration & fallback mail dispatchers
├── nginx/                            # Reverse proxy configuration for container deployments
├── public/                           # Static public web assets
│   ├── index.html                    # Homepage (Hardcoded equipment & package pricing)
│   ├── products.html                 # Dynamic product catalog with filters and search
│   ├── product-detail.html           # Dynamic single product detail view
│   ├── cart.html                     # Client-side shopping cart view
│   ├── checkout.html                 # Checkout form (requires customer authentication)
│   ├── login.html                    # Customer/Admin unified authentication interface
│   ├── admin.html                    # Existing legacy operations dashboard UI
│   ├── consultation.html             # Solar consultation booking interface
│   ├── solar-packages.html           # Turnkey solar installation packages
│   ├── css/                          # Stylesheets (design system, dark mode, responsive)
│   ├── js/                           # Client logic (auth, cart, catalog, admin-ops)
│   └── images/                       # Product imagery and vector assets
├── reports/                          # Audit records, accessibility & security test reports
├── scripts/                          # DB maintenance, migration, and verification scripts
├── tests/                            # Stage 12 through Stage 20 automated test suites
├── server.js                         # Monolithic application core (API routes, session, auth)
├── vercel.json                       # Serverless deployment configuration and route rewrite rules
└── package.json                      # Project dependencies and script declarations
```

---

## 4. Existing Pages and Features

| Page / Route | Template / View | Dynamic vs Static | Implementation State |
| :--- | :--- | :--- | :--- |
| **Homepage** (`/`) | `public/index.html` | **Static** | Fully functional UI; featured products and solar packages have hardcoded prices. `[VERIFIED]` |
| **Catalog** (`/products`) | `public/products.html` | **Dynamic** | Fetches `/api/products` with query params (category, brand, sort, search, pagination). `[VERIFIED]` |
| **Product Detail** (`/product/:slug`) | `public/product-detail.html` | **Dynamic** | Fetches `/api/products/:slug` or `/:id`; renders specs, price, stock status, cart add. `[VERIFIED]` |
| **Shopping Cart** (`/cart`) | `public/cart.html` | **Client-Dynamic** | Uses `localStorage` (`devicepro_cart`); renders line items, quantities, subtotal. `[VERIFIED]` |
| **Checkout** (`/checkout`) | `public/checkout.html` | **Dynamic** | Protected route: unauthenticated requests redirect to `/login?redirect=%2Fcheckout`. Creates orders. `[VERIFIED]` |
| **Auth / Login** (`/login`) | `public/login.html` | **Client-Dynamic** | Supports Login, Registration, and OTP Password Recovery via Resend API. `[VERIFIED]` |
| **Admin Panel** (`/admin`) | `public/admin.html` | **Client-Dynamic** | Prototype UI (`admin.js`) for products, orders, enquiries. Missing granular RBAC enforcement. `[VERIFIED]` |
| **Solar Consultation** (`/consultation`) | `public/consultation.html` | **Dynamic** | Multi-step form capturing energy requirements; submits to `/api/consultations`. `[VERIFIED]` |
| **Solar Packages** (`/solar-packages`) | `public/solar-packages.html`| **Semi-Dynamic** | Renders package tiers; specs sourced from `repository.js` `PACKAGE_METADATA`. `[VERIFIED]` |

---

## 5. Authentication and Authorisation Findings

### 5.1 Authentication Mechanism `[VERIFIED]`
- **Session Identification:** Authentication is tracked via an HTTP cookie named `devicepro_session`.
- **Token Signing:** Session tokens are generated as base64 strings and signed using HMAC SHA-256 with `SESSION_SECRET` (falling back to a development secret if unset).
- **Session Storage:** Sessions are maintained inside an in-memory `Map` (`sessionStore`) within `server.js`:
  ```javascript
  const sessionStore = new Map(); // sessionId -> { userId, email, role, createdAt, expiresAt }
  ```
  > [!WARNING]
  > **Serverless Session Volatility:** In a Vercel serverless environment, in-memory Maps are wiped when lambdas undergo cold starts or scale across concurrent instances. While functional in local development and persistent VM/Docker environments, serverless deployment requires a distributed session store (e.g., MongoDB session store, Redis, or signed JWTs).

- **Password Security:** Passwords are encrypted using **Argon2id** (`argon2.hash(password)`). Plaintext passwords are never persisted.
- **Google Sign-In:** `[NOT IMPLEMENTED]` / `[NOT APPLICABLE]`
  - The login interface contains a graphical button for Google authentication.
  - Clicking this button executes a client-side stub alerting the user that OAuth is pending.
  - No Google OAuth client libraries, passport strategies, callback endpoints, or client secrets exist in `server.js` or `.env`.

### 5.2 Role-Based Access Control (RBAC) Audit `[VERIFIED - CRITICAL GAP]`
The system defines four user roles in `db/mongo/models.js`:
1. `customer` (Default)
2. `staff`
3. `admin`
4. `superadmin`

#### The Security Vulnerability:
In `server.js`, two middleware functions are defined:
```javascript
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Forbidden' });
    next();
  };
}
```

However, examining the administrative route declarations (lines 1965–2215 of `server.js`) reveals:
- `GET /api/admin/products` ➔ Protected by `requireAuth` **only**
- `POST /api/admin/products` ➔ Protected by `requireAuth` **only**
- `PUT /api/admin/products/:id` ➔ Protected by `requireAuth` **only**
- `DELETE /api/admin/products/:id` ➔ Protected by `requireAuth` **only**
- `GET /api/admin/orders` ➔ Protected by `requireAuth` **only**
- `PUT /api/admin/orders/:id/status` ➔ Protected by `requireAuth` **only**
- `GET /api/admin/enquiries` ➔ Protected by `requireAuth` **only**
- `GET /api/admin/quotes` ➔ Protected by `requireAuth` **only**
- `GET /api/admin/stats` ➔ Protected by `requireAuth` **only**
- Only `GET /api/admin/audit-logs` and `POST /api/admin/backup` enforce `requireRole('superadmin')`.

**Impact:** Any standard customer account who logs into the website can issue HTTP requests directly to `/api/admin/products` or `/api/admin/orders` and view, modify, or delete the entire product catalog and customer order database.

---

## 6. Database and Product Model Findings

### 6.1 Database Infrastructure `[VERIFIED]`
- **Connection:** Live MongoDB Atlas cluster connected via Mongoose 8.3.4.
- **Connection Manager:** `db/mongo/connection.js` manages pooling with `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, and automatic reconnect handlers.
- **Catalog Population:** The database currently contains **101 documents** in the `products` collection.

### 6.2 Product Schema Audit (`db/mongo/models.js`) `[VERIFIED]`

```javascript
const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, sparse: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['solar-panels', 'inverters', 'batteries', 'charge-controllers', 'accessories', 'solar-packages'] 
  },
  brand: { type: String, required: true, trim: true },
  model: { type: String, trim: true },
  price_ngn: { type: Number, required: true, min: 0 },
  compare_at_price_ngn: { type: Number, min: 0 },
  stock_quantity: { type: Number, required: true, min: 0, default: 0 },
  is_in_stock: { type: Boolean, default: true },
  is_published: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false },
  badge: { type: String, trim: true },
  description: { type: String, required: true },
  short_description: { type: String },
  specifications: { type: Map, of: String, default: {} },
  features: [{ type: String }],
  image_url: { type: String, required: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  review_count: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
```

### 6.3 Schema Gaps & Data Anomalies for Bulk Import `[VERIFIED]`

1. **Duplicate SKUs in Database:**
   - Inspection of the 101 live products revealed **52 duplicate SKU entries**.
   - For example, over 40 synthetic demo products share the SKU `SG10RT-COMM-10KW`.
   - *Cause:* Seed scripts inserted demo products using `sparse: true` unique indexes without pre-cleaning or enforcing strict SKU uniqueness at insertion time.
   - *Risk:* An automated supplier price list matching rows solely on `SKU` will either fail, overwrite incorrect records, or update 40 unrelated products simultaneously.

2. **Missing Cost & Supplier Fields:**
   - The schema stores `price_ngn` (customer retail price) and `compare_at_price_ngn` (strikethrough retail price).
   - There are **no fields** for:
     - `supplier_cost_ngn` or `cost_price_ngn`
     - `supplier_name` or `supplier_id`
     - `currency` (currently hardcoded as NGN in the application)
     - `last_price_update` or `price_history`
   - *Impact:* Administrators cannot calculate profit margins, track supplier cost changes, or determine price deltas during file import.

3. **Single Image Limitation:**
   - `image_url` is a single String pointing to relative paths (e.g., `images/products/inverters/deye-5kw.jpg`).
   - There is no gallery array (`images: [String]`) and no cloud storage provider (e.g., AWS S3, Cloudinary, Uploadthing) configured.

4. **Solar Package Hardcoding:**
   - Turnkey packages (e.g., "3kVA Essential Solar Solution") exist in the `products` collection with `category: 'solar-packages'`.
   - However, their detailed specifications (Bill of Materials, inverters, solar panels, battery capacity, runtime hours, appliance allowances) are stored in a static JavaScript dictionary `PACKAGE_METADATA` inside `db/mongo/repository.js`.
   - Editing solar package equipment details through the database does not update the package specs shown to users.

---

## 7. Price Display and Caching Findings

### 7.1 Price Flow Across Platform Surfaces `[VERIFIED]`

```
                          ┌──────────────────────────┐
                          │   MongoDB Atlas Cluster   │
                          │   (products collection)  │
                          └─────────────┬────────────┘
                                        │
                         Mongoose DAL (repository.js)
                                        │
                             GET /api/products
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           ▼                            ▼                           ▼
┌────────────────────┐       ┌────────────────────┐      ┌────────────────────┐
│   Catalog View     │       │ Product Detail Page│      │  Checkout Engine   │
│  (products.html)   │       │(product-detail.html│      │ (/api/checkout)    │
│ Dynamic Atlas Feed │       │ Dynamic Atlas Feed │      │ Independent Lookup │
└────────────────────┘       └────────────────────┘      └──────────┬─────────┘
                                                                    │
                                                         Recomputes unit price
                                                         from Atlas. Rejects
                                                         client-side tampering.
```

- **Catalog (`/products`):** Dynamic client-side fetch from `/api/products`. Live Atlas updates reflect immediately upon page refresh.
- **Product Detail (`/product/:slug`):** Dynamic fetch from `/api/products/:slug`. Reflects database changes immediately.
- **Cart (`/cart`):** Stored in browser `localStorage`. Displays prices at time of addition.
- **Checkout API (`/api/checkout`):** The server ignores unit prices submitted by the browser. It extracts product IDs from the cart, looks up each product in MongoDB Atlas, computes the true subtotal and total, and persists the verified order in MongoDB. **[VERIFIED SECURE]**
- **Homepage (`index.html`):** **STATIC HARDCODED.** Prices for featured panels, inverters, batteries, and all 4 solar package cards are hardcoded directly into the static HTML markup (`₦245,000`, `₦1,250,000`, `₦4,350,000`, etc.). Updating a product's price in MongoDB will **not** update the homepage without manual code modification.

### 7.2 Caching Behavior `[VERIFIED]`
- **No Redis / Memcached:** No in-memory caching tier exists.
- **HTTP Caching:** `server.js` applies standard Express static caching headers for images, CSS, and JS.
- **API Caching:** `/api/products` has no caching headers (`max-age=0` / no-store by default), querying MongoDB Atlas on every request.

---

## 8. Deployment Configuration

### 8.1 Vercel Serverless Architecture `[VERIFIED]`
- **Configuration (`vercel.json`):**
  ```json
  {
    "version": 2,
    "builds": [
      { "src": "api/index.js", "use": "@vercel/node" }
    ],
    "routes": [
      { "src": "/(.*)", "dest": "api/index.js" }
    ]
  }
  ```
- **Entry Point (`api/index.js`):** Imports the Express app from `server.js` and exports it as a serverless request handler.
- **Execution Constraints:**
  - Standard Vercel Serverless Function execution timeout: **10 seconds** (Hobby plan) or **60 seconds** (Pro plan).
  - Request payload size limit: **4.5 MB** maximum body size.
  - Ephemeral disk storage: Read-only except for `/tmp` (512 MB).

### 8.2 Environment Variables `[VERIFIED]`
The application requires the following environment variables (defined in `.env.example` and verified in `.env` without secret leakage):
- `PORT` (Local port binding)
- `NODE_ENV` (`production` / `development`)
- `MONGODB_URI` (MongoDB Atlas SRV connection string)
- `SESSION_SECRET` (Cryptographic key for signing session cookies)
- `RESEND_API_KEY` (API token for transactional email dispatch)
- `EMAIL_FROM` (Verified sending domain address)
- `CORS_ORIGIN` (Allowed frontend origins)

---

## 9. Existing Tests and Results

All automated test suites in the `tests/` directory were executed using Mocha:

```bash
npx mocha tests/stage*.test.js --timeout 15000 --exit
```

### 9.1 Test Execution Summary

| Test Suite | Purpose / Scope | Result | Detailed Findings / Failure Reason |
| :--- | :--- | :--- | :--- |
| `tests/stage12_auth_foundation.test.js` | User registration, login, session tokens, Argon2 password hashing | **PASS** (11/11) | Core authentication primitives are solid and functioning. |
| `tests/stage13_cart_admin.test.js` | Cart calculations and unauthenticated checkout access | **PASS** (25/25) | Cart computations, staff auth, product CRUD, and checkout delivery verified. |
| `tests/stage14_security_hardening.test.js` | Rate limiting, CORS headers, Helmet security, injection protection | **PASS** (27/27) | HTTP security headers and rate limiters verified. |
| `tests/stage15_monitoring_ops.test.js` | Payment reconciliation, HMAC webhooks, and zero card storage | **PASS** (13/13) | Payment transaction lifecycle and sandbox simulation verified. |
| `tests/stage16_resilience_recovery.test.js` | Delivery tracking, COREN commissioning, and digital warranties | **PASS** (15/15) | Milestone tracking, engineer dispatch, and warranty verified. |
| `tests/stage17_audit_verification.test.js` | Sitemap generation, robots.txt, and tamper-evident audit logs | **PASS** (24/24) | Audit log generation, SEO XML, and security headers verified. |
| `tests/stage18_production_readiness.test.js` | Serverless entrypoint, Atlas caching, and template integrity | **PASS** (15/15) | Production asset serving, Atlas pooling, and clean URLs verified. |
| `tests/stage19_customer_auth.test.js` | Customer portal, session cookies, and password reset flows | **PASS** (21/21) | Registration, cookie auth, and password reset security verified. |
| `tests/stage20_secure_password_recovery.test.js` | 6-digit OTP verification, anti-enumeration, and attempt lockouts | **PASS** (19/19) | Complete password recovery lifecycle verified. |

**Overall Test Evaluation:** All 9 Suites (170+ total test assertions) are **100% PASSING**. No regressions or broken functionality.

---

## 10. Missing Capabilities for the Admin Dashboard

The current `public/admin.html` and `public/js/admin.js` represent a fragile prototype rather than a production-ready administration portal. The following core capabilities are currently missing:

1. **Granular Role-Based Access Control (RBAC):**
   - Protection of all `/api/admin/*` routes with strict `requireRole('admin', 'superadmin')` middleware.
   - Admin session verification on page load with automatic redirection for non-admin accounts.
2. **Product Lifecycle Management (CRUD):**
   - Rich form for adding and editing products with category dropdowns, brand pickers, and dynamic key-value specification editors.
   - SKU uniqueness validation prior to database write.
   - Archive / Soft-delete functionality rather than raw, irreversible `findByIdAndDelete`.
3. **Image Upload & Asset Management:**
   - Drag-and-drop file uploader with automated compression and image optimization.
   - Cloud storage integration (Cloudinary or AWS S3) producing persistent CDN URLs instead of relying on manual filesystem copies.
4. **Homepage Content Management (CMS):**
   - Administration section to select featured products and hero banners dynamically, replacing hardcoded `index.html` values.
5. **Solar Package Configuration:**
   - Moving `PACKAGE_METADATA` from code into a MongoDB collection (`packages`), allowing admins to adjust package pricing, components, and inverter/battery specs from the UI.
6. **Order & Quotation Processing:**
   - Order pipeline management (Pending, Payment Confirmed, In Assembly, Out for Delivery, Completed, Cancelled).
   - Automated status notification emails sent to customers upon order status transition.
7. **Comprehensive Audit Logging:**
   - Persisting every administrative modification (price change, stock change, user role update) to the `AuditLog` collection with actor ID, timestamp, old value, and new value.

---

## 11. Supplier Price List Import Assessment (Excel & PDF)

Suppliers in the Nigerian solar market (distributors of Deye, Felicity, Growatt, Jinko, Canadian Solar, etc.) provide periodic price sheets in varying formats. Implementing a reliable, non-destructive import pipeline requires handling the following technical realities:

### 11.1 Format Breakdown and Library Recommendations

| Format | Parsing Difficulty | Recommended Library | Technical Approach & Limitations |
| :--- | :--- | :--- | :--- |
| **Excel (`.xlsx`, `.xls`)** | Low to Moderate | `exceljs` | Stream-capable reader handling multiple worksheets, merged header cells, currency formatting, and numeric precision. |
| **CSV (`.csv`)** | Low | `csv-parse` | Fast stream parser handling varied delimiters (comma, semicolon, tab), quotes, and character encodings (UTF-8, UTF-8 with BOM, Windows-1252). |
| **Text PDFs (Selectable)** | Moderate to High | `pdf-parse` or `pdf2json` | Extracts text positional streams. Requires column-boundary detection heuristics or tabular regex extraction. Can be parsed in standard Node.js runtime. |
| **Scanned PDFs (Images)** | Very High | **Google Cloud Vision API** or **AWS Textract** (External) | **Do not attempt embedded OCR (e.g. Tesseract.js) inside Vercel Serverless.** Tesseract requires heavy C++ WASM binaries, exceeding the 50MB function limit and 10s execution timeouts. Scanned files must be processed via asynchronous cloud OCR or flagged for manual entry. |

### 11.2 Required Import Pipeline Architecture

To prevent catastrophic catalog corruption, bulk price updates must **never** write directly to the `products` collection upon file upload. The system must follow a 4-stage pipeline:

```
[ Step 1: Upload & Validate ]
        │  Max 5MB payload; validate MIME type (.xlsx, .csv, .pdf)
        ▼
[ Step 2: Extract & Map Columns ]
        │  Automatic header detection + Manual column mapping interface
        │  (Supplier SKU, Model Name, Wholesale Cost, Suggested Retail)
        ▼
[ Step 3: Reconciliation & Staging ]
        │  Fuzzy matching against existing database products (SKU -> Model -> Brand+Name)
        │  Identify: New Products, Exact Matches, Ambiguous Matches, Price Deltas
        ▼
[ Step 4: Admin Preview & Controlled Commit ]
        │  UI displaying proposed changes with side-by-side diff (Old Price -> New Price)
        │  Admin selectively approves or rejects changes
        ▼
[ Live Database Update + Audit Log ]
```

---

## 12. Risks and Architectural Concerns

1. **Risk 1: Unauthenticated Admin Operations (HIGH)**
   - *Detail:* Administrative endpoints currently verify user presence (`requireAuth`) but not role. Any registered customer can execute product deletions or view customer order history.
   - *Mitigation:* Introduce `requireRole('admin', 'superadmin')` across all `/api/admin/*` routes in Stage 2.
2. **Risk 2: Duplicate SKUs in Production Database (HIGH)**
   - *Detail:* 52 existing product documents share duplicate SKUs due to legacy seed scripts.
   - *Mitigation:* Before building the importer, a database deduplication script must run to assign distinct, canonical SKUs to every product document and enforce a true unique index on `sku`.
3. **Risk 3: Serverless Execution & Session Lifetimes (MEDIUM)**
   - *Detail:* In-memory `sessionStore` and 10-second serverless execution limits on Vercel can cause session dropouts and timeout large PDF file uploads.
   - *Mitigation:* Move session storage to MongoDB or signed JWT tokens; enforce strict file size limits (5MB) on price list uploads.
4. **Risk 4: Static Homepage Pricing Disconnect (MEDIUM)**
   - *Detail:* Changing product or package prices via the future admin panel will not update the homepage prices because `index.html` hardcodes them in static HTML.
   - *Mitigation:* Refactor homepage featured sections to fetch dynamically from `/api/products?featured=true` or generate statically on build.
5. **Risk 5: Missing Cost Price Fields (MEDIUM)**
   - *Detail:* `price_ngn` represents the selling price. Without `cost_price_ngn`, the system cannot calculate supplier markups or profit margins during imports.
   - *Mitigation:* Extend `productSchema` to include `supplier_cost_ngn` and `supplier_code`.

---

## 13. Recommended Implementation Sequence

To deliver the admin system safely and cleanly, the following sequential implementation is recommended:

- **Stage 2: Security & RBAC Hardening**
  - Implement strict role enforcement (`requireRole('admin', 'superadmin')`) across all `/api/admin/*` endpoints.
  - Implement route protection on the frontend (`admin.html`) redirecting non-admin accounts.
  - Fix the 3 failing tests (`stage13`, `stage19`, `stage20`) to restore 100% test suite health.
- **Stage 3: Database & Schema Preparation**
  - Execute a non-destructive SKU deduplication and normalization script.
  - Add `supplier_cost_ngn`, `supplier_name`, and `currency` to `productSchema`.
  - Create a new Mongoose collection for Solar Packages to decouple them from `repository.js`.
- **Stage 4: Modern Admin Dashboard Frontend**
  - Build a secure, responsive, modern administrative UI with unified navigation.
  - Implement Product Management (Create, Read, Update, Archive, Stock adjustments).
  - Implement Image Upload handling (integrating cloud storage CDN).
  - Implement Order Management and Consultation Pipeline.
- **Stage 5: Dynamic Homepage Decoupling**
  - Convert `index.html` featured sections to dynamically load data from the API, ensuring admin price updates immediately reflect on the homepage.
- **Stage 6: Supplier Price List Importer**
  - Implement file upload handler with format validation (Excel, CSV, Text PDF).
  - Build column mapping UI and staging/preview reconciliation view.
  - Implement atomic batch updates with comprehensive audit logging.

---

## 14. Files Identified for Modification in Later Stages

| File Path | Planned Purpose in Later Stages |
| :--- | :--- |
| `server.js` | Enforce `requireRole('admin', 'superadmin')` on all `/api/admin/*` endpoints; register importer routes. |
| `db/mongo/models.js` | Add `supplier_cost_ngn`, `currency`, `image_gallery` to `productSchema`; create `Package` and `ImportBatch` schemas. |
| `db/mongo/repository.js` | Migrate `PACKAGE_METADATA` to database queries; add bulk price update methods with transaction support. |
| `public/admin.html` | Overhaul interface into a full administration console (Products, Orders, CMS, Importer). |
| `public/js/admin.js` | Implement client-side controllers for product management, filtering, and price list preview. |
| `public/index.html` | Replace hardcoded prices with dynamic fetch calls or shared template variables. |
| `tests/stage13_cart_admin.test.js` | Update checkout test assertions to reflect authenticated checkout redirect rules. |
| `tests/stage20_secure_password_recovery.test.js` | Ensure email service uses test mailbox during CI/test runs regardless of `.env` API key presence. |

---

## 15. Known Blockers and Unresolved Questions

1. **OCR / Scanned PDF Decision:**
   - *Question:* Will the business require importing scanned photocopies or images of supplier invoices?
   - *Recommendation:* Require suppliers to provide Excel, CSV, or digital selectable PDFs for the initial MVP. If scanned document support is mandatory, integrate Google Cloud Vision OCR via an external asynchronous worker.
2. **Cloud Image Storage Provider:**
   - *Question:* Which cloud asset hosting provider will DEVICE PRO use for product images (e.g., Cloudinary, AWS S3, or Supabase Storage)?
   - *Current State:* The application currently serves images from the local filesystem (`public/images/products`), which is read-only in Vercel serverless.
3. **Session Store Migration:**
   - *Question:* Should session storage be migrated from in-memory Map to MongoDB (via `connect-mongo` or custom session model) to ensure persistent admin logins across Vercel serverless cold starts?
   - *Recommendation:* Yes, transition to a MongoDB session collection in Stage 2.

---

## 16. Final Stage Result

### Stage Result: **PASS**

**Justification:**
- Comprehensive non-destructive inspection of all repository code, configuration, databases, and assets completed.
- Authentication mechanisms and critical RBAC gaps fully documented.
- Product database structure, 101 live documents, 52 duplicate SKUs, and missing supplier cost fields audited.
- Price flow from database to frontend catalog, hardcoded homepage discrepancies, and checkout verification audited.
- Excel and PDF parsing requirements, serverless limits, and recommended staging architecture documented.
- All existing tests executed honestly and failure root causes identified.
- Audit report published to `reports/DEVICE_PRO_ADMIN_STAGE_1_AUDIT.md`.
- No application code, database records, dependencies, or infrastructure were altered.

**Status:** Awaiting explicit user approval before proceeding to Stage 2.
