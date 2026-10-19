# DEVICE PRO — Commercial & Residential Solar Platform

[![Test Suite](https://img.shields.io/badge/tests-133%20passed-success.svg)](#automated-testing)
[![Smoke Tests](https://img.shields.io/badge/smoke%20tests-26%20passed-success.svg)](#production-smoke-tests)
[![Security Audit](https://img.shields.io/badge/OWASP-audited%20%26%20verified-blue.svg)](#security--data-privacy)
[![WCAG](https://img.shields.io/badge/WCAG%202.2-Level%20AA-green.svg)](#accessibility)
[![Market](https://img.shields.io/badge/market-Nigeria%20%F0%9F%87%B3%F0%9F%87%AC-orange.svg)](#market-focus)

**DEVICE PRO** is an engineering-grade e-commerce and consultative solar energy platform custom-built for the Nigerian market. The platform provides a dual customer journey: direct purchase of Tier-1 solar hardware (inverters, LiFePO4 batteries, monocrystalline solar panels, charge controllers) and an interactive consultative workflow for turnkey residential, commercial, industrial, and agricultural micro-grids.

---

## Key Capabilities & Architecture

- **Dual Customer Journey:** Direct e-commerce catalog with cart, Naira (₦) checkout, and pro-forma generation alongside an interactive multi-step solar consultation and quote builder.
- **Engineering Sizing Engine:** High-precision appliance load analysis incorporating empirical Nigerian solar irradiance data (Peak Sunlight Hours: Lagos 4.2h vs. Abuja 4.8h vs. Kano 5.8h), battery Depth of Discharge (DoD) margins, and generator fuel savings ROI formulas.
- **Paystack Payment Gateway:** Full transaction initialization in kobo, server-side verification, anti-underpayment fraud protection, currency validation, and HMAC-SHA512 webhook signature verification.
- **Zero Raw Card Storage:** Strict compliance with the Nigeria Data Protection Act (NDPA 2023) and PCI-DSS Level 1 specifications. No primary account numbers (PAN), CVVs, or PINs are accepted or stored.
- **Logistics & 6-Stage Engineering Stepper:** Live order tracking with customer privacy gates (requiring phone or email verification) and 6 verified engineering milestones from cell balancing to NEMSA electrical commissioning.
- **COREN Commissioning & Digital Warranties:** Lead engineer sign-off checklist (earth resistance < 5Ω, insulation resistance > 1MΩ) unlocking serialized digital warranty certificates.
- **After-Sales Rapid Swap SLA:** Public warranty claim ticketing with 24–48 hour rapid replacement guarantees from regional freight hubs (Lagos, Abuja, Port Harcourt).
- **Administrative Operations Console (`/admin`):** Role-Based Access Control (`superadmin`, `lead_engineer`, `sales_desk`) with equipment CRUD, order logistics updates, quote triage, and tamper-evident audit logging.
- **Production Asset Delivery:** Gzip compression via Express `compression()`, static caching policies (`max-age=86400`), responsive design (320px–1920px), and full SEO discoverability (75-URL XML sitemap, `robots.txt`, and JSON-LD schemas).

---

## Technology Stack

- **Runtime:** Node.js `v22+` / `v26+` (Native ES6+ modules and built-in test runner)
- **Framework:** Express `v4.21.2`
- **Database:** SQLite (via Node.js native `node:sqlite` `DatabaseSync` in WAL mode)
- **Process Management:** PM2 (`ecosystem.config.js`)
- **Reverse Proxy:** NGINX with TLS 1.3, HTTP/2, Let's Encrypt SSL, and rate limiting
- **Styling & Assets:** Vanilla CSS variables (`tokens.css`, `components.css`), responsive grids, and zero-toolchain frontend architecture

---

## Quick Start & Local Development

### Prerequisites
- Node.js `v22.0.0` or higher (tested on `v26.4.0`)
- npm `10.0.0` or higher

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-org/device-pro.git
cd device-pro

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start development server with auto-reload
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## Operational CLI Commands

DEVICE PRO includes built-in operational scripts for testing, health validation, and database disaster recovery:

```bash
# Run complete automated regression test suite (133 tests across 6 suites)
npm test

# Run production smoke tests across all 15 public pages, APIs, and security headers
npm run smoke

# Create an atomic, verified snapshot of the active SQLite database
npm run backup

# Restore the database from the latest verified snapshot
npm run restore

# Start production server
npm start
```

---

## Production Deployment

### 1. PM2 Process Management (Clustered)
```bash
# Start clustered instances
pm2 start ecosystem.config.js --env production

# View process status & logs
pm2 status
pm2 logs device-pro
```

### 2. Docker Container Deployment
```bash
# Build production Docker image
docker build -t device-pro:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name device-pro-app \
  device-pro:latest
```

### 3. NGINX Reverse Proxy
Copy the production configuration from `nginx/devicepro.conf` to your NGINX sites directory:
```bash
sudo cp nginx/devicepro.conf /etc/nginx/sites-available/devicepro.conf
sudo ln -s /etc/nginx/sites-available/devicepro.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Documentation Directory

Comprehensive architectural records and operational guides are maintained in the repository:
- [`DEVICE_PRO_ARCHITECTURE.md`](DEVICE_PRO_ARCHITECTURE.md): Complete technical, business, and functional specification (1,476 lines).
- [`docs/OPERATIONS_AND_HANDOVER_MANUAL.md`](docs/OPERATIONS_AND_HANDOVER_MANUAL.md): Complete operations manual, staff workflows, and disaster recovery runbooks.
- [`TESTING.md`](TESTING.md): Testing strategy, test execution logs, and automated test runners.
- [`STAGE17_SECURITY_REPORT.md`](STAGE17_SECURITY_REPORT.md): OWASP Top 10/ASVS audit, penetration tests, and anti-fraud verification.
- [`STAGE17_FINAL_REPORT.md`](STAGE17_FINAL_REPORT.md): Release gate sign-off evaluation across Gates A through J.
- [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md): Chronological stage-by-stage implementation history.

---

## Security & Data Privacy Compliance

- **Nigeria Data Protection Act (NDPA 2023):** Data controller and Data Protection Officer contacts (`dpo@devicepro.ng`) published on `/privacy-policy`.
- **Payment Card Industry Compliance (PCI-DSS):** Zero raw card numbers (PAN), CVVs, or cardholder PINs are processed or stored on DEVICE PRO servers.
- **Cryptographic Security:** Passwords hashed with unique salted `scryptSync` buffers. Session tokens use 256-bit entropy. Webhooks use HMAC-SHA512.
- **HTTP Security Headers:** Strict-Transport-Security (1-year max-age), Content-Security-Policy, X-Content-Type-Options (`nosniff`), X-Frame-Options (`SAMEORIGIN`), and Referrer-Policy configured globally.

---

## Business Inquiries & Support

- **Lagos Engineering Headquarters:** Victoria Island, Lagos, Nigeria
- **Abuja Regional Hub:** Central Business District, Abuja, Nigeria
- **Port Harcourt Logistics Hub:** Trans-Amadi Industrial Layout, Rivers State, Nigeria
- **Emergency Hotline & WhatsApp:** `+234 803 123 4567`
- **General Inquiries:** `info@devicepro.com` / `sales@devicepro.ng`

---

© 2026 DEVICE PRO Solar Systems Ltd. All rights reserved.
