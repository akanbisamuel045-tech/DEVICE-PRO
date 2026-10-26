# DEVICE PRO ADMIN SYSTEM
## STAGE 8.4 BASELINE AUDIT: SOLAR PACKAGE BILL OF MATERIALS (BOM)

**Generated:** 2026-10-24  
**Environment:** Isolated Development / MongoDB Atlas (`devicepro`)  
**Scope:** Stage 8.4 Solar Package Bill of Materials (BOM) System Architecture & Baseline Verification  
**Status:** COMPLETE — Ready for Implementation  

---

### 1. EXECUTIVE SUMMARY & OBJECTIVE

As mandated by Stage 8.4 of the DEVICE PRO Admin System, this baseline audit investigates the current state of solar packages, component definitions, product catalog relationships, cost pricing fields, and administrative UI capabilities.

A Bill of Materials (BOM) system describes the components, quantities, and documented cost basis required to assemble and deliver turnkey solar packages. This baseline report establishes:
- Current package counts, database schemas, and pricing structures in MongoDB Atlas.
- Analysis of where component specifications currently reside (e.g., in-memory metadata vs database records).
- Structural relationships between turnkey packages and active commercial catalog products.
- Reusable APIs, authentication/authorization layers, and administrative UI sections.
- Identified data gaps, costing provenance rules, and technical risks.
- The proposed, backward-compatible Mongoose schema, calculation engine, API routes, and administrator interface design.

**Mandatory Safety Boundaries:**
- Zero activation or invention of supplier acquisition costs.
- Zero automatic changes to retail package prices (`price_ngn`) or promotional references (`previous_price_ngn`).
- Zero changes to customer orders, quotes, inventory stock quantities, or checkout flows.
- Stage 8.5 remains strictly deferred.
- No production or Vercel deployment.

---

### 2. EXISTING SOLAR PACKAGE COUNT & IDENTIFIERS

A safe read-only query was performed against MongoDB Atlas (`devicepro.products` collection) where `category: 'solar-packages'`:

| Product ID | SKU | URL Slug | Package Name | Retail Selling Price (`price_ngn`) | Reference Price (`previous_price_ngn`) | Stock Status | Published |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **27** | `DP-PKG-2KVA` | `2kva-starter-solar-backup-package` | 2kVA Starter Solar Backup System | ₦1,150,000 | ₦1,280,000 | `in_stock` | 1 |
| **23** | `DP-PKG-3.5KVA` | `3-5kva-essential-home-solar-package` | 3.5kVA Essential Home Solar System | ₦2,450,000 | ₦2,750,000 | `in_stock` | 1 |
| **24** | `DP-PKG-5KVA` | `5kva-premium-duplex-solar-package` | 5kVA Premium Duplex Solar Package | ₦4,350,000 | ₦4,850,000 | `in_stock` | 1 |
| **48** | `DP-PKG-7.5KVA` | `7-5kva-executive-villa-solar-package` | 7.5kVA Executive Villa Solar Package | ₦6,450,000 | ₦7,200,000 | `in_stock` | 1 |
| **25** | `DP-PKG-10KVA` | `10kva-executive-residence-solar-package` | 10kVA Executive Residence Solar System | ₦8,200,000 | ₦9,100,000 | `in_stock` | 1 |
| **26** | `DP-PKG-15KVA` | `15kva-commercial-office-solar-package` | 15kVA Commercial Office Microgrid | ₦12,500,000 | ₦13,800,000 | `in_stock` | 1 |

**Key Findings:**
1. Exactly **6 turnkey solar packages** exist in the database.
2. All 6 packages have active commercial selling prices (`price_ngn`) ranging from ₦1,150,000 to ₦12,500,000.
3. All 6 packages are currently published (`published: 1`) and available in catalog listings.

---

### 3. EXISTING PACKAGE PRICING & COST FIELDS

Inspection of the package records in MongoDB Atlas confirms:
- `price_ngn`: Valid positive integer representing commercial retail selling price.
- `previous_price_ngn`: Valid positive integer representing promotional strike-through retail price.
- `cost_price_ngn`: Evaluates to `0` or `null`/`undefined` across all 6 package records.
- `supplier_cost_ngn`: Not present / uninitialized.

**Crucial Costing Safety Principle:**
Under no circumstances may retail selling prices (`price_ngn`) be treated as supplier acquisition costs. Nor may `cost_price_ngn` be defaulted to `price_ngn` or `0`. When a package or its component has no verified acquisition cost, it must be reported as **unknown / incomplete costing**.

---

### 4. WHERE PACKAGE COMPONENTS ARE CURRENTLY RECORDED

**1. Database Document Inspection (`Product` collection):**
- In MongoDB Atlas, package documents contain general marketing fields: `name`, `slug`, `brand: 'DEVICE PRO'`, `category: 'solar-packages'`, `price_ngn`, `power_rating`, `power_tier`, `specifications` (a text string summary), and `image_url`.
- **Zero component records, itemized BOM lines, component SKU links, or quantities exist in the database collection.**

**2. Application Source Code Inspection (`PACKAGE_METADATA` in `db/mongo/repository.js`):**
- In `db/mongo/repository.js` (lines 20–514), an in-memory dictionary named `PACKAGE_METADATA` contains descriptive specifications for each slug, including:
  - `system_specs`: `capacity`, `inverter`, `panels`, `battery`, `daily_gen`, `backup_time`, `ideal_for`.
  - Narrative strings:
    - `inverter_detail`: e.g., `'1× 3.5kVA 24V Pure Sine Wave Hybrid Inverter with built-in 60A MPPT charge controller'`
    - `panels_detail`: e.g., `'4× 550W Tier-1 Monocrystalline Bifacial PV Panels (2.2kWp total array)'`
    - `battery_detail`: e.g., `'2× 200Ah 12V Deep Cycle Gel Batteries (4.8kWh gross / 2.4kWh usable at 50% DoD) or 1× 2.56kWh LiFePO4'`
    - `features`: array of marketing bullets.
    - `warranty`: object with component warranty text.
    - `faqs`: array of Q&As.
- When public API routes `/api/packages` and `/api/packages/:slug` are invoked, `getPackages()` and `getPackageBySlug()` merge `PACKAGE_METADATA[slug]` as `pkg.details`.
- **Conclusion:** Prior to Stage 8.4, BOM components only existed as unstructured marketing text in source code, with zero database-driven linkage, zero quantities, zero units of measure, and zero cost association.

---

### 5. RELATIONSHIP BETWEEN PACKAGES AND ACTIVE COMMERCIAL CATALOG

An inventory scan of MongoDB Atlas reveals the current product distribution:
- **Total Product Documents in Database:** 118
  - **Active Commercial Products (`published: 1`):** 48
    - `solar-packages`: 6 (the turnkey packages)
    - `inverters`: 10 (e.g., Deye, Growatt, Felicity, Must)
    - `solar-panels`: 7 (e.g., Jinko, Longi, Canadian Solar)
    - `batteries`: 7 (e.g., Felicity, Deye, Pylontech)
    - `accessories`: 11 (e.g., PV cables, DC disconnects, changeover switches, surge protectors)
    - `portable-power`: 7
  - **Soft-Archived Supplier Benchmark Products (`published: 0`):** 70
    - All 70 documents correspond to benchmark imports (`SG-10K-HYBRID-NG`, Sungrow) preserved under owner approval decision ADR-016.

**Linkage Rules for BOM:**
1. A BOM component line may optionally link to an active commercial product (`published: 1`) in the catalog (`product_id`).
2. Soft-archived benchmark products (`published: 0`) must be **strictly excluded** from BOM component selection.
3. Turnkey packages (`category: 'solar-packages'`) cannot link to themselves or other packages as subcomponents (circular reference prevention).
4. Snapping: When an administrator links an active product to a BOM component, the system must capture a **historical snapshot** (`product_sku`, `product_name`) so future catalog modifications or archivals do not corrupt existing BOM revisions.

---

### 6. REUSABLE API ROUTES & UI SECTIONS

#### A. Backend Architecture & Security
- **Authentication & RBAC:**
  - `requireAuth` middleware verifies active session cookie.
  - `requireRole('superadmin', 'admin', 'engineer')` is currently configured for `'solar-packages'` in `ADMIN_SECTION_PERMISSIONS`.
  - Superadmin & Admin: full create/update/review permissions.
  - Superadmin only: formal approval permission (`APPROVE_BOM`).
- **Audit Logging:**
  - `logAudit` helper in `db/mongo/repository.js` records actions to `AuditLog` collection with actor ID, IP address, timestamp, and structured `metadata`.
  - Actions: `CREATE_BOM`, `UPDATE_BOM_REVISION`, `APPROVE_BOM`.
- **Existing Public Routes:**
  - `GET /api/packages`: public listing of packages.
  - `GET /api/packages/:slug`: public package detail.
  - **Confidentiality Check:** Neither endpoint queries nor returns BOM cost records. BOM costs remain strictly internal.

#### B. Administrative UI (`public/admin.html`, `public/js/admin.js`, `public/css/admin.css`)
- **Navigation:**
  - Sidebar button `[data-section="solar-packages"]` already exists and activates `#panel-solar-packages`.
- **Existing Panel `#panel-solar-packages`:**
  - Currently displays a static placeholder card ("PLANNED FOR STAGE 7").
  - Can be upgraded into a complete **Turnkey Solar Package & BOM Management Console** featuring:
    - Summary KPI cards (Active Packages, BOM Statuses, Cost Completeness).
    - Responsive Packages Table with live status badges (`Draft`, `Incomplete`, `Ready for Review`, `Approved`).
    - Action button "Configure BOM" triggering a dedicated BOM Editor modal.
    - Component lines table with quantity, unit, catalog SKU linker, cost provenance, and subtotal.
    - Non-product cost lines (installation labour, logistics, switchgear hookup).
    - Costing completeness banner and margin indicator (only displayed when 100% complete and verified).
    - Revision history and rollback audit log drawer.

---

### 7. MISSING INFORMATION & TECHNICAL RISKS

1. **Deferred Supplier Cost Baselines:**
   - Because Stage 8.1–8.3 kept supplier costs unactivated until genuine supplier price lists are approved, catalog hardware products have no active `cost_price_ngn`.
   - **Risk:** Calculating BOM cost when catalog products have null cost.
   - **Mitigation:** The BOM engine must explicitly classify missing costs as unknown. If any component has an unverified cost, `is_costing_complete` is `false`, and no total package cost or margin is declared as verified.
2. **Concurrent Edits & Lost Updates:**
   - **Risk:** Two administrators modifying the same package BOM simultaneously.
   - **Mitigation:** Monotonically increasing `revision` number on `PackageBom`. Save requests must include the base revision; if the database has a higher revision, reject with HTTP 409 Conflict.
3. **Data Immutability & Historical Revisions:**
   - **Risk:** Overwriting a reviewed or approved BOM revision when tweaking lines.
   - **Mitigation:** Every save creates a new immutable revision record in `history` array or `PackageBomRevision` subdocument, preserving previous lines, totals, author, and timestamp.
4. **Financial Arithmetic Precision:**
   - **Risk:** IEEE-754 floating point rounding drift when multiplying quantities by fractional currency values.
   - **Mitigation:** Internal integer kobo calculations (`Math.round(cost * 100)`) with clean rounding at output boundaries.
5. **Catalog Product Mutation Resilience:**
   - **Risk:** Product SKU or name edited in catalog breaking old BOM displays.
   - **Mitigation:** Persist snapshot of `product_sku` and `product_name` on each BOM component line.

---

### 8. PROPOSED IMPLEMENTATION DESIGN

#### A. Data Model (`PackageBom` in `db/mongo/models.js`)
```javascript
const packageBomSchema = new mongoose.Schema({
  bom_id: { type: String, required: true, unique: true, index: true }, // e.g. "BOM-PKG-24"
  package_id: { type: Number, required: true, index: true }, // References Product.id
  package_sku: { type: String, required: true },
  package_name: { type: String, required: true },
  package_slug: { type: String, required: true },
  revision: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['draft', 'incomplete', 'ready_for_review', 'approved'], 
    default: 'draft',
    index: true 
  },
  currency: { type: String, default: 'NGN' },
  
  // 1. Hardware Components
  components: [{
    line_id: { type: String, required: true },
    component_type: { 
      type: String, 
      enum: ['solar-panels', 'inverter', 'battery', 'mounting-structure', 'protection-switchgear', 'cables-connectors', 'accessories', 'other'],
      required: true 
    },
    product_id: { type: Number, default: null }, // Linked catalog product
    product_sku: { type: String, default: '' },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { 
      type: String, 
      enum: ['pcs', 'meters', 'sets', 'roll', 'lot', 'hours', 'units'],
      default: 'pcs' 
    },
    waste_allowance_pct: { type: Number, default: 0, min: 0, max: 100 },
    cost_source: {
      type: String,
      enum: ['verified_supplier_quote', 'catalog_documented_cost', 'manual_sourced_cost', 'unknown'],
      default: 'unknown'
    },
    unit_cost_ngn: { type: Number, default: null }, // Null when unknown
    line_cost_ngn: { type: Number, default: null },
    cost_provenance_ref: { type: String, default: '' },
    notes: { type: String, default: '' },
    validation_status: { type: String, enum: ['valid', 'warning', 'missing_cost'], default: 'missing_cost' }
  }],

  // 2. Non-Product Cost Lines
  non_product_costs: [{
    line_id: { type: String, required: true },
    cost_type: { 
      type: String, 
      enum: ['labour_installation', 'logistics_transport', 'electrical_switchgear_bos', 'contingency_commissioning', 'other'],
      required: true 
    },
    name: { type: String, required: true },
    cost_ngn: { type: Number, default: null },
    provenance_ref: { type: String, default: '' },
    notes: { type: String, default: '' }
  }],

  // 3. Calculation & Completeness Summary
  cost_summary: {
    components_subtotal_ngn: { type: Number, default: 0 },
    non_product_subtotal_ngn: { type: Number, default: 0 },
    total_estimated_cost_ngn: { type: Number, default: null },
    missing_cost_lines_count: { type: Number, default: 0 },
    total_lines_count: { type: Number, default: 0 },
    is_costing_complete: { type: Boolean, default: false },
    costing_completeness_pct: { type: Number, default: 0 }
  },

  // 4. Metadata & Audit
  notes: { type: String, default: '' },
  created_by_email: { type: String, default: '' },
  updated_by_email: { type: String, default: '' },
  approved_by_email: { type: String, default: null },
  approved_at: { type: Date, default: null },
  
  // 5. Revision Snapshots
  history: [{
    revision: Number,
    saved_at: Date,
    saved_by_email: String,
    status: String,
    cost_summary: mongoose.Schema.Types.Mixed,
    components_snapshot: [mongoose.Schema.Types.Mixed],
    non_product_costs_snapshot: [mongoose.Schema.Types.Mixed],
    revision_notes: String
  }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
```

#### B. Calculation Engine (`lib/bom-engine.js`)
- Validates quantities (> 0, finite).
- Validates units of measure against approved dictionary.
- Computes effective quantities with waste allowance: `effectiveQty = qty * (1 + wastePct / 100)`.
- Reconciles cost source:
  - If linked product has documented `cost_price_ngn` > 0 -> `catalog_documented_cost`.
  - If manual entry has verified document reference -> `manual_sourced_cost`.
  - Otherwise -> `unknown` (stored as `null`).
- Evaluates completeness: only if `missing_cost_lines_count === 0` is `is_costing_complete = true`.
- Evaluates gross margin against package retail selling price (`price_ngn`) using formula:
  `gross_profit_ngn = price_ngn - total_estimated_cost_ngn`
  `gross_margin_pct = (gross_profit_ngn / price_ngn) * 100`
  *Displayed strictly as an internal estimate; never alters catalog price.*

#### C. API Endpoints
- `GET /api/admin/solar-packages`: Lists 6 packages with their active BOM summary (status, completeness, lines count).
- `GET /api/admin/solar-packages/:id/bom`: Returns current BOM, component lines, eligible catalog products for dropdown, and revision history.
- `POST /api/admin/solar-packages/:id/bom`: Creates or saves a new BOM revision with concurrency check (`base_revision`).
- `POST /api/admin/solar-packages/:id/bom/approve`: Superadmin-only approval endpoint setting status to `approved`.

---

### 9. BASELINE AUDIT CONCLUSION

The initial audit confirms:
1. All 6 turnkey solar packages are healthy and active in MongoDB Atlas.
2. Component specifications currently exist only as static text strings in `PACKAGE_METADATA` within `db/mongo/repository.js`.
3. The catalog contains 42 non-package active commercial products ready for BOM component linking, while 70 benchmark items remain safely soft-archived.
4. No conflicting database migrations or destructive schema operations are required.
5. All design and costing safety principles are strictly met.

**Baseline Audit Recommendation:** PROCEED with Stage 8.4 implementation.
