# DEVICE PRO: Website Wide Premium Animation & Smooth Scroll Baseline Audit
**Document ID:** `reports/DEVICE_PRO_ANIMATION_STAGE_1_BASELINE.md`  
**Date:** October 30, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Target Environment:** Node.js Express / MongoDB Atlas / Vanilla HTML, CSS, JavaScript / Vercel Serverless  
**Scope:** Complete inspection of all customer-facing routes, components, stylesheets, interactive scripts, and animation baselines.

---

## 1. Executive Summary

DEVICE PRO is a commercial-grade Nigerian solar engineering e-commerce and technical consultation platform. The web application is engineered with high architectural discipline: zero framework bloat, semantic HTML5, high-contrast dark-first engineering aesthetics, client-side progressive enhancement, and robust server-side security.

This baseline audit evaluates the existing motion and scrolling characteristics across every public route. While foundational layout, color tokens, and static component styling are established, motion feedback is currently disparate, consisting of ad-hoc transitions, isolated CSS keyframe pulses, and native anchor scrolling. There is no unified, hardware-accelerated, intersection-observed entrance reveal or progressive stagger system.

This audit establishes the baseline technical constraints, complete route inventory, shared component surfaces, performance characteristics, and the roadmap for a lightweight, 60-FPS, battery-efficient, accessible animation system that strictly honors `prefers-reduced-motion: reduce`.

---

## 2. Technical Architecture & Compatibility Verification

| Architecture Layer | Current Implementation | Animation Compatibility & Constraints |
| :--- | :--- | :--- |
| **Runtime & Server** | Node.js (v22+), Express 4.21.2 | Static file streaming via `server.js` and `api/index.js` (Vercel serverless proxy). Zero server-side templating dependency. |
| **Frontend Foundation** | Vanilla HTML5, Vanilla Modern CSS, Vanilla JavaScript (ES2022) | High performance. No framework overhead (no React, Next.js, or Vue runtime). Direct DOM access allows smooth 60fps transitions without virtual DOM reconciliation bottlenecks. |
| **Database** | MongoDB Atlas (`devicepro` database) with Mongoose 9.11.2 | Invariant to UI motion. Zero business logic or database mutation will occur during animation implementation. |
| **Styling Architecture** | Design Tokens (`tokens.css`), UI Components (`components.css`), Page Sheets (`homepage.css`, `products.css`, etc.) | Centralized CSS custom properties. Clean hook for global animation tokens (`--anim-duration-reveal`, `--ease-smooth-out`, etc.). |
| **Script Inclusions** | Standard `<script src="...">` tags at end of `<body>` | Progressive enhancement: content remains 100% readable and accessible even before JavaScript execution or if JavaScript is disabled. |
| **Content Security Policy (CSP)** | Enforced in `server.js`: `script-src 'self' 'unsafe-inline' https://js.paystack.co https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;` | All animation code must remain self-contained in local files (`/css/animations.css` and `/js/animations.js`). Zero external animation CDN dependencies (no unapproved CDNs). |
| **Vercel Routing** | `vercel.json` rewrites and clean URLs | Compatible with clean URLs (`/products`, `/packages`, `/projects`, `/calculator`, etc.) and `.html` file mapping. |

---

## 3. Complete Webpage & Customer-Facing Route Inventory

Every customer-facing route was verified against `server.js`, `vercel.json`, and the filesystem (`public/`):

| # | Route / URL Pattern | Primary HTML Template | Page Purpose & Description | Shared Layout Components | Main Content Sections | Existing Motion & Interactive Elements | Inspection & Test Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :-: |
| **1** | `/` | `public/index.html` | Commercial Homepage & Solar Technology Showcase | Global Header (sticky), Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Cinematic Hero, Brand Showcase, Tier-1 Product Preview, Solutions Preview, Solar Packages Preview, Hardware Architecture, 7-Stage Engineering, Instant Consultation | Hero dot indicators, basic hover transitions on cards, infinite marquee on partner logos (`brand-scroll`) | **INSPECTED** (Ready for Plan) |
| **2** | `/products`, `/products.html` | `public/products.html` | Hardware Catalog & Component Filtering (Inverters, Batteries, Panels) | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Catalog Hero, Filter Rail (Categories, Brands, Price, Capacity, Stock), Search Input, Product Grid, Pagination, Empty State | Category pill clicks, instant filter updates, toast notification on add-to-cart (`p-toast-in`), spin loader | **INSPECTED** (Ready for Plan) |
| **3** | `/products/:slug`, `/product-detail.html` | `public/product-detail.html` | Dynamic Hardware Detail & Technical Datasheet View | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Breadcrumbs, High-Res Image Gallery, Stock Status Pill, Price/Specs Grid, Quantity Stepper, Add-to-Cart Action, Technical Accordion, Related Equipment | Thumbnail switching, quantity increment/decrement, skeleton placeholder shimmer (`p-skeleton-shimmer`) | **INSPECTED** (Ready for Plan) |
| **4** | `/packages`, `/packages.html`, `/packages/:slug` | `public/packages.html` | Turnkey Solar Systems (Starter, Essential, Executive, Industrial) | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Package Tiers (6 tiers), Comprehensive Technical Comparison Matrix, Scope of Works, Package FAQ Accordion, Turnkey Quote CTA | Tier selector pills, FAQ expand/collapse, quote modal trigger, table hover states | **INSPECTED** (Ready for Plan) |
| **5** | `/projects`, `/projects.html`, `/projects/:slug` | `public/projects.html` | Engineering Portfolio & Field Commissioning Case Studies | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Portfolio Hero, Category Filter Tabs (Residential, Commercial, Industrial, Microgrid), Grid of Verified Projects, Engineering Specs, Client Testimonials | Filter tab switching, project card hover zoom, inspection badges | **INSPECTED** (Ready for Plan) |
| **6** | `/calculator`, `/calculator.html` | `public/calculator.html` | Technical Solar Sizing Engine (COREN Engineering Standard) | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Parameter Form (Zone, Autonomy, Diversity), Appliance Schedule Accordions, Custom Appliance Modal, Dynamic Engineering Results Cards, Package Recommendation | Real-time calculation triggers, dynamic accordion rows, custom appliance dialog entrance, output highlight | **INSPECTED** (Ready for Plan) |
| **7** | `/about`, `/about.html` | `public/about.html` | Company Story, Technical Accreditations & Core Values | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Hero Banner, Live Engineering Stat Counters, Founding Story, Technical Pillars (COREN / NEMSA), Engineering Leadership, Regional Hubs, About FAQ | Basic link hovers, FAQ accordions, counter display | **INSPECTED** (Ready for Plan) |
| **8** | `/contact`, `/contact.html` | `public/contact.html` | Direct Technical Support, Hub Locations & Consultation Request | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Hero Banner, Computer Village Hub Location Card, Direct Channels (Phone, WhatsApp, Email, Hours), Inquiry Submission Form | Form input focus ring, validation messages, submit button state | **INSPECTED** (Ready for Plan) |
| **9** | `/login`, `/login.html`, `/signin` | `public/login.html` | Secure Customer Authentication & Sign-in | Minimal Branded Auth Shell, Back-to-Store Link, Security Badges | Auth Card, Username/Email Input, Password Field with Visibility Toggle, Remember Me, Submit Action, Password Reset Link | Focus states, password toggle icon, loading spinner (`authSpin`), error alert transitions | **INSPECTED** (Ready for Plan) |
| **10** | `/register`, `/register.html`, `/signup` | `public/register.html` | Customer Registration & Account Provisioning | Minimal Branded Auth Shell, Back-to-Store Link, Security Badges | Registration Form, Real-time Password Strength Meter, Terms Acceptance, Submission Action | Password strength bar expansion, validation indicators, error alerts | **INSPECTED** (Ready for Plan) |
| **11** | `/forgot-password`, `/forgot-password.html` | `public/forgot-password.html` | Self-Service Password Recovery (Email OTP Dispatch) | Minimal Branded Auth Shell, Security Badges | Email Lookup Form, Dispatch State, Security Guarantee | Input focus, loading indicator, state swap | **INSPECTED** (Ready for Plan) |
| **12** | `/verify-reset-code`, `/verify-reset-code.html` | `public/verify-reset-code.html` | 6-Digit Cryptographic OTP Verification | Minimal Branded Auth Shell, Security Badges | 6-Box Segmented OTP Inputs, Auto-advance Logic, Countdown Timer | Keyup auto-advance between inputs, resend timer countdown | **INSPECTED** (Ready for Plan) |
| **13** | `/reset-password`, `/reset-password.html` | `public/reset-password.html` | Secure Password Setting with Token Gate | Minimal Branded Auth Shell, Security Badges | New Password Form, Confirm Password, Password Rules Checklist | Rule checklist checkmark activations, form submission | **INSPECTED** (Ready for Plan) |
| **14** | `/profile`, `/profile.html`, `/account` | `public/profile.html` | Customer Account Dashboard & Order History | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Tab Navigation (Profile Info, Order History, Security Settings), Past Orders Table, Live Order Status Badges, Password Update Form | Tab switching (`fadeInPanel`), order item row expansion, skeleton pulse | **INSPECTED** (Ready for Plan) |
| **15** | `/checkout`, `/checkout.html` | `public/checkout.html` | Secure 2-Step Turnkey Checkout & Paystack Integration | Minimal Header (SSL badge, phone trigger), Mobile Drawer, Footer | Delivery Destination Form (Lagos / Nationwide), Payment Method Selector, Sticky Order Summary, Submit Action | State select total recalculation, button state, validation warnings | **INSPECTED** (Ready for Plan) |
| **16** | `/order-confirmation`, `/order-confirmation.html` | `public/order-confirmation.html` | Post-Purchase Receipt & Fulfillment Timeline | Minimal Header, Footer | Success Hero, 6-Stage Fulfillment Stepper, Invoice Breakdown, Delivery Waybill Card, Action Buttons (Print, Track) | Stepper checkmark rendering, invoice print trigger | **INSPECTED** (Ready for Plan) |
| **17** | `/tracking`, `/tracking.html` | `public/tracking.html` | Real-time Engineering Logistics & Digital Warranty Portal | Global Header, Cart Drawer, Search Dialog, Quick Quote Modal, Mobile Nav, Global Footer | Privacy Lookup Gate (Order # + Phone), 6-Stage Engineering Milestones, Digital Serial Registry, Warranty Claim Form | Step pulse (`@keyframes pulse`), accordion expand, modal dialog | **INSPECTED** (Ready for Plan) |
| **18** | `/privacy-policy`, `/privacy-policy.html` | `public/privacy-policy.html` | Legal Privacy & Data Protection Policy (NDPR) | Global Header, Mobile Nav, Global Footer | Editorial Layout, Table of Contents, Section Anchors | Smooth anchor navigation, hover states | **INSPECTED** (Ready for Plan) |
| **19** | `/terms`, `/terms.html` | `public/terms.html` | Commercial Terms & Conditions of Sale | Global Header, Mobile Nav, Global Footer | Editorial Layout, Warranty Clauses, Liability Disclaimers | Anchor link scrolling | **INSPECTED** (Ready for Plan) |
| **20** | `/shipping-policy`, `/shipping-policy.html` | `public/shipping-policy.html` | Nationwide Logistics & Freight Policy | Global Header, Mobile Nav, Global Footer | Delivery Timelines Table, Transit Insurance Terms, Hub Pickups | Anchor link scrolling, table hover states | **INSPECTED** (Ready for Plan) |
| **21** | `/solutions`, `/solutions.html` | `public/solutions.html` | Dedicated Sector Solutions (Commercial, AgriSolar, Residential) | Global Header, Mobile Nav, Global Footer | Sector Architecture Breakdown, System Sizing Case Studies, Inquiry Form | Tab toggles, card hovers | **INSPECTED** (Ready for Plan) |
| **22** | `/faq`, `/faq.html` | `public/faq.html` | Comprehensive Solar & Battery Knowledge Base | Global Header, Mobile Nav, Global Footer | Category Filter Tabs (Technical, Financial, Warranty), Accordion Items | Accordion expand/collapse (`faq.js`), search filter | **INSPECTED** (Ready for Plan) |

---

## 4. Existing Shared Interactive Overlays & Micro-Interactions

| Component | Files Involved | Current Behavior & Limitations |
| :--- | :--- | :--- |
| **Sticky Header** | `main.js`, `components.css` | Adds `.scrolled` class when `window.scrollY > 20`. Lacks smooth elevation and backdrop-blur transition. |
| **Cart Drawer** | `cart.js`, `components.css` | Toggles `.open` class with translate transform. Works well, but item addition and quantity changes lack micro-bounce/pulse feedback. |
| **Search Dialog** | `search.js`, `search.css` | Native `<dialog>` or overlay with fade. Can benefit from smooth scale-in (`0.98 -> 1.0`) entrance. |
| **Quote Modal** | `main.js`, `components.css` | Backdrop fade with simple display toggle. Needs elegant vertical scale entrance. |
| **Mobile Nav Drawer** | `main.js`, `components.css` | Slides from left on mobile viewports. |
| **Internal Anchor Links** | `main.js` (L188-201) | `targetElement.scrollIntoView({ behavior: 'smooth' })`. Lacks explicit sticky header offset subtraction, causing target headers to be obscured beneath the 76px sticky navbar. |

---

## 5. Current Performance & Accessibility Observations

### 5.1 CSS & Animation Inventory
- **Keyframe Definitions:** 19 isolated keyframe animations exist across CSS files (mostly spinners, pulses, and toast slides).
- **Reduced Motion:** Handled globally in `components.css` L984 (`@media (prefers-reduced-motion: reduce) { ... }`), but not systematically respected inside individual page stylesheets.
- **Scroll Observation:** No centralized `IntersectionObserver` exists in the application; elements render statically on page load without progressive entrance reveals.

### 5.2 Performance Baseline (Desktop & Mobile)
- **DOM Size:** Lightweight across all pages (typically 400 - 1,200 DOM nodes).
- **Stylesheets:** All CSS is statically served with caching headers.
- **JavaScript Execution:** Vanilla JS execution time is ultra-low (< 25ms per page load).
- **LCP (Largest Contentful Paint):** High-priority hero images and typography load fast; an entrance animation must NOT artificially delay LCP elements.

---

## 6. Risks, Constraints & Governance Guardrails

1. **Progressive Enhancement:** Content must never be permanently hidden (`opacity: 0`) if JavaScript is disabled, crashes, or fails to execute. The animation system must use a CSS-class-based enhancement model (e.g. `.has-reveal` or `.reveal-ready` applied by JS or CSS fallback).
2. **Zero Layout Shifts (CLS):** Animations must only transform `opacity` and `transform` (`translateY`, `scale`). Never animate layout properties like `margin`, `padding`, `height`, or `top`.
3. **Sticky Header Offset on Anchor Scrolls:** The sticky header is `76px` high. Anchor navigation (`#solutions`, `#faqs`, `#specs`) must offset by at least `92px` so section headings are never obscured.
4. **No Overhead on Dynamic Controls:** Forms, calculator input schedules, cart quantity steppers, and filters must respond instantaneously without waiting for animation frames.
5. **Reduced Motion Compliance:** Complete suppression of entrance translations and parallax when `prefers-reduced-motion: reduce` is active.
6. **No Production Deployment:** This work is confined to local implementation, testing, and owner sign-off. Zero production data or business logic will be touched.

---
*End of Baseline Document. Ready for Implementation Plan.*
