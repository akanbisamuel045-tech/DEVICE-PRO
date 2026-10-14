# DEVICE PRO

## Product, Experience, and Technical Architecture

**Document type:** AI agent implementation specification\
**Status:** Foundation specification, to be refined during discovery\
**Business:** DEVICE PRO, a Nigeria focused solar solutions, equipment,
installation, and support business\
**Reference website:**
https://www.solarworldelectric.com/solutions.html\
**Primary objective:** Build a custom, production grade website and
commerce platform inspired by the reference website's information
architecture, clarity, simplicity, technical explanations, and
conversion journey. DEVICE PRO must have its own original brand
identity, copy, assets, and implementation.

------------------------------------------------------------------------

## 1. How AI agents must use this document

This document is the shared source of truth for design, development,
testing, and delivery agents.

Before starting a task, an agent must: 1. Read this document and any
later approved decision records. 2. Identify the relevant user journey,
page, component, data model, and acceptance criteria. 3. Reuse
established components and design tokens rather than inventing new
patterns. 4. Preserve accessibility, responsive behaviour, performance,
security, and SEO. 5. Avoid inventing business facts, product prices,
warranties, customer testimonials, certifications, financing terms,
installation promises, or performance claims. 6. Record meaningful
architectural changes in the decision log and update this document when
an approved decision changes. 7. Build working functionality, not merely
static visual imitations, unless the task is explicitly for a prototype.
8. Never copy the reference site's source code, branding, text, images,
proprietary assets, or exact identity. Use it as a reference for
information architecture and interaction principles only.

### 1.1 Status labels

-   **Confirmed:** supplied directly by the business owner or
    established in this project.
-   **Proposed:** a recommended design or technical decision awaiting
    validation.
-   **Required before launch:** a business or technical dependency that
    must be resolved.
-   **Future:** a capability that can follow the initial launch.

------------------------------------------------------------------------

## 2. Business vision and scope

### 2.1 Vision

DEVICE PRO will be a professional online destination where customers
across Nigeria can understand solar energy options, explore and buy
equipment, configure indicative system packages, request an engineered
quotation, book a consultation, arrange installation, and access after
sales support.

The website must serve both customers who know exactly which product
they need and customers who need expert guidance.

### 2.2 Confirmed business context

-   Brand name: DEVICE PRO.
-   Market: customers across Nigeria.
-   Business focus: solar solutions, equipment, installations, and
    related services.
-   Build approach: custom built website and platform.
-   Design reference: Solar World Electric's solutions page and the
    wider public site architecture.
-   The reference is intended as a strong model for layout, content
    structure, simplicity, customer journey, and interaction style, not
    as a source to copy verbatim.

### 2.3 Core business outcomes

1.  Generate qualified residential and commercial solar enquiries.
2.  Sell eligible products and packages online.
3.  Explain technical solutions in language customers can understand.
4.  Help customers estimate the system they may need.
5.  Present project evidence and credible business information.
6.  Manage products, inventory, enquiries, quotations, orders, payments,
    installation jobs, and support from one administrative platform.
7.  Support national reach while accurately representing delivery and
    installation coverage.
8.  Establish a foundation that can scale into a larger commerce and
    service operation.

### 2.4 Target audiences

-   Homeowners, tenants where installation permission exists, estates,
    and residential developers.
-   Small and medium businesses, shops, restaurants, hotels, schools,
    clinics, offices, and retail facilities.
-   Industrial and high energy use customers.
-   Farms, water pumping projects, community infrastructure, street
    lighting, and other approved solar applications.
-   Customers buying individual components such as panels, inverters,
    batteries, mounting structures, cables, and accessories.
-   Procurement teams and organisations requesting larger projects.
-   Existing customers requiring warranty, maintenance, or technical
    support.

### 2.5 Out of scope unless separately approved

-   A multi-vendor marketplace where third-party sellers manage their
    own shops.
-   Unverified financing or lending services.
-   Live remote monitoring of installed systems without an agreed
    hardware or telemetry integration.
-   Automatic engineering approval of a solar design without qualified
    human review.
-   International shipping as a launch requirement.
-   Native mobile apps. The initial customer experience should be
    responsive web.
-   Unsupported claims about guaranteed savings, uninterrupted power,
    product authenticity, warranty duration, or installation time.

------------------------------------------------------------------------

## 3. Reference website analysis

The reference website presents solar as a complete solution, not merely
a catalogue of equipment. Its public structure connects: - Company and
team information. - Solution categories for residential, commercial,
industrial, and energy or infrastructure use cases. - Product listings
and published prices. - Project portfolios and case studies. - Solar
sizing and finance calculators. - FAQs and educational content. -
Consultation and WhatsApp contact pathways. - Financing information and
customer reviews.

The Solutions page uses a clear sequence: 1. Breadcrumb and descriptive
page title. 2. Concise introductory explanation. 3. A quick answer
explaining the available solution categories. 4. Separate sections for
residential and small commercial, commercial, industrial, and
infrastructure solutions. 5. Contextual links to relevant projects. 6.
Explanation of complete solar system components. 7. A step by step
installation process. 8. A final consultation prompt and WhatsApp route.
9. A footer with further navigation, contact information, locations, and
support details.

### 3.1 Design principles to learn from

-   Clear hierarchy instead of decorative complexity.
-   Large, legible headings and concise introductory copy.
-   Specific page sections with a clear purpose.
-   Technical information divided into digestible chunks.
-   Repeated, contextual calls to action.
-   Cross links between solutions, products, pricing, calculators,
    projects, and contact.
-   Evidence and practical detail close to claims.
-   A complete customer journey from learning to enquiry and service.
-   Responsive navigation and predictable page patterns.
-   Helpful content that answers customer questions before asking them
    to make contact.

### 3.2 Important distinction

The public reference website can be observed, but its private backend,
source code, database, internal animation implementation, analytics, and
administration tools are not assumed to be known. DEVICE PRO's backend
architecture below is a proposal designed for DEVICE PRO, not a claim
about the reference site's private implementation.

### 3.3 Originality

Use the reference to understand page architecture, information
hierarchy, and customer journey. DEVICE PRO must have its own logo,
visual assets, writing, component implementation, and brand voice. Do
not reproduce the reference's exact text, images, customer information,
trademarks, or distinctive assets.

------------------------------------------------------------------------

## 4. Product strategy: two connected ways to buy

DEVICE PRO must support two purchase journeys.

### 4.1 Direct commerce

For products or standard packages with approved prices and known
fulfilment rules: 1. Browse or search. 2. Filter and compare. 3. Open a
product detail page. 4. Select an available variant or quantity. 5. Add
to cart. 6. Review cart and delivery details. 7. Complete checkout and
payment. 8. Receive order confirmation. 9. Follow order status and
delivery updates.

### 4.2 Consultative solar solution

For custom installations, larger systems, uncertain loads, or projects
requiring a site assessment: 1. Choose a solution category or use the
sizing tool. 2. Explain the property, location, loads, desired backup
duration, and budget range if comfortable. 3. Receive an indicative
estimate clearly marked as preliminary. 4. Submit a consultation or
quotation request. 5. Sales staff review the information. 6. An engineer
validates load, surge, solar generation, storage, wiring, mounting,
safety, and site conditions. 7. DEVICE PRO issues a formal proposal with
scope, exclusions, itemised pricing, warranty terms, installation
details, and payment terms. 8. Customer accepts the proposal and
completes the approved payment process. 9. Operations schedule delivery
and installation. 10. Team commissions the system, records handover
details, and starts the after sales workflow.

### 4.3 Shared journey principles

-   Do not force custom installations into a generic one-click checkout.
-   Make the difference between product purchase, indicative estimate,
    and formal engineering quotation obvious.
-   Keep customer-entered information when moving from calculator to
    enquiry.
-   Never describe a calculator result as an engineered design.
-   Display availability, delivery coverage, installation scope, and
    warranty only when supported by current business data.
-   Offer WhatsApp as a contact option without making it the only way to
    transact.

------------------------------------------------------------------------

## 5. Information architecture and sitemap

### 5.1 Primary navigation

Proposed desktop navigation: - Home - Solutions - Products - Packages
and Pricing - Projects - Solar Calculator - Resources - About - Contact

Persistent utility actions: - Search - Account - Cart, where direct
commerce is enabled - Request a Quote or Book a Consultation - WhatsApp
contact, if the business confirms the number and service process

The header must not become crowded. Use dropdown or mega menu navigation
for large categories, with a mobile friendly equivalent.

### 5.2 Public pages

-   `/` Home
-   `/solutions` Solutions overview
-   `/solutions/residential`
-   `/solutions/commercial`
-   `/solutions/industrial`
-   `/solutions/infrastructure`
-   `/products` Product catalogue
-   `/products/[slug]` Product detail
-   `/categories/[slug]` Product category
-   `/packages` Standard solar packages
-   `/packages/[slug]` Package details
-   `/pricing` Pricing and quotation information
-   `/projects` Project portfolio
-   `/projects/[slug]` Case study
-   `/calculator` Solar sizing calculator
-   `/savings-calculator` Generator versus solar cost estimator
-   `/financing` Financing information, only if approved terms exist
-   `/resources` Knowledge centre
-   `/resources/[slug]` Article or guide
-   `/faq` Frequently asked questions
-   `/about` Company profile
-   `/team` Team, only with approved profiles
-   `/reviews` Customer reviews, only with permission and verification
-   `/locations` Service coverage or locations, only with confirmed data
-   `/contact` Contact and enquiry
-   `/consultation` Consultation request
-   `/quote` Quote request
-   `/cart`
-   `/checkout`
-   `/checkout/success`
-   `/account`
-   `/account/orders`
-   `/account/quotes`
-   `/account/profile`
-   `/support`
-   `/privacy`
-   `/terms`
-   `/delivery`
-   `/returns`
-   `/warranty`
-   `/accessibility`

### 5.3 Administration pages

-   `/admin`
-   `/admin/products`
-   `/admin/categories`
-   `/admin/brands`
-   `/admin/packages`
-   `/admin/inventory`
-   `/admin/orders`
-   `/admin/payments`
-   `/admin/customers`
-   `/admin/enquiries`
-   `/admin/quotes`
-   `/admin/projects`
-   `/admin/installations`
-   `/admin/service`
-   `/admin/content`
-   `/admin/promotions`
-   `/admin/reports`
-   `/admin/users`
-   `/admin/settings`
-   `/admin/audit-log`

Admin routes must be protected by server side authentication and role
based authorization. Hiding a navigation item is not authorization.

------------------------------------------------------------------------

## 6. Page specifications

### 6.1 Homepage

Purpose: explain DEVICE PRO quickly, establish trust, and route visitors
to the right next step.

Recommended section order: 1. Optional announcement bar for a verified
offer or service notice. 2. Main header with logo, navigation, search,
account, and cart. 3. Hero with strong solar solution message, short
supporting copy, primary CTA to explore solutions or calculate needs,
secondary CTA to request consultation, and authentic solar imagery. 4.
Trust strip with only verified service, warranty, product, or support
facts. 5. Solution category cards. 6. Featured products or approved
packages with price and key specifications. 7. Solar calculator teaser.
8. Selected projects or case studies. 9. Why choose DEVICE PRO, using
substantiated differentiators. 10. Customer reviews or client logos only
with permission. 11. Simple process overview. 12. Educational resources
or common questions. 13. Strong final consultation CTA. 14. Footer with
navigation, verified contacts, policies, service coverage, and social
links.

Do not put every possible feature on the homepage. Keep the order
logical and visually breathable.

### 6.2 Solutions overview

Purpose: help a visitor recognise their use case and understand the path
to a solution.

Required sections: - Breadcrumbs. - Descriptive H1 and short
introduction. - Quick answer or overview. - Four solution cards:
residential, commercial, industrial, infrastructure. - Detail sections
with relevant audience, challenges, system considerations, and related
projects. - Explanation of core system components. - Seven stage
process: consultation, proposal, site visit where needed, agreement and
payment, scheduling and installation, testing and commissioning, after
sales support. - FAQ links. - Final consultation and WhatsApp actions.

Technical power ranges must be based on DEVICE PRO's approved service
offering and must not be copied from the reference without validation.

### 6.3 Solution detail pages

Each solution page should share a reusable template: - Hero and
audience. - Customer problem and desired outcome. - Typical loads or
applications. - System options and technical considerations. - Relevant
products or packages. - Project examples. - Process and service
coverage. - FAQs. - Consultation form with solution type preselected.

### 6.4 Product catalogue

Required capabilities: - Search by product name, brand, model, and
supported attributes. - Category and brand filters. - Filters for price,
capacity, voltage, chemistry, panel wattage, phase, availability, and
other relevant attributes when data exists. - Sort by relevance, price,
newest, and popularity only where popularity is calculated reliably. -
Pagination or accessible progressive loading. - Clear empty and error
states. - Product cards with image, name, model, key attribute, current
price, availability, and action. - Mobile filters presented as a drawer
or sheet. - URL query parameters for search, filters, sorting, and
pagination so results can be shared and indexed appropriately.

### 6.5 Product detail

-   Product title, brand, model and image gallery.
-   Price and currency, with any tax treatment explained.
-   Stock or availability state.
-   Specifications table.
-   Variant selection.
-   Warranty information based on approved product records.
-   Delivery or installation notes where applicable.
-   Compatibility notes and related accessories.
-   Quantity control, add to cart, and enquiry action when relevant.
-   Shipping, returns, and warranty links.
-   Related products.
-   Structured data for eligible product information.

### 6.6 Packages and pricing

-   Package cards with system type and intended customer.
-   Clear separation between included equipment, installation, delivery,
    optional extras, and exclusions.
-   Inverter capacity and type, battery usable energy where known, panel
    quantity and total capacity, accessories, and installation scope.
-   Supported loads presented as illustrative and dependent on usage and
    engineering assessment.
-   Price effective date or update timestamp where appropriate.
-   Direct purchase only for packages with a defined scope and
    fulfilment process.
-   Request quotation for bespoke or large projects.
-   No fabricated pricing or outdated hardcoded prices in production.

### 6.7 Projects and case studies

Each project record may include: - Approved project title and
category. - Location at an appropriate privacy level. - Customer
sector. - Challenge and objectives. - System configuration and key
specifications approved for publication. - Before and after or
installation imagery with rights cleared. - Outcome metrics only when
measured and substantiated. - Related solution and CTA. - Customer
permission and privacy review.

### 6.8 Solar sizing calculator

The calculator should be useful, transparent, and cautious.

Inputs may include: - Appliance type and quantity. - Rated power and
starting surge when known. - Hours of use per day. - Simultaneous usage
assumptions. - Desired backup duration. - Available grid or generator
charging assumptions. - Property type and location, if needed for a
future solar resource model. - Optional budget range and contact
details.

Outputs may include: - Estimated simultaneous load. - Indicative
inverter size. - Estimated daily energy consumption. - Indicative
battery capacity. - Indicative PV array size. - Indicative package
range, only if current price data and calculation assumptions exist. -
Assumptions, exclusions, and warning that a qualified engineer must
confirm the final design.

The calculation engine must be isolated from the UI, documented, tested,
versioned, and reviewed by a competent solar engineer before being used
for commercial recommendations. Do not silently invent appliance
wattages or battery depth of discharge values. Any default values must
be editable, clearly labelled assumptions.

### 6.9 Savings calculator

If implemented, allow customers to enter or adjust: - Fuel type. - Daily
or monthly consumption. - Fuel price. - Maintenance estimate. -
Estimated solar system cost. - Comparison period.

Show the assumptions, formulas, and uncertainty. Avoid promising a
particular payback period or guaranteed savings. Keep monetary values in
NGN unless another supported currency is intentionally introduced.

### 6.10 Consultation and quote forms

Keep forms short and progressive.

Initial fields: - Name. - Phone number. - Email, optional unless
operationally required. - State and city. - Property or project type. -
Main requirement. - Preferred contact method. - Optional appliance list,
message, or file attachment. - Consent to the stated privacy terms.

For commercial and industrial leads, later steps can request operating
hours, three phase requirements, approximate demand, drawings, or site
survey preferences.

Form requirements: - Server side validation. - Accessible labels and
useful error messages. - Spam prevention and rate limits. - Consent and
data retention policy. - Confirmation state with reference number where
available. - Email or admin notification with retry and failure
logging. - Do not lose form content on recoverable errors. - Provide
WhatsApp as an alternative, not as the only submission path.

### 6.11 Contact and footer

Use confirmed business contact information only. Display hours,
emergency support, office locations, service regions, and response time
only when the business can maintain those details accurately.

------------------------------------------------------------------------

## 7. Visual design system

The final brand system should be approved before detailed UI production.
The following is a proposed starting point, not a final identity.

### 7.1 Visual character

-   Professional, engineering led, trustworthy, and modern.
-   Clean light backgrounds and high contrast typography.
-   Deep navy or dark blue for authority.
-   A restrained solar green accent for energy and sustainability.
-   Bright blue for primary interactive elements if consistent with the
    final identity.
-   Neutral grey surfaces and subtle borders.
-   Authentic installation and equipment photography.
-   Product images should have consistent crops and backgrounds.
-   Avoid excessive gradients, glass effects, animated backgrounds, and
    decorative clutter.

### 7.2 Proposed design tokens

Use CSS variables or equivalent design tokens. Do not scatter literal
colours across components.

``` css
:root {
  --color-brand-primary: #12345A;
  --color-brand-action: #1769E0;
  --color-brand-energy: #168447;
  --color-text-primary: #172536;
  --color-text-secondary: #5C6878;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F4F7FA;
  --color-border: #DCE3EA;
  --color-success: #168447;
  --color-warning: #A66300;
  --color-danger: #B42318;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --content-max: 1200px;
  --page-gutter: clamp(16px, 4vw, 48px);
}
```

These values are initial proposals and should be validated in a real
design review. Maintain contrast ratios consistent with WCAG 2.2 AA.

### 7.3 Typography

-   Use a highly legible modern sans serif typeface with suitable
    language support.
-   Use a small, consistent type scale.
-   Headings should be direct, descriptive, and not excessively
    oversized.
-   Body text should have comfortable line height and line length.
-   Avoid using font size alone to express hierarchy; use spacing,
    weight, and semantic headings too.
-   Keep H1 unique and descriptive on each public page.

### 7.4 Layout and spacing

-   Establish a consistent centered content container.
-   Use a predictable spacing scale.
-   Use a grid for product and solution cards.
-   Maintain generous spacing between major sections.
-   Keep paragraphs at a readable width.
-   Use responsive layouts instead of fixed desktop widths.
-   Avoid unnecessary horizontal scrolling.
-   Use sticky UI only when it materially helps the task and does not
    obscure content.

### 7.5 Components

Build and reuse: - Announcement bar. - Responsive header. - Desktop mega
menu and mobile navigation. - Breadcrumbs. - Buttons and links. - Search
input and autocomplete. - Product card. - Solution card. - Package
card. - Project card. - Specification table. - Price display. - Badge
for verified states only. - Filter drawer. - Pagination. - Form
controls. - Modal and confirmation dialog. - Accordion. - Tabs where
they improve comprehension. - Stepper or progress indicator. -
Calculator appliance selector. - Estimate summary. - Quote CTA panel. -
Trust strip. - Testimonial component with approval metadata. - Alert,
toast, empty state, skeleton, and error state. - Footer. - Admin data
table, filters, bulk actions, and audit information.

Components should have explicit props, predictable state, accessibility
support, and documented empty, loading, error, and disabled states.

------------------------------------------------------------------------

## 8. Animation and interaction architecture

Animations should improve orientation, reveal hierarchy, and communicate
state. The website must feel responsive and polished, not theatrical.

### 8.1 Global motion principles

-   Prefer CSS transitions for simple UI feedback.
-   Use a motion library only if its benefits justify the dependency.
-   Animate opacity and transform where practical.
-   Avoid animating layout properties that trigger expensive reflow.
-   Keep animation short and purposeful.
-   Respect `prefers-reduced-motion`.
-   All information and actions must remain available when motion is
    reduced or disabled.
-   Do not delay navigation or submission to finish an animation.
-   Avoid scroll hijacking, forced horizontal scrolling, cursor
    gimmicks, and mandatory cinematic intros.
-   Never make a core action dependent on hover because touch devices do
    not have hover.
-   Do not add motion to every section merely for visual effect.

### 8.2 Motion token proposals

``` css
:root {
  --motion-fast: 120ms;
  --motion-standard: 200ms;
  --motion-emphasis: 320ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Review the reduced motion implementation to ensure it does not break
essential state feedback.

### 8.3 Interaction specification

-   Header: subtle background or shadow change when the page scrolls, if
    useful. Keep navigation stable.
-   Dropdowns: open on click or keyboard interaction, close on Escape
    and outside click, and maintain focus correctly.
-   Mobile menu: slide or fade in briefly, lock background scrolling
    only while open, restore focus when closed.
-   Buttons: clear hover, focus-visible, active, loading, and disabled
    states.
-   Cards: small elevation or border change on hover where the entire
    card is interactive; never imply that a non-clickable card is
    clickable.
-   Accordions: animate height only if reliable and accessible; support
    keyboard operation and correct expanded state.
-   Image galleries: simple crossfade or slide between images with
    controls and accessible names.
-   Filters: update result state clearly, preserve selected filters in
    URL when suitable, and announce result counts to assistive
    technology.
-   Cart: update count and totals immediately after successful local
    state changes, but confirm prices and stock server side.
-   Forms: inline validation after appropriate user interaction, clear
    submission loading state, success confirmation, and recoverable
    error state.
-   Calculator: update estimates when inputs change, debounce expensive
    work, explain which outputs changed, and do not animate numeric
    changes so aggressively that values become difficult to read.
-   Project filters: update results without confusing page jumps;
    preserve filter state where practical.
-   Scroll reveal: optional and restrained; content must be visible if
    scripts fail and accessible with reduced motion.
-   Charts: provide equivalent text or tabular values.
-   Toast notifications: do not convey critical information only through
    colour or animation.

### 8.4 Animation acceptance tests

-   All actions work with keyboard only.
-   Reduced motion preference removes nonessential movement.
-   No content remains hidden if an animation script fails.
-   Motion does not cause layout shifts or horizontal overflow.
-   Modal and menu focus behaviour is correct.
-   Animation never hides validation errors, payment status, or
    important warnings.
-   Mobile interactions work without hover.
-   Automated and manual tests cover loading, success, and failure
    states.

------------------------------------------------------------------------

## 9. Technical architecture

### 9.1 Approved simplicity first stack

The project owner has explicitly requested a straightforward stack. Do not introduce a large framework or complex infrastructure without asking for approval.

-   Frontend structure: semantic HTML5.
-   Styling: plain CSS3 using CSS custom properties for colours, spacing, typography, layout, and motion tokens.
-   Browser behaviour: modern vanilla JavaScript using ES modules. Use small, understandable functions and reusable components through templates or shared rendering helpers where useful.
-   Backend: Node.js with Express.js for routes, APIs, form handling, authentication, and business logic.
-   Database: SQLite during early development if it meets deployment and concurrency needs; use PostgreSQL when production requirements, hosting, or expected concurrent transactions make it the safer choice. Record the decision before building persistence deeply.
-   Database access: a small, consistently used library such as better-sqlite3 for SQLite or pg for PostgreSQL. Avoid adding an ORM unless a documented need justifies it.
-   Authentication: secure server managed sessions, password hashing with a maintained library, role based authorization, CSRF protection where relevant, and rate limiting for sensitive routes.
-   Payments: integrate Paystack or Flutterwave only after the business confirms the provider and completes merchant onboarding. Use hosted or tokenized payment flows and verified server side webhooks.
-   Email: a transactional email provider selected after requirements are confirmed.
-   Product and project images: local optimized assets for initial development, with a managed media service only if operational needs justify it.
-   Testing: Node's built in test runner for small pure JavaScript modules, plus a browser automation tool such as Playwright for critical user journeys if approved and available.
-   Hosting: a Node.js compatible host, environment variables for secrets, HTTPS, scheduled backups, and a documented restore procedure.
-   Version control: Git.

Use HTML, CSS, JavaScript, and Node.js as the default foundation. Do not introduce React, Next.js, TypeScript, Tailwind, microservices, containers, a message queue, or an ORM by default. A small dependency is allowed when it removes meaningful risk or repetitive work, but document why it is needed and keep the overall system understandable to a developer who knows the core stack.

SQLite is a starting option, not an unconditional production requirement. The agent must assess the chosen host, backup strategy, write concurrency, and expected usage before finalizing the database. Store configuration in environment variables and provide a safe `.env.example` with names only, never real credentials.

### 9.2 Architecture boundaries

Keep the following domains separate in code even if the first release is
a modular monolith: - Identity and access. - Product catalogue. -
Pricing. - Inventory. - Cart and checkout. - Orders and payments. -
Solar calculations. - Quotes and enquiries. - Projects and content. -
Installation operations. - Support and warranty. - Notifications. -
Reporting and audit.

Do not split into microservices prematurely. A modular monolith is a
reasonable first implementation when modules have clear boundaries and
can be separated later if real scale or team needs justify it.

### 9.3 Data flow

1.  Browser requests public page or user action.
2.  Server validates identity, inputs, permissions, and request limits.
3.  Domain service applies business rules.
4.  Database transaction persists authoritative changes.
5.  External gateway or service is called through a controlled
    integration layer.
6.  Webhooks are verified and processed idempotently.
7.  Notifications and noncritical work are queued where appropriate.
8.  Logs and audit events record significant state transitions.
9.  UI displays confirmed status, never a guessed success.

### 9.4 API conventions

-   Use typed request and response schemas.
-   Validate all external input on the server.
-   Use consistent error codes and user friendly messages.
-   Paginate large lists.
-   Apply rate limits to login, quote, calculator, and checkout
    endpoints as appropriate.
-   Use idempotency keys for payment initiation and other sensitive
    repeatable operations.
-   Version public APIs if compatibility requires it.
-   Never expose internal stack traces, secrets, payment credentials, or
    private customer data.
-   Keep payment and privileged business logic on the server.

------------------------------------------------------------------------

## 10. Data model

The following is a conceptual model. Final schema and constraints must
be developed alongside actual business rules.

### 10.1 Core entities

-   `User`: identity, verified contacts, account status, timestamps.
-   `Role` and `Permission`: staff roles and explicit permissions.
-   `CustomerProfile`: customer type, organisation, contact preferences.
-   `Address`: state, city, street or delivery details, recipient,
    delivery notes.
-   `Product`: name, slug, description, brand, model, status, type, SEO
    fields.
-   `ProductVariant`: SKU, options, price, cost where authorised, stock
    tracking settings.
-   `ProductAttribute`: typed technical properties such as watts,
    voltage, capacity, chemistry, phase, dimensions.
-   `ProductImage`: media URL, alt text, ordering, usage rights
    metadata.
-   `Category`: hierarchical catalogue taxonomy.
-   `Brand`: manufacturer or brand details.
-   `PriceRecord`: amount, currency, validity period, tax treatment,
    approval status.
-   `InventoryLocation`: warehouse or stock location.
-   `InventoryMovement`: received, reserved, sold, returned, adjusted,
    transferred.
-   `Cart` and `CartItem`: customer or guest cart and selected variant
    quantities.
-   `Order` and `OrderItem`: immutable purchase snapshot, totals,
    customer and delivery snapshot.
-   `Payment`: gateway, reference, amount, currency, status, timestamps,
    reconciliation state.
-   `Refund`: payment reference, amount, reason, status.
-   `Shipment`: fulfilment provider, tracking reference, status and
    timestamps.
-   `SolarPackage`: package definition and publication status.
-   `SolarPackageItem`: products and quantities included.
-   `CalculatorSession`: inputs, assumptions, calculation version and
    indicative results.
-   `Enquiry`: source, contact, project category, details, status,
    assigned staff.
-   `Quote` and `QuoteItem`: formal proposal, validity, line items,
    exclusions, terms, revisions, acceptance status.
-   `Project`: approved public case study content and technical summary.
-   `InstallationJob`: site, assigned team, schedule, checklist, status,
    commissioning and handover.
-   `ServiceTicket`: issue, severity, warranty relationship, status and
    resolution.
-   `WarrantyRecord`: product or system, dates, terms and proof of
    purchase.
-   `Review`: content, permission, verification status, moderation
    state.
-   `Article`: educational content, author, publication state, SEO.
-   `Promotion`: rules, dates, eligibility, limits.
-   `Notification`: channel, template, recipient, delivery state.
-   `AuditEvent`: actor, action, target, timestamp, metadata.
-   `ConsentRecord`: consent purpose, version, timestamp, and withdrawal
    where applicable.

### 10.2 Important data rules

-   Store money as integer minor units where the currency model supports
    it; use explicit currency codes and tested formatting.
-   Store timestamps consistently in UTC and display them in the
    intended local timezone.
-   Snapshot product name, SKU, price, tax, and relevant terms onto
    order and quote line items so later catalogue edits do not rewrite
    history.
-   Keep stock movement records rather than relying only on a manually
    editable stock number.
-   Use transactions for stock reservation, order creation, and payment
    state changes.
-   Use idempotency for webhook processing.
-   Never store card details or payment secrets directly.
-   Keep customer personal data private and limit staff access.
-   Preserve audit trails for sensitive price, inventory, payment,
    quote, and permission changes.

------------------------------------------------------------------------

## 11. Solar calculation requirements

Solar sizing is a safety and engineering adjacent capability. It must be
treated differently from ordinary product filtering.

### 11.1 Required calculation concepts

Depending on the supported calculator scope: - Appliance quantity and
rated load. - Duty cycle and operating hours. - Simultaneous load
assumptions. - Motor starting surge and other transient loads. - Daily
energy demand in kWh. - Required autonomy or backup duration. - Battery
nominal and usable capacity. - Depth of discharge and conversion
losses. - Inverter continuous rating and surge capacity. - Solar array
size and local generation assumptions. - Charging requirements. - System
voltage and phase. - Cable, protection, mounting, shading, and
installation constraints for engineering review.

### 11.2 Required safety and accuracy rules

-   Do not treat kW and kVA as interchangeable.
-   Do not infer a final design from appliance count alone.
-   State assumptions and uncertainty.
-   Never promise a particular runtime without the corresponding
    assumptions.
-   Do not guarantee zero interruption or a specific savings result.
-   Require qualified engineer review for formal proposals and
    installations.
-   Keep calculator formulas in a tested domain module, not embedded in
    React components.
-   Version formulas and default assumptions.
-   Maintain unit tests with representative examples reviewed by a solar
    engineer.
-   If required inputs are missing, return an estimate range or ask for
    more data instead of inventing precision.
-   Distinguish the preliminary estimate from the approved engineering
    design in UI, database, PDFs, and emails.

------------------------------------------------------------------------

## 12. Commerce, payment, and fulfilment

### 12.1 Checkout

-   Support guest checkout and customer accounts if business policy
    allows.
-   Confirm delivery region and fulfilment eligibility before final
    payment.
-   Recalculate price, promotions, shipping, tax, and stock on the
    server.
-   Show item totals, delivery, discounts, fees, and final total
    separately.
-   Require acceptance of applicable terms and policies.
-   Create order records using safe transaction semantics.
-   Prevent duplicate orders from repeated submissions.
-   Send confirmation only after the relevant order and payment state is
    confirmed.

### 12.2 Payment lifecycle

Proposed states: - `pending` - `initiated` - `successful` - `failed` -
`cancelled` - `partially_refunded` - `refunded` - `requires_review`

The exact model must align with gateway capabilities. The browser return
URL is not proof of payment. Verify payment server side and validate
gateway webhooks, amount, currency, reference, and order association.

### 12.3 Inventory

-   Track physical stock by SKU and location where needed.
-   Define reservation expiry and release behaviour.
-   Avoid overselling under concurrent checkout.
-   Separate available, reserved, damaged, and returned stock where
    operationally necessary.
-   Record stock adjustments with reason and staff identity.
-   Provide low stock alerts and reconciliation reports.

### 12.4 Delivery and installation

-   Define product delivery separately from installation service.
-   Configure service areas and any area based fees from approved data.
-   Support manual fulfilment for early operations if automated carrier
    integrations are not yet selected.
-   Record order packing, dispatch, delivery, installation booking,
    completion, and customer handover as distinct states.
-   Do not show unsupported live tracking claims.

------------------------------------------------------------------------

## 13. Admin and operations

### 13.1 Dashboard overview

Display useful operational metrics such as: - Orders by status. - Sales
totals from verified transactions. - Pending payments and reconciliation
exceptions. - Low stock and stockout alerts. - New enquiries and quote
follow ups. - Quotes awaiting approval or customer response. - Upcoming
installations. - Open service tickets. - Recent audit events.

### 13.2 Roles

Proposed roles: - Super administrator. - Operations administrator. -
Product and inventory manager. - Sales and quotation staff. - Solar
engineer. - Installation coordinator. - Customer support. - Content
editor. - Finance or reconciliation staff. - Read only reporting user.

Use least privilege. High risk actions such as changing prices, issuing
refunds, granting access, adjusting stock, and approving quotations may
require elevated permission or a second approval.

### 13.3 Admin quality requirements

-   Search, filters, sorting, pagination, and bulk actions where useful.
-   Clear loading, empty, failure, and success states.
-   Confirmation for destructive actions.
-   Audit trail for sensitive changes.
-   Export controls with permission checks and privacy safeguards.
-   No reliance on client side checks alone.
-   Avoid displaying unnecessary customer personal information.

------------------------------------------------------------------------

## 14. SEO, content, and discoverability

-   Server render indexable public pages.
-   Use descriptive titles, meta descriptions, canonical URLs, and
    social sharing metadata.
-   Generate sitemap and robots rules.
-   Add appropriate structured data for products, breadcrumbs, articles,
    and eligible organisation information.
-   Use clean slugs and internal links.
-   Avoid duplicate indexable filter URLs.
-   Include useful original content for Nigerian customer questions,
    such as system sizing, batteries, inverter types, maintenance, and
    installation preparation.
-   Add alt text to meaningful images and empty alt text to decorative
    images.
-   Do not publish fake reviews, fabricated project outcomes,
    unsupported statistics, or keyword stuffed copy.
-   Make public content editable through the agreed CMS or admin content
    module.

------------------------------------------------------------------------

## 15. Accessibility and responsive design

Target WCAG 2.2 AA as a development goal.

Required: - Semantic HTML and correct heading order. - Full keyboard
support. - Visible focus styles. - Accessible labels and instructions. -
Contrast checked across text, icons, borders, and controls. - Error
messages programmatically associated with fields. - Focus management for
dialogs, menus, and mobile navigation. - Touch targets suitable for
mobile use. - Reduced motion support. - No information conveyed through
colour alone. - Accessible tables and calculator output. - Screen reader
announcements for cart updates, form results, and dynamic filtering. -
Responsive layouts tested on small phones, large phones, tablets,
laptops, and wide desktop screens.

------------------------------------------------------------------------

## 16. Performance, reliability, and security

### 16.1 Performance

-   Optimise and correctly size images.
-   Use modern image formats where supported.
-   Lazy load below the fold imagery while prioritising the main hero
    image.
-   Avoid excessive third party scripts.
-   Minimise client JavaScript.
-   Cache public catalogue and content data safely.
-   Keep dynamic pricing, stock, customer data, and checkout responses
    appropriately fresh.
-   Set and test performance budgets.
-   Aim for good Core Web Vitals, with a practical target of LCP at or
    below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or
    below 0.1 at the 75th percentile when measured with sufficient real
    user data.

### 16.2 Security

-   Use HTTPS everywhere.
-   Validate and sanitise inputs appropriately.
-   Apply secure cookies, CSRF protection where applicable, and safe
    session handling.
-   Rate limit sensitive endpoints.
-   Protect against injection, XSS, broken access control, and file
    upload abuse.
-   Keep secrets in managed environment variables or secret storage.
-   Use least privilege for service credentials.
-   Verify signed payment webhooks and prevent replay or duplicate
    processing.
-   Patch dependencies and scan builds.
-   Back up the database and periodically test restoration.
-   Monitor errors and suspicious activity.
-   Create and test incident response procedures.
-   Avoid logging passwords, tokens, card data, or unnecessary personal
    data.
-   Assess Nigerian data protection obligations and relevant payment
    compliance requirements with appropriate professional guidance
    before launch.

------------------------------------------------------------------------

## 17. Analytics and measurement

Instrument key events only after defining a privacy compliant analytics
plan.

Suggested events: - `view_solution` - `view_product` -
`search_catalogue` - `apply_product_filter` - `add_to_cart` -
`begin_checkout` - `purchase` - `start_calculator` -
`complete_calculator` - `request_quote` - `book_consultation` -
`click_whatsapp` - `submit_contact_form` - `view_project` -
`start_support_request`

Do not send unnecessary personally identifiable information to analytics
tools. Define event names, required fields, consent behaviour,
retention, and reporting ownership.

Key business measures: - Product conversion rate. - Quote request
completion rate. - Qualified enquiry rate. - Calculator to enquiry
conversion. - Cart abandonment. - Average order value. - Payment failure
and refund rates. - Stockout rate. - Quote response time. - Quote
acceptance rate. - Installation completion and support resolution time.

------------------------------------------------------------------------

## 18. Testing strategy

### 18.1 Unit tests

-   Price calculations.
-   Cart totals and promotions.
-   Inventory availability and reservation rules.
-   Payment state transitions.
-   Solar calculation formulas.
-   Form validation.
-   Permission checks.
-   Currency formatting.

### 18.2 Integration tests

-   Database transactions.
-   Order creation.
-   Payment initiation and webhook verification.
-   Duplicate webhook handling.
-   Email and notification retries.
-   Quote creation and revision.
-   Inventory movement.
-   Installation workflow transitions.

### 18.3 End to end tests

-   Browse product, add to cart, and complete a test checkout.
-   Failed and cancelled payments.
-   Duplicate checkout submission.
-   Submit a consultation request.
-   Complete the calculator and continue to a quote request.
-   Admin creates a product and updates stock.
-   Admin creates a quote and records customer acceptance.
-   Staff schedules an installation and records commissioning.
-   Customer opens order history.
-   Mobile navigation and filtering.
-   Keyboard only navigation and reduced motion.
-   Search engine metadata and key public routes.

Use a payment sandbox until the business and gateway are ready for
production. Never use live customer payment details in test suites.

### 18.4 Release gates

A release is not ready until: - Build and type checks pass. - Linting
passes. - Required tests pass. - Critical security issues are
resolved. - No key page has broken navigation or horizontal overflow. -
Forms have loading, success, validation, and error states. - Payment
verification is server side. - Backup and restore procedures are
documented. - Privacy, terms, returns, delivery, and warranty content is
approved. - Real prices and product claims are verified. - Analytics and
monitoring are configured appropriately.

------------------------------------------------------------------------

## 19. Mandatory staged delivery plan for AI agents

The entire project must be delivered in ordered stages. The minimum plan is 18 stages. Agents must not start the next stage until the current stage has passed its verification gate and the project owner or designated lead has accepted the stage report. Do not combine stages just to move faster.

### 19.1 Non negotiable stage gate

At the end of every stage, the implementing agent must stop feature work and perform all of the following:

1. **Test:** run the relevant automated tests and the stage's manual test checklist.
2. **Debug:** inspect console output, server logs, failed tests, network requests, and browser behaviour. Fix root causes, not just visible symptoms.
3. **Troubleshoot:** test normal, invalid, empty, slow, failed, and boundary conditions that apply to the stage.
4. **Verify:** compare the result against the acceptance criteria, approved design, responsive layouts, accessibility needs, and relevant security requirements.
5. **Regression check:** rerun all previously passing tests that could be affected by the changes.
6. **Document:** update the README or relevant technical notes, record commands run, and list known limitations.
7. **Report:** produce a Stage Completion Report with files changed, features completed, tests and outcomes, defects found and fixed, remaining issues, screenshots or recordings where useful, and an explicit PASS or BLOCKED status.
8. **Stop on failure:** if a critical test fails, a core journey is broken, or a security or data integrity issue remains, mark the stage BLOCKED. Fix it and repeat the full gate. Do not proceed on an assumed pass.

A stage passes only when all required checks pass, no unresolved critical or high severity defect remains, and the stage report is complete. Do not mark a test as passed unless it was actually run. If a test cannot run because a dependency is unavailable, state that honestly and keep the stage BLOCKED unless the project owner explicitly accepts the limitation in writing.

### 19.2 The 18 implementation stages

#### Stage 1: Discovery and business confirmation

Tasks: confirm business goals, target audiences, sales regions, contact channels, product categories, service offerings, direct purchase versus quotation rules, payment preferences, shipping and installation coverage, and the content that must be supplied by the owner. Create a decision log and list unknowns. Never fabricate prices, testimonials, certificates, warranty terms, or business contact details.

Gate checks: requirements review, assumptions list, business data checklist, prioritised scope, and written acceptance of unresolved launch dependencies.

#### Stage 2: Reference analysis and user journeys

Tasks: map the reference site's visible information hierarchy and interaction patterns without copying its code, branding, text, or media. Define journeys for product purchase, custom solar consultation, quote request, project discovery, and support.

Gate checks: sitemap, journey diagrams or written flows, page inventory, clear calls to action, and review that both commerce and consultation journeys have a clear outcome.

#### Stage 3: Sitemap, wireframes, and content plan

Tasks: create low fidelity layouts for every launch page, define section order and content purpose, plan internal links, identify reusable page patterns, and specify mobile and desktop behaviour.

Gate checks: all launch routes accounted for, every page has a primary goal, missing content is flagged, and wireframes reviewed before visual styling begins.

#### Stage 4: Visual identity and design system

Tasks: establish DEVICE PRO design tokens, typography, colours, spacing, buttons, cards, forms, navigation, icons, image treatment, focus states, and responsive breakpoints. Keep the visual style clear, professional, and simple.

Gate checks: design tokens documented, shared component examples approved, contrast and legibility reviewed, mobile and desktop samples checked, and no unapproved brand assets used.

#### Stage 5: Motion and interaction specification

Tasks: specify menu transitions, dropdowns, accordions, tabs, modals, hover and focus states, sticky elements, scroll reveal, loading indicators, cart feedback, form feedback, and reduced motion behaviour. Use motion sparingly and never make core content depend on animation.

Gate checks: each interaction has default, hover, focus, active, disabled, loading, success, and failure states where relevant. Keyboard and touch alternatives are specified. Reduced motion is covered.

#### Stage 6: Repository and development foundation

Tasks: create the Git repository, simple folder structure, Node.js and Express application, HTML templates or static pages, CSS and JavaScript modules, environment configuration, error handling, and development scripts. Add only dependencies needed for an explicit requirement.

Gate checks: a clean checkout can install dependencies, start the server, render a working page, serve CSS and JavaScript, and display a useful error page. README setup instructions must work on a fresh environment.

#### Stage 7: Shared layout and navigation

Tasks: build the header, desktop navigation, mobile menu, footer, breadcrumbs, buttons, reusable cards, form controls, and shared page containers. Ensure navigation is consistent on all pages.

Gate checks: all navigation links resolve to intended routes, mobile menu works with keyboard and touch, focus is visible, no horizontal overflow appears at supported widths, and shared components pass visual regression review.

#### Stage 8: Homepage

Tasks: build the homepage sections in the approved order, including hero, clear calls to action, solution entry points, featured products or packages, trust content that has been verified, project examples, process explanation, FAQs, and final contact action as approved.

Gate checks: every CTA works, images have appropriate alternative text, no invented claims appear, mobile and desktop layouts are reviewed, and page performance is measured.

#### Stage 9: Solutions and service pages

Tasks: build the solutions overview and residential, commercial, industrial, and infrastructure pages where applicable. Explain who each solution serves, what it includes, what information is needed for a quote, and the next action.

Gate checks: each solution page is complete, cross links work, enquiry CTAs preserve relevant context, claims are approved, and pages are responsive and accessible.

#### Stage 10: Products, categories, packages, and pricing

Tasks: build product categories, search and filtering where approved, product detail pages, package pages, price presentation, stock status, specification tables, and product enquiry paths. Use real owner supplied data only.

Gate checks: category and product navigation works, filters return correct results, missing data is displayed honestly, price and availability states are consistent, and sample catalogue data is clearly marked as test data until approved.

#### Stage 11: Projects, about, resources, FAQs, and contact

Tasks: create project listings and case study pages, company information, educational resources, FAQs, contact details, consultation form, and WhatsApp link if the owner supplies and approves the number. Do not publish invented project outcomes or testimonials.

Gate checks: forms validate and give success and error feedback, spam protection is present where appropriate, contact links work, content is reviewed, and all pages have page titles and metadata.

#### Stage 12: Node.js API, data model, and persistence

Tasks: implement the minimum required database tables and server routes for products, categories, enquiries, quotes, orders, users, and content that must be managed dynamically. Use migrations or versioned schema scripts. Validate all server inputs and centralize business rules.

Gate checks: data persists across restarts, validation rejects malformed inputs, authorization protects private routes, database failure is handled safely, and backup and restore are tested before production data is stored.

#### Stage 13: Admin dashboard and content operations

Tasks: implement protected admin sign in and the minimum workflows for managing products, pricing, stock, enquiries, quotes, project content, and order statuses as required for launch. Keep admin screens simple and consistent with the same design system.

Gate checks: unauthenticated users cannot access admin data, role permissions are verified, create/read/update/archive actions work, validation is enforced on the server, and important changes are logged where appropriate.

#### Stage 14: Solar calculator and quotation workflow

Tasks: build the approved calculator as an indicative estimation tool, document units and assumptions, collect relevant customer requirements, preserve calculator inputs when opening a quote request, and support enquiry review. A qualified engineer must approve formulas and safety related assumptions before public release.

Gate checks: unit tests cover formulas and boundaries, inputs are validated, results are labelled as indicative, unsafe or impossible inputs are handled, the enquiry receives the captured values, and an engineering review is recorded.

#### Stage 15: Cart, checkout, orders, and payments

Tasks: implement cart state, checkout validation, order creation, payment gateway sandbox flow, server side payment verification, webhook signature verification, idempotent webhook processing, order confirmation, and failure recovery. Do not store raw card details.

Gate checks: test successful, declined, cancelled, duplicated, delayed, and mismatched payment events; verify an order is not marked paid based only on the browser redirect; reconcile order and payment states; and complete an end to end sandbox purchase.

#### Stage 16: Delivery, installation, and after sales workflows

Tasks: implement the launch required status tracking for delivery, installation scheduling, commissioning records, support requests, and warranty information. Only expose operational promises that the business has approved.

Gate checks: status transitions follow defined rules, customers and staff see the correct information, notifications do not leak private data, and operational staff can complete a sample job from request through completion.

#### Stage 17: Security, SEO, accessibility, performance, and full regression

Tasks: perform a full audit of authentication, authorization, input validation, rate limits, dependency health, secret handling, backups, SEO, accessibility, responsive behaviour, performance, analytics, and error reporting. Check all key journeys on mobile and desktop.

Gate checks: no known critical or high severity security defect remains, all critical journeys pass, payment and data integrity tests pass, metadata and indexing rules are correct, keyboard navigation works, reduced motion is respected, and backup restoration is demonstrated.

#### Stage 18: Production launch and handover

Tasks: confirm domain and HTTPS, production environment variables, database setup, backups, payment live mode approval, business content, privacy policy, terms, delivery and returns policy, warranty policy, analytics, monitoring, support ownership, and rollback plan. Train the business team on admin tasks and provide a handover document.

Gate checks: run smoke tests on the live site, verify forms and payment callbacks safely, confirm backups and alerts, check the full set of launch routes, record rollback instructions, obtain owner approval, and deliver a final known issues register.

### 19.3 Required stage report template

Every stage must finish with a report using this format:

- Stage number and name.
- Objective and scope completed.
- Files and modules changed.
- Commands and test suites actually run.
- Test results with pass, fail, or blocked status.
- Manual browser checks and screen sizes tested.
- Bugs discovered, root causes, fixes, and regression results.
- Security, accessibility, responsive, and performance checks relevant to the stage.
- Known limitations and dependencies.
- Screenshots or recordings when visual behaviour changed.
- Final gate status: PASS or BLOCKED.
- Next stage recommendation, only if the current stage is PASS.

### 19.4 Change control

If a stage reveals a missing requirement, stop and document the decision needed. Do not silently expand scope or change an approved design. If a change affects a previously passed stage, rerun that stage's relevant tests and any affected regression tests. The project owner may reprioritise work, but the verification gate may not be skipped.

------------------------------------------------------------------------

------------------------------------------------------------------------

## 20. Repository structure proposal

Adapt to the selected framework, but keep domains and shared components
clear.

```text
device-pro/
  public/
    css/
      tokens.css
      styles.css
      responsive.css
    js/
      main.js
      navigation.js
      forms.js
      products.js
      calculator.js
      cart.js
    images/
    icons/
  views/
    layouts/
    pages/
    partials/
  routes/
    public.routes.js
    products.routes.js
    enquiries.routes.js
    admin.routes.js
    orders.routes.js
    payments.routes.js
  controllers/
  services/
    catalogue.service.js
    enquiries.service.js
    quotes.service.js
    orders.service.js
    payments.service.js
  middleware/
    authentication.js
    authorization.js
    validation.js
    rate-limit.js
    error-handler.js
  database/
    schema.sql
    migrations/
    seeds/
  tests/
    unit/
    integration/
    browser/
  docs/
    architecture.md
    decisions/
    stage-reports/
    operations/
  server.js
  package.json
  .env.example
  .gitignore
  README.md
```

Use the smallest folder structure that keeps responsibilities understandable. Do not create empty modules before they are needed. The exact template engine and database adapter must be selected and documented in Stage 6 or Stage 12. Plain HTML files may be served directly for early static pages, then moved into reusable server templates only when shared content or dynamic rendering needs it.

------------------------------------------------------------------------

## 21. AI agent working protocol

### 21.1 Suggested agent roles

-   **Product and research agent:** requirements, business rules, page
    content model, and unresolved decisions.
-   **UX and visual agent:** page layouts, responsive rules, component
    states, motion, and accessibility.
-   **Frontend agent:** public pages, shared components, forms, and
    responsive interaction.
-   **Backend agent:** domain services, API validation, database schema,
    and permissions.
-   **Commerce agent:** catalogue, inventory, checkout, payment
    integration, refunds, and order state machine.
-   **Solar domain agent:** calculator assumptions, units, formula
    documentation, and engineer review workflow.
-   **QA agent:** unit, integration, end to end, accessibility, and
    regression tests.
-   **Security and release agent:** threat review, dependency checks,
    secrets, backups, monitoring, and release gates.

A single agent may perform several roles, but the responsibilities and
acceptance criteria should remain distinct.

### 21.2 Required task format

Each implementation task should state: - Objective. - User or business
problem. - Relevant pages and user journey. - Files or modules expected
to change. - Dependencies. - Data and API contracts. - Responsive and
accessibility requirements. - Animation and interaction states. -
Security and privacy considerations. - Acceptance criteria. - Tests to
add or update. - Documentation to update.

### 21.3 Agent rules

The 18 stage plan in Section 19 is mandatory. Agents must work on only the active stage unless a documented blocker requires a narrow investigation of a dependency. At the end of the stage, run the complete gate and produce the required report. A later stage may not begin while the current stage is BLOCKED. The project owner must explicitly approve any exception; an agent cannot approve its own gate exception.

-   Inspect existing code before changing it.
-   Do not replace working architecture without a documented reason.
-   Do not silently change established design tokens or data contracts.
-   Do not hardcode production secrets, prices, stock, contact details,
    or warranty claims.
-   Do not invent integrations or claim that a payment succeeded without
    verified confirmation.
-   Keep changes focused and testable.
-   Add tests for business logic and edge cases.
-   Use migrations for schema changes.
-   Explain assumptions and blockers in the task result.
-   Update the architecture document when implementation changes
    approved system behaviour.

------------------------------------------------------------------------

## 22. Definition of done

A feature is done when: 1. Its intended user journey works from start to
finish. 2. It uses the approved design system. 3. It is responsive and
accessible. 4. Loading, empty, success, failure, and disabled states are
handled where relevant. 5. Server side validation and authorization
exist where needed. 6. Data is persisted correctly and sensitive
operations are auditable. 7. Tests cover important behaviour and edge
cases. 8. SEO metadata is correct for public pages. 9. No fake claims or
unapproved business data have been introduced. 10. Documentation is
updated. 11. The feature has been reviewed in a real browser at mobile
and desktop sizes. 12. There are no unresolved critical security,
payment, or data integrity issues.

------------------------------------------------------------------------

## 23. Open decisions that must be resolved

The architecture is a strong starting point, but these business
decisions must be confirmed before production implementation:

1.  Final DEVICE PRO logo, brand colours, typography, and approved
    photography.
2.  Exact product categories, brands, SKUs, specifications, stock
    locations, and pricing.
3.  Which products can be purchased directly and which require a quote.
4.  Approved package configurations and engineering assumptions.
5.  Delivery pricing, installation coverage, service regions, and
    operational schedules.
6.  Payment gateway, settlement account, refunds, and reconciliation
    procedures.
7.  Inventory, accounting, POS, CRM, or ERP systems that need
    integration.
8.  Staff roles, approval limits, and access requirements.
9.  Confirmed warranty, returns, privacy, terms, and financing policies.
10. Calculator assumptions and engineer approval workflow.
11. Hosting budget, expected traffic, support ownership, and recovery
    objectives.
12. Whether customer accounts are required at launch or guest checkout
    is sufficient.
13. Whether content should be managed in a custom admin CMS or a
    dedicated headless CMS.
14. Whether nationwide installation is available everywhere or only in
    defined service zones.

Do not block visual design on every unanswered question. Use clearly
labelled placeholder content in prototypes, but do not publish
placeholder business facts to production.

------------------------------------------------------------------------

## 24. Architecture decision log

Record important decisions in `docs/decisions/` using a consistent
format.

Each decision record should include: - Decision title and date. -
Status: proposed, accepted, superseded. - Context and constraints. -
Options considered. - Decision and rationale. - Consequences and trade
offs. - Owner or approver.

Initial proposed decisions: - Use a custom built platform rather than a
hosted template store. - Use a responsive web experience before
considering native apps. - Support both direct product commerce and
consultative solar projects. - Keep the initial backend modular rather
than prematurely splitting into microservices. - Treat solar sizing as
an estimate until reviewed by a qualified engineer. - Use server
verified payment events and auditable order transitions. - Use the
reference website for structure and customer journey inspiration, while
creating an original DEVICE PRO identity and implementation.

------------------------------------------------------------------------

## 25. Launch vision

At launch, a customer should be able to arrive at DEVICE PRO, understand
the company's solar offerings, choose between residential and business
solutions, inspect equipment and package options, obtain a clearly
labelled preliminary estimate, request a quotation, purchase eligible
products, pay securely, receive order updates, and contact the business
for installation or support.

At the same time, authorised DEVICE PRO staff should be able to manage
catalogue data, stock, pricing, orders, payments, enquiries, quotations,
projects, installation jobs, and support cases from a secure
administration system.

The result should combine the reference website's clarity and solution
led presentation with the reliability of a custom ecommerce platform and
the operational workflows required by a solar business serving customers
across Nigeria.

------------------------------------------------------------------------

## Reference

-   Solar World Electric, Solutions:
    https://www.solarworldelectric.com/solutions.html
-   Solar World Electric, public homepage and linked public navigation:
    https://www.solarworldelectric.com/

This document records a proposed DEVICE PRO architecture based on the
public reference structure and the business requirements established so
far. It must be updated as actual business policies, product data,
engineering rules, and implementation decisions are confirmed.
