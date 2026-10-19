# DEVICE PRO — Testing Documentation

## Test Environment

- **OS:** Windows
- **Node.js:** v26.4.0
- **npm:** 11.17.0
- **Git:** 2.47.1
- **Browser Testing:** Manual inspection in Chrome, Firefox, Edge (minimum)
- **Automated Testing:** Node.js built-in test runner (`node --test`)

## Test Categories

### 1. Unit Tests
**Location:** `tests/unit/`
**Runner:** `node --test tests/unit/`
**Coverage:**
- Price calculations and currency formatting
- Cart total and promotion calculations
- Solar calculator formulas
- Form validation logic
- Permission and authorization checks
- Inventory availability rules
- Payment state transitions

### 2. Integration Tests
**Location:** `tests/integration/`
**Runner:** `node --test tests/integration/`
**Coverage:**
- Database transactions (CRUD operations)
- API route validation and error handling
- Order creation workflow
- Payment initiation and webhook verification
- Quote creation and revision
- Inventory movement tracking

### 3. End-to-End Tests
**Location:** `tests/browser/`
**Runner:** Playwright (if approved) or manual testing procedures
**Coverage:**
- Full product browse → add to cart → checkout journey
- Consultation request submission
- Calculator → quote request flow
- Admin product management
- Mobile navigation and filtering
- Keyboard-only navigation

### 4. Manual Test Checklist
Used at every stage gate. Covers:
- [ ] All navigation links resolve correctly
- [ ] No console errors on any page
- [ ] No horizontal overflow at any screen width
- [ ] Forms show validation, loading, success, and error states
- [ ] Mobile menu opens/closes correctly with keyboard and touch
- [ ] Focus styles are visible on all interactive elements
- [ ] Images have appropriate alt text
- [ ] Page titles and meta descriptions are correct
- [ ] No fabricated business data visible

## Screen Sizes for Responsive Testing

| Device Class | Width | Notes |
|-------------|-------|-------|
| Small phone | 320px | Minimum supported |
| Standard phone | 375px | iPhone SE |
| Large phone | 414px | iPhone Plus |
| Tablet portrait | 768px | iPad |
| Tablet landscape | 1024px | iPad landscape |
| Laptop | 1280px | Standard laptop |
| Desktop | 1440px | Standard desktop |
| Wide desktop | 1920px | Full HD |

## How to Run Tests

```bash
# Install dependencies
npm install

# Run entire automated regression suite (133 tests across 6 suites)
npm test

# Equivalent direct command with sequential concurrency (prevents SQLite lock contention)
node --test --test-concurrency=1 tests/*.test.js

# Run individual stage test suites
node tests/stage12_api.test.js
node tests/stage13_cart_admin.test.js
node tests/stage14_search_ux.test.js
node tests/stage15_payment.test.js
node tests/stage16_delivery_support.test.js
node tests/stage17_security_seo_perf.test.js

# Start development server
npm run dev
```

## Test Data
- Test data uses clearly labelled placeholder values
- No real customer data in test fixtures
- No real payment credentials in test environment
- Database seeds use `database/seeds/` and `data/` directory
- Automated database backups exported to `data/backups/`

## Adding New Tests
1. Create test file in `tests/` directory
2. Follow naming convention: `stage<number>_<topic>.test.js`
3. Use Node.js built-in `test` and `assert` modules
4. Include both success and failure scenarios
5. Test edge cases and boundary conditions
6. Update this document when adding new test categories

---

## Test Execution Log

### Stage 17 Comprehensive Regression & Security Audit (2026-10-17)
**Scope:** Full application stack — `server.js`, `db/database.js`, `public/`, and all 6 test suites  
**Test Method:** Automated Node.js built-in test runner (`npm test`) with sequential concurrency, HTTP benchmark probes, and WCAG A11y verification  
**Results:**
- **Total Test Suites:** 6
- **Total Assertions:** 133
- **Passed:** 133 (100%)
- **Failed:** 0 (0%)
- **Duration:** 3.41s
- **Breakdown:**
  - `tests/stage12_api.test.js`: 28 Passed (Schema, Sizing, Generator OPEX, Salted Scrypt Auth)
  - `tests/stage13_cart_admin.test.js`: 25 Passed (Cart, Checkout, Lagos/Regional Delivery, RBAC, Catalog CRUD, Audit Logs)
  - `tests/stage14_search_ux.test.js`: 29 Passed (Search API, Spotlight Palette, 12 Core HTML Pages Compliance)
  - `tests/stage15_payment.test.js`: 13 Passed (Paystack Sandbox, Idempotency, HMAC-SHA512 Webhooks, Zero Card Storage)
  - `tests/stage16_delivery_support.test.js`: 14 Passed (Privacy Tracking Gate, 6-Stage Stepper, NEMSA Safety, Warranties)
  - `tests/stage17_security_seo_perf.test.js`: 24 Passed (XML Sitemap 75 URLs, Robots.txt, HSTS/CSP, Gzip, Caching, JSON-LD, SQLite Integrity)
- **Dependency Audit:** `npm audit` returned 0 vulnerabilities.
- **Overall Status:** ✅ **PASS — PRODUCTION READY**

### Reference Homepage Implementation QA (2026-10-13)
**Scope:** `public/index.html`, `public/css/homepage.css`, `public/js/main.js`, `server.js`  
**Test Method:** Automated Browser Subagent QA with viewport resizing, interaction triggers, and DOM evaluation  
**Results:**
- **Console Errors:** 0 errors detected.
- **Horizontal Overflow (`scrollWidth <= clientWidth`):**
  - Desktop (1424px x 805px): Passed (1424px / 1424px, 0px overflow)
  - Tablet (752px x 805px): Passed (752px / 752px, 0px overflow)
  - Mobile (500px x 805px): Passed (500px / 500px, 0px overflow)
- **Interactive Modals & Drawers:**
  - Search Dialog (`#search-dialog`): Opens, focuses input, dismisses on Escape and backdrop click.
  - Cart Drawer (`#cart-drawer`): Opens slide-in drawer, calculates empty state, traps focus, dismisses smoothly.
  - Quote Modal (`#quote-modal`): Opens 3-step consultation dialog, handles form inputs, validates fields.
  - Mobile Nav Drawer (`#mobile-nav-drawer`): Opens on hamburger click, lists all navigation items, hides completely off-canvas when closed.
- **Visual Asset Integrity:** All 12 extracted and cleaned reference photographic assets load with HTTP 200 without text distortion.
- **Overall Status:** ✅ **PASS**


