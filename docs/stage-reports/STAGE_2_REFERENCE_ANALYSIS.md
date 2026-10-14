# DEVICE PRO — Stage 2: Reference Analysis & User Journeys

## 2.1 Reference Site Information Hierarchy Analysis

The reference site (Solar World Electric) uses a clear, solution-led architecture. Key design principles observed (NOT copied):

### Navigation Structure
- **Primary nav**: Home | About (dropdown) | Solutions (dropdown) | Product Prices (dropdown) | Projects (dropdown) | Calculators (dropdown) | Blog | Contact
- **Persistent CTA**: "Free consultation" button in header
- **Mobile**: Hamburger menu with full nav + contact CTAs at bottom
- **Each dropdown** contains title + description for each sub-item (mega-menu pattern)

### Homepage Section Order (Reference Pattern)
1. Hero with rotating slides, gradient text, stats counter
2. Trust/network band with animated globe
3. Solution categories (4 cards)
4. Featured packages with prices (horizontal scroll)
5. Why choose section (differentiators)
6. Process steps (7 steps)
7. Customer reviews carousel
8. FAQ accordion
9. Calculator teaser
10. Final CTA band
11. Footer (navigation, offices by city, contact, social)

### Key Interaction Patterns
- **Scroll-reveal animations** (fade-in on scroll, `data-reveal` attribute)
- **Counter animations** for statistics
- **Hero slideshow** with auto-advance
- **Dropdown navigation** with click-to-open, escape-to-close
- **Sticky header** with background change on scroll
- **WhatsApp CTA** throughout (floating + inline)
- **Breadcrumbs** on interior pages
- **Split layouts** (text + image, alternating sides)
- **Card grids** for solutions, packages, projects
- **Process stepper** (numbered steps, sticky sidebar)

---

## 2.2 DEVICE PRO Sitemap (Adapted from Architecture §5)

```
DEVICE PRO
├── / (Homepage)
├── /solutions (Solutions Overview)
│   ├── /solutions/residential
│   ├── /solutions/commercial
│   ├── /solutions/industrial
│   └── /solutions/infrastructure
├── /products (Product Catalogue)
│   └── /products/:slug (Product Detail)
├── /categories/:slug (Category Page)
├── /packages (Solar Packages)
│   └── /packages/:slug (Package Detail)
├── /pricing (Pricing & Quotation Info)
├── /projects (Project Portfolio)
│   └── /projects/:slug (Case Study)
├── /calculator (Solar Sizing Calculator)
├── /savings-calculator (Generator vs Solar)
├── /resources (Knowledge Centre)
│   └── /resources/:slug (Article/Guide)
├── /faq (Frequently Asked Questions)
├── /about (Company Profile)
├── /team (Team Profiles)
├── /reviews (Customer Reviews)
├── /locations (Service Coverage)
├── /contact (Contact & Enquiry)
├── /consultation (Consultation Request)
├── /quote (Quote Request)
├── /cart (Shopping Cart)
├── /checkout (Checkout)
│   └── /checkout/success (Order Confirmation)
├── /account (Customer Account)
│   ├── /account/orders
│   ├── /account/quotes
│   └── /account/profile
├── /support (Support Portal)
├── /privacy (Privacy Policy)
├── /terms (Terms of Service)
├── /delivery (Delivery Information)
├── /returns (Returns Policy)
├── /warranty (Warranty Information)
├── /accessibility (Accessibility Statement)
└── /admin (Admin Dashboard - Protected)
    ├── /admin/products
    ├── /admin/categories
    ├── /admin/brands
    ├── /admin/packages
    ├── /admin/inventory
    ├── /admin/orders
    ├── /admin/payments
    ├── /admin/customers
    ├── /admin/enquiries
    ├── /admin/quotes
    ├── /admin/projects
    ├── /admin/installations
    ├── /admin/service
    ├── /admin/content
    ├── /admin/promotions
    ├── /admin/reports
    ├── /admin/users
    ├── /admin/settings
    └── /admin/audit-log
```

**Total public pages**: 35+ (including dynamic routes)
**Total admin pages**: 19

---

## 2.3 User Journey Definitions

### Journey 1: Direct Product Purchase

**Actor**: Customer who knows what they need (e.g., a specific inverter or battery)
**Goal**: Find product, confirm specs & price, purchase, receive delivery

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────┐
│   Discover   │────▶│   Browse &   │────▶│  Product Detail  │────▶│ Add to   │
│  (Home/Nav)  │     │   Filter     │     │  (Specs/Price)   │     │  Cart    │
└─────────────┘     └──────────────┘     └─────────────────┘     └────┬─────┘
                                                                       │
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐          │
│   Order     │◀────│   Payment    │◀────│    Checkout      │◀─────────┘
│ Confirmation│     │  (Paystack)  │     │ (Details/Review)  │
└──────┬──────┘     └──────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐
│Track/Support│
└─────────────┘
```

**Entry points**: Homepage → Products, Nav → Products, Search, Package page
**Key pages**: /products, /products/:slug, /cart, /checkout, /checkout/success
**CTAs**: "Add to Cart", "Buy Now", "View Cart", "Proceed to Checkout"
**Exit states**: Order confirmation with reference number, or quote request if product needs consultation

### Journey 2: Consultative Solar Solution

**Actor**: Homeowner or business unsure about what they need
**Goal**: Understand options, get an estimate, request professional consultation

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Discover   │────▶│   Solutions  │────▶│  Solution Detail  │
│  (Home/Nav)  │     │   Overview   │     │  (Residential/   │
└─────────────┘     └──────────────┘     │   Commercial)    │
                                          └────────┬─────────┘
                                                   │
       ┌───────────────────────────────────────────┘
       │                            │
       ▼                            ▼
┌──────────────┐     ┌──────────────────────────┐
│    Solar     │     │  Consultation / Quote     │
│  Calculator  │────▶│  Request Form             │
│ (Estimate)   │     │  (carries calculator data)│
└──────────────┘     └───────────┬──────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Confirmation + WhatsApp  │
                    │  follow-up option         │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  Staff review → Proposal  │
                    │  → Site visit → Agreement │
                    └──────────────────────────┘
```

**Entry points**: Homepage CTA, Nav → Solutions, Nav → Calculator
**Key pages**: /solutions, /solutions/:type, /calculator, /consultation, /quote
**CTAs**: "Get a Free Consultation", "Calculate Your System", "Request a Quote", "Chat on WhatsApp"
**Data preserved**: Calculator inputs → Quote form (appliance list, estimated load, backup hours)

### Journey 3: Project Discovery & Trust Building

**Actor**: Potential customer researching before committing
**Goal**: See evidence of real work, understand the company, build confidence

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌───────────┐
│   Discover   │────▶│   Projects   │────▶│  Case Study     │────▶│  Contact/ │
│  (Home/Nav)  │     │  (Filtered)  │     │  (Evidence)     │     │  Consult  │
└─────────────┘     └──────────────┘     └─────────────────┘     └───────────┘
                           │
                           ├──▶ /about (Company story)
                           ├──▶ /reviews (Customer testimonials)
                           ├──▶ /team (Meet the people)
                           └──▶ /faq (Common questions)
```

**Entry points**: Homepage project section, Nav → Projects, Nav → About
**Key pages**: /projects, /projects/:slug, /about, /reviews, /team, /faq
**CTAs**: "See Our Projects", "Read Our Story", "Book Consultation"

### Journey 4: Knowledge & Education

**Actor**: Customer learning about solar before making a decision
**Goal**: Understand solar technology, sizing, costs, maintenance

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌───────────┐
│  Discover   │────▶│  Resources/  │────▶│  Article/Guide   │────▶│ Calculator│
│  (Search/   │     │  FAQ/Blog    │     │  (Educational)   │     │ or Quote  │
│   Social)   │     └──────────────┘     └──────────────────┘     └───────────┘
└─────────────┘
```

**Entry points**: Search engine, social media, Nav → Resources/FAQ
**Key pages**: /resources, /resources/:slug, /faq, /calculator
**CTAs**: "Use Our Calculator", "Get Expert Advice", "Read More"

### Journey 5: Existing Customer Support

**Actor**: Customer who already purchased/installed
**Goal**: Get help with warranty, maintenance, or technical support

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Return    │────▶│   Support    │────▶│  Submit Request  │
│  (Account/  │     │  Portal/FAQ  │     │  (Ref# + Details)│
│   Direct)   │     └──────────────┘     └──────────────────┘
└─────────────┘            │
                           ├──▶ /warranty (Warranty information)
                           ├──▶ /account/orders (Order history)
                           └──▶ WhatsApp (Quick support)
```

**Entry points**: Nav → Support, Footer → Support, Account dashboard
**Key pages**: /support, /warranty, /account/orders, /contact
**CTAs**: "Submit Support Request", "Check Warranty", "Chat on WhatsApp"

---

## 2.4 Page Inventory with Primary Goals

| Page | Primary Goal | Key CTA |
|------|-------------|---------|
| **Homepage** | Route visitor to correct journey | "Get Consultation" / "Explore Solutions" |
| **Solutions Overview** | Help identify use case | "Learn More" per category |
| **Solutions/Residential** | Explain residential solar | "Get a Quote" / "Use Calculator" |
| **Solutions/Commercial** | Explain commercial solar | "Request Consultation" |
| **Solutions/Industrial** | Explain industrial solar | "Request Consultation" |
| **Solutions/Infrastructure** | Explain infrastructure solar | "Request Consultation" |
| **Products** | Browse & filter equipment | "View Product" / "Add to Cart" |
| **Product Detail** | Evaluate specs, decide to buy/enquire | "Add to Cart" / "Enquire" |
| **Packages** | Compare pre-configured systems | "View Package" / "Buy Now" |
| **Pricing** | Understand pricing structure | "View Packages" / "Request Quote" |
| **Projects** | See evidence of completed work | "View Case Study" |
| **Project Detail** | Build trust with real examples | "Get Similar Solution" |
| **Calculator** | Estimate system size | "Request Quote" (with data) |
| **Savings Calculator** | Compare solar vs generator cost | "Get Consultation" |
| **Resources** | Educate customer | "Read Article" / "Use Calculator" |
| **FAQ** | Answer common questions | "Still have questions? Contact us" |
| **About** | Build trust and credibility | "Meet the Team" / "Contact" |
| **Reviews** | Social proof | "Get Your Own System" |
| **Contact** | Submit enquiry | "Send Message" / "WhatsApp" |
| **Consultation** | Book free consultation | "Submit Request" |
| **Quote** | Request formal quotation | "Submit Quote Request" |
| **Cart** | Review selected items | "Proceed to Checkout" |
| **Checkout** | Complete purchase | "Place Order" |
| **Account** | Manage orders & profile | "View Orders" / "Get Support" |
| **Support** | Get help with existing system | "Submit Ticket" |

---

## 2.5 Calls to Action Inventory

### Primary CTAs (appear globally)
1. **"Get a Free Consultation"** — Links to /consultation
2. **"Chat on WhatsApp"** — Opens WhatsApp with pre-filled message
3. **"Calculate Your System"** — Links to /calculator

### Secondary CTAs (context-specific)
4. **"Explore Solutions"** — Homepage → /solutions
5. **"View Packages & Pricing"** — Various → /packages
6. **"Request a Quote"** — Product/calculator → /quote
7. **"Add to Cart"** — Product detail → cart action
8. **"See Our Projects"** — Various → /projects
9. **"Learn More"** — Solution cards → /solutions/:type
10. **"Get Support"** — Footer/account → /support

### CTA Placement Rules
- Every content page ends with a consultation CTA
- Product/package pages include both "Buy" and "Enquire" options
- Calculator results include "Request Quote" with pre-filled data
- WhatsApp appears as floating button (when number confirmed) and in CTAs
- No page should be a dead-end without a clear next action

---

## 2.6 Commerce vs Consultation Journey Clarity

| Scenario | Journey Type | Clear to Customer? |
|----------|-------------|-------------------|
| Individual product (panel, cable) | Direct purchase | ✅ "Add to Cart" |
| Standard package with fixed price | Direct purchase | ✅ "Buy This Package" |
| Custom system, unknown load | Consultation | ✅ "Get a Quote" |
| Large commercial/industrial | Consultation | ✅ "Request Consultation" |
| Existing customer, support | Support ticket | ✅ "Get Support" |
| Not sure which path | Calculator → Guided | ✅ "Calculate Your System" first |

The calculator serves as a bridge between journeys — customers who start unsure can get an indicative estimate, then either purchase a matching package directly or request a professional consultation.

---

## 2.7 Mobile Considerations

- Navigation collapses to hamburger menu with slide-in drawer
- Solution cards stack vertically (1 column on mobile)
- Product grid: 1 column on phone, 2 on tablet, 3-4 on desktop
- Calculator: full-width form, results scroll below
- Filters: presented as a slide-up drawer (not sidebar)
- WhatsApp CTA: always reachable (floating or in-page)
- Touch targets: minimum 44×44px
- Forms: one field per line on mobile, appropriate keyboard types

---

## 2.8 Reusable Page Patterns

1. **Content page**: Breadcrumb → Hero/Page header → Content sections → CTA band → Footer
2. **Listing page**: Breadcrumb → Filters/Search → Grid → Pagination → CTA band → Footer
3. **Detail page**: Breadcrumb → Hero/Gallery → Content → Related items → CTA band → Footer
4. **Form page**: Breadcrumb → Intro → Form → Success/Error state → Footer
5. **Admin page**: Sidebar nav → Header → Data table/Form → Actions
