# DEVICE PRO — Production Operations, Administration & Handover Manual

**Document ID:** DP-OPS-MAN-001  
**Project:** DEVICE PRO (Tier-1 Commercial & Residential Solar Energy Systems)  
**Lifecycle Stage:** Stage 18 — Production Launch & Handover  
**Target Audience:** System Administrators, Operations Managers, Lead Solar Engineers, and Sales Desk Staff  
**Date:** 2026-10-17  
**Version:** 1.0.0 (Production Release)  

---

## 1. System Overview & Technology Stack

DEVICE PRO is an engineering-led e-commerce and consultative platform for solar energy hardware, turnkey installations, and after-sales support across Nigeria.

| Component | Technology | Role |
|-----------|------------|------|
| **Frontend UI** | HTML5, CSS3, Vanilla ES6 JavaScript | Zero-hydration, lightweight, responsive client interface |
| **Backend Framework** | Node.js `v22+` / `v26+`, Express `4.21.2` | RESTful API, authentication, business logic, static asset delivery |
| **Database Engine** | SQLite (Node native `node:sqlite` `DatabaseSync`) | Relational persistence in WAL mode with foreign key integrity |
| **Process Manager** | PM2 (`ecosystem.config.js`) | Multi-core clustering, auto-restart on memory limits, log rotation |
| **Reverse Proxy / SSL**| NGINX (`nginx/devicepro.conf`) | TLS 1.3 termination, HTTP/2, Let's Encrypt, caching, rate limiting |
| **Payment Gateway** | Paystack (with HMAC-SHA512 Webhook Engine) | Naira card, bank transfer, and USSD payments with zero raw card storage |

### Directory Architecture
```
DEVICE PRO/
├── db/                   # Database connection, schemas, prepared statements, and seed data
├── data/                 # SQLite products.db database and automated backup snapshots
│   └── backups/          # Timestamped verified database snapshots
├── docs/                 # Architectural specifications, decisions, and operations manuals
├── nginx/                # Production NGINX reverse proxy configuration
├── public/               # Static assets, CSS, client-side JS, images, and public HTML pages
├── lib/                  # Engineering sizing calculator engine and domain utilities
├── scripts/              # Production utilities (backup-db.js, restore-db.js, smoke-test.js)
├── tests/                # Automated regression test suites (Stages 12 through 17)
├── server.js             # Express application entry point, routing, and security middleware
├── ecosystem.config.js   # PM2 clustering and process configuration
├── Dockerfile            # Container deployment specification
└── package.json          # Dependencies and operational scripts (test, smoke, backup, restore)
```

---

## 2. Staff Roles, Permissions & Access Matrix

Access to administrative and operational features (`/admin`) is controlled via Role-Based Access Control (RBAC). Passwords are cryptographically salted and hashed using `scryptSync`, and sessions use cryptographically generated 256-bit bearer tokens.

### Staff Roles & Permissions

| Role Identifier | Default Staff Email | Scope of Authority |
|-----------------|---------------------|--------------------|
| **`superadmin`** | `superadmin@devicepro.ng` | Unrestricted authority: manage staff accounts, trigger/download database backups, inspect immutable audit logs, update system configurations. |
| **`lead_engineer`** | `engineer@devicepro.ng` | Technical operations: review sizing estimates, conduct site surveys, record NEMSA electrical safety checklists, sign off on commissioning, issue digital serial warranties, resolve technical support tickets. |
| **`sales_desk`** | `sales@devicepro.ng` | Commercial operations: triage contact inquiries, manage quote pipeline, update product stock and pricing, track customer order fulfillment milestones. |

> **IMPORTANT SECURITY NOTE:**  
> Before exposing the admin console to public networks, all default passwords must be rotated immediately using the user management interface in `/admin` or via the database management utility.

---

## 3. Daily Administrative Workflows

Authorized staff can access the operations dashboard by navigating to `https://devicepro.ng/admin` and authenticating with their corporate credentials.

### 3.1 Product Catalogue & Price Management
1. Navigate to the **Products** tab in the admin console.
2. **Add New Equipment:**
   - Click **+ Add Equipment SKU**.
   - Input Product Name, Category (Inverters, Batteries, Solar Panels, Charge Controllers, Balance of System, Monitoring), Brand (Deye, Felicity, Jinko, Growatt, Victron), SKU, and Technical Specifications.
   - Enter **Price in NGN (₦)**.
   - Set Stock Quantity and Availability Status (`in_stock`, `low_stock`, `pre_order`, `discontinued`).
   - Save. Action is automatically recorded in the tamper-evident audit log.
3. **Foreign Exchange Price Adjustments:**
   - Locate the SKU via the search bar.
   - Click **Edit Price**. Update the Naira price based on current supplier FX replacement costs.
   - Click **Save Updates**. Price updates apply immediately across the public catalogue, cart re-evaluations, and checkout.

### 3.2 Quotation Pipeline & Sizing Review
1. Navigate to the **Quotes** tab.
2. Inquiries generated from `/calculator`, `/savings-calculator`, and `/solutions` appear as `new` with an assigned reference ID (`DP-Q-XXXXXX`).
3. Click on a quotation reference to view customer property type, daily load breakdown, simultaneous wattage, and indicative inverter/battery sizing.
4. **Review & Transition:**
   - Assign the quote to an engineering lead.
   - Transition status: `new` → `survey_scheduled` → `quoted` → `accepted` → `declined`.
   - Add internal engineering notes regarding roof orientation, shading, and cable distances.

### 3.3 Order Fulfillment & Delivery Tracking
1. Navigate to the **Orders** tab.
2. Orders paid through Paystack transition to `PAID` automatically via HMAC-SHA512 webhook reconciliation.
3. **Logistics Stepper Updates:**
   - Step 1: `Order Verified` (Payment confirmed, items allocated in warehouse).
   - Step 2: `Warehouse Staged` (Heavy equipment crated, battery cell balancing completed).
   - Step 3: `Dispatched & In Transit` (Assign courier partner, waybill tracking number, and estimated arrival date).
   - Step 4: `Delivered to Site` (Heavy equipment safely offloaded and inspected).
   - Step 5: `Installation & Ground Mounting` (Mounting rails and array configured).
   - Step 6: `NEMSA Commissioned` (Electrical safety checks complete, system live).

### 3.4 Commissioning & NEMSA Electrical Safety Verification
1. Open the specific order under **Commissioning Sign-Off**.
2. Complete the mandatory safety checklist:
   - [x] Earth Resistance Measurement (< 5.0 Ohms required by NEMSA).
   - [x] DC Insulation Resistance Test (> 1.0 Megaohms).
   - [x] AC Phase Voltage & 50Hz Frequency Calibration.
   - [x] Battery Cell Voltage Deviation (< 0.05V delta between cells).
   - [x] Surge Protection Device (SPD) and DC Breaker Functional Verification.
3. Enter the COREN Registered Engineer's accreditation number and digital sign-off timestamp.
4. Submit. The order transitions to `COMMISSIONED` and unlocks the official digital warranty certificate for the customer.

### 3.5 Digital Warranty Registration & Rapid Swap SLA Tickets
1. **Registering Hardware Serials:**
   - Navigate to **Warranties**.
   - Input Order Number, Equipment SKU, and Manufacturer Serial Number (e.g., Inverter Serial: `DY-2026-IN-9812`).
   - Issue Warranty Code (`DP-WAR-XXXXXX`). Sets 5-year inverter, 10-year LiFePO4 battery, or 25-year panel warranty clock.
2. **Support & Rapid Swap Tickets:**
   - Customers submit tickets via `https://devicepro.ng/tracking#support`.
   - The ticket appears in the **Support Tickets** tab with SLA countdown (24-48 hours).
   - Assign a field technician. Record diagnosis notes.
   - If hardware failure occurs within warranty, initiate the **Rapid Swap** procedure: dispatch a replacement unit from the regional hub before factory RMA shipping.

---

## 4. Production Maintenance & Server Runbooks

### 4.1 Automated Database Backups
Automated database backups run daily at 02:00 UTC. The backup utility creates verified snapshots, performs SQLite `PRAGMA integrity_check`, and prunes snapshots older than 14 days.

```bash
# Execute manual snapshot backup
npm run backup

# Verify backup archive
ls -lh data/backups/
```

### 4.2 Disaster Recovery & Database Restoration
In the event of accidental data corruption or hardware recovery:
```bash
# Restore latest verified backup snapshot
npm run restore

# Or restore a specific historical snapshot
node scripts/restore-db.js devicepro-backup-2026-10-17T12-42-55-344Z.db
```
The restore script automatically creates a pre-restore safety copy of the existing database before overwriting, checks integrity, and verifies table counts.

### 4.3 Running Production Smoke Tests
After any code deployment, server reboot, or environment variable change, execute the automated smoke test suite:
```bash
# Run smoke tests against local instance
npm run smoke

# Or run smoke tests against live production domain
BASE_URL=https://devicepro.ng npm run smoke
```

### 4.4 Process Management with PM2
```bash
# Start application cluster in production mode
pm2 start ecosystem.config.js --env production

# View active cluster status & memory consumption
pm2 status

# Real-time resource monitoring
pm2 monit

# Inspect combined error and access logs
pm2 logs device-pro

# Reload cluster with zero-downtime
pm2 reload device-pro

# Restart cluster
pm2 restart device-pro
```

### 4.5 NGINX Management & SSL Certificates
```bash
# Test NGINX configuration syntax
sudo nginx -t

# Reload NGINX configuration
sudo systemctl reload nginx

# Renew Let's Encrypt SSL certificates
sudo certbot renew --dry-run
```

---

## 5. Environment Variables & Live Activation Checklist

Before switching to live operations, create `/app/.env` (or set environment variables in your hosting provider) containing the following production variables:

```ini
# Server Port & Mode
PORT=3000
NODE_ENV=production

# Base URL (Used for canonical sitemaps and webhook reconciliation)
BASE_URL=https://devicepro.ng

# Session Cryptographic Secret (Minimum 64 random characters)
SESSION_SECRET=GENERATE_A_SECURE_RANDOM_HEX_SECRET_FOR_PRODUCTION

# Paystack Live Payment Credentials
PAYSTACK_SECRET_KEY=sk_live_YOUR_PAYSTACK_LIVE_SECRET_KEY
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_PAYSTACK_LIVE_PUBLIC_KEY
PAYSTACK_WEBHOOK_SECRET=YOUR_PAYSTACK_SECRET_KEY_FOR_HMAC_VALIDATION

# Corporate Email & SMTP Mailer
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SMTP_API_KEY
CONTACT_NOTIFICATION_EMAIL=orders@devicepro.ng
DPO_EMAIL=dpo@devicepro.ng
```

### Paystack Webhook Configuration in Paystack Dashboard:
1. Log in to `https://dashboard.paystack.com`.
2. Navigate to **Settings** → **API Keys & Webhooks**.
3. Under **Live Webhook URL**, enter:
   `https://devicepro.ng/api/payments/webhook`
4. Set Webhook Secret to match your `PAYSTACK_SECRET_KEY`.
5. Enable notifications for: `charge.success`, `transfer.success`, `transfer.failed`.

---

## 6. Incident Response & Rollback Runbook

### Incident Severity Levels

| Severity | Definition | Response SLA | Action Required |
|----------|------------|--------------|-----------------|
| **P1 — Critical** | Complete site outage, payment gateway failure, or checkout blocked. | < 15 minutes | Immediate rollback or hotfix; notify lead engineering. |
| **P2 — Major** | Customer tracking degraded, quote submission failure, or admin console inaccessible. | < 1 hour | Investigate logs; apply database restore or service restart. |
| **P3 — Minor** | Visual glitch on specific device, non-critical calculator edge case. | < 24 hours | Schedule patch in standard deployment window. |

### Emergency Rollback Procedure
If a production release introduces unforeseen critical errors:
1. **Rollback Application Code:**
   ```bash
   git checkout <PREVIOUS_STABLE_TAG_OR_COMMIT>
   npm ci --only=production
   pm2 reload device-pro
   ```
2. **Rollback Database (if schema changes were involved):**
   ```bash
   npm run restore
   ```
3. **Verify Health:**
   ```bash
   npm run smoke
   ```

---

## 7. Support & Escalation Directory

- **Technical Infrastructure & Hosting:** Lead Systems Engineer (`devops@devicepro.ng`)
- **Electrical Engineering & Safety:** COREN Lead Engineer (`engineering@devicepro.ng`)
- **Commercial & Customer Operations:** Commercial Director (`sales@devicepro.ng`)
- **Data Protection & Legal Compliance:** Data Protection Officer (`dpo@devicepro.ng`)
- **Emergency Escalation Hotline:** `+234 803 388 2268` (24/7 Priority Support)
