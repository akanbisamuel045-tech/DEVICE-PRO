# DEVICE PRO — Architecture Decision Log

This file records important architectural and design decisions for the DEVICE PRO project.

---

## ADR-001: Custom-Built Platform

**Date:** 2026-10-09
**Status:** Accepted
**Context:** The business requires a complete website and commerce platform for solar energy solutions in Nigeria.
**Options Considered:**
1. Hosted template store (Shopify, WooCommerce)
2. Headless CMS with frontend
3. Custom-built platform

**Decision:** Build a custom platform using HTML5, CSS3, vanilla JavaScript, and Node.js/Express.
**Rationale:** Full control over the customer journey, solar calculator, consultative quotation workflow, and admin operations. Architecture document explicitly requests custom build.
**Consequences:** More development effort but maximum flexibility and no ongoing platform fees.
**Owner:** Project Owner (confirmed in architecture document)

---

## ADR-002: Technology Stack — Simplicity First

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Architecture §9.1 explicitly requests a straightforward stack. No React, Next.js, TypeScript, Tailwind, or microservices.
**Decision:** HTML5 + CSS3 + Vanilla JS + Node.js/Express + SQLite (dev) with EJS templating.
**Rationale:** Keep the project understandable, modular, and maintainable by any developer or AI agent. Minimal dependencies.
**Consequences:** No component-based framework benefits, but simpler debugging, faster page loads, and easier handoff.

---

## ADR-003: Database — SQLite for Development

**Date:** 2026-10-09
**Status:** Accepted (to be re-evaluated at Stage 12)
**Context:** Architecture §9.1 allows SQLite for early development but requires evaluation of concurrency and hosting before production.
**Decision:** Use SQLite via `better-sqlite3` for development. Re-evaluate PostgreSQL requirement before Stage 12 based on hosting choice and expected concurrent transactions.
**Rationale:** SQLite is simpler to set up, requires no separate server, and is sufficient for development and low-traffic production.
**Consequences:** Must assess write concurrency limits before production deployment. Migration path to PostgreSQL should remain feasible.

---

## ADR-004: Template Engine — EJS

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Need server-side rendering for SEO, shared layouts, and dynamic content.
**Options Considered:**
1. Plain HTML files (no shared layouts)
2. EJS (Embedded JavaScript)
3. Pug/Jade
4. Handlebars

**Decision:** Use EJS for server-rendered templates.
**Rationale:** EJS uses standard HTML syntax, is lightweight, well-maintained, widely understood, and integrates naturally with Express. Pug requires learning a new syntax. Handlebars is more limited for logic.
**Consequences:** Templates are `.ejs` files with `<%= %>` syntax. Familiar to any HTML developer.

---

## ADR-005: Typography — Inter Font Family

**Date:** 2026-10-09
**Status:** Proposed (pending brand review)
**Context:** Architecture §7.3 requests a "highly legible modern sans serif typeface." Reference site uses Inter + Sora + Space Grotesk.
**Decision:** Use Inter as the primary typeface, with system fonts as fallback.
**Rationale:** Inter is highly legible at all sizes, supports Latin Extended characters needed for Nigerian names, is free (Google Fonts), and is an industry-standard choice for professional web applications.
**Consequences:** Consistent with professional, engineering-led brand character described in architecture §7.1.

---

## ADR-006: Responsive Web First, No Native Apps

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Architecture §2.5 explicitly excludes native mobile apps from scope.
**Decision:** Build a responsive web experience that works on mobile phones, tablets, laptops, and desktops.
**Rationale:** Reaches all Nigerian customers through any modern browser. PWA capabilities can be added later if justified.

---

## ADR-007: Solar Calculator as Indicative Estimation Only

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Architecture §11 requires that calculator results are treated as indicative estimates, never as engineering designs.
**Decision:** All calculator outputs will be clearly labelled as "Indicative Estimate" with documented assumptions and a disclaimer requiring qualified engineer review.
**Rationale:** Safety and professional responsibility. Solar sizing affects electrical safety, structural load, and financial investment.
**Consequences:** Calculator formulas must be versioned, tested, isolated from UI, and approved by a competent solar engineer before commercial use.

---

## ADR-008: Progressive Multi-Step Consultation & Quotation Architecture

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Solar consultations and quotation requests require multiple pieces of property and electrical information (location, roof type, appliance load, budget) which can overwhelm users if presented as a single long form.
**Decision:** Implement consultation and quotation workflows as progressive 3-step forms (Contact Identity -> Property & Location -> Electrical Load & Scope) with step validation, sessionStorage state recovery, and accessible progress indicators.
**Rationale:** Higher conversion rates, lower drop-off, and reduced customer cognitive load, while retaining WhatsApp direct dispatch as an alternative path.
**Consequences:** Frontend must handle state persistence across steps without losing inputs on validation errors.

---

## ADR-009: 7 Reusable Page Layout Archetypes

**Date:** 2026-10-09
**Status:** Accepted
**Context:** The platform encompasses 62 distinct routes (42 public + 20 admin). Handcrafting custom layout structures for each page would cause maintenance bloat and inconsistent user experience.
**Decision:** Standardize all routes across 7 reusable layout archetypes: (1) Hero-Centric Landing, (2) Filterable Catalogue Grid, (3) Tabbed Technical Detail, (4) Progressive Multi-Step Form, (5) Reactive Sizing Tool Engine, (6) Editorial Policy/Guide, (7) Admin Operational Console.
**Rationale:** Dramatically accelerates frontend component reuse, ensures consistent responsive breakpoints (Mobile <640px, Tablet 640-1023px, Desktop ≥1024px), and eliminates dead-end routes.
**Consequences:** All future page views must conform to one of the 7 archetypes and follow established breadcrumb hierarchy.

---

## ADR-010: CSS Variable Design Tokens & Zero-Dependency Vanilla Components

**Date:** 2026-10-09
**Status:** Accepted
**Context:** Architecture §7 requires a unified, high-contrast, engineering-led design system avoiding excessive frameworks, runtime CSS-in-JS overhead, or decorative visual clutter.
**Decision:** Implement all design tokens using CSS Custom Properties in `public/css/tokens.css` and build a component library in `public/css/components.css` without third-party CSS dependencies. Color contrast must strictly fulfill WCAG 2.1 AA (≥4.5:1 for text, ≥3:1 for UI components).
**Rationale:** Guarantees sub-millisecond styling execution, zero dependency vulnerabilities, native browser performance on low-bandwidth Nigerian mobile connections, and seamless integration with server-rendered EJS templates.
**Consequences:** Developers must consume tokens via `var(--token-name)` and maintain semantic class names rather than applying inline arbitrary CSS styles.

---

## ADR-011: Cinematic Dark-First Visual Direction & Typography Alignment

**Date:** 2026-10-09
**Status:** Accepted
**Context:** User explicitly requested that the visual design match the aesthetic of the reference site (`https://www.solarworldelectric.com/index.html`), which features a cinematic, dark-first renewable energy brand identity with glowing solar energy accents, glassmorphism, and modern typography (`Sora`, `Inter`, `Space Grotesk`).
**Decision:** Adopt a cinematic dark-first visual foundation across the public experience: deep cosmic ink canvas (`#05070F`, `#0B0F1E`), solar gold/amber radiant gradients (`#F9B000` to `#F7931A`), high-efficiency solar green accents (`#32B768`), electric cyan/blue flow highlights (`#00D2FF`, `#1D68E2`), frosted glass header navigation, aurora ambient glows, pill badges with animated pulsing status dots, and live network metrics tickers. Maintain DEVICE PRO's original brand identity, logo, copywriting, and legal/engineering independence without copying proprietary assets or exact code.
**Rationale:** Creates an immediate "wow" factor, communicates immense technical competence and modern energy authority, while aligning directly with user expectations and Nigerian solar consumer psychology.
**Consequences:** Public hero, solution cards, package cards, and navigation default to dark glass aesthetics with high contrast (WCAG 2.1 AA verified). Clean light containers remain available for dense data sheets, receipts, and admin operation tables.


---

## ADR-012: Exact Reference Mockup Implementation & Authentic Brand Identity

**Date:** 2026-10-13
**Status:** Accepted
**Context:** The user provided an explicit visual specification (`Desktop.jpg`, 1728x7623px) containing the authentic DEVICE PRO brand identity and an exact 10-section homepage layout. Prior exploratory stages assumed a green/dark aesthetic with a synthetic hexagonal logo because the primary reference mockup had not yet been located.
**Decision:**
1. Faithfully implement the exact 10-section layout from `Desktop.jpg` in sequential order: (1) Header & Nav with search/cart/quote, (2) Editorial Hero with dual CTAs, stats bar, and sunset villa background, (3) Value Proposition split editorial with lifestyle imagery, (4) Social Proof Metrics, (5) Tailored Solutions residential & commercial split cards, (6) Step-by-Step Transition alternating photo-and-text cards, (7) Product Category Grid with photography cards, (8) Free Consultation with booking form and showroom advisor imagery, (9) High-impact Evening CTA Banner, and (10) Comprehensive 5-column Footer with newsletter and legal bar.
2. Formalize the sampled reference brand palette: Primary Solar Gold (`#EBB531`), Night Navy (`#0A121F`), Editorial Dark Navy (`#0B132B`), Accent Blue (`#284C86`), Off-White (`#F8F9FA`), and Warm Cream (`#F5F4F0`).
3. Vectorize and implement the authentic DEVICE PRO logo: DP geometric monogram with solar triangle accent and bold typographic wordmark (`logo.svg`, `logo-white.svg`, and transparent high-res PNG alternatives).
4. Implement clean photo crops blended with hardware-accelerated CSS gradient overlays to eliminate baked-in mockup text artifacts while ensuring responsive crispness across all viewports.
**Rationale:** Directly fulfills the user's primary requirement for an exact visual match to the provided reference design, establishes real brand consistency, and provides production-grade responsiveness and accessibility.
**Consequences:** Replaces the temporary green-themed mockup styling on the homepage with the authentic DEVICE PRO Navy/Gold visual identity, verified WCAG 2.1 AA compliant across all 10 sections.

---

## ADR-013: Sunfold Architectural Solar Aesthetic & Reduced Side Margins

**Date:** 2026-10-13
**Status:** Accepted
**Context:** User provided a reference visual specification ("Sunfold" solar design) featuring an airy, luminous sky aesthetic, centered commanding display typography, custom 3D isometric architectural renders, an asymmetric bento grid, and wide responsive page bounds. The user specifically requested:
1. Implement the Sunfold design style into the current website.
2. Do not crop images from mockups or screenshots; instead, create custom high-resolution images from scratch.
3. Reduce excessive side margins so the layout spans expansively across desktop viewports.
**Decision:**
1. **Side Margin Reduction:** Expanded `--site-max-width` from `1360px` to `1560px` and adjusted container padding to `clamp(1rem, 2.5vw, 2.25rem)`, reducing dead margins on widescreen displays (1920px) by over 200px while maintaining responsive gutters.
2. **Custom 3D Assets Generated from Scratch:**
   - `sunfold-hero-house.jpg`: 3D architectural modern villa with integrated solar roof and EV.
   - `sunfold-bento-residential.jpg`: 3D isometric residential villa with photovoltaic array.
   - `sunfold-bento-carport.jpg`: 3D isometric solar carport canopy with EV charging.
   - Vector 3D wireframe perspective solar array schematic in pure SVG.
3. **Sunfold Architectural Solar Design System:**
   - Luminous sky atmosphere radial gradient (`#D8ECFD` -> `#F4F8FC` -> `#FFFFFF`).
   - Frosted modern glass navbar with dark navigation links and sleek black pill CTA button.
   - Floating pill badges (`.sunfold-pill-badge`) with yellow solar indicator dots.
   - Centered manifesto section with inline emoji chips (`🌍`, `☀️`, `⚡`) and 3-column stats bar.
   - Infinite marquee ticker ribbon: `Our Expertise — Our Expertise`.
   - 2-column asymmetric Bento Grid for Solar Production, Self-Consumption, and Agro-Systems.
   - 3 Floating white feature cards with circular icon badges.
   - High-impact deep navy CTA block with 3 timeline perks and white pill CTA button.
   - Clean minimalist white footer with subtle background watermark (`DEVICE PRO`).
**Rationale:** Directly fulfills user aesthetic requests with custom, uncropped 3D assets, produces an expansive modern look on desktop viewports, and preserves DEVICE PRO's brand integrity, performance, and accessibility.
**Consequences:** The homepage adopts a modern, luminous, Scandinavian-inspired architectural solar aesthetic, fully compliant with WCAG 2.1 AA contrast requirements with zero horizontal overflow.

---

## ADR-014: Canonical Supplier Cost Field Resolution & Controlled Application Architecture

**Date:** 2026-10-23  
**Status:** Accepted  
**Context:** During Stage 6 implementation of the Supplier Price Review, Approval and Controlled Application workflow, an inspection of the repository revealed historical usage of both `cost_price_ngn` and `supplier_cost_ngn`. A canonical supplier purchasing cost field was required to ensure database consistency, prevent silent data reinterpretation, and strictly preserve customer-facing retail selling price isolation.

**Decision:**
1. Formally designate `cost_price_ngn` as the authoritative canonical supplier purchasing cost field for DEVICE PRO across all database models, repository methods, administrative catalog forms, and supplier import applications.
2. Maintain conservative backward compatibility for read queries by evaluating `product.cost_price_ngn !== undefined ? product.cost_price_ngn : (product.supplier_cost_ngn || 0)`.
3. Enforce strict isolation between supplier purchasing costs (`cost_price_ngn`) and customer retail selling prices (`price_ngn`):
   - Approved supplier cost applications update exclusively `cost_price_ngn` via atomic `$set`.
   - Retail selling prices (`price_ngn`), promotional pricing, active inventory stock quantities (`stock_quantity`), active customer orders, quotations, and turnkey solar package prices are never modified by supplier cost updates.
4. Enforce strict lifecycle gating (`analysed` -> `awaiting_approval` -> `approved_for_application` -> `applying` -> `successfully_applied` / `partially_applied` / `cancelled`) with concurrency locks and tamper-evident audit logging (`APPROVE_PRICE_IMPORT`, `PRICE_IMPORT_APPLIED_ROW`, `APPLY_PRICE_IMPORT`, `CANCEL_PRICE_IMPORT`).

**Rationale:** Aligns with Mongoose schema definitions, catalog management forms in `admin.html`, and Stage 4 test assertions, providing absolute price separation and zero risk of live retail price disruption.  
---

## ADR-015: Supplier Price Intelligence, Margin Analysis & Advisory Pricing Recommendation Architecture

**Date:** 2026-10-23  
**Status:** Accepted  
**Context:** Stage 7 required the introduction of a comprehensive profit margin analysis and advisory pricing intelligence system within the administrative console. The core requirement was providing executives with visibility into unit gross profit, margin percentages, cost markups, genuine historical cost trends, and target margin simulations, while maintaining a strict prohibition against automated catalog repricing or unintended exposure of confidential supplier metrics.

**Decision:**
1. **Advisory Semantics Only (Zero Automated Mutations):**
   - The price intelligence system is strictly analytical. No recommendation, simulation, or threshold alert can modify customer retail selling prices (`price_ngn`), supplier costs (`cost_price_ngn`), promotional prices (`previous_price_ngn`), or inventory quantities (`stock_quantity`).
   - Calculated indicative selling prices ($\text{Supplier Cost} / (1 - \text{Target Margin})$) are displayed exclusively in an interactive simulator dialog (`#modal-indicative-price`) with prominent advisory disclosures. They are never persisted automatically to the catalog.
2. **Standardized Profitability Formulations:**
   - $\text{Estimated Gross Profit Before Other Costs} = \text{Selling Price} - \text{Supplier Cost}$.
   - $\text{Gross Margin \%} = ((\text{Selling Price} - \text{Supplier Cost}) / \text{Selling Price}) \times 100$. Division by zero is protected ($Selling Price \le 0$ results in `Unavailable`).
   - $\text{Markup \%} = ((\text{Selling Price} - \text{Supplier Cost}) / \text{Supplier Cost}) \times 100$.
   - Operating expenses (shipping, duties, payment fees, installation labour, warranty, VAT) are explicitly excluded and disclosed as such.
3. **Verified Supplier Cost History Only:**
   - Historical supplier cost movements are derived solely from verified applied price imports (`status: 'successfully_applied' | 'partially_applied'` with item status `applied`) and correlated `PRICE_IMPORT_APPLIED_ROW` audit log events. Analysed, unapplied, or cancelled imports are strictly excluded.
4. **Data Isolation & Active Product Filtering:**
   - Commercial profitability dashboards evaluate only active commercial items (`published: 1`), explicitly excluding the 69 archived benchmark records (`SG-10K-HYBRID-NG`) created during stress testing.
   - Products lacking supplier costs are labeled honestly with `has_missing_cost: true` and display `Unavailable` margins rather than fabricating zero-cost statistics.
5. **Role-Based Confidentiality & Server Enforcement:**
   - Access to `/api/admin/price-intelligence/*` is restricted to `superadmin` and `admin`. Customers, unauthenticated visitors, and unprivileged staff (`sales`, `engineer`) receive 401 or 403. Public product APIs continue stripping all cost and margin fields.

**Rationale:** Prevents unintended pricing errors, maintains data confidentiality, upholds financial integrity through transparent disclaimers, and ensures all repricing decisions require explicit human authorization.  
**Consequences:** Administrators gain clear visibility into product margins and cost movements without any risk of inadvertent catalog disruptions.

---

## ADR-016: Supplier Cost Baseline Preparation, Intake Validation & Benchmark Data Retention Policy (Stage 8.1–8.3)

**Date:** 2026-10-24  
**Status:** Accepted (Owner Approved)  
**Context:** Independent verification of Sub-stages 8.1 (Catalog Matrix Template), 8.2 (Supplier Intake & Pre-Validation), and 8.3 (Controlled Batch Reconciliation & Invariance) was completed with 268/268 tests passing across 10 test suites and certified in `reports/DEVICE_PRO_ADMIN_STAGE_8_FINAL_VERIFICATION.md`. Project owner decisions were required regarding catalog benchmark data retention (OD-8.1), operational supplier quotation intake channels (OD-8.2), and the timing of live supplier cost activation (OD-8.3).

**Decision:**
1. **OD-8.1 Benchmark Data Retention & Catalog Baseline Invariance:**
   - **Retain 70 Archived Benchmark Records**: All 70 soft-archived Sungrow benchmark documents (`sku: 'SG-10K-HYBRID-NG'`, `published: 0`, IDs 49–118) in MongoDB Atlas must be retained intact. They must not be hard-deleted, modified, or truncated pending a separate, dedicated business data-retention decision.
   - **Active Commercial Catalog Baseline**: Formally record that the active commercial catalog consists of **exactly 48 products** (`published: 1`, IDs 1–48) across 8 categories, and currently has **zero verified supplier acquisition cost baseline** (`cost_price_ngn: null/0`).
   - **Test Teardown Safeguards**: Automated test suites (specifically `tests/stage13_cart_admin.test.js`) must strictly clean up their created test fixtures upon test completion to eliminate persistent benchmark leakage.
2. **OD-8.2 Administrative Supplier Quotation Intake Channel:**
   - **Approved Template Formats**: Adopt the standardized 48-item dual-sheet Excel matrix (`templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx`) and RFC 4180 CSV matrix (`templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv`) as the authoritative quotation collection format for Tier-1 equipment distributors.
   - **Operational Workflow**: Commercial administrators export the template, transmit it to distributor sales desks, and upload the returned matrix via `POST /api/admin/price-imports/intake`.
   - **Intake Safeguards**: Enforce exact normalized SKU matching, 30-day freshness windows evaluated in WAT (UTC+1), calendar-validated date parsing preventing month-day rollovers, ambiguous date rejection (`date_ambiguous`), NGN currency restrictions (zero implicit FX conversions), and formula injection sanitization (`=`, `+`, `-`, `@`).
   - **Multi-Supplier Comparison**: Competing quotations from multiple distributors are presented transparently side-by-side with lowest-cost indicators via `compareSupplierQuotations`, without automated winner selection.
3. **OD-8.3 Deferred Supplier Cost Baseline Activation:**
   - **Strict Cost Application Deferral**: Supplier cost baseline activation is strictly deferred until genuine supplier quotations have been collected, ingested, reconciled, reviewed, and explicitly authorized by commercial management.
   - **Deferred Stages**: Stage 8.4 (Solar package bill of materials) and Stage 8.5 (Final supplier cost baseline activation) remain deferred and must not be implemented until explicit owner authorization.
   - **Safety Boundary**: Zero supplier costs applied to live catalog products; zero customer retail price changes; zero production or Vercel deployment.

---

## ADR-017: Solar Package Bill of Materials (BOM) Architecture, Costing Provenance & Revision Governance (Stage 8.4)

**Date:** 2026-10-24  
**Status:** Accepted (Owner Approved with Documented Limitations — 2026-10-24)  
**Context:** Stage 8.4 required designing and implementing an administrator-controlled Bill of Materials (BOM) system for the 6 turnkey solar packages in DEVICE PRO. Prior to Stage 8.4, package specifications existed only as hardcoded text strings in `PACKAGE_METADATA` within application memory, with no database persistence, no component linkage, no quantities or units of measure, and no cost tracking. A structured, auditable BOM system was needed while strictly preventing automated repricing, cost fabrication, inventory mutations, or leakage of internal costing to public endpoints.

**Decision:**
1. **Dedicated Database Model (`PackageBom`):**
   - Implemented `PackageBom` collection in MongoDB Atlas referencing turnkey solar package products (`Product.id`, category `'solar-packages'`).
   - Supports itemized hardware component lines and non-product service cost lines (installation labour, logistics/delivery, distribution board BOS hookup, commissioning).
   - Component lines support quantities, units of measure (`pcs`, `meters`, `sets`, `roll`, `lot`, `hours`, `units`), optional waste allowances (0–100%), and cost sources.
2. **Catalog Product Linkage & Historical Snapshots:**
   - Active commercial products (`published: 1`) can be linked to BOM components. Soft-archived benchmark products (`published: 0`) and turnkey solar packages (circular reference guard) are strictly excluded from component selection.
   - When a catalog product is linked, its `product_sku` and `product_name` are captured as immutable snapshots, protecting existing BOM revisions from future catalog modifications or archivals.
3. **Strict Cost Provenance & Missing Cost Rule:**
   - Distinguishes between `verified_supplier_quote`, `catalog_documented_cost`, `manual_sourced_cost`, and `unknown`.
   - Missing costs are stored as `null` and counted in `missing_cost_lines_count`. Missing costs are **never silently interpreted as zero**.
   - Commercial retail selling prices (`price_ngn`) and reference strike-through prices (`previous_price_ngn`) are never treated or copied as supplier acquisition costs.
4. **Internal Gross Margin Estimation & Price Safety:**
   - Gross profit and gross margin are calculated only when costing is 100% complete and verified (`is_costing_complete === true`).
   - Formula: $\text{Gross Profit} = \text{Retail Price} - \text{Total Estimated Cost}$; $\text{Gross Margin \%} = (\text{Gross Profit} / \text{Retail Price}) \times 100$.
   - BOM calculations are strictly internal planning estimates and never alter commercial retail selling prices or public catalog displays.
5. **Revision Governance & Concurrency Control:**
   - Every modification increments the BOM `revision` number and snapshots the prior revision into `history`.
   - Optimistic concurrency control rejects conflicting concurrent edits with HTTP 409 Conflict if `base_revision` is stale.
   - Dedicated `APPROVE_BOM` workflow is restricted to authorized roles and enforces 100% complete costing before approval can occur.
6. **Confidentiality & Audit Logging:**
   - Public package endpoints (`/api/packages`, `/api/packages/:slug`) strictly exclude internal BOM components, costs, and private notes.
   - Operations emit structured audit events (`CREATE_BOM`, `UPDATE_BOM_REVISION`, `APPROVE_BOM`) to the persistent `AuditLog` collection.

**Rationale:** Solves the historical lack of structured BOM persistence, establishes auditable package component modeling, guarantees mathematical and currency precision, protects customer pricing integrity, and maintains complete separation between internal cost estimation and public commerce.  
**Consequences:** Administrators gain full visibility into turnkey package assembly costs and component requirements, while live catalog prices, supplier baselines, and commercial storefront operations remain 100% safe and invariant.

---

## ADR-018: Solar Package BOM Governance, Dual Authorization Policy & Tariff Deferral (Stage 8.4 Owner Approval)

**Date:** 2026-10-24  
**Status:** Accepted (Owner Decisions Recorded; Dual Authorization Pending Implementation)  
**Context:** Following the delivery of Stage 8.4 (`reports/DEVICE_PRO_ADMIN_STAGE_8_4_BOM.md`) and verification of 32/32 tests in `tests/stage28_solar_package_bom.test.js`, the project owner reviewed the implementation report and rendered formal governance decisions regarding BOM approval, missing supplier cost baselines, approval authority roles, and service/logistics tariffs.

**Decision:**
1. **OD-8.4.1: Stage 8.4 Approval with Documented Limitations:**
   - Formally approve Stage 8.4 based on verified project evidence and automated tests.
   - Authoritative report reference: `reports/DEVICE_PRO_ADMIN_STAGE_8_4_BOM.md`.
2. **OD-8.4.2: Missing Supplier Cost Policy:**
   - Linked hardware components must remain in `missing_cost` validation status and the BOM must remain `incomplete` until genuine supplier acquisition costs are obtained, ingested, validated, and reviewed.
   - Supplier cost intake must strictly follow the approved Stage 8.2/8.3 intake matrix workflow (`templates/`).
   - Commercial retail selling prices (`price_ngn`) and promotional prices (`previous_price_ngn`) must **never** be substituted for supplier acquisition costs.
   - Missing costs must **never** silently become zero or default values.
3. **OD-8.4.3: BOM Approval Authority & Dual Authorization Policy:**
   - Adopt dual authorization as the formal target policy for BOM approval:
     1. Finance role reviews the BOM and its documented cost sources.
     2. A distinct, authorized Superadmin provides final approval.
     3. The system records both identities, timestamps, and audit events.
     4. Incomplete costing strictly prevents formal approval.
     5. One individual user must not satisfy both approval steps.
   - **Current Implementation Code Verification**:
     - Inspection of `db/mongo/repository.js` (`approvePackageBom`) and `server.js` (`POST /api/admin/solar-packages/:id/bom/approve`) confirms that the current system enforces a **single-step Superadmin approval** (`requireRole('superadmin')`) coupled with strict completeness checking (`cost_summary.is_costing_complete === true`).
     - A two-party dual authorization requirement (Finance review + distinct Superadmin approval) is **NOT currently implemented** in code or schema.
     - **Status**: Dual authorization is recorded as **PENDING IMPLEMENTATION AND OWNER VERIFICATION**. The project documentation and records must not claim the current system enforces dual authorization until the two-step mechanism is developed, tested, and verified.
4. **OD-8.4.4: Deferral of Service & Logistics Tariffs:**
   - Standardized flat rates and regional tariffs for installation labour, balance of system (BOS) materials, and freight across Lagos, Abuja, Port Harcourt, and nationwide zones are explicitly deferred.
   - No estimated rates or tariffs may be invented.
   - Until documented, verified cost sources exist, affected non-product lines must remain explicitly flagged as estimates or missing costs, and cannot cause an otherwise incomplete BOM to appear complete.
5. **Operational Boundaries & Deferred Stages:**
   - Zero supplier costs activated across commercial catalog products (`cost_price_ngn: null/0`).
   - Zero retail price or inventory stock changes.
   - Zero production or Vercel deployment.
   - Stage 8.5 (Final supplier cost baseline activation) remains strictly deferred and prohibited until explicit owner authorization.

**Rationale:** Establishes unambiguous executive governance for solar package BOM management, enforces financial integrity without premature cost assumptions, and provides a clear roadmap for dual authorization controls.  
**Consequences:** Internal costing is rigorously bounded by evidence; dual authorization is scheduled for future implementation; and customer pricing remains completely protected.

---

### ADR-019: Dual-Authorization Enforcement for Solar Package BOM Approval (Stage 8.4.1)

**Status:** Implemented & Verified  
**Date:** October 26, 2026  
**Context:**  
In Stage 8.4 (ADR-018 / OD-8.4.3), the business owner mandated a dual-authorization policy for Solar Package Bill of Materials (BOM) approval to eliminate single-point superadmin sign-off risk. The documented gap required:
1. A finance-authorized user reviews the BOM and its costing sources.
2. A distinct superadmin performs final commercial approval.
3. Both actions are recorded with responsible user identity, email, timestamp, and audit trail.
4. The same user cannot perform both steps (Two-Person Rule).
5. Incomplete costing cannot be reviewed positively or approved.
6. BOM modifications after review invalidate the review.

**Decision:**
1. **Role Model Integration:**
   - Formally added `'finance'` to administrative roles dictionary (`ADMIN_ROLES` in `server.js`, `ALLOWED_ADMIN_ROLES` in `scripts/provision-admin.js`).
   - Granted the `finance` role access to `/api/admin/solar-packages` (catalog list), `/api/admin/solar-packages/:id/bom` (BOM detail), and `/api/admin/solar-packages/:id/bom/review` (review submission).
2. **Step 1: Finance Review Endpoint:**
   - Implemented `POST /api/admin/solar-packages/:id/bom/review`, protected by `requireAuth, requireRole('finance', 'superadmin')`.
   - Requires 100% complete costing (`is_costing_complete === true`) before a positive (`'reviewed'`/`'approved'`) review can be submitted. Missing supplier costs strictly return HTTP 400.
   - Enforces optimistic concurrency via `base_revision` matching `bom.revision` (HTTP 409 conflict on stale review attempts).
   - Records reviewer stable identity (`reviewed_by_id`, `reviewed_by_email`), timestamp (`reviewed_at`), revision (`revision_reviewed`), decision (`decision`), and optional notes (`notes`).
   - Transactional audit log emission: `REVIEW_BOM` (for positive review) or `REJECT_BOM_REVIEW` (for rejections) with `throwOnError: true`.
3. **Step 2: Distinct Superadmin Final Approval:**
   - Updated `POST /api/admin/solar-packages/:id/bom/approve`, protected by `requireAuth, requireRole('superadmin')`.
   - Requires valid positive Finance review (`bom.finance_review.status === 'reviewed'`).
   - Requires exact revision match (`bom.finance_review.revision_reviewed === bom.revision`).
   - Enforces the **Two-Person Rule**: `approverId !== reviewerId` AND `approverEmail !== reviewerEmail`. If the approver is identical to the reviewer, the operation is blocked with HTTP 403 Forbidden (`Two-person rule violation`) and logs a `DENY_BOM_APPROVAL` security audit event.
   - Requires 100% complete costing at approval time.
   - Preserves historical snapshots with full dual-authorization metadata (`finance_review_snapshot`, `approved_by_id`, `approved_by_email`, `approved_at`).
   - Transactional audit log emission: `APPROVE_BOM` with `throwOnError: true`.
4. **Revision Invalidation Invariant:**
   - Whenever an existing BOM revision is modified via `savePackageBomRevision`, the method automatically resets `bom.finance_review.status = 'invalidated'`, records `invalidated_at: new Date()`, and logs `INVALIDATE_BOM_REVIEW`. Any subsequent final approval attempt is rejected until a new finance review is completed for the updated revision.
5. **Database Model Extension:**
   - `packageBomSchema` in `db/mongo/models.js` extended with `finance_review` subdocument (`status`, `reviewed_by_id`, `reviewed_by_email`, `reviewed_at`, `decision`, `notes`, `revision_reviewed`, `invalidated_at`), `approved_by_id`, `approved_by_email`, `approved_at`, and historical snapshots.
6. **Administrator Interface Governance:**
   - Updated `#modal-bom-editor` with `#bom-dual-auth-card` banner showing Step 1 Finance Review and Step 2 Superadmin Final Approval statuses.
   - Dynamic button controls (`#btn-review-bom`, `#btn-approve-bom`) react to session role, costing completeness, review status, and self-review warnings (`#bom-dual-auth-violation-warning`).

**Consequences:**
- Closed the dual-authorization governance gap permanently with authoritative server-side validation.
- The two-person rule cannot be bypassed by client-side tampering or forged request parameters.
- Revisions are fully auditable with dual timestamps, distinct user IDs, and structured audit logs.
- Public packages endpoints (`/api/packages`, `/api/packages/:slug`) remain 100% sanitized with 0 exposure of internal BOM costs, supplier figures, reviewer info, or approval details.
- Verified by 28 automated tests in `tests/stage29_bom_dual_authorization.test.js` and 32 regression tests in `tests/stage28_solar_package_bom.test.js`.

---

### ADR-020: Supplier Cost Baseline Establishment Readiness & Procurement Protocol (Stage 8.4.2)

**Status:** Implemented & Verified (Readiness Stage; Genuine Evidence Pending)  
**Date:** October 26, 2026  
**Context:**  
Following the implementation and verification of Stage 8.4.1 dual authorization, Stage 8.4.2 was initiated to establish a verified supplier acquisition cost baseline for DEVICE PRO's 48 active commercial catalog products using authentic distributor quotations under the approved Stage 8.2 intake and Stage 8.3 reconciliation workflows.

Mandatory scope boundaries required:
1. Zero fabrication of supplier quotations, prices, vendor identities, or quotation dates.
2. Stopping at the readiness and intake stage if genuine supplier quotations are not available in the workspace.
3. Prohibiting retail prices from being treated as supplier costs.
4. Prohibiting automatic selection of a winning supplier when competing quotes exist.
5. Prohibiting supplier cost activation (Stage 8.5 remains unstarted).
6. Preserving all catalog retail prices, promotional prices, stock quantities, and benchmark products.

**Decision:**
1. **Intake Gateway & Route Hardening:**
   - Supported `POST /api/admin/price-imports/intake` (aliased with `/upload`) in `server.js` with strict authentication (`requireAuth`), administrative authorization (`requireRole('superadmin', 'admin')`), and Multer 4MB bounded memory storage.
   - Verified template availability in `templates/` (`DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx` and `.csv`).
2. **Strict Non-Fabrication & Evidence Gating:**
   - Confirmed through read-only inspection that zero distributor quotation files were present in the repository or submitted by external vendors.
   - In accordance with Section 2 of the Stage 8.4.2 mandate, zero synthetic prices or vendor quotations were invented.
   - All 48 active commercial catalog products retain `cost_price_ngn: null/0` (status: `MISSING_COST`).
3. **Pre-Validation & Reconciliation Engine Validation:**
   - Enforced exact normalized SKU matching against active commercial products only (`published === 1`).
   - Strictly excluded all 70 soft-archived benchmark products (`SG-10K-HYBRID-NG`, `published: 0`).
   - Enforced 30-calendar-day quotation freshness window in West Africa Time (WAT / UTC+1).
   - Enforced strict calendar date validation (preventing calendar rollovers like `2026-04-31` or non-leap year `2025-02-29`).
   - Rejection of ambiguous date formats (e.g. `04/05/2026`) unless explicit `options.dateFormat` is provided.
   - Strict currency restriction: NGN is the sole supported currency. Foreign currencies (USD, EUR, GBP, CNY) are strictly rejected with zero implicit foreign exchange conversions.
   - Rejection of negative, zero, non-numeric, and excessive prices (> ₦100,000,000,000).
   - Multi-supplier comparison (`compareSupplierQuotations`) groups quotes side-by-side without automatically declaring lowest-price winners.
4. **Cost Baseline & BOM Safeguards:**
   - Missing supplier costs remain missing (`null`), never zero or retail price.
   - Any BOM with missing component costs remains incomplete (`is_costing_complete: false`), gross margin analysis is disabled, and approval is blocked with HTTP 400.
   - Two-Person Rule and revision invalidation remain strictly enforced.
5. **Decisions Recorded for Owner Review:**
   - **OD-8.4.2.1 (Procurement Quotation Collection Authorization)**: Authorize procurement operations to distribute `templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx` to certified distributors to collect authentic acquisition prices.
   - **OD-8.4.2.2 (Multi-Supplier Review Protocol)**: Reconfirm that multi-supplier quotes must be reviewed by Finance and approved by Superadmin without automated lowest-bid selection.
   - **OD-8.4.2.3 (Stage 8.5 Activation Readiness Gate)**: Reiterate that live catalog supplier cost activation remains prohibited until authentic quotations are ingested and approved.

**Consequences:**
- The technical readiness of the quotation intake and reconciliation subsystem is 100% verified.
- 134 automated tests passing cleanly with zero failures across 5 test suites (`tests/stage30_supplier_cost_baseline.test.js`, `tests/stage27_supplier_baseline_reconciliation.test.js`, `tests/stage28_solar_package_bom.test.js`, `tests/stage29_bom_dual_authorization.test.js`, `tests/stage25_security_verification.test.js`).
- Complete database invariance: zero mutations to active products (48), benchmark records (70), solar packages (6), orders (412), customer accounts (310), quotes (182), or enquiries (147).
- Stage 8.5 remains untouched.

---

### ADR-021: Procurement Outreach Preparation and Distributor Shortlist Protocol (Stage 8.4.2.1)

**Status:** Implemented & Verified (Preparation & Governance Only; External Transmission Halted)  
**Date:** October 26, 2026  
**Context:**  
Following owner approval of Owner Decision OD-8.4.2.1, Stage 8.4.2.1 was executed to prepare the formal procurement outreach package for obtaining authentic wholesale quotations from certified Nigerian solar equipment distributors.
Mandatory scope boundaries required preparation and verification only: zero external communications, zero supplier cost activations, zero production changes, zero data fabrication, and zero automated lowest-bid selection.

**Decision:**
1. **Template Integrity & Cell Protection Verification:**
   - Re-verified `templates/DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx` and `DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv`.
   - Confirmed both artifacts contain exactly the 48 active commercial catalog products (IDs 1–48) and strictly exclude all 70 archived benchmark items (`SG-10K-HYBRID-NG`).
   - Verified that catalog reference columns (A–F) are locked under password protection (`DeviceProCatalog2026`), and supplier entry columns (G–O) are unlocked (`locked: false`).
   - Verified that unit purchase cost cells are completely unpopulated (0 fabricated prices).
2. **Distributor Candidate Research & Shortlist Protocol:**
   - Conducted structured empirical research across public registries, corporate websites, and manufacturer partner directories.
   - Identified 14 distinct candidates categorized under strict verification statuses:
     - 8 `VERIFIED` candidates (Gennex Technologies, Simba Solar/Simba Group, Felicity Solar Nigeria, PRAG Electroniks, Fouani Nigeria, EcoFlow Nigeria, itel Energy, JFO Energy Solutions).
     - 4 `PARTIALLY_VERIFIED` candidates (ME3 Energy, Solar Depot Nigeria, GreenKapital Energy, Rubitec Solar).
     - 1 `UNVERIFIED` candidate (Deepoint West Africa - overseas exporter with unverified Nigerian entity and naira pricing).
     - 1 `EXCLUDE` candidate (Wavetra Energy - documented cessation of regular commercial business operations).
   - Recorded candidate details, official websites, verified contacts, and source URLs in `reports/DEVICE_PRO_ADMIN_STAGE_8_4_2_1_DISTRIBUTOR_SHORTLIST.csv`. Prohibited generic placeholders and fabricated email addresses.
3. **Outreach Email Package & Governance Requirements:**
   - Authored `reports/DEVICE_PRO_ADMIN_STAGE_8_4_2_1_OUTREACH_EMAIL_DRAFT.md` prominently marked **DRAFT FOR OWNER REVIEW ONLY — DO NOT SEND**.
   - Enforced 9 core procurement requirements: exact SKU matching, mandatory explicit disclosure of substitutions (`SUBSTITUTION`), strict Nigerian Naira (NGN) currency, 30-day price validity window, stock availability, itemized taxes (VAT) and freight, local Nigerian warranty terms, product authenticity credentials, and corporate registration (CAC/TIN).
   - Formally disclaimed purchase order guarantees and reiterated that automated award selection is prohibited.
4. **Quotation Review & Human Decision Checklist:**
   - Authored `reports/DEVICE_PRO_ADMIN_STAGE_8_4_2_1_QUOTATION_REVIEW_CHECKLIST.md` operationalizing Stage 8.2 pre-validation, Stage 8.3 reconciliation, and Stage 8.4.1 dual-authorization standards.
   - Mandated human-only supplier selection: automated lowest-bid selection is explicitly prohibited. Two-Person Rule (Finance Review by `finance`, distinct Final Approval by `superadmin`) remains strictly enforced.
5. **Decisions Recorded for Owner Review:**
   - **OD-8.4.2.1.1 (Shortlist Approval)**: Owner review and approval of the 8 `VERIFIED` and 4 `PARTIALLY_VERIFIED` candidates.
   - **OD-8.4.2.1.2 (Outreach Dispatch Authorization)**: Explicit owner authorization required prior to dispatching any external email or spreadsheet.

**Consequences:**
- Procurement outreach package is 100% prepared, audited, and tested.
- 15 automated verification tests passing cleanly with 0 failures in `tests/stage30_1_procurement_outreach.test.js`.
- Complete database invariance: zero mutations to products (118), solar packages (6), orders (412), customer accounts (310), quotes (182), or enquiries (147).
- Zero external communications sent. Stage 8.5 remains untouched.

---

### ADR-022: Supplier Cost Activation Readiness and Evidence Audit Outcome (Stage 8.5.1)

**Status:** Completed & Factually Verified (Read-Only Audit — Live Activation Strictly Blocked)  
**Date:** October 26, 2026  
**Context:**  
Stage 8.5.1 was initiated as a strictly read-only audit to evaluate the current repository, MongoDB Atlas database, quotation evidence inventory, and control implementations to determine whether DEVICE PRO is ready to proceed toward controlled supplier cost activation.
The audit operated under mandatory restrictions:
1. Strictly read-only audit: zero supplier costs activated, zero retail prices or stock quantities changed, zero customer/order records touched.
2. Zero data fabrication: zero invented, estimated, or inferred supplier quotations or costs.
3. Prohibiting missing supplier costs from being defaulted to zero or retail selling price.
4. Preserving the 70 soft-archived benchmark records (`SG-10K-HYBRID-NG`).
5. Zero external communications dispatched.
6. Zero production deployments.
7. Stages 8.5.2, 8.5.3, and 8.5.4 strictly deferred and unstarted.

**Decision & Audit Outcome:**
1. **Readiness Classification — `BLOCKED BY MISSING EVIDENCE`:**
   - Technical readiness is 100% operational; however, exactly zero genuine distributor quotation files exist in the repository or database.
   - All 48 active commercial products lack verified acquisition costs (`cost_price_ngn: null/0`).
   - Live cost activation is strictly prohibited until genuine distributor quotations are received, reconciled, reviewed by Finance, and approved by Superadmin.
2. **Current Baseline Counts Factually Established:**
   - Total products: 118 (48 active commercial products IDs 1–48; 70 soft-archived benchmark records IDs 49–118).
   - Active commercial products with verified supplier costs: 0 of 48 (100% unpopulated).
   - Turnkey solar packages: 6 packages (IDs 27, 23, 24, 48, 25, 26).
   - Package BOM status: Packages 24 and 25 have revision records from earlier automated test suites (`fin_stage28_...` and `fin_stage841_...`), but commercial component costs are missing; packages 27, 23, 48, and 26 have `NO_BOM`. All 6 packages remain incomplete for commercial costing baseline.
   - Quotation imports: Exactly 2 records in `price_imports` collection, both in `analysed` status (from automated test runs; 0 applied).
   - Orders: 412 (410 legitimate + 2 Stage 23 test fixtures).
   - Customers: 310 (308 legitimate + 2 Stage 23 test fixtures).
   - Sizing quotes: 182; Customer enquiries: 147.
3. **Control Verification Status (14 of 14 Controls Verified):**
   - Exact normalized SKU matching, benchmark record exclusion, strict date validation (WAT, 30-day freshness, rollover protection), NGN currency boundary, invalid/zero/negative cost rejection, duplicate SKU detection, multi-supplier comparison without auto-winner, dual authorization (Finance review + Superadmin approval), Two-Person Rule enforcement, revision invalidation, transactional audit logging with session rollbacks, public API cost confidentiality, server-side checkout price computation, and concurrency lock recovery are all fully verified in source code and supported by 149 passing automated test assertions.
4. **Mandatory Invariance Confirmed:**
   - Zero supplier costs were activated or modified.
   - Zero retail prices, promotional prices, stock quantities, or benchmark records were mutated.
   - Zero customer orders, customer accounts, sizing quotes, or customer enquiries were modified.
   - Zero external communications dispatched.
   - Zero production deployments executed.
   - Stages 8.5.2, 8.5.3, and 8.5.4 remain completely unstarted.

**Consequences:**
- Stage 8.5.1 deliverables are complete and documented in `reports/DEVICE_PRO_ADMIN_STAGE_8_5_1_READINESS_AUDIT.md`, `reports/DEVICE_PRO_ADMIN_STAGE_8_5_1_PRODUCT_COST_COVERAGE.csv`, `reports/DEVICE_PRO_ADMIN_STAGE_8_5_1_BOM_READINESS.csv`, and `reports/DEVICE_PRO_ADMIN_STAGE_8_5_1_CONTROL_VERIFICATION.md`.
- Live cost activation is halted pending external receipt and intake of authentic distributor quotations.
- The next required step is owner review and decision on OD-8.4.2.1.1 and OD-8.4.2.1.2 to authorize procurement outreach.



