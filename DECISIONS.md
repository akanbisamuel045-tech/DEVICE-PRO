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




