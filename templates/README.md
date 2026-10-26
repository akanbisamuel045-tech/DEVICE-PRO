# DEVICE PRO — Standardized Supplier Quotation Matrix Template
## Stage 8.1: Active Catalog SKU and Specification Matrix

### Overview
This directory contains the authoritative, standardized supplier quotation templates for DEVICE PRO's active commercial catalog.
These templates are designed for supplier price intake, quotations, and baseline cost reconciliation.

### Available Files
1. `DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx`:
   - Dual-sheet formatted Excel workbook.
   - Sheet 1: **Quotation Matrix** — Contains the 48 active commercial catalog products.
     - **Columns A–F (Protected Reference Data)**: DEVICE PRO Product SKU, Product Name, Brand, Category, Model Identifier, Technical Specifications.
     - **Columns G–O (Supplier Completion Fields)**: Supplier Name, Supplier Product SKU / Model Ref, Quoted Unit Cost (NGN), Currency, Quotation Date (YYYY-MM-DD), Quotation Expiry Date (YYYY-MM-DD), Product Availability, Warranty / Commercial Terms, Quotation Ref / Notes.
     - Sheet protection enabled with password protection (`DeviceProCatalog2026`) to prevent accidental overwriting of reference catalog identity.
     - Header formatting with navy blue brand styling for catalog reference columns and emerald green styling for supplier entry columns.
   - Sheet 2: **Instructions & Guidelines** — Complete instructions for suppliers on required formats, NGN currency restrictions, 30-day freshness policy, and date formatting.

2. `DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv`:
   - Plain CSV equivalent containing identical 15 columns and all 48 active commercial items.
   - Suitable for automated supplier ERP/B2B data pipelines and lightweight spreadsheet editors.

### Catalog Coverage (Stage 8.1 Baseline)
- **Total active commercial products**: 48 products across 8 categories:
  - Solar Panels: 6 products (JA Solar, Longi, Canadian Solar, Jinko Solar, Trina Solar)
  - Inverters: 6 products (Solis, Deye, Growatt, SMA, Victron Energy)
  - Batteries: 6 products (Pylontech, Dyness, BYD, Felicity Solar, Freedom Won)
  - Charge Controllers: 6 products (Victron Energy, Outback Power, Morningstar, EPEVER, SRNE)
  - Racking & Mounting: 6 products (K2 Systems, Renusol, Schletter, Unirac, Clenergy)
  - Protection & Switchgear: 6 products (Schneider Electric, ABB, Hager, Noark, Suntree)
  - Cables & Accessories: 6 products (KBE Elektrotechnik, Helukabel, Lapp Group, Top Cable, Prysmian)
  - Monitoring & Metering: 6 products (Victron Energy, Solar-Log, Carlo Gavazzi, Eastron, Schneider Electric)
- **Archived benchmark records**: Strictly excluded (0 Sungrow benchmark records present).

### Date Format and Ambiguity Policy (Stage 8.2 / 8 Final Verification)
- **Primary & Recommended Format**: ISO 8601 (`YYYY-MM-DD`). E.g., `2026-10-24`.
- **Accepted Delimited Formats**:
  - `DD/MM/YYYY` or `DD-MM-YYYY` (Standard West African / British convention).
  - `MM/DD/YYYY` (US convention).
  - Excel numeric date serials (e.g., 46319 for 2026-10-24).
- **Ambiguous Date Policy**:
  - Any date where both the first and second numeric components are $\le 12$ and unequal (such as `04/05/2026`, which could represent 4 May or 5 April) **cannot be silently guessed**.
  - Without an explicit format parameter (`options.dateFormat` set to `'DD/MM/YYYY'` or `'MM/DD/YYYY'`), the engine flags the record with status `date_ambiguous` and requires human commercial administrator clarification.
  - If components are identical (e.g., `05/05/2026`), the calendar day is unambiguous.
  - If the first component exceeds 12 (e.g., `24/10/2026`), it is parsed unambiguously as `DD/MM/YYYY`.
  - If the second component exceeds 12 (e.g., `10/24/2026`), it is parsed unambiguously as `MM/DD/YYYY`.
- **Strict Calendar Validation**:
  - Dates are verified against actual calendar limits. Month day overflow (such as `2026-04-31`, or `2025-02-29` in non-leap years) is strictly rejected and never silently converted to the following month.
  - Leap year boundaries (`2024-02-29` valid; `2025-02-29` invalid; `2000-02-29` valid; `1900-02-29` invalid) are strictly enforced.

### Freshness and Currency Policies (Stage 8.2)
- **Freshness Window**: 30 calendar days from the quotation date evaluated in West Africa Time (WAT / UTC+1). Quotations older than 30 days are flagged as `stale` and require human review.
- **Future Dates**: Dates more than 1 day in the future are flagged as `future_date` requiring verification.
- **Expired Quotes**: Quotes whose explicit expiry date has passed are flagged as `expired`.
- **Freshness Re-evaluation**: Freshness is automatically re-evaluated whenever a saved quotation batch is retrieved for administrator review.
- **Currency**: Canonical baseline costs must be quoted in Nigerian Naira (NGN). Unsupported currencies (USD, EUR, GBP, CNY) are rejected during validation and cannot proceed to approval. No implicit FX conversions are performed.
- **Safety**: Uploading or validating a quotation template NEVER updates live product retail prices or supplier costs. Approval and application require explicit multi-step authorization (Stage 6 workflow).

### Security and Data Protection
- **Spreadsheet Cell Protection**: Column protection in Excel is an administrative user-experience safeguard designed to prevent unintentional edits to reference SKU data. It is **not** an access control boundary or cryptographic security mechanism.
- **CSV & Excel Formula Injection Mitigation**: All text fields starting with formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically neutralized to prevent spreadsheet execution vulnerabilities when opened in Microsoft Excel or Google Sheets.
- **Confidentiality**: Exported quotation templates never contain internal margins, historical purchase costs, or unpublished benchmarks. Only public reference catalog data is included.

