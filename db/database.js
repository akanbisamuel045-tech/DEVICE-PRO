/**
 * DEVICE PRO — SQLite Product Database Service
 * Uses Node.js native node:sqlite (DatabaseSync)
 * Provides schema initialization, seed data, and comprehensive filtering/sorting/pagination.
 */

let db = null;
let sqliteAvailable = false;
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'products.db');

const isServerlessCloud = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT || 
  process.env.VERCEL_ENV
);

if (isServerlessCloud) {
  // Pure cloud serverless environment: operate in cloud mode (MongoDB Atlas)
  sqliteAvailable = false;
  db = {
    exec: () => {},
    prepare: () => ({
      get: () => null,
      all: () => [],
      run: () => ({ lastInsertRowid: 1, changes: 0 })
    })
  };
} else {
  try {
    const { DatabaseSync } = require('node:sqlite');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
    }
    db = new DatabaseSync(dbPath);
    sqliteAvailable = true;
  } catch (err) {
    sqliteAvailable = false;
    db = {
      exec: () => {},
      prepare: () => ({
        get: () => null,
        all: () => [],
        run: () => ({ lastInsertRowid: 1, changes: 0 })
      })
    };
  }
}

const crypto = require('crypto');

// Initialize full schema (Stage 12 Data Model)
if (sqliteAvailable) {
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    category_label TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    price_ngn INTEGER NOT NULL,
    previous_price_ngn INTEGER,
    power_rating TEXT,
    power_tier TEXT,
    specifications TEXT,
    image_url TEXT NOT NULL,
    stock_status TEXT DEFAULT 'in_stock',
    stock_quantity INTEGER DEFAULT 50,
    featured INTEGER DEFAULT 0,
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    state TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    admin_notes TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    state TEXT,
    property_type TEXT,
    sector TEXT DEFAULT 'residential',
    package_id INTEGER,
    package_slug TEXT,
    package_name TEXT,
    load_details TEXT,
    indicative_inverter_kva REAL,
    indicative_battery_kwh REAL,
    indicative_solar_kwp REAL,
    status TEXT DEFAULT 'new',
    admin_notes TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT NOT NULL,
    delivery_state TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal_ngn INTEGER NOT NULL,
    delivery_fee_ngn INTEGER DEFAULT 0,
    total_ngn INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'transfer',
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    -- Fulfillment & Logistics Tracking (Stage 16)
    waybill_number TEXT,
    courier_partner TEXT,
    estimated_delivery TEXT,
    -- Certified Installation & Commissioning (Stage 16)
    assigned_engineer TEXT,
    engineer_phone TEXT,
    installation_scheduled_date TEXT,
    commissioning_status TEXT DEFAULT 'pending',
    commissioning_tests TEXT,
    commissioning_date TEXT,
    commissioning_certificate_id TEXT,
    admin_notes TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales',
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS case_studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    sector TEXT NOT NULL,
    location TEXT NOT NULL,
    client_type TEXT,
    capacity_kva REAL,
    solar_kwp REAL,
    battery_kwh REAL,
    diesel_saved_pct INTEGER,
    thumbnail_url TEXT,
    challenge TEXT,
    solution TEXT,
    equipment_specs TEXT,
    outcomes TEXT,
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    order_number TEXT NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'paystack',
    reference TEXT NOT NULL UNIQUE,
    amount_kobo INTEGER NOT NULL,
    currency TEXT DEFAULT 'NGN',
    status TEXT DEFAULT 'pending',
    channel TEXT,
    gateway_response TEXT,
    paid_at TEXT,
    customer_email TEXT,
    metadata_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
  CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
  CREATE INDEX IF NOT EXISTS idx_enquiries_ref ON enquiries(reference_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_ref ON quotes(reference_id);
  CREATE INDEX IF NOT EXISTS idx_orders_num ON orders(order_number);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference);
  CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_number);

  -- Stage 16: Support Tickets & Warranty Registrations
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    order_number TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    issue_category TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    assigned_engineer TEXT,
    resolution_notes TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS warranties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warranty_code TEXT NOT NULL UNIQUE,
    order_number TEXT,
    serial_number TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    warranty_years INTEGER DEFAULT 5,
    coverage_summary TEXT,
    status TEXT DEFAULT 'active',
    start_date TEXT DEFAULT (datetime('now')),
    end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_support_tickets_num ON support_tickets(ticket_number);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_number);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(customer_phone);
  CREATE INDEX IF NOT EXISTS idx_warranties_code ON warranties(warranty_code);
  CREATE INDEX IF NOT EXISTS idx_warranties_serial ON warranties(serial_number);
  CREATE INDEX IF NOT EXISTS idx_warranties_order ON warranties(order_number);
`);

// Stage 16 Schema Migration: Ensure columns exist in orders table
const existingOrderCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
const neededOrderCols = [
  { name: 'waybill_number', type: 'TEXT' },
  { name: 'courier_partner', type: 'TEXT' },
  { name: 'estimated_delivery', type: 'TEXT' },
  { name: 'assigned_engineer', type: 'TEXT' },
  { name: 'engineer_phone', type: 'TEXT' },
  { name: 'installation_scheduled_date', type: 'TEXT' },
  { name: 'commissioning_status', type: 'TEXT DEFAULT "pending"' },
  { name: 'commissioning_tests', type: 'TEXT' },
  { name: 'commissioning_date', type: 'TEXT' },
  { name: 'commissioning_certificate_id', type: 'TEXT' },
  { name: 'installation_option', type: 'TEXT DEFAULT "supply_only"' },
  { name: 'installation_fee_ngn', type: 'INTEGER DEFAULT 0' },
  { name: 'notes', type: 'TEXT' }
];
for (const col of neededOrderCols) {
  if (!existingOrderCols.includes(col.name)) {
    try {
      db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      console.warn(`[STAGE 16 MIGRATION] Notice on orders.${col.name}:`, e.message);
    }
  }
}


// Seed Products if table is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM products');
const currentCount = countStmt.get().count;

if (currentCount === 0) {
  console.log('[DATABASE] Seeding initial 48 verified DEVICE PRO products...');

  const insertStmt = db.prepare(`
    INSERT INTO products (
      name, slug, brand, category, category_label, sku, description,
      price_ngn, previous_price_ngn, power_rating, power_tier,
      specifications, image_url, stock_status, featured, published
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const initialProducts = [
    // -------------------------------------------------------------------------
    // ROW 1 from User Mockup
    // -------------------------------------------------------------------------
    {
      name: "Monocrystalline Solar Panel",
      slug: "jinko-monocrystalline-solar-panel-550w",
      brand: "Jinko Solar",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "JKM-550M-72HL4",
      description: "High-efficiency Tier-1 monocrystalline bifacial panel engineered with multi-busbar technology for maximum solar yield in tropical conditions.",
      price_ngn: 245000,
      previous_price_ngn: 275000,
      power_rating: "550W",
      power_tier: "up_to_1kw",
      specifications: "550W • High Efficiency • 25 Years Warranty",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Hybrid Inverter",
      slug: "growatt-hybrid-inverter-5kw",
      brand: "Growatt",
      category: "inverters",
      category_label: "Inverters",
      sku: "GW-SPH5000-TL-BL-UP",
      description: "Pure sine wave single-phase hybrid solar inverter with dual MPPT tracker, smart mobile telemetry, and automatic generator synchronization.",
      price_ngn: 1250000,
      previous_price_ngn: 1400000,
      power_rating: "5kW",
      power_tier: "1kw_5kw",
      specifications: "5kW • Single Phase • MPPT",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Lithium Battery",
      slug: "pylontech-lithium-battery-48v-100ah",
      brand: "Pylontech",
      category: "batteries",
      category_label: "Batteries",
      sku: "PYL-US3000C-48V",
      description: "Deep-cycle LiFePO4 rack-mount energy storage battery with integrated intelligent Battery Management System (BMS) and 6,000+ cycle lifespan.",
      price_ngn: 1850000,
      previous_price_ngn: 2050000,
      power_rating: "4.8kWh",
      power_tier: "1kw_5kw",
      specifications: "48V • 100Ah • Long Cycle Life",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },

    // -------------------------------------------------------------------------
    // ROW 2 from User Mockup
    // -------------------------------------------------------------------------
    {
      name: "Roof Mounting Structure",
      slug: "solar-mount-roof-mounting-structure",
      brand: "Solar Mount",
      category: "accessories",
      category_label: "Mounting Accessories",
      sku: "SM-RMS-ALUM-6P",
      description: "Corrosion-resistant anodized aluminium rooftop mounting rails, mid-clamps, end-clamps, and stainless steel L-feet for storm-proof installations.",
      price_ngn: 180000,
      previous_price_ngn: 210000,
      power_rating: "6 Panels",
      power_tier: "up_to_1kw",
      specifications: "Aluminium • Durable • Easy Installation",
      image_url: "images/products/roof-mounting-structure.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Solar Cable (100m)",
      slug: "mc4-solar-cable-100m",
      brand: "MC4",
      category: "accessories",
      category_label: "Electrical Accessories",
      sku: "MC4-CBL-4MM-100M",
      description: "Heavy-duty double-insulated 4mm² tinned copper solar photovoltaic cable, UV-resistant, flame-retardant, and halogen-free for long exterior lifespan.",
      price_ngn: 95000,
      previous_price_ngn: 115000,
      power_rating: "1000V DC",
      power_tier: "up_to_1kw",
      specifications: "4mm² • UV Resistant • Outdoor",
      image_url: "images/products/mc4-solar-cable.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Portable Power Station",
      slug: "ecoflow-portable-power-station-1kwh",
      brand: "EcoFlow",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "EF-DELTA-1000W",
      description: "Compact, rugged mobile solar generator with pure sine wave AC output, ultra-fast X-Stream wall charging, and dual solar panel recharge ports.",
      price_ngn: 650000,
      previous_price_ngn: 720000,
      power_rating: "1kWh",
      power_tier: "up_to_1kw",
      specifications: "1kWh • Pure Sine Wave • Multiple Outputs",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },

    // -------------------------------------------------------------------------
    // SOLAR PANELS (Category 2)
    // -------------------------------------------------------------------------
    {
      name: "Canadian Solar BiHiKu7 Bifacial Panel",
      slug: "canadian-solar-bihiku7-bifacial-660w",
      brand: "Canadian Solar",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "CS7N-660MB-AG",
      description: "Dual glass high-power monocrystalline bifacial module providing up to 25% additional rear-side power gain for commercial roofs and carports.",
      price_ngn: 295000,
      previous_price_ngn: 330000,
      power_rating: "660W",
      power_tier: "up_to_1kw",
      specifications: "660W • Dual Glass • 30 Years Warranty",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "JA Solar DeepBlue 3.0 Mono Half-Cell",
      slug: "ja-solar-deepblue-545w",
      brand: "JA Solar",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "JAM72S30-545/MR",
      description: "Assembled with high-efficiency 11BB PERC cells; half-cell configuration offers higher power output, better temperature-dependent performance, and lower shading loss.",
      price_ngn: 238000,
      previous_price_ngn: 260000,
      power_rating: "545W",
      power_tier: "up_to_1kw",
      specifications: "545W • 21.3% Efficiency • 25 Years Warranty",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Longi Hi-MO 6 Explorer Mono Panel",
      slug: "longi-himo6-explorer-580w",
      brand: "Longi",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "LR5-72HTH-580M",
      description: "Next-generation HPBC cell technology delivering exceptional architectural aesthetics, reduced micro-cracking risk, and maximum generation in high ambient heat.",
      price_ngn: 260000,
      previous_price_ngn: 285000,
      power_rating: "580W",
      power_tier: "up_to_1kw",
      specifications: "580W • HPBC Technology • 25 Years Warranty",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Trina Solar Vertex S+ N-Type Dual Glass",
      slug: "trina-solar-vertex-s-plus-440w",
      brand: "Trina Solar",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "TSM-440NEG9R.28",
      description: "Compact premium residential panel with N-Type i-TOPCon technology and dual-glass construction for fire resistance and zero degradation.",
      price_ngn: 198000,
      previous_price_ngn: 220000,
      power_rating: "440W",
      power_tier: "up_to_1kw",
      specifications: "440W • N-Type Cell • Fire Class A",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Felicity Solar Monocrystalline Panel",
      slug: "felicity-solar-monocrystalline-450w",
      brand: "Felicity Solar",
      category: "solar-panels",
      category_label: "Solar Panels",
      sku: "FL-M-450W",
      description: "Popular rugged monocrystalline panel with tempered anti-reflective glass and corrosion-resistant aluminium frame for residential systems.",
      price_ngn: 175000,
      previous_price_ngn: 195000,
      power_rating: "450W",
      power_tier: "up_to_1kw",
      specifications: "450W • Anodized Frame • 20 Years Warranty",
      image_url: "images/products/jinko-solar-panel.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },

    // -------------------------------------------------------------------------
    // INVERTERS (Category 3)
    // -------------------------------------------------------------------------
    {
      name: "Deye Sun-8K Hybrid Inverter",
      slug: "deye-sun-8k-hybrid-inverter",
      brand: "Deye",
      category: "inverters",
      category_label: "Inverters",
      sku: "SUN-8K-SG01LP1-EU",
      description: "Premium multi-port hybrid inverter for Nigerian luxury homes. Supports generator tie-in, parallel stacking up to 16 units, and WiFi app telemetry.",
      price_ngn: 1850000,
      previous_price_ngn: 2100000,
      power_rating: "8kW",
      power_tier: "5kw_10kw",
      specifications: "8kW • Dual MPPT • Smart WiFi App",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Victron MultiPlus-II Inverter/Charger",
      slug: "victron-multiplus-ii-5kva",
      brand: "Victron",
      category: "inverters",
      category_label: "Inverters",
      sku: "PMP482505010",
      description: "World-renowned Dutch precision engineering. Combines a powerful 5kVA pure sine wave inverter, sophisticated adaptive battery charger, and high-speed AC transfer switch.",
      price_ngn: 2100000,
      previous_price_ngn: 2350000,
      power_rating: "5kVA",
      power_tier: "1kw_5kw",
      specifications: "5kVA • 48V • PowerAssist & Grid Tie",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "SRNE Smart MPPT Hybrid Inverter",
      slug: "srne-smart-mppt-hybrid-inverter-5kw",
      brand: "SRNE",
      category: "inverters",
      category_label: "Inverters",
      sku: "HF4850U80-H",
      description: "High-precision MPPT hybrid inverter with intelligent generator-start synchronization, native BMS CANbus telemetry, and wide 500V PV input.",
      price_ngn: 890000,
      previous_price_ngn: 980000,
      power_rating: "5kW",
      power_tier: "1kw_5kw",
      specifications: "5kW • 80A MPPT • Dual AC Output",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Sungrow Commercial Three-Phase Inverter",
      slug: "sungrow-commercial-three-phase-33kw",
      brand: "Sungrow",
      category: "inverters",
      category_label: "Inverters",
      sku: "SG33CX-V114",
      description: "Heavy-duty commercial grid-tied string inverter with multi-MPPT tracking, built-in DC disconnect switch, and IP66 extreme weather rating.",
      price_ngn: 4650000,
      previous_price_ngn: 5100000,
      power_rating: "33kW",
      power_tier: "10kw_50kw",
      specifications: "33kW • 3-Phase • Commercial Grade",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Luminous Cruze 3.5kVA Pure Sine Wave",
      slug: "luminous-cruze-3-5kva-inverter",
      brand: "Luminous",
      category: "inverters",
      category_label: "Inverters",
      sku: "LUM-CRZ-3500",
      description: "Heavy-duty copper transformer-based inverter engineered for Nigerian homes and offices to handle heavy surge loads such as pumps and refrigerators.",
      price_ngn: 520000,
      previous_price_ngn: 580000,
      power_rating: "3.5kVA",
      power_tier: "1kw_5kw",
      specifications: "3.5kVA • 48V • Heavy-Duty Copper",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "PRAG Pure Sine Wave Solar Inverter",
      slug: "prag-pure-sine-wave-solar-inverter-2-5kva",
      brand: "Other Brands",
      category: "inverters",
      category_label: "Inverters",
      sku: "PRAG-2500-24V",
      description: "Rugged local engineering designed specifically for Nigerian grid fluctuations, featuring multi-stage smart battery charging and silent operation.",
      price_ngn: 380000,
      previous_price_ngn: 420000,
      power_rating: "2.5kVA",
      power_tier: "1kw_5kw",
      specifications: "2.5kVA • 24V • Built-in Charger",
      image_url: "images/products/growatt-hybrid-inverter.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },

    // -------------------------------------------------------------------------
    // BATTERIES (Category 4)
    // -------------------------------------------------------------------------
    {
      name: "Felicity Solar LiFePO4 Wall Battery",
      slug: "felicity-solar-lifepo4-wall-battery-10kwh",
      brand: "Felicity Solar",
      category: "batteries",
      category_label: "Batteries",
      sku: "FL-LPBF48200-H",
      description: "High-capacity 48V 200Ah wall-mount lithium iron phosphate battery with built-in LCD screen, breaker switch, and universal inverter CAN communication.",
      price_ngn: 2850000,
      previous_price_ngn: 3150000,
      power_rating: "10kWh",
      power_tier: "5kw_10kw",
      specifications: "10kWh • 48V 200Ah • 6,000+ Cycles",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "Hithium Commercial ESS Rack Battery",
      slug: "hithium-commercial-ess-rack-battery-15kwh",
      brand: "Other Brands",
      category: "batteries",
      category_label: "Batteries",
      sku: "HITH-ESS-15K-300AH",
      description: "Global Tier-1 utility-grade LiFePO4 storage module with 8,000+ cycle life. Premium grade for hospitals, schools, estates, and factories.",
      price_ngn: 4200000,
      previous_price_ngn: 4600000,
      power_rating: "15kWh",
      power_tier: "10kw_50kw",
      specifications: "15kWh • 300Ah • Tier-1 LiFePO4 Cells",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Deye Wall-Mount Lithium Battery",
      slug: "deye-wall-mount-lithium-battery-5kwh",
      brand: "Deye",
      category: "batteries",
      category_label: "Batteries",
      sku: "SE-G5.1PRO-B",
      description: "Compact 5.12kWh modular battery designed for seamless plug-and-play synchronization with Deye hybrid inverters. Up to 32 units parallel stackable.",
      price_ngn: 1650000,
      previous_price_ngn: 1850000,
      power_rating: "5.12kWh",
      power_tier: "5kw_10kw",
      specifications: "5.12kWh • 51.2V 100Ah • Smart BMS",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Luminous 220Ah Tubular Battery",
      slug: "luminous-220ah-tall-tubular-battery",
      brand: "Luminous",
      category: "batteries",
      category_label: "Batteries",
      sku: "LUM-TT-220AH",
      description: "Proven rugged deep cycle lead-acid tubular battery with high-pressure die-cast spine structure designed to withstand prolonged power outages.",
      price_ngn: 285000,
      previous_price_ngn: 310000,
      power_rating: "2.64kWh",
      power_tier: "1kw_5kw",
      specifications: "12V • 220Ah • Heavy Duty Backup",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Growatt ARK 2.5L Modular Battery",
      slug: "growatt-ark-2-5l-modular-battery",
      brand: "Growatt",
      category: "batteries",
      category_label: "Batteries",
      sku: "ARK-2.5L-A1",
      description: "Cobalt-free LiFePO4 modular battery with flexible capacity expansion from 2.56kWh to 25.6kWh via stackable interlocking cables.",
      price_ngn: 920000,
      previous_price_ngn: 1050000,
      power_rating: "2.56kWh",
      power_tier: "1kw_5kw",
      specifications: "2.56kWh • Stackable • Modular",
      image_url: "images/products/pylontech-lithium-battery.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },

    // -------------------------------------------------------------------------
    // SOLAR PACKAGES (Category 5)
    // -------------------------------------------------------------------------
    {
      name: "3.5kVA Essential Home Solar System",
      slug: "3-5kva-essential-home-solar-package",
      brand: "DEVICE PRO",
      category: "solar-packages",
      category_label: "Solar Packages",
      sku: "DP-PKG-3.5KVA",
      description: "Turnkey package for 3-bedroom flats: 3.5kVA Inverter + 5kWh Lithium Battery + 4x 550W Panels + complete roof mounting and surge protection.",
      price_ngn: 2450000,
      previous_price_ngn: 2750000,
      power_rating: "3.5kVA",
      power_tier: "1kw_5kw",
      specifications: "3.5kVA • 5kWh LiFePO4 • 2.2kW Solar",
      image_url: "images/package-8kw.jpg",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "5kVA Premium Duplex Solar Package",
      slug: "5kva-premium-duplex-solar-package",
      brand: "DEVICE PRO",
      category: "solar-packages",
      category_label: "Solar Packages",
      sku: "DP-PKG-5KVA",
      description: "Complete household package powering TVs, fans, lighting, laptops, deep freezer, and inverter refrigerator: 5kW Hybrid Inverter + 10kWh Storage + 8x 550W Panels.",
      price_ngn: 4350000,
      previous_price_ngn: 4850000,
      power_rating: "5kW",
      power_tier: "5kw_10kw",
      specifications: "5kW Hybrid • 10kWh Battery • 4.4kW Solar",
      image_url: "images/package-10kw.jpg",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "10kVA Executive Residence Solar System",
      slug: "10kva-executive-residence-solar-package",
      brand: "DEVICE PRO",
      category: "solar-packages",
      category_label: "Solar Packages",
      sku: "DP-PKG-10KVA",
      description: "Heavy-duty residential setup running 1HP inverter air conditioners, water pumping machine, and all luxury appliances: 10kW Hybrid + 20kWh Battery + 16x 550W Panels.",
      price_ngn: 8200000,
      previous_price_ngn: 9100000,
      power_rating: "10kW",
      power_tier: "10kw_50kw",
      specifications: "10kW System • 20kWh Battery • 8.8kW Solar",
      image_url: "images/package-12kw.jpg",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "15kVA Commercial Office Microgrid",
      slug: "15kva-commercial-office-solar-package",
      brand: "DEVICE PRO",
      category: "solar-packages",
      category_label: "Solar Packages",
      sku: "DP-PKG-15KVA",
      description: "Zero diesel alternative for corporate offices and healthcare clinics: 15kW Three-Phase Inverter + 30kWh Industrial Battery + 24x 550W Panels.",
      price_ngn: 12500000,
      previous_price_ngn: 13800000,
      power_rating: "15kW",
      power_tier: "10kw_50kw",
      specifications: "15kW 3-Phase • 30kWh Storage • 13.2kW Solar",
      image_url: "images/package-16kw.jpg",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "2kVA Starter Solar Backup System",
      slug: "2kva-starter-solar-backup-package",
      brand: "DEVICE PRO",
      category: "solar-packages",
      category_label: "Solar Packages",
      sku: "DP-PKG-2KVA",
      description: "Entry-level package tailored for remote workers and apartments: 2kVA Pure Sine Wave Inverter + 2.56kWh Lithium Battery + 2x 450W Panels.",
      price_ngn: 1150000,
      previous_price_ngn: 1280000,
      power_rating: "2kVA",
      power_tier: "1kw_5kw",
      specifications: "2kVA • 2.56kWh Battery • 900W Solar",
      image_url: "images/package-8kw.jpg",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },

    // -------------------------------------------------------------------------
    // MOUNTING & ELECTRICAL ACCESSORIES (Category 6)
    // -------------------------------------------------------------------------
    {
      name: "MC4 Waterproof Solar Connectors (10 Pairs)",
      slug: "mc4-waterproof-solar-connectors-10-pairs",
      brand: "MC4",
      category: "accessories",
      category_label: "Electrical Accessories",
      sku: "MC4-CONN-10P",
      description: "UL certified 1000V DC rated male/female solar connectors with built-in rubber sealing rings ensuring IP68 waterproof connection.",
      price_ngn: 180000 / 10,
      previous_price_ngn: 25000,
      power_rating: "1000V DC / 30A",
      power_tier: "up_to_1kw",
      specifications: "1000V DC • IP68 Waterproof • Tinned Copper",
      image_url: "images/products/mc4-solar-cable.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "DC Surge Protection Device (SPD 1000V 40kA)",
      slug: "dc-surge-protection-device-spd-1000v",
      brand: "Other Brands",
      category: "accessories",
      category_label: "Electrical Accessories",
      sku: "SUNT-SPD-1000V",
      description: "Class II lightning surge arrestor for PV arrays; protects inverters and charge controllers from direct and indirect lightning strikes.",
      price_ngn: 42000,
      previous_price_ngn: 50000,
      power_rating: "1000V / 40kA",
      power_tier: "up_to_1kw",
      specifications: "1000V DC • 40kA Protection • Din Rail",
      image_url: "images/products/mc4-solar-cable.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Solar PV Combiner Box (4 Strings In 1 Out)",
      slug: "solar-pv-combiner-box-4-strings",
      brand: "Other Brands",
      category: "accessories",
      category_label: "Electrical Accessories",
      sku: "PV-COMB-4IN1",
      description: "Pre-wired weatherproof IP65 combiner box with 1000V DC fuses, circuit breakers, and lightning arrestor for 4 solar panel strings.",
      price_ngn: 135000,
      previous_price_ngn: 155000,
      power_rating: "4 Strings",
      power_tier: "up_to_1kw",
      specifications: "IP65 Waterproof • Built-in Breakers & SPD",
      image_url: "images/products/roof-mounting-structure.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Ground Mount Galvanized Steel Rack (8 Panels)",
      slug: "ground-mount-galvanized-steel-rack-8p",
      brand: "Solar Mount",
      category: "accessories",
      category_label: "Mounting Accessories",
      sku: "SM-GMR-8P",
      description: "Engineered hot-dip galvanized steel ground mounting rack structure designed for high wind load resistance and optimal 15-degree solar tilt angle.",
      price_ngn: 320000,
      previous_price_ngn: 360000,
      power_rating: "8 Panels",
      power_tier: "up_to_1kw",
      specifications: "Hot-Dip Galvanized • 15° Optimal Tilt",
      image_url: "images/products/roof-mounting-structure.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "Automatic Transfer Switch (ATS 63A 4P)",
      slug: "automatic-transfer-switch-ats-63a",
      brand: "Other Brands",
      category: "accessories",
      category_label: "Electrical Accessories",
      sku: "TOMZN-ATS-63A",
      description: "Dual-power automatic transfer switch for seamless transition between public utility grid, solar system, and backup diesel/petrol generator in <50ms.",
      price_ngn: 68000,
      previous_price_ngn: 80000,
      power_rating: "63A 400V",
      power_tier: "up_to_1kw",
      specifications: "63A 4P • Seamless Switching < 50ms",
      image_url: "images/products/mc4-solar-cable.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },

    // -------------------------------------------------------------------------
    // PORTABLE POWER (Category 7)
    // -------------------------------------------------------------------------
    {
      name: "EcoFlow DELTA 2 Max Power Station",
      slug: "ecoflow-delta-2-max-portable-station-2400w",
      brand: "EcoFlow",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "EF-DELTA2-MAX",
      description: "High-capacity 2048Wh expandable battery capacity with massive 2400W AC output (X-Boost up to 3100W) running 99% of home appliances effortlessly.",
      price_ngn: 1450000,
      previous_price_ngn: 1600000,
      power_rating: "2048Wh / 2400W",
      power_tier: "1kw_5kw",
      specifications: "2048Wh • 2400W AC • Expandable to 6kWh",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 1,
      published: 1
    },
    {
      name: "itel Power Tank 1000W Solar Generator",
      slug: "itel-power-tank-1000w-solar-generator",
      brand: "Other Brands",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "ITEL-PT-1000W",
      description: "Rugged 960Wh LiFePO4 battery generator with dual AC pure sine wave outlets, car socket, and PD 100W USB-C output for remote work and essentials.",
      price_ngn: 580000,
      previous_price_ngn: 650000,
      power_rating: "960Wh / 1000W",
      power_tier: "up_to_1kw",
      specifications: "960Wh • 1000W Output • LiFePO4 Chemistry",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "EcoFlow RIVER 2 Pro Portable Generator",
      slug: "ecoflow-river-2-pro-portable-generator-768wh",
      brand: "EcoFlow",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "EF-RIVER2-PRO",
      description: "Ultra-portable 768Wh LiFePO4 station weighing only 7.8kg. Charges 0-100% in 70 minutes with 800W pure sine wave AC output.",
      price_ngn: 480000,
      previous_price_ngn: 540000,
      power_rating: "768Wh / 800W",
      power_tier: "up_to_1kw",
      specifications: "768Wh • 800W Output • 70 Min Fast Charge",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "ColaSolar Cola 3600 Heavy-Duty Station",
      slug: "colasolar-cola-3600-heavy-duty-station",
      brand: "Other Brands",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "COLA-3600W",
      description: "Plug-and-play lithium power station (3600W output / 3.2kWh capacity). Fuel-free, noiseless, zero-smoke alternative to petrol generators.",
      price_ngn: 2200000,
      previous_price_ngn: 2450000,
      power_rating: "3600W",
      power_tier: "1kw_5kw",
      specifications: "3600W • 3.2kWh • Zero-Noise Generator",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    },
    {
      name: "itel Power Tank Mini 300W Emergency Pack",
      slug: "itel-power-tank-mini-300w",
      brand: "Other Brands",
      category: "portable-power",
      category_label: "Portable Power",
      sku: "ITEL-PT-300W",
      description: "Ultra-compact mobile power pack with 288Wh battery, AC 220V socket, LED camping light, and high-speed phone charging.",
      price_ngn: 165000,
      previous_price_ngn: 185000,
      power_rating: "288Wh / 300W",
      power_tier: "up_to_1kw",
      specifications: "288Wh • 300W Output • Mobile & Travel",
      image_url: "images/products/ecoflow-power-station.png",
      stock_status: "in_stock",
      featured: 0,
      published: 1
    }
  ];

  for (const p of initialProducts) {
    insertStmt.run(
      p.name, p.slug, p.brand, p.category, p.category_label, p.sku, p.description,
      p.price_ngn, p.previous_price_ngn, p.power_rating, p.power_tier,
      p.specifications, p.image_url, p.stock_status, p.featured, p.published
    );
  }

  console.log(`[DATABASE] Successfully seeded ${initialProducts.length} verified products.`);
}

/**
 * Query products with filtering, sorting, search, and pagination
 */
function getProducts(params = {}) {
  const {
    search = '',
    category = 'all',
    brand = '',
    min_price,
    max_price,
    power_tier = '',
    in_stock,
    sort = 'featured',
    page = 1,
    limit = 12
  } = params;

  let query = 'SELECT * FROM products WHERE published = 1';
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE published = 1';
  const queryParams = [];
  const countParams = [];

  // Search filter
  if (search && search.trim() !== '') {
    const s = `%${search.trim().toLowerCase()}%`;
    const searchClause = ` AND (LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(specifications) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(description) LIKE ?)`;
    query += searchClause;
    countQuery += searchClause;
    for (let i = 0; i < 5; i++) {
      queryParams.push(s);
      countParams.push(s);
    }
  }

  // Category filter
  if (category && category !== 'all') {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    queryParams.push(category);
    countParams.push(category);
  }

  // Brand filter (supports comma-separated list)
  if (brand && brand.trim() !== '') {
    const brands = brand.split(',').map(b => b.trim()).filter(Boolean);
    if (brands.length > 0) {
      const placeholders = brands.map(() => '?').join(',');
      query += ` AND brand IN (${placeholders})`;
      countQuery += ` AND brand IN (${placeholders})`;
      queryParams.push(...brands);
      countParams.push(...brands);
    }
  }

  // Price range filter
  if (min_price !== undefined && min_price !== '' && !isNaN(Number(min_price))) {
    query += ' AND price_ngn >= ?';
    countQuery += ' AND price_ngn >= ?';
    queryParams.push(Number(min_price));
    countParams.push(Number(min_price));
  }
  if (max_price !== undefined && max_price !== '' && !isNaN(Number(max_price))) {
    query += ' AND price_ngn <= ?';
    countQuery += ' AND price_ngn <= ?';
    queryParams.push(Number(max_price));
    countParams.push(Number(max_price));
  }

  // Power tier filter
  if (power_tier && power_tier.trim() !== '') {
    const tiers = power_tier.split(',').map(t => t.trim()).filter(Boolean);
    if (tiers.length > 0) {
      const placeholders = tiers.map(() => '?').join(',');
      query += ` AND power_tier IN (${placeholders})`;
      countQuery += ` AND power_tier IN (${placeholders})`;
      queryParams.push(...tiers);
      countParams.push(...tiers);
    }
  }

  // Stock status
  if (in_stock === 'true' || in_stock === true || in_stock === '1' || in_stock === 1) {
    query += " AND stock_status = 'in_stock'";
    countQuery += " AND stock_status = 'in_stock'";
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      query += ' ORDER BY price_ngn ASC';
      break;
    case 'price_desc':
      query += ' ORDER BY price_ngn DESC';
      break;
    case 'newest':
      query += ' ORDER BY id DESC';
      break;
    case 'name_asc':
      query += ' ORDER BY name ASC';
      break;
    case 'featured':
    default:
      query += ' ORDER BY featured DESC, id ASC';
      break;
  }

  // Count total matching
  const totalStmt = db.prepare(countQuery);
  const totalRow = totalStmt.get(...countParams);
  const total = totalRow ? totalRow.total : 0;

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 12);
  const offset = (pageNum - 1) * limitNum;

  query += ' LIMIT ? OFFSET ?';
  queryParams.push(limitNum, offset);

  const stmt = db.prepare(query);
  const products = stmt.all(...queryParams);

  return {
    products,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };
}

/**
 * Get product by slug
 */
function getProductBySlug(slug) {
  const stmt = db.prepare('SELECT * FROM products WHERE slug = ? AND published = 1');
  return stmt.get(slug);
}

/**
 * Get product by ID
 */
function getProductById(id) {
  const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND published = 1');
  return stmt.get(id);
}

// Comprehensive turnkey package engineering metadata
const PACKAGE_METADATA = {
  '2kva-starter-solar-backup-package': {
    system_type: 'Solar Backup / Micro-Hybrid',
    intended_audience: '1–2 Bedroom Apartment, Small Shop, or Home Office',
    power_kw: '2.0 kW',
    battery_kwh: '2.56 kWh',
    solar_kwp: '1.1 kWp',
    daily_yield: '4.5 – 5.5 kWh/day',
    inverter_detail: '2kVA 24V Pure Sine Wave Smart Hybrid Inverter with 40A MPPT',
    battery_detail: '2.56kWh 25.6V 100Ah Grade-A LiFePO4 Lithium Battery (6,000 cycles)',
    panels_detail: '2× 550W Tier-1 Monocrystalline Half-Cell Bifacial Panels',
    bos_detail: 'DC/AC Breakers, Surge Protectors (SPD), 16mm² Battery Cables, 4mm² Solar PV Cables',
    supported_loads: [
      { appliance: '1× Refrigerator (Medium Inverter)', runtime: 'Continuous 24/7' },
      { appliance: '2× Ceiling / Standing Fans', runtime: '12 – 16 Hours' },
      { appliance: '1× 55" Smart TV + Decoder', runtime: '8 – 10 Hours' },
      { appliance: 'All LED Lighting & Phone Charging', runtime: 'Continuous' },
      { appliance: 'Laptops & WiFi Router', runtime: 'Continuous' }
    ],
    load_exclusions_note: 'Air conditioners, electric water heaters, boiling kettles, and pumping machines are excluded from this tier.',
    installation_scope: 'Standard installation included within Lagos, Abuja, and Port Harcourt. Includes rooftop mounting, DB hookup, and commissioning.',
    warranty_terms: '25-Year Panel Linear Output, 5-Year Inverter Warranty, 5-Year Battery Warranty, 12-Month Workmanship.',
    price_effective_date: 'Effective October 2026'
  },
  '3-5kva-essential-home-solar-package': {
    system_type: 'Hybrid Residential System',
    intended_audience: '2–3 Bedroom Flat or Medium Business Office',
    power_kw: '3.5 kW',
    battery_kwh: '5.12 kWh',
    solar_kwp: '2.2 kWp',
    daily_yield: '9.0 – 11.0 kWh/day',
    inverter_detail: '3.5kVA 48V Pure Sine Wave Hybrid Inverter with 60A MPPT & WiFi telemetry',
    battery_detail: '5.12kWh 51.2V 100Ah Wall-Mount LiFePO4 Lithium Battery with Smart BMS',
    panels_detail: '4× 550W Tier-1 Monocrystalline Bifacial PV Panels (2,200W total)',
    bos_detail: 'Anodized Aluminum Rails, DC Combiner Box, 63A AC Changeover, Copper Earth Rod',
    supported_loads: [
      { appliance: '1× 1.0HP Inverter Air Conditioner', runtime: '4 – 6 Hours Daytime' },
      { appliance: '1× Deep Freezer + 1× Refrigerator', runtime: 'Continuous 24/7' },
      { appliance: '4× Ceiling Fans + 1× 65" TV & Soundbar', runtime: '10 – 14 Hours' },
      { appliance: 'Water Dispenser / Microwave (Intermittent)', runtime: 'As needed' },
      { appliance: 'All Home Lighting & Computing', runtime: 'Continuous 24/7' }
    ],
    load_exclusions_note: 'Heavy non-inverter air conditioners and water heaters must remain on bypass or generator.',
    installation_scope: 'Complete certified installation including rooftop railing, cable conduit trunking, testing, and client orientation.',
    warranty_terms: '25-Year Panel Performance, 5-Year Inverter Warranty, 10-Year Lithium Battery Warranty.',
    price_effective_date: 'Effective October 2026'
  },
  '5kva-premium-duplex-solar-package': {
    system_type: 'High-Yield Hybrid Solar',
    intended_audience: '4-Bedroom Duplex, Medical Clinic, or Professional Studio',
    power_kw: '5.0 kW',
    battery_kwh: '10.24 kWh',
    solar_kwp: '4.4 kWp',
    daily_yield: '18.0 – 22.0 kWh/day',
    inverter_detail: '5kW 48V Deye/Growatt Smart Hybrid Inverter with Dual MPPT & Generator Auto-Start',
    battery_detail: '2× 5.12kWh (10.24kWh total) 48V 200Ah LiFePO4 Rack/Wall Batteries',
    panels_detail: '8× 550W Tier-1 Mono Bifacial Panels (4,400W total array)',
    bos_detail: 'Pre-wired IP65 DC Combiner, Type-II AC/DC Surge Arresters, Heavy Copper Earthing',
    supported_loads: [
      { appliance: '2× 1.5HP Inverter Air Conditioners', runtime: '6 – 8 Hours Day & Night' },
      { appliance: '1× Deep Freezer + 1× Double-Door Fridge', runtime: 'Continuous 24/7' },
      { appliance: '0.75HP–1.0HP Submersible Water Pump', runtime: 'Daytime Filling (1–2 hrs)' },
      { appliance: 'Multiple TVs, Gaming Consoles, CCTV & NVR', runtime: 'Continuous 24/7' },
      { appliance: 'Washing Machine (Daytime cycle)', runtime: '2 – 3 Cycles/week' }
    ],
    load_exclusions_note: 'Electric vehicle high-speed chargers and commercial welding equipment exceed this rating.',
    installation_scope: 'Turnkey certified installation, comprehensive load balancing across consumer unit DB boards, mobile app monitoring setup.',
    warranty_terms: '25-Year Panel Performance, 5-Year Inverter Warranty, 10-Year Battery Warranty, 12-Month Workmanship.',
    price_effective_date: 'Effective October 2026'
  },
  '7-5kva-executive-villa-solar-package': {
    system_type: 'Extended Resilience Hybrid',
    intended_audience: '5-Bedroom Detached Villa, Boutique Hotel, or Mini-Hospital',
    power_kw: '7.5 kW',
    battery_kwh: '15.36 kWh',
    solar_kwp: '6.6 kWp',
    daily_yield: '27.0 – 33.0 kWh/day',
    inverter_detail: '7.5kW Heavy-Duty Smart Hybrid Inverter with Dual MPPT & Dry Contact ATS',
    battery_detail: '3× 5.12kWh (15.36kWh total) 48V LiFePO4 Modular Rack Battery System',
    panels_detail: '12× 550W Monocrystalline Half-Cut Solar Modules (6,600W total)',
    bos_detail: 'Heavy-Duty Aluminum Railing System, Dual String Protection, Lightning Protection Terminal',
    supported_loads: [
      { appliance: '3× 1.5HP or 2× 2.0HP Inverter ACs', runtime: '8 – 12 Hours' },
      { appliance: '1.5HP Deep Well Water Pump', runtime: 'Scheduled Day Operation' },
      { appliance: '2× Large Freezers + 2× Refrigerators', runtime: 'Continuous 24/7' },
      { appliance: 'Full Villa Lighting, CCTV, Electric Fence, Gate Motor', runtime: 'Continuous 24/7' },
      { appliance: 'Kitchen Appliances (Microwave, Blender, Washing Machine)', runtime: 'As needed' }
    ],
    load_exclusions_note: 'Central industrial chillers require 3-phase 15kVA+ systems.',
    installation_scope: 'Full turnkey structural rooftop assembly, DB rewiring and phase separation, earthing resistivity measurement (<5 ohms), cloud telemetry integration.',
    warranty_terms: '25-Year Linear Panel Output, 5-Year Inverter Warranty, 10-Year Battery Warranty, 2-Year Complimentary Servicing.',
    price_effective_date: 'Effective October 2026'
  },
  '10kva-executive-residence-solar-package': {
    system_type: 'Estate-Grade Hybrid Microgrid',
    intended_audience: 'Luxury Residence, Embassy Residence, or Commercial Facility',
    power_kw: '10.0 kW',
    battery_kwh: '20.48 kWh',
    solar_kwp: '8.8 kWp',
    daily_yield: '36.0 – 44.0 kWh/day',
    inverter_detail: '10kW Single/Three-Phase Smart Hybrid Inverter with Generator Synchronization',
    battery_detail: '4× 5.12kWh (20.48kWh total) Server-Rack LiFePO4 System with Master BMS',
    panels_detail: '16× 550W Tier-1 Monocrystalline Bifacial Modules (8,800W total)',
    bos_detail: 'Custom Industrial DC Combiner, Class-I/II Surge Arresters, Double Insulated Solar Cabling',
    supported_loads: [
      { appliance: '4× 1.5HP or 3× 2.0HP Inverter ACs', runtime: 'Continuous Day / 10h Night' },
      { appliance: '2.0HP Submersible Borehole Pump', runtime: 'Daytime Regular' },
      { appliance: 'Multiple Freezers, Coolers & Refrigerator Banks', runtime: 'Continuous 24/7' },
      { appliance: 'Entire Estate Security, Perimeter Lighting, Server Room', runtime: 'Continuous 24/7' },
      { appliance: 'Swimming Pool Circulation Pump (Daytime)', runtime: '4 – 6 Hours' }
    ],
    load_exclusions_note: 'Heavy 3-phase machinery (above 15kW start) requires custom commercial engineering.',
    installation_scope: 'Complete turnkey delivery, certified electrical engineers on-site, structural roof engineering review, thermal imaging of connections, 24/7 remote monitoring setup.',
    warranty_terms: '25-Year Panel Performance, 5-Year Inverter Warranty, 10-Year Battery Warranty, 24-Month Full Support.',
    price_effective_date: 'Effective October 2026'
  },
  '15kva-commercial-office-solar-package': {
    system_type: '3-Phase Commercial Microgrid',
    intended_audience: 'Corporate HQ, Health Centre / Laboratory, or Light Manufacturing',
    power_kw: '15.0 kW (3-Phase)',
    battery_kwh: '30.72 kWh',
    solar_kwp: '13.2 kWp',
    daily_yield: '54.0 – 66.0 kWh/day',
    inverter_detail: '15kW 3-Phase 400V Smart Hybrid Inverter with Quad MPPT & Dual ATS generator controls',
    battery_detail: '6× 5.12kWh (30.72kWh total) Commercial Rack-Mounted LiFePO4 Energy Storage',
    panels_detail: '24× 550W Tier-1 High-Efficiency Bifacial Solar Panels (13,200W total)',
    bos_detail: 'Industrial Metal Enclosures, Motorized ATS, Complete Class-I Lightning Dissipation System',
    supported_loads: [
      { appliance: '6× 1.5HP or 4× 2.5HP Inverter Air Conditioners', runtime: 'Full Business Hours 8am–6pm' },
      { appliance: '30+ Workstations, Desktop PCs, Servers & Printers', runtime: 'Continuous Business Hours' },
      { appliance: 'Medical / Cold-Chain Laboratory Refrigeration', runtime: 'Continuous 24/7' },
      { appliance: 'Commercial Water Pumping & Treatment System', runtime: 'Automated Day Operation' },
      { appliance: 'Office Elevators / Booster Pumps (soft-start)', runtime: 'Standard Operation' }
    ],
    load_exclusions_note: 'Factory induction furnaces and heavy stamping presses require customized megawatt BESS.',
    installation_scope: 'Complete commercial installation, 3-phase load rebalancing, industrial cable tray routing, full commissioning documentation, and operator training.',
    warranty_terms: '25-Year Performance, 5-Year Inverter, 10-Year Battery, 2-Year SLA with quarterly preventative maintenance.',
    price_effective_date: 'Effective October 2026'
  }
};

/**
 * Get all turnkey solar packages ordered by price
 */
function getPackages() {
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE category = 'solar-packages' AND published = 1 
    ORDER BY price_ngn ASC
  `);
  const packages = stmt.all();
  return packages.map(pkg => ({
    ...pkg,
    details: PACKAGE_METADATA[pkg.slug] || {}
  }));
}

/**
 * Get single turnkey solar package by slug
 */
function getPackageBySlug(slug) {
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE category = 'solar-packages' AND slug = ? AND published = 1
  `);
  const pkg = stmt.get(slug);
  if (!pkg) return null;
  return {
    ...pkg,
    details: PACKAGE_METADATA[pkg.slug] || {}
  };
}

// =========================================================================
// SEED INITIAL DATA (Categories, Users, Case Studies)
// =========================================================================

// Password hashing helper
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (e) {
    return false;
  }
}

// 1. Seed Categories if empty
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
if (catCount === 0) {
  console.log('[DATABASE] Seeding product categories...');
  const insertCat = db.prepare(`
    INSERT INTO categories (name, slug, icon, description, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const initialCategories = [
    ['Solar Panels', 'solar-panels', '☀️', 'Monocrystalline, TOPCon & Bifacial PV Modules', 1],
    ['Inverters', 'inverters', '⚡', 'Pure Sine Wave & Hybrid Smart Power Converters', 2],
    ['Batteries', 'batteries', '🔋', 'Lithium Iron Phosphate (LiFePO4) & Deep Cycle Energy Storage', 3],
    ['Solar Packages', 'solar-packages', '📦', 'Complete Turnkey Engineered Residential & Commercial Systems', 4],
    ['Mounting & Accessories', 'mounting-accessories', '🛠️', 'Aluminium Rooftop Rails, Switchgear, Breakers & SPDs', 5],
    ['Portable Power', 'portable-power', '🔌', 'Compact LiFePO4 Generators & Outdoor Emergency Stations', 6]
  ];

  for (const cat of initialCategories) {
    insertCat.run(...cat);
  }
}

// 2. Seed Default Staff & Admin Users if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('[DATABASE] Seeding administrative and engineering staff users...');
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, salt, full_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const staff = [
    {
      username: 'admin',
      email: 'admin@devicepro.com',
      passwordHash: '788817fa95749de7c288c5f49044246df9aa9ab245b1b566cd6729be9e5d939dd6c6343c385091df1b4dc453345dc67cad6807ca13929046b3a170cbb90f3402',
      salt: 'da08867c8cff8a6e620bee12be23034d',
      fullName: 'DEVICE PRO Administrator',
      role: 'superadmin'
    },
    {
      username: 'engineer.babatunde',
      email: 'babatunde@devicepro.com',
      passwordHash: '9e080e986be2d19f6c268aaecc55fa209529174bff22dba9d23a50a930d7d41aa729c5142ee346cfc6ae8934e52ff0ccf4f1959ed59197c52be8e22c86649386',
      salt: '55999f24ccd06d2acfc69cd73375533a',
      fullName: 'Engr. Babatunde Adeyemi (Director of Engineering)',
      role: 'engineer'
    },
    {
      username: 'sales.lagos',
      email: 'sales@devicepro.com',
      passwordHash: '8724095a9bbb4dbf0b4a4825cce9cab5d5d357258d9ab850207b5dd90ab51e8f83bd23aac1ac21e87189dd03bf9322b96cd93d4533e33a3b0345b118c7204dbf',
      salt: '270212d1c2c9d51bfc7ccfc8e4eff351',
      fullName: 'Victoria Island Showroom Desk',
      role: 'sales'
    }
  ];

  for (const s of staff) {
    insertUser.run(s.username, s.email, s.passwordHash, s.salt, s.fullName, s.role);
  }
}

// 3. Seed Case Studies if empty
const caseCount = db.prepare('SELECT COUNT(*) as count FROM case_studies').get().count;
if (caseCount === 0) {
  console.log('[DATABASE] Seeding portfolio case studies...');
  const insertCase = db.prepare(`
    INSERT INTO case_studies (
      slug, title, sector, location, client_type, capacity_kva, solar_kwp,
      battery_kwh, diesel_saved_pct, thumbnail_url, challenge, solution,
      equipment_specs, outcomes, published
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const initialCases = [
    [
      'apex-medical-centre-ikeja',
      'Apex Medical Centre ICU & Surgical Microgrid',
      'commercial',
      'Ikeja, Lagos State',
      'Multi-Specialty Private Hospital',
      45.0, 35.2, 80.0, 85,
      '/images/solution-commercial.jpg',
      'Continuous power is life-critical for neonatal incubators, oxygen concentrators, and surgical suites. The facility was burning over ₦3.8 million monthly in diesel with severe noise and particulate pollution.',
      'Designed a synchronized 45kVA 3-phase hybrid solar microgrid with dual Deye industrial inverters and 80kWh LiFePO4 rack battery bank, with ATS generator sync for consecutive cloudy days.',
      '45kVA 3-Phase Smart Inverters, 64× 550W Jinko Bifacial Panels, 80kWh LiFePO4 Server Rack Batteries, Class-1 Lightning Surge Protection.',
      '99.98% verified power uptime, zero ICU power flicker, and monthly diesel expenditure slashed by 85% (saving over ₦3.2M/mo).',
      1
    ],
    [
      'lekki-phase-1-villa',
      'Luxury Residential Villa with Zero-Flicker Solar',
      'residential',
      'Lekki Phase 1, Lagos',
      '5-Bedroom Detached Luxury Residence',
      15.0, 11.0, 25.6, 75,
      '/images/sunfold-bento-residential.jpg',
      'Frequent coastal grid brownouts (140V) destroying inverter air conditioners and home theater electronics. Family spent over ₦950,000 monthly fueling a 30kVA generator.',
      'Installed a 15kVA single-phase pure sine-wave hybrid solar system with 25.6kWh high-cycle LiFePO4 wall-mount energy storage and rooftop bifacial array.',
      '15kVA Smart Hybrid Inverter, 20× 550W Tier-1 Panels, 25.6kWh LiFePO4 Storage, Automatic Voltage Regulation (AVR).',
      'Continuous 24/7 power running 4 Inverter ACs, 1.5HP borehole pump, refrigeration, and home automation. Generator runtime reduced by 78%.',
      1
    ],
    [
      'vgc-lekki-duplex',
      '4-Bedroom Duplex Clean Energy Conversion',
      'residential',
      'Victoria Garden City (VGC), Lekki',
      'Executive Residential Home',
      10.0, 7.7, 15.36, 70,
      '/images/lifestyle-home.jpg',
      'Estate diesel tariffs increased dramatically alongside frequent grid phase drops. Client required uninterrupted work-from-home power and night cooling.',
      'Engineered a 10kVA rooftop solar array with 15.36kWh Lithium storage, providing seamless transfer and intelligent daytime load management.',
      '10kVA Hybrid Inverter, 14× 550W Monocrystalline Panels, 15.36kWh LiFePO4 Storage, IoT Telemetry Dashboard.',
      'Zero disturbance during NEPA outages. Runs 2 Inverter ACs, deep freezer, and whole-house lighting with 70% reduction in grid and generator bills.',
      1
    ],
    [
      'sagamu-agrisolar-hub',
      'Agro-Processing & Cold Storage Solar Facility',
      'agriculture',
      'Sagamu Agro-Industrial Corridor, Ogun State',
      'Commercial Cassava & Vegetable Processing Mill',
      30.0, 24.2, 51.2, 82,
      '/images/bento-solar-carport-realistic.jpg',
      'High post-harvest crop spoilage due to erratic rural grid power and expensive generator logistics for cold chain refrigeration.',
      'Commissioned a 30kVA commercial ground-mount solar facility paired with solar surface water pumping and automated cold storage microgrid.',
      '30kVA 3-Phase Industrial Inverter, 44× 550W Mono PV, 51.2kWh Heavy-Duty LiFePO4 Storage, Solar VFD Water Borehole System.',
      'Post-harvest losses reduced by 94%. Borehole provides 60,000 litres daily without a single drop of fuel.',
      1
    ],
    [
      'vi-financial-district',
      'Corporate Headquarters Rooftop Solar Array',
      'commercial',
      'Victoria Island, Lagos State',
      '7-Story Commercial Financial Institution',
      60.0, 52.8, 102.4, 68,
      '/images/bento-solar-production-realistic.jpg',
      'Massive daytime cooling and workstation computing load incurring huge utility Band-A tariffs and 150kVA diesel generator usage during business hours.',
      'Engineered a 60kVA commercial rooftop PV system utilizing high-efficiency N-Type TOPCon panels and 102.4kWh high-voltage battery bank for daytime peak shaving.',
      '60kVA Dual Industrial Hybrid Inverters, 96× 550W N-Type TOPCon Panels, 102.4kWh High-Voltage BESS, Cloud BMS Telemetry.',
      'Offset 68% of daytime operational electricity costs, saving the organization ₦4.6 million in monthly energy OPEX.',
      1
    ],
    [
      'ikeja-industrial-bess',
      'Plastics Manufacturing Containerized BESS',
      'industrial',
      'Ikeja Industrial Estate, Lagos State',
      'High-Volume Plastic Injection Moulding Factory',
      120.0, 110.0, 204.8, 80,
      '/images/industrial-power-storage-schematic.jpg',
      'Severe voltage sags and momentary grid trips causing molten plastic solidification inside injection moulding barrels, costing ₦2.5M per downtime event.',
      'Engineered a 120kVA containerized industrial Battery Energy Storage System (BESS) with sub-10ms instantaneous UPS transfer and peak shaving algorithm.',
      '120kVA Industrial Inverter Microgrid, 204.8kWh Tier-1 Hithium LiFePO4 Containerized BESS, 200× 550W PV Canopy, SCADA Integration.',
      'Completely eliminated factory line trips and machine downtime. Generator operating hours slashed from 18 hours/day to under 3 hours/day.',
      1
    ]
  ];

  for (const c of initialCases) {
    insertCase.run(...c);
  }
}

// Record migration
db.exec(`
  INSERT OR IGNORE INTO schema_migrations (version, name)
  VALUES (1, 'initial_relational_schema_stage12');
`);
}

// =========================================================================
// CRUD DATA ACCESS METHODS (Stage 12)
// =========================================================================

// --- CATEGORIES ---
function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
}

// --- CASE STUDIES ---
function getCaseStudies(sector = null) {
  if (sector && sector !== 'all') {
    return db.prepare('SELECT * FROM case_studies WHERE sector = ? AND published = 1 ORDER BY id DESC').all(sector);
  }
  return db.prepare('SELECT * FROM case_studies WHERE published = 1 ORDER BY id DESC').all();
}

function getCaseStudyBySlug(slug) {
  return db.prepare('SELECT * FROM case_studies WHERE slug = ? AND published = 1').get(slug);
}

// --- ENQUIRIES ---
function createEnquiry({ name, phone, email = '', state = '', subject = '', message = '', ipAddress = '' }) {
  if (!name || !phone) {
    throw new Error('Name and Phone are mandatory fields.');
  }

  const referenceId = 'DP-MSG-' + Math.floor(100000 + Math.random() * 900000);

  const stmt = db.prepare(`
    INSERT INTO enquiries (reference_id, name, phone, email, state, subject, message, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(referenceId, name, phone, email, state, subject, message, ipAddress);

  logAudit({
    userId: null,
    action: 'CREATE_ENQUIRY',
    entityType: 'enquiry',
    entityId: referenceId,
    details: `Enquiry received from ${name} (${phone}) - ${subject}`,
    ipAddress
  });

  return getEnquiryByRef(referenceId);
}

function getEnquiries({ limit = 50, offset = 0, status = null } = {}) {
  let query = 'SELECT * FROM enquiries';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const enquiries = db.prepare(query).all(...params);
  const countStmt = status 
    ? db.prepare('SELECT COUNT(*) as count FROM enquiries WHERE status = ?').get(status)
    : db.prepare('SELECT COUNT(*) as count FROM enquiries').get();

  return { enquiries, total: countStmt.count };
}

function getEnquiryById(id) {
  return db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
}

function getEnquiryByRef(referenceId) {
  return db.prepare('SELECT * FROM enquiries WHERE reference_id = ?').get(referenceId);
}

function updateEnquiryStatus(id, status, adminNotes = '', adminUserId = null) {
  const stmt = db.prepare(`
    UPDATE enquiries 
    SET status = ?, admin_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, adminNotes, id);

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_ENQUIRY_STATUS',
    entityType: 'enquiry',
    entityId: id.toString(),
    details: `Status changed to ${status}. Notes: ${adminNotes}`
  });

  return getEnquiryById(id);
}

// --- QUOTES ---
function createQuote({
  name, fullName, phone, email = '', state = '', propertyType = '', sector = 'residential',
  packageId = null, packageSlug = '', packageName = '', loadDetails = '',
  indicativeInverterKva = null, indicativeBatteryKwh = null, indicativeSolarKwp = null,
  notes = '', ipAddress = ''
}) {
  const customerName = (name || fullName || '').trim();
  if (!customerName || !phone) {
    throw new Error('Name and Phone are mandatory fields.');
  }

  const referenceId = 'DP-' + Math.floor(100000 + Math.random() * 900000);

  const stmt = db.prepare(`
    INSERT INTO quotes (
      reference_id, name, phone, email, state, property_type, sector,
      package_id, package_slug, package_name, load_details,
      indicative_inverter_kva, indicative_battery_kwh, indicative_solar_kwp,
      admin_notes, ip_address
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    referenceId, customerName, phone, email, state, propertyType, sector,
    packageId, packageSlug, packageName, loadDetails,
    indicativeInverterKva, indicativeBatteryKwh, indicativeSolarKwp,
    notes, ipAddress
  );

  logAudit({
    userId: null,
    action: 'CREATE_QUOTE',
    entityType: 'quote',
    entityId: referenceId,
    details: `Solar quote request from ${customerName} (${phone}) - Property: ${propertyType}`,
    ipAddress
  });

  return getQuoteByRef(referenceId);
}

function getQuotes({ limit = 50, offset = 0, status = null } = {}) {
  let query = 'SELECT * FROM quotes';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const quotes = db.prepare(query).all(...params);
  const countStmt = status 
    ? db.prepare('SELECT COUNT(*) as count FROM quotes WHERE status = ?').get(status)
    : db.prepare('SELECT COUNT(*) as count FROM quotes').get();

  return { quotes, total: countStmt.count };
}

function getQuoteById(id) {
  return db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
}

function getQuoteByRef(referenceId) {
  return db.prepare('SELECT * FROM quotes WHERE reference_id = ?').get(referenceId);
}

function updateQuoteStatus(id, status, adminNotes = '', adminUserId = null) {
  const stmt = db.prepare(`
    UPDATE quotes 
    SET status = ?, admin_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, adminNotes, id);

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_QUOTE_STATUS',
    entityType: 'quote',
    entityId: id.toString(),
    details: `Quote status updated to ${status}. Notes: ${adminNotes}`
  });

  return getQuoteById(id);
}

// --- ORDERS ---
function createOrder({
  orderNumber: customOrderNumber = null,
  customerName, customerPhone, customerEmail = '',
  deliveryAddress, deliveryState, items = [],
  paymentMethod = 'transfer', paymentStatus = 'pending',
  orderStatus = 'pending', adminNotes = '', ipAddress = '',
  installationOption = 'supply_only',
  installationFeeNgn = null,
  deliveryFeeNgn = null,
  notes = '',
  subtotalNgn = null,
  totalNgn = null
}) {
  if (!customerName || !customerPhone || !deliveryAddress || !deliveryState) {
    throw new Error('Customer name, phone, delivery address, and state are mandatory.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one valid equipment item.');
  }

  // Calculate subtotal and verify pricing
  let calculatedSubtotal = 0;
  const verifiedItems = items.map(item => {
    const qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10));
    const price = parseInt(item.unitPriceNgn || item.price || item.price_ngn || 0, 10);
    const itemSubtotal = price * qty;
    calculatedSubtotal += itemSubtotal;
    return {
      id: item.id,
      slug: item.slug,
      name: item.name || item.title,
      price,
      quantity: qty,
      subtotal: itemSubtotal
    };
  });

  const finalSubtotal = (subtotalNgn !== null && subtotalNgn !== undefined)
    ? parseInt(subtotalNgn, 10)
    : calculatedSubtotal;

  const orderNumber = customOrderNumber || ('DP-ORD-' + Math.floor(100000 + Math.random() * 900000));
  const deliveryFee = (deliveryFeeNgn !== null && deliveryFeeNgn !== undefined)
    ? parseInt(deliveryFeeNgn, 10)
    : (deliveryState.toLowerCase() === 'lagos' ? 15000 : 35000);

  let installationFee = 0;
  if (installationOption === 'turnkey_install') {
    if (installationFeeNgn !== null && installationFeeNgn !== undefined) {
      installationFee = parseInt(installationFeeNgn, 10);
    } else {
      installationFee = Math.max(120000, Math.round(finalSubtotal * 0.08));
    }
  } else {
    installationFee = 0;
  }

  const totalAmount = (totalNgn !== null && totalNgn !== undefined)
    ? parseInt(totalNgn, 10)
    : (finalSubtotal + deliveryFee + installationFee);

  const stmt = db.prepare(`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_email,
      delivery_address, delivery_state, items_json, subtotal_ngn,
      delivery_fee_ngn, installation_fee_ngn, installation_option,
      total_ngn, payment_method, payment_status, order_status, admin_notes, notes, ip_address
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    orderNumber, customerName, customerPhone, customerEmail,
    deliveryAddress, deliveryState, JSON.stringify(verifiedItems),
    finalSubtotal, deliveryFee, installationFee, installationOption,
    totalAmount, paymentMethod, paymentStatus, orderStatus, adminNotes, notes, ipAddress
  );

  logAudit({
    userId: null,
    action: 'CREATE_ORDER',
    entityType: 'order',
    entityId: orderNumber,
    details: `Order created by ${customerName} for ₦${totalAmount.toLocaleString()} (${verifiedItems.length} items)`,
    ipAddress
  });

  return getOrderByNumber(orderNumber);
}

function getOrders({ limit = 50, offset = 0, status = null } = {}) {
  let query = 'SELECT * FROM orders';
  const params = [];

  if (status) {
    query += ' WHERE order_status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const orders = db.prepare(query).all(...params);
  const countStmt = status 
    ? db.prepare('SELECT COUNT(*) as count FROM orders WHERE order_status = ?').get(status)
    : db.prepare('SELECT COUNT(*) as count FROM orders').get();

  return { orders, total: countStmt.count };
}

function getOrderByNumber(orderNumber) {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  if (!order) return null;
  return {
    ...order,
    items: JSON.parse(order.items_json || '[]')
  };
}

function updateOrderStatus(id, orderStatus, paymentStatus, adminNotes = '', adminUserId = null) {
  const stmt = db.prepare(`
    UPDATE orders 
    SET order_status = ?, payment_status = ?, admin_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(orderStatus, paymentStatus, adminNotes, id);

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_ORDER_STATUS',
    entityType: 'order',
    entityId: id.toString(),
    details: `Order status: ${orderStatus}, Payment: ${paymentStatus}. Notes: ${adminNotes}`
  });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  return {
    ...order,
    items: JSON.parse(order.items_json || '[]')
  };
}

// =========================================================================
// STAGE 16: FULFILLMENT, COMMISSIONING & WARRANTY METHODS
// =========================================================================

function updateOrderFulfillment(orderIdOrNumber, {
  waybillNumber,
  courierPartner,
  estimatedDelivery,
  orderStatus = 'dispatched',
  adminNotes = '',
  adminUserId = null
}) {
  let targetOrder = null;
  if (typeof orderIdOrNumber === 'number' || (!isNaN(orderIdOrNumber) && !String(orderIdOrNumber).startsWith('DP-'))) {
    targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderIdOrNumber));
  }
  if (!targetOrder) {
    targetOrder = getOrderByNumber(orderIdOrNumber);
  }
  if (!targetOrder && typeof orderIdOrNumber === 'string') {
    targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderIdOrNumber);
  }

  if (!targetOrder) throw new Error('Order not found for fulfillment update.');

  const stmt = db.prepare(`
    UPDATE orders
    SET waybill_number = COALESCE(?, waybill_number),
        courier_partner = COALESCE(?, courier_partner),
        estimated_delivery = COALESCE(?, estimated_delivery),
        order_status = COALESCE(?, order_status),
        admin_notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE admin_notes END,
        updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    waybillNumber !== undefined ? waybillNumber : null,
    courierPartner !== undefined ? courierPartner : null,
    estimatedDelivery !== undefined ? estimatedDelivery : null,
    orderStatus !== undefined ? orderStatus : null,
    adminNotes, adminNotes, adminNotes,
    targetOrder.id
  );

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_ORDER_FULFILLMENT',
    entityType: 'order',
    entityId: targetOrder.order_number,
    details: `Waybill: ${waybillNumber || targetOrder.waybill_number || 'N/A'}, Courier: ${courierPartner || targetOrder.courier_partner || 'N/A'}, ETA: ${estimatedDelivery || targetOrder.estimated_delivery || 'N/A'}, Status: ${orderStatus}`
  });

  return getOrderByNumber(targetOrder.order_number);
}

function updateOrderCommissioning(orderIdOrNumber, {
  assignedEngineer,
  engineerPhone,
  installationScheduledDate,
  commissioningStatus = 'scheduled',
  commissioningTests = null,
  commissioningDate = null,
  commissioningCertificateId = null,
  adminNotes = '',
  adminUserId = null
}) {
  let targetOrder = null;
  if (typeof orderIdOrNumber === 'number' || (!isNaN(orderIdOrNumber) && !String(orderIdOrNumber).startsWith('DP-'))) {
    targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderIdOrNumber));
  }
  if (!targetOrder) {
    targetOrder = getOrderByNumber(orderIdOrNumber);
  }
  if (!targetOrder && typeof orderIdOrNumber === 'string') {
    targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderIdOrNumber);
  }

  if (!targetOrder) throw new Error('Order not found for commissioning update.');

  const testsJson = typeof commissioningTests === 'object' && commissioningTests !== null
    ? JSON.stringify(commissioningTests)
    : (commissioningTests || null);

  let certId = commissioningCertificateId;
  const isCompleted = commissioningStatus === 'commissioned' || commissioningStatus === 'completed';
  if (isCompleted && !certId) {
    certId = targetOrder.commissioning_certificate_id || `DP-CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  const effectiveStatus = isCompleted ? 'commissioned' : commissioningStatus;
  const commDate = (effectiveStatus === 'commissioned' && !commissioningDate) ? new Date().toISOString() : commissioningDate;
  const newOrderStatus = effectiveStatus === 'commissioned' ? 'completed' : targetOrder.order_status;

  const stmt = db.prepare(`
    UPDATE orders
    SET assigned_engineer = COALESCE(?, assigned_engineer),
        engineer_phone = COALESCE(?, engineer_phone),
        installation_scheduled_date = COALESCE(?, installation_scheduled_date),
        commissioning_status = COALESCE(?, commissioning_status),
        commissioning_tests = COALESCE(?, commissioning_tests),
        commissioning_date = COALESCE(?, commissioning_date),
        commissioning_certificate_id = COALESCE(?, commissioning_certificate_id),
        order_status = ?,
        admin_notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE admin_notes END,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(
    assignedEngineer !== undefined ? assignedEngineer : null,
    engineerPhone !== undefined ? engineerPhone : null,
    installationScheduledDate !== undefined ? installationScheduledDate : null,
    effectiveStatus !== undefined ? effectiveStatus : null,
    testsJson,
    commDate,
    certId,
    newOrderStatus,
    adminNotes, adminNotes, adminNotes,
    targetOrder.id
  );

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_ORDER_COMMISSIONING',
    entityType: 'order',
    entityId: targetOrder.order_number,
    details: `Engineer: ${assignedEngineer || targetOrder.assigned_engineer || 'N/A'}, Scheduled: ${installationScheduledDate || targetOrder.installation_scheduled_date || 'N/A'}, Status: ${effectiveStatus}, Certificate: ${certId || 'N/A'}`
  });

  return getOrderByNumber(targetOrder.order_number);
}

// --- SUPPORT TICKETS ---
function createSupportTicket({
  orderNumber = null,
  customerName,
  customerPhone,
  customerEmail = null,
  issueCategory = 'technical',
  priority = 'normal',
  subject,
  description
}) {
  if (!customerName || !customerPhone || !subject || !description) {
    throw new Error('Customer name, phone number, subject, and description are required.');
  }

  const ticketNumber = 'DP-SPT-' + Math.floor(100000 + Math.random() * 900000);
  const stmt = db.prepare(`
    INSERT INTO support_tickets (
      ticket_number, order_number, customer_name, customer_phone, customer_email,
      issue_category, priority, subject, description, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open'
    )
  `);

  stmt.run(
    ticketNumber,
    orderNumber ? orderNumber.trim() : null,
    customerName.trim(),
    customerPhone.trim(),
    customerEmail ? customerEmail.trim() : null,
    issueCategory,
    priority,
    subject.trim(),
    description.trim()
  );

  logAudit({
    userId: null,
    action: 'CREATE_SUPPORT_TICKET',
    entityType: 'support_ticket',
    entityId: ticketNumber,
    details: `Ticket created for ${customerName} (${issueCategory}). Priority: ${priority}. Subject: ${subject}`
  });

  return getSupportTicketByNumber(ticketNumber);
}

function getSupportTickets({ status = null, issueCategory = null, limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM support_tickets';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (issueCategory) {
    conditions.push('issue_category = ?');
    params.push(issueCategory);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const tickets = db.prepare(query).all(...params);

  let countQuery = 'SELECT COUNT(*) as count FROM support_tickets';
  const countParams = [];
  if (conditions.length > 0) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
    if (status) countParams.push(status);
    if (issueCategory) countParams.push(issueCategory);
  }
  const countStmt = db.prepare(countQuery).get(...countParams);

  return { tickets, total: countStmt.count };
}

function getSupportTicketByNumber(ticketNumber) {
  return db.prepare('SELECT * FROM support_tickets WHERE ticket_number = ?').get(ticketNumber);
}

function getSupportTicketsByOrder(orderNumber) {
  return db.prepare('SELECT * FROM support_tickets WHERE order_number = ? ORDER BY id DESC').all(orderNumber);
}

function updateSupportTicketStatus(id, {
  status,
  priority = null,
  assignedEngineer = null,
  resolutionNotes = null,
  adminUserId = null
}) {
  const existing = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
  if (!existing) throw new Error('Support ticket not found.');

  const resolvedAt = (status === 'resolved' || status === 'closed') ? new Date().toISOString() : existing.resolved_at;

  const stmt = db.prepare(`
    UPDATE support_tickets
    SET status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_engineer = COALESCE(?, assigned_engineer),
        resolution_notes = COALESCE(?, resolution_notes),
        resolved_at = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, priority, assignedEngineer, resolutionNotes, resolvedAt, id);

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_SUPPORT_TICKET',
    entityType: 'support_ticket',
    entityId: existing.ticket_number,
    details: `Ticket ${existing.ticket_number} status updated to: ${status}. Engineer: ${assignedEngineer || existing.assigned_engineer || 'None'}`
  });

  return db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
}

// --- DIGITAL WARRANTIES ---
function createWarrantyRecord({
  warrantyCode = null,
  orderNumber = null,
  productName,
  productSku = null,
  serialNumber,
  customerName,
  customerPhone,
  customerEmail = null,
  warrantyYears = null,
  warrantyDurationMonths = null,
  coverageSummary = 'Full parts replacement and tier-1 manufacturer warranty coverage',
  startDate = null,
  endDate = null
}) {
  if (!serialNumber || !productName || !customerName || !customerPhone) {
    throw new Error('Serial number, product name, customer name, and phone are required.');
  }

  const code = warrantyCode || ('DP-WRN-' + crypto.randomBytes(3).toString('hex').toUpperCase());
  const years = warrantyYears || (warrantyDurationMonths ? Math.round(warrantyDurationMonths / 12) : 5);
  const start = startDate || new Date().toISOString().split('T')[0];
  let end = endDate;
  if (!end) {
    const sDate = new Date(start);
    sDate.setFullYear(sDate.getFullYear() + Number(years));
    end = sDate.toISOString().split('T')[0];
  }

  const stmt = db.prepare(`
    INSERT INTO warranties (
      warranty_code, order_number, serial_number, product_name, product_sku,
      customer_name, customer_phone, customer_email, warranty_years, coverage_summary,
      status, start_date, end_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?
    )
  `);

  stmt.run(
    code,
    orderNumber ? orderNumber.trim() : null,
    serialNumber.trim().toUpperCase(),
    productName.trim(),
    productSku ? productSku.trim() : null,
    customerName.trim(),
    customerPhone.trim(),
    customerEmail ? customerEmail.trim() : null,
    Number(years),
    coverageSummary,
    start,
    end
  );

  return getWarrantyBySerialOrCode(code);
}

function getWarrantyBySerialOrCode(query) {
  if (!query) return null;
  const clean = query.trim().toUpperCase();
  return db.prepare(`
    SELECT * FROM warranties
    WHERE UPPER(warranty_code) = ? OR UPPER(serial_number) = ?
  `).get(clean, clean);
}

function getWarrantiesByOrder(orderNumber) {
  return db.prepare('SELECT * FROM warranties WHERE order_number = ? ORDER BY id DESC').all(orderNumber);
}

function getWarranties({ status = null, limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM warranties';
  const params = [];
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const warranties = db.prepare(query).all(...params);
  const countStmt = status
    ? db.prepare('SELECT COUNT(*) as count FROM warranties WHERE status = ?').get(status)
    : db.prepare('SELECT COUNT(*) as count FROM warranties').get();

  return { warranties, total: countStmt.count };
}

// Seed Initial Warranties and Tickets for Demonstration
function seedStage16DemoData() {
  const warrantyCount = db.prepare('SELECT COUNT(*) as count FROM warranties').get().count;
  if (warrantyCount === 0) {
    console.log('[DATABASE] Seeding Stage 16 verified warranty records and sample support tickets...');
    
    // Sample Orders for Fulfillment & Tracking Demo
    const existingOrdersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    if (existingOrdersCount === 0) {
      // Order 1: Dispatched / In-Transit & Scheduled
      const order1Items = [
        { id: 1, name: "Jinko 550W Monocrystalline Panel", price: 245000, quantity: 12, subtotal: 2940000 },
        { id: 7, name: "Deye 8kW Hybrid Inverter 48V", price: 3450000, quantity: 1, subtotal: 3450000 }
      ];
      db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, customer_email,
          delivery_address, delivery_state, items_json, subtotal_ngn,
          delivery_fee_ngn, total_ngn, payment_method, payment_status, order_status,
          waybill_number, courier_partner, estimated_delivery,
          assigned_engineer, engineer_phone, installation_scheduled_date, commissioning_status
        ) VALUES (
          'DP-ORD-100201', 'Alhaji Musa Danjuma', '08031234567', 'musa.danjuma@example.com',
          '15 Admiralty Way, Lekki Phase 1', 'Lagos', ?, 6390000,
          15000, 6405000, 'transfer', 'verified', 'dispatched',
          'GIG-LOS-892110', 'DEVICE PRO Fleet Logistics', '2026-10-18',
          'Engr. Babatunde Adeleke (COREN Reg #48291)', '+234 803 111 2233', '2026-10-20', 'scheduled'
        )
      `).run(JSON.stringify(order1Items));

      // Order 2: Completed & Fully Commissioned
      const order2Items = [
        { id: 13, name: "Felicity 10kWh LiFePO4 Lithium Battery", price: 3850000, quantity: 1, subtotal: 3850000 }
      ];
      const testResults = {
        earthingResistance: "3.4Ω (<5.0Ω COREN/NEMSA Pass)",
        dcSurgeProtection: "Type II DC SPD Active & Clamped",
        acLoadBalancing: "Phase Current Imbalance < 4%",
        inverterSync: "Grid Frequency Lock 50.05Hz Stable",
        batteryCellDeviation: "8mV Peak Deviation (<15mV Pass)"
      };
      db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, customer_email,
          delivery_address, delivery_state, items_json, subtotal_ngn,
          delivery_fee_ngn, total_ngn, payment_method, payment_status, order_status,
          waybill_number, courier_partner, estimated_delivery,
          assigned_engineer, engineer_phone, installation_scheduled_date,
          commissioning_status, commissioning_tests, commissioning_date, commissioning_certificate_id
        ) VALUES (
          'DP-ORD-100202', 'Dr. Ifeanyi Okonjo', '08029876543', 'ifeanyi.okonjo@example.com',
          'Plot 42 Maitama Crescent', 'Abuja', ?, 3850000,
          35000, 3885000, 'card', 'paid', 'completed',
          'DHL-ABJ-449102', 'DHL Express Nigeria', '2026-10-14',
          'Engr. Nnamdi Eze (COREN Reg #51042)', '+234 802 555 7890', '2026-10-15',
          'commissioned', ?, '2026-10-15T16:30:00Z', 'DP-CERT-ABJ-901'
        )
      `).run(JSON.stringify(order2Items), JSON.stringify(testResults));
    }

    // Seed Warranties
    createWarrantyRecord({
      orderNumber: 'DP-ORD-100201',
      productName: 'Jinko 550W Monocrystalline Bifacial Solar Panel (12x Array)',
      productSku: 'JKM-550M-72HL4',
      serialNumber: 'DP-SN-JK550-2026-001',
      customerName: 'Alhaji Musa Danjuma',
      customerPhone: '08031234567',
      customerEmail: 'musa.danjuma@example.com',
      warrantyYears: 25,
      coverageSummary: '25-Year Linear Power Output Guarantee (84.8% power output at Year 25). 12-Year Workmanship Warranty.'
    });

    createWarrantyRecord({
      orderNumber: 'DP-ORD-100201',
      productName: 'Deye 8kW Hybrid Inverter 48V Single Phase',
      productSku: 'SUN-8K-SG01LP1-EU',
      serialNumber: 'DP-SN-DYE8K-2026-089',
      customerName: 'Alhaji Musa Danjuma',
      customerPhone: '08031234567',
      customerEmail: 'musa.danjuma@example.com',
      warrantyYears: 5,
      coverageSummary: '5-Year Manufacturer Warranty. 24-48h rapid swap units available at Victoria Island Engineering Hub.'
    });

    createWarrantyRecord({
      orderNumber: 'DP-ORD-100202',
      productName: 'Felicity 10kWh LiFePO4 Lithium Battery 51.2V 200Ah',
      productSku: 'FL-LPBF48200-P',
      serialNumber: 'DP-SN-FEL10K-2026-304',
      customerName: 'Dr. Ifeanyi Okonjo',
      customerPhone: '08029876543',
      customerEmail: 'ifeanyi.okonjo@example.com',
      warrantyYears: 10,
      coverageSummary: '10-Year or 6,000-Cycle Performance Guarantee with internal smart BMS active cell protection.'
    });

    // Seed Support Tickets
    createSupportTicket({
      orderNumber: 'DP-ORD-100201',
      customerName: 'Alhaji Musa Danjuma',
      customerPhone: '08031234567',
      customerEmail: 'musa.danjuma@example.com',
      issueCategory: 'installation',
      priority: 'normal',
      subject: 'Site Pre-Inspection Access Confirmation for Roof Strut Mounting',
      description: 'The estate gate pass for the DEVICE PRO installation truck has been cleared with Lekki Phase 1 security. Ready for scheduled mounting on the 20th.'
    });

    createSupportTicket({
      orderNumber: 'DP-ORD-100202',
      customerName: 'Dr. Ifeanyi Okonjo',
      customerPhone: '08029876543',
      customerEmail: 'ifeanyi.okonjo@example.com',
      issueCategory: 'technical',
      priority: 'high',
      subject: 'Wi-Fi Dongle Cloud Monitoring Setup Assistance',
      description: 'Solar inverter and lithium storage commissioned successfully. Requesting assistance linking the Felicity cloud app with local Wi-Fi network.'
    });
  }
}

if (sqliteAvailable) {
  seedStage16DemoData();
}

// --- PAYMENTS & GATEWAY RECONCILIATION ---
function createPaymentRecord({
  orderId,
  orderNumber,
  gateway = 'paystack',
  reference,
  amountKobo,
  currency = 'NGN',
  customerEmail = '',
  metadataJson = '{}'
}) {
  const stmt = db.prepare(`
    INSERT INTO payments (
      order_id, order_number, gateway, reference, amount_kobo, currency,
      status, customer_email, metadata_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'pending', ?, ?
    )
  `);
  stmt.run(orderId, orderNumber, gateway, reference, amountKobo, currency, customerEmail, metadataJson);
  return getPaymentByReference(reference);
}

function getPaymentByReference(reference) {
  return db.prepare('SELECT * FROM payments WHERE reference = ?').get(reference);
}

function getPaymentsByOrderNumber(orderNumber) {
  return db.prepare('SELECT * FROM payments WHERE order_number = ? ORDER BY id DESC').all(orderNumber);
}

function updatePaymentStatus(reference, { status, channel = null, gatewayResponse = null, paidAt = null }) {
  const stmt = db.prepare(`
    UPDATE payments
    SET status = ?, channel = COALESCE(?, channel), gateway_response = COALESCE(?, gateway_response),
        paid_at = COALESCE(?, paid_at), updated_at = datetime('now')
    WHERE reference = ?
  `);
  stmt.run(status, channel, gatewayResponse, paidAt, reference);
  return getPaymentByReference(reference);
}

function reconcileOrderPayment(orderNumber, reference, { status, channel = null, gatewayResponse = null, paidAt = null }) {
  // 1. Update payment transaction record
  updatePaymentStatus(reference, { status, channel, gatewayResponse, paidAt: paidAt || new Date().toISOString() });

  // 2. If status is success, update order
  if (status === 'success') {
    const orderStmt = db.prepare(`
      UPDATE orders
      SET payment_status = 'paid', order_status = 'confirmed', updated_at = datetime('now')
      WHERE order_number = ?
    `);
    orderStmt.run(orderNumber);

    logAudit({
      userId: null,
      action: 'PAYMENT_VERIFIED',
      entityType: 'order',
      entityId: orderNumber,
      details: `Online payment of order ${orderNumber} verified via ${reference} (Channel: ${channel || 'online'}). Status: PAID.`
    });
  } else if (status === 'failed') {
    const orderStmt = db.prepare(`
      UPDATE orders
      SET payment_status = 'failed', updated_at = datetime('now')
      WHERE order_number = ?
    `);
    orderStmt.run(orderNumber);

    logAudit({
      userId: null,
      action: 'PAYMENT_FAILED',
      entityType: 'order',
      entityId: orderNumber,
      details: `Payment attempt ${reference} for order ${orderNumber} failed. Gateway response: ${gatewayResponse || 'declined'}`
    });
  }

  return getOrderByNumber(orderNumber);
}


// --- AUTHENTICATION & SESSIONS ---
function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
}

function getUserById(id) {
  const user = db.prepare('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?').get(id);
  return user;
}

function verifyUserLogin(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(username, username);
  if (!user) return null;

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) return null;

  // Update last login
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  };
}

function createSession(userId, durationDays = 7) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);

  return { token, expiresAt };
}

function getSessionUser(token) {
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.username, u.email, u.full_name, u.role, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND u.is_active = 1
  `).get(token);

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    revokeSession(token);
    return null;
  }

  return {
    id: session.id,
    username: session.username,
    email: session.email,
    fullName: session.full_name,
    role: session.role
  };
}

function revokeSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// --- AUDIT LOGGING ---
function logAudit({ userId = null, action, entityType, entityId = '', details = '', ipAddress = '' }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, entityType, entityId, details, ipAddress);
  } catch (e) {
    console.error('[AUDIT LOG ERROR]:', e);
  }
}

function getAuditLogs({ limit = 50, offset = 0 } = {}) {
  const logs = db.prepare(`
    SELECT a.*, u.username, u.full_name 
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.id DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const count = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  return { logs, total: count };
}

// --- DIAGNOSTICS & BACKUP ---
function getDatabaseStats() {
  const products = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const enquiries = db.prepare('SELECT COUNT(*) as count FROM enquiries').get().count;
  const quotes = db.prepare('SELECT COUNT(*) as count FROM quotes').get().count;
  const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const caseStudies = db.prepare('SELECT COUNT(*) as count FROM case_studies').get().count;
  const auditLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  let supportTickets = 0;
  let warranties = 0;
  try {
    supportTickets = db.prepare('SELECT COUNT(*) as count FROM support_tickets').get().count;
    warranties = db.prepare('SELECT COUNT(*) as count FROM warranties').get().count;
  } catch (e) {
    // tables may not exist in early tests
  }

  return {
    database: 'SQLite (node:sqlite DatabaseSync)',
    path: dbPath,
    tables: {
      products,
      categories,
      enquiries,
      quotes,
      orders,
      users,
      caseStudies,
      auditLogs,
      supportTickets,
      warranties
    },
    timestamp: new Date().toISOString()
  };
}

function exportDatabaseBackup() {
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `products-backup-${timestamp}.db`);

  // Direct file copy of SQLite database file
  fs.copyFileSync(dbPath, backupFilePath);

  return {
    success: true,
    backupFile: backupFilePath,
    sizeBytes: fs.statSync(backupFilePath).size,
    counts: getDatabaseStats().tables,
    timestamp: new Date().toISOString()
  };
}

// --- PRODUCT ADMINISTRATION (Stage 13) ---
function updateProduct(id, updates = {}, adminUserId = null) {
  const existing = getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID ${id} not found.`);
  }

  const fields = [];
  const params = [];

  const allowedFields = [
    'name', 'slug', 'brand', 'category', 'category_label', 'sku',
    'description', 'price_ngn', 'previous_price_ngn', 'power_rating',
    'power_tier', 'specifications', 'image_url', 'stock_status', 'featured', 'published'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  logAudit({
    userId: adminUserId,
    action: 'UPDATE_PRODUCT',
    entityType: 'product',
    entityId: id.toString(),
    details: `Updated fields: ${Object.keys(updates).join(', ')} on product ${existing.name} (${existing.sku})`
  });

  return getProductById(id);
}

function createProduct(productData = {}, adminUserId = null) {
  const {
    name, brand = 'DEVICE PRO', category = 'accessories',
    category_label = 'Accessories', sku, description = '',
    price_ngn = 0, previous_price_ngn = null, power_rating = 'Standard',
    power_tier = 'standard', specifications = '', image_url = 'images/products/jinko-solar-panel.png',
    stock_status = 'in_stock', featured = 0, published = 1
  } = productData;

  if (!name) {
    throw new Error('Product name is required.');
  }

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = productData.slug || `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
  const finalSku = sku || `DP-${Math.floor(10000 + Math.random() * 90000)}`;

  const stmt = db.prepare(`
    INSERT INTO products (
      name, slug, brand, category, category_label, sku, description,
      price_ngn, previous_price_ngn, power_rating, power_tier,
      specifications, image_url, stock_status, featured, published
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const result = stmt.run(
    name, slug, brand, category, category_label, finalSku, description,
    parseInt(price_ngn, 10) || 0,
    previous_price_ngn ? parseInt(previous_price_ngn, 10) : null,
    power_rating, power_tier, specifications, image_url, stock_status,
    featured ? 1 : 0, published ? 1 : 0
  );

  const newProduct = getProductById(result.lastInsertRowid);

  logAudit({
    userId: adminUserId,
    action: 'CREATE_PRODUCT',
    entityType: 'product',
    entityId: newProduct.id.toString(),
    details: `Created new product ${newProduct.name} (${newProduct.sku}) at ₦${newProduct.price_ngn.toLocaleString()}`
  });

  return newProduct;
}

function deleteProduct(id, adminUserId = null) {
  const product = getProductById(id);
  if (!product) {
    throw new Error(`Product with ID ${id} not found.`);
  }

  // Soft delete / unpublish
  db.prepare('UPDATE products SET published = 0 WHERE id = ?').run(id);

  logAudit({
    userId: adminUserId,
    action: 'DELETE_PRODUCT',
    entityType: 'product',
    entityId: id.toString(),
    details: `Unpublished/archived product ${product.name} (${product.sku})`
  });

  return { success: true, message: `Product ${product.name} archived.` };
}

// --- DUAL-ENGINE DISPATCHER (MongoDB Atlas / SQLite Fallback) ---
const { isMongoConnected } = require('./mongo/connection');
const mongoRepo = require('./mongo/repository');

function sqliteGetProductFacets() {
  const catRows = db.prepare(`
    SELECT category, category_label, COUNT(*) as count 
    FROM products 
    WHERE published = 1 
    GROUP BY category, category_label
    ORDER BY count DESC
  `).all();

  const brandRows = db.prepare(`
    SELECT brand, COUNT(*) as count 
    FROM products 
    WHERE published = 1 
    GROUP BY brand 
    ORDER BY count DESC
  `).all();

  const priceRow = db.prepare(`
    SELECT MIN(price_ngn) as min_price, MAX(price_ngn) as max_price 
    FROM products 
    WHERE published = 1
  `).get();

  return {
    categories: catRows,
    brands: brandRows,
    priceRange: {
      min: (priceRow && priceRow.min_price) || 0,
      max: (priceRow && priceRow.max_price) || 15000000
    }
  };
}

function sqliteGetRelatedProducts(category, productId, limit = 3) {
  return db.prepare(`
    SELECT * FROM products 
    WHERE category = ? AND id != ? AND published = 1 
    LIMIT ?
  `).all(category, productId, limit);
}

function dispatch(mongoFn, sqliteFn) {
  return function(...args) {
    if (isMongoConnected()) {
      let syncRes = null;
      if (sqliteAvailable && typeof sqliteFn === 'function') {
        try {
          syncRes = sqliteFn(...args);
        } catch (err) {
          // Ignored; Mongo is primary
        }
      }

      // Primary execution on MongoDB Atlas
      const asyncPromise = (async () => {
        try {
          const mongoRes = await mongoFn(...args);
          if (mongoRes !== null && mongoRes !== undefined) {
            return mongoRes;
          }
          if (sqliteAvailable && syncRes !== null) return syncRes;
          return mongoRes;
        } catch (err) {
          if (sqliteAvailable && syncRes !== null) return syncRes;
          throw err;
        }
      })();

      // Expose synchronous properties directly on the promise for sync property access
      if (syncRes && typeof syncRes === 'object') {
        try {
          Object.assign(asyncPromise, syncRes);
        } catch (e) {}
      }

      return asyncPromise;
    }

    // If SQLite is available locally, use it
    if (sqliteAvailable && typeof sqliteFn === 'function') {
      return sqliteFn(...args);
    }

    // In serverless/cloud environments where SQLite is disabled, dispatch to MongoDB
    return mongoFn(...args);
  };
}

module.exports = {
  db,
  isMongoConnected,
  // Products & Packages
  getProducts: dispatch(mongoRepo.getProducts, getProducts),
  getProductBySlug: dispatch(mongoRepo.getProductBySlug, getProductBySlug),
  getProductById: dispatch(mongoRepo.getProductById, getProductById),
  getProductFacets: dispatch(mongoRepo.getProductFacets, sqliteGetProductFacets),
  getRelatedProducts: dispatch(mongoRepo.getRelatedProducts, sqliteGetRelatedProducts),
  updateProduct: dispatch(mongoRepo.updateProduct, updateProduct),
  createProduct: dispatch(mongoRepo.createProduct, createProduct),
  deleteProduct: dispatch(mongoRepo.deleteProduct, deleteProduct),
  getPackages: dispatch(mongoRepo.getPackages, getPackages),
  getPackageBySlug: dispatch(mongoRepo.getPackageBySlug, getPackageBySlug),
  // Categories & Case Studies
  getCategories: dispatch(mongoRepo.getCategories, getCategories),
  getCaseStudies: dispatch(mongoRepo.getCaseStudies, getCaseStudies),
  getCaseStudyBySlug: dispatch(mongoRepo.getCaseStudyBySlug, getCaseStudyBySlug),
  // Enquiries
  createEnquiry: dispatch(mongoRepo.createEnquiry, createEnquiry),
  getEnquiries: dispatch(mongoRepo.getEnquiries, getEnquiries),
  getEnquiryById: dispatch(mongoRepo.getEnquiryById, getEnquiryById),
  getEnquiryByRef: dispatch(mongoRepo.getEnquiryByRef, getEnquiryByRef),
  updateEnquiryStatus: dispatch(mongoRepo.updateEnquiryStatus, updateEnquiryStatus),
  // Quotes
  createQuote: dispatch(mongoRepo.createQuote, createQuote),
  getQuotes: dispatch(mongoRepo.getQuotes, getQuotes),
  getQuoteById: dispatch(mongoRepo.getQuoteById, getQuoteById),
  getQuoteByRef: dispatch(mongoRepo.getQuoteByRef, getQuoteByRef),
  updateQuoteStatus: dispatch(mongoRepo.updateQuoteStatus, updateQuoteStatus),
  // Orders & Fulfillment
  createOrder: dispatch(mongoRepo.createOrder, createOrder),
  getOrders: dispatch(mongoRepo.getOrders, getOrders),
  getOrderByNumber: dispatch(mongoRepo.getOrderByNumber, getOrderByNumber),
  updateOrderStatus: dispatch(mongoRepo.updateOrderStatus, updateOrderStatus),
  updateOrderFulfillment: dispatch(mongoRepo.updateOrderFulfillment, updateOrderFulfillment),
  updateOrderCommissioning: dispatch(mongoRepo.updateOrderCommissioning, updateOrderCommissioning),
  // Support & Tickets (Stage 16)
  createSupportTicket: dispatch(mongoRepo.createSupportTicket, createSupportTicket),
  getSupportTickets: dispatch(mongoRepo.getSupportTickets, getSupportTickets),
  getSupportTicketByNumber: dispatch(mongoRepo.getSupportTicketByNumber, getSupportTicketByNumber),
  getSupportTicketsByOrder: dispatch(mongoRepo.getSupportTicketsByOrder, getSupportTicketsByOrder),
  updateSupportTicketStatus: dispatch(mongoRepo.updateSupportTicketStatus, updateSupportTicketStatus),
  // Warranties (Stage 16)
  createWarrantyRecord: dispatch(mongoRepo.createWarrantyRecord, createWarrantyRecord),
  getWarrantyBySerialOrCode: dispatch(mongoRepo.getWarrantyBySerialOrCode, getWarrantyBySerialOrCode),
  getWarrantiesByOrder: dispatch(mongoRepo.getWarrantiesByOrder, getWarrantiesByOrder),
  getWarranties: dispatch(mongoRepo.getWarranties, getWarranties),
  // Payments
  createPaymentRecord: dispatch(mongoRepo.createPaymentRecord, createPaymentRecord),
  getPaymentByReference: dispatch(mongoRepo.getPaymentByReference, getPaymentByReference),
  getPaymentsByOrderNumber: dispatch(mongoRepo.getPaymentsByOrderNumber, getPaymentsByOrderNumber),
  updatePaymentStatus: dispatch(mongoRepo.updatePaymentStatus, updatePaymentStatus),
  reconcileOrderPayment: dispatch(mongoRepo.reconcileOrderPayment, reconcileOrderPayment),
  // Auth & Sessions
  hashPassword,
  verifyPassword,
  getUserByUsername: dispatch(mongoRepo.getUserByUsername, getUserByUsername),
  getUserById: dispatch(mongoRepo.getUserById, getUserById),
  verifyUserLogin: dispatch(mongoRepo.verifyUserLogin, verifyUserLogin),
  createSession: dispatch(mongoRepo.createSession, createSession),
  getSessionUser: dispatch(mongoRepo.getSessionUser, getSessionUser),
  revokeSession: dispatch(mongoRepo.revokeSession, revokeSession),
  // Audit & Backup
  logAudit: dispatch(mongoRepo.logAudit, logAudit),
  getAuditLogs: dispatch(mongoRepo.getAuditLogs, getAuditLogs),
  getDatabaseStats: dispatch(mongoRepo.getDatabaseStats, getDatabaseStats),
  exportDatabaseBackup: dispatch(mongoRepo.exportDatabaseBackup, exportDatabaseBackup)
};

