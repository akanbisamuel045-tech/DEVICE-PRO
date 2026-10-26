# DEVICE PRO — Quotation Review & Comparison Checklist
## Stage 8.4.2.1: Procurement Outreach Preparation & Intake Governance

> [!IMPORTANT]
> **GOVERNANCE NOTICE: HUMAN DECISION MAKING MANDATORY**  
> Under DEVICE PRO Procurement Governance Policy (ADR-016, ADR-018, ADR-020), **no automated algorithm may declare a winning supplier or automatically select the lowest bidder**. Every supplier selection must be reviewed by Finance and formally authorized by a distinct Superadmin under the Two-Person Rule.

---

### 1. Purpose & Application

This checklist defines the rigorous multi-point verification and commercial evaluation protocol to be applied to every supplier quotation spreadsheet received by DEVICE PRO. It operationalizes the Stage 8.2 pre-validation rules, Stage 8.3 reconciliation workflows, and Stage 8.4.1 dual-authorization standards.

---

### 2. Stage 1: Technical Intake & Data Integrity Verification

Every submitted file (`.xlsx`, `.xls`, or `.csv`) must pass through the automated intake gateway (`POST /api/admin/price-imports/intake` / `upload`) and satisfy these technical gates:

- [ ] **Exact Normalized SKU Matching:**
  - Every quoted row must match an active commercial product (`published: 1`, IDs 1–48) using exact normalized SKU comparison (`trim().toUpperCase()`).
  - **Zero Name-Only Matching:** Product names, descriptions, or keyword similarities must NEVER trigger an automated match without an exact SKU match.
- [ ] **Archived Benchmark Exclusion:**
  - The 70 soft-archived benchmark records (`SG-10K-HYBRID-NG`, `published: 0`, IDs 49–118) must NEVER be matched or populated through the quotation intake pipeline.
- [ ] **Duplicate File SKU Detection:**
  - If a supplier's spreadsheet contains duplicate rows for the same DEVICE PRO SKU, the batch must be flagged with `duplicate_skus_in_file` and halted for clarification.
- [ ] **Currency Integrity (NGN Only):**
  - Currency field must strictly be `"NGN"`.
  - Quotes submitted in USD, EUR, GBP, or CNY must be rejected. Zero implicit or automatic foreign exchange conversions are permitted.
- [ ] **Price Value Sanity & Non-Zero Invariant:**
  - Unit purchase costs must be positive finite numeric values (`cost > 0`).
  - Values that are zero, negative, `NaN`, non-numeric, or excessively high (> ₦100,000,000,000) must be rejected with validation errors.
  - Retail prices (`price_ngn`) must NEVER be substituted for acquisition costs.
- [ ] **Formula Injection & Script Neutralization:**
  - All input cells starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) must be sanitized to prevent spreadsheet formula injection attacks.
- [ ] **File Size & Memory Protection:**
  - Incoming files must not exceed the 4MB Multer memory buffer limit.

---

### 3. Stage 2: Quotation Freshness & Calendar Date Verification

The intake engine in `lib/price-import-engine.js` verifies quotation dates against strict calendar rules:

- [ ] **Quotation Date Format & Strict Calendar Limits:**
  - Date must be a valid calendar date (`YYYY-MM-DD` preferred, or delimited `DD/MM/YYYY`).
  - Calendar overflow dates (e.g. `2026-04-31`, or non-leap year `2025-02-29`) must be strictly rejected.
- [ ] **Date Ambiguity Gate:**
  - Any delimited date where day and month are both $\le 12$ and unequal (such as `04/05/2026`) must NOT be silently guessed.
  - It must either be accompanied by an explicit `options.dateFormat` parameter or flagged as `date_ambiguous` requiring human clarification.
- [ ] **30-Calendar-Day Freshness Window:**
  - Evaluated in West Africa Time (WAT / UTC+1).
  - Quotation date older than 30 calendar days from the date of review must be classified as `stale`.
  - A stale quotation cannot be used as an active acquisition baseline without formal written extension from the distributor.
- [ ] **Future Date & Expiry Gate:**
  - Quotation dates more than 1 day in the future must be flagged as `future_date`.
  - If the supplier's explicit expiry date has elapsed, the quote must be flagged as `expired`.
- [ ] **Review-Time Freshness Re-evaluation:**
  - Freshness must be re-evaluated automatically at the time the review is opened (`preparePriceImportForReview`).

---

### 4. Stage 3: Commercial & Technical Comparison Matrix

When competing quotations are received from multiple certified distributors, the Procurement Committee must prepare a side-by-side reconciliation table comparing the following 10 dimensions:

| Review Dimension | Evaluation Criteria | Mandatory Safeguard |
| :--- | :--- | :--- |
| **1. SKU & Model Match** | Exact match against active catalog specification. | If supplier proposed a substitution, it must be marked `SUBSTITUTION` and evaluated separately. Never silently treated as exact match. |
| **2. Brand & Spec Compatibility** | Tier-1 brand, power rating (W/kW), voltage (V), chemistry (LiFePO4). | Must meet or exceed catalog specifications; no downgrades permitted. |
| **3. Unit Acquisition Cost (NGN)** | Net purchase price per unit in Nigerian Naira. | Integer kobo precision verified. No foreign currency indexation. |
| **4. Date & Validity Window** | Valid quotation date within 30-day freshness window. | Expiry date must provide sufficient runway for procurement execution. |
| **5. Stock Availability** | Immediate quantity available in Nigerian warehouse. | Must meet current installation pipeline commitments or minimum batch threshold. |
| **6. Delivery Lead Time** | Warehouse dispatch lead time (days/weeks) to Lagos/Abuja. | Critical for project delivery SLA (standard: $\le 5$ business days in Lagos). |
| **7. Itemized Taxes & Logistics** | 7.5% VAT and freight charges to project sites. | Must be transparently itemized; cannot be hidden or ambiguous. |
| **8. Warranty & Authenticity** | Manufacturer warranty duration and local replacement facility. | Must have verified Nigerian RMA hub (not return-to-China). |
| **9. Distributor Status** | Status from Shortlist: `VERIFIED` vs `PARTIALLY_VERIFIED`. | Higher weighting assigned to manufacturer-authorized tier-1 distributors. |
| **10. Commercial Risk & Notes** | Payment terms, credit facilities, minimum order quantities (MOQ). | Identified commercial dependencies or supply chain risks documented. |

---

### 5. Stage 4: Strict Prohibitions & Invariant Enforcement

Before any recommendation is advanced to Finance and Superadmin:

- [ ] **PROHIBITION 1: No Automatic Lowest-Bid Selection:**
  - The cheapest quote must NEVER be automatically adopted. Total value, product authenticity, local warranty support, and delivery reliability must be weighted comprehensively.
- [ ] **PROHIBITION 2: No Direct Database Activation:**
  - Quotation intake and reconciliation are strictly analytical and non-destructive.
  - Uploading a file or reviewing a comparison table must NEVER update live `cost_price_ngn` fields in `products` collection.
  - Stage 8.5 remains unstarted and prohibited.
- [ ] **PROHIBITION 3: BOM Completeness Gate:**
  - If any component in a turnkey solar package lacks an approved genuine supplier cost, the BOM status remains `incomplete`, and `is_costing_complete` must evaluate to `false`.
  - Incomplete BOMs strictly disable gross margin calculations and cannot receive formal approval.
- [ ] **PROHIBITION 4: Dual-Authorization Separation (Two-Person Rule):**
  - **Step 1:** Finance Review by authorized `finance` or `superadmin` user (`reviewed_by_id`).
  - **Step 2:** Final Approval by distinct `superadmin` user (`approved_by_id`).
  - Reviewer and Approver user IDs and emails must strictly differ (`reviewer !== approver`).
  - If the same user attempts both actions, the server must reject with HTTP 403 Forbidden.

---

### 6. Stage 5: Sign-Off & Audit Trail

| Step | Responsible Role | Required Artifact / Evidence | Required Action |
| :--- | :--- | :--- | :--- |
| **1. Technical Intake** | Procurement Administrator | Verified import record in Admin Console | Ingest valid Excel/CSV, verify zero errors. |
| **2. Multi-Supplier Comparison** | Procurement Lead | Side-by-side reconciliation report | Document commercial differences, evaluate lead times and warranties. |
| **3. Finance Review (Step 1)** | Finance Manager (`finance`) | Recorded Finance Review (`reviewed_at`, `decision`, `notes`) | Verify unit costs, tax compliance, integer kobo arithmetic, and margin impact. |
| **4. Superadmin Approval (Step 2)** | Distinct Superadmin (`superadmin`) | Recorded Approval (`approved_at`, `approval_notes`, audit event) | Formal baseline authorization. Two-person rule enforced. |

---
*Classification: OFFICIAL GOVERNANCE CHECKLIST — DEVICE PRO PROCUREMENT*
