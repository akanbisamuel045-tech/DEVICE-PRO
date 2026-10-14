/**
 * DEVICE PRO — SQLite Product Database Service
 * Uses Node.js native node:sqlite (DatabaseSync)
 * Provides schema initialization, seed data, and comprehensive filtering/sorting/pagination.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'products.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
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
    featured INTEGER DEFAULT 0,
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

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

module.exports = {
  db,
  getProducts,
  getProductBySlug,
  getProductById
};
