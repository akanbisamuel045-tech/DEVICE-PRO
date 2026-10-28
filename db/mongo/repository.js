const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Product, Category, CaseStudy, Enquiry, Quote,
  Order, Payment, Warranty, SupportTicket, User, Session, AuditLog, PasswordReset,
  PriceImport, PriceIntelligenceSettings, PackageBom
} = require('./models');
const {
  calculateBom,
  validateCatalogProductForBom,
  createProductSnapshot,
  COST_SOURCES
} = require('../../lib/bom-engine');

// Password verification helper (consistent with SQLite implementation)
function verifyPassword(password, hash, salt) {
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (e) {
    return false;
  }
}

// Package metadata details dictionary
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
    system_type: 'Heavy Hybrid Residential',
    intended_audience: '4–Bedroom Duplex, Medical Clinic, or Professional Studio',
    power_kw: '5.0 kW',
    battery_kwh: '10.24 kWh',
    solar_kwp: '4.4 kWp',
    daily_yield: '18.0 – 22.0 kWh/day',
    inverter_detail: '5kW 48V Deye/Growatt Smart Hybrid Inverter with Dual MPPT & Generator Auto-Start',
    battery_detail: '2× 5.12kWh (10.24kWh total) 48V 200Ah LiFePO4 Rack/Wall Batteries',
    panels_detail: '8× 550W Tier-1 Mono Bifacial Panels (4,400W total array)',
    bos_detail: 'Integrated DC Combiner, Class-II Type-2 Surge Arresters, Fire-Resistant Cable Trunking',
    supported_loads: [
      { appliance: '2× 1.5HP Inverter Air Conditioners', runtime: 'Continuous Daytime + 1× Overnight' },
      { appliance: '1× Double Door Fridge + 1× Deep Freezer', runtime: 'Continuous 24/7' },
      { appliance: '1× 1.0HP Submersible Borehole Pump', runtime: '1 – 2 Hours Daytime' },
      { appliance: 'Washing Machine (Wash cycle)', runtime: 'Daytime on solar yield' },
      { appliance: 'Home Entertainment, CCTV, All Lighting', runtime: 'Continuous 24/7' }
    ],
    load_exclusions_note: 'Central industrial chillers and heavy non-inverter resistive heating.',
    installation_scope: 'Engineered rooftop railing, dedicated sub-distribution board, lightning earthing, and NEMSA test certification.',
    warranty_terms: '25-Year Panel Warranty, 5-Year Inverter Replacement, 10-Year Battery Warranty, 24-Month Workmanship.',
    price_effective_date: 'Effective October 2026'
  },
  '7-5kva-executive-villa-solar-package': {
    system_type: 'Executive Residential / Estate Microgrid',
    intended_audience: '5-Bedroom Luxury Residence, Law Firm, or Hospital Wing',
    power_kw: '7.5 kW',
    battery_kwh: '15.36 kWh',
    solar_kwp: '6.6 kWp',
    daily_yield: '27.0 – 33.0 kWh/day',
    inverter_detail: '7.5kW 48V Pure Sine Wave Hybrid Inverter with Dual MPPT & Remote Cloud Monitoring',
    battery_detail: '3× 5.12kWh (15.36kWh total) High-Density LiFePO4 Battery Bank with Smart Active Balancer',
    panels_detail: '12× 550W Tier-1 Monocrystalline Bifacial Solar Modules (6,600W array)',
    bos_detail: 'Commercial Grade DC Distribution Box, Automatic Generator ATS Sync, Multi-stage SPD',
    supported_loads: [
      { appliance: '3× 1.5HP Inverter Air Conditioners', runtime: 'Daytime + 2× Overnight (8–10 hrs)' },
      { appliance: '2× Large Freezers + 2× Refrigerators', runtime: 'Continuous 24/7' },
      { appliance: '1× 1.5HP Borehole Submersible Pump', runtime: 'Daily automated pumping' },
      { appliance: 'Electric Gate Motors, CCTV & Perimeter Lights', runtime: 'Continuous 24/7' },
      { appliance: 'Home Office / Studio workstations', runtime: 'Continuous 24/7' }
    ],
    load_exclusions_note: 'Direct resistive water heaters over 3kW without smart timer interlock.',
    installation_scope: 'Comprehensive turnkey commissioning, lightning protection array, phase balance calibration, and client dashboard configuration.',
    warranty_terms: '25-Year Panel Output, 5-Year Inverter Replacement, 10-Year Lithium Battery Warranty, 24-Month Workmanship.',
    price_effective_date: 'Effective October 2026'
  },
  '10kva-executive-residence-solar-package': {
    system_type: 'Commercial Hybrid / Estate Microgrid',
    intended_audience: 'Executive Mansion, Corporate HQ, Commercial Laboratory, or Filling Station',
    power_kw: '10.0 kW',
    battery_kwh: '20.48 kWh',
    solar_kwp: '8.8 kWp',
    daily_yield: '36.0 – 44.0 kWh/day',
    inverter_detail: '10kW 48V Industrial Hybrid Inverter (Parallelable up to 6 units) with Cloud SCADA Telemetry',
    battery_detail: '4× 5.12kWh (20.48kWh total) Server-Rack LiFePO4 Lithium Bank with Smart BMS',
    panels_detail: '16× 550W Tier-1 Bifacial Solar Panels (8,800W total array)',
    bos_detail: 'Industrial DC Combiner with String Monitoring, 100A Automatic Changeover, Dual Earth Pits',
    supported_loads: [
      { appliance: '4× 1.5HP Inverter ACs (or 3× 2HP)', runtime: 'Full daytime + 2× Overnight' },
      { appliance: 'Full Kitchen Appliance Bank (Fridges, Freezers)', runtime: 'Continuous 24/7' },
      { appliance: '2HP Borehole Water Pumping Machine', runtime: 'Automated daylight operation' },
      { appliance: 'Server Rack, Security Hub, Electric Fencing', runtime: 'Continuous 24/7' },
      { appliance: 'All Interior & Landscape Architectural Lighting', runtime: 'Continuous 24/7' }
    ],
    load_exclusions_note: 'Heavy 3-phase central chillers require bespoke 3-phase commercial configuration.',
    installation_scope: 'Full EPC turnkey commissioning, structural roof load certification, harmonic distortion analysis, and annual maintenance plan.',
    warranty_terms: '25-Year Panel Output, 5-Year Inverter Warranty, 10-Year Battery Warranty, 24-Month Workmanship.',
    price_effective_date: 'Effective October 2026'
  },
  '15kva-commercial-office-microgrid': {
    system_type: '3-Phase Commercial Microgrid',
    intended_audience: 'Office Complex, Commercial Printing, Clinic & Surgery, or Production Facility',
    power_kw: '15.0 kW (3-Phase)',
    battery_kwh: '30.72 kWh',
    solar_kwp: '13.2 kWp',
    daily_yield: '54.0 – 66.0 kWh/day',
    inverter_detail: '15kW 3-Phase Low-Frequency Hybrid Inverter with Triple MPPT and Zero Export Control',
    battery_detail: '6× 5.12kWh (30.72kWh total) Heavy Commercial LiFePO4 Rack System',
    panels_detail: '24× 550W Tier-1 Monocrystalline Bifacial Panels (13,200W total)',
    bos_detail: '3-Phase Main Distribution Board, Type 1+2 Surge Protection, Generator Comms Link',
    supported_loads: [
      { appliance: '6× 1.5HP Inverter Air Conditioners (Balanced 3-Phase)', runtime: 'Full Working Hours (8am–6pm)' },
      { appliance: '25+ Laptops, Workstations, Multi-function Printers', runtime: 'Continuous business hours' },
      { appliance: 'Commercial Refrigeration / Cold Room Backup', runtime: 'Continuous 24/7' },
      { appliance: 'Commercial Borehole / Industrial Boosters', runtime: 'As scheduled' },
      { appliance: 'Full Office Lighting, Access Control & Surveillance', runtime: 'Continuous 24/7' }
    ],
    load_exclusions_note: 'Heavy arc welders and continuous industrial smelting.',
    installation_scope: 'Complete EPC deployment, 3-phase phase balancing, transformer sync, client energy analytics portal, and quarterly maintenance.',
    warranty_terms: '25-Year Panel Performance, 5-Year Inverter Replacement, 10-Year Lithium Battery Warranty, 36-Month SLA.',
    price_effective_date: 'Effective October 2026'
  }
};

// --- PRODUCTS ---
async function getProducts({
  category = null,
  brand = null,
  powerTier = null,
  inStock = null,
  stockStatus = null,
  status = 'active', // 'active' (published: 1), 'archived' (published: 0), 'all' (all items)
  search = null,
  limit = 50,
  offset = 0,
  page = 1,
  sort = 'featured',
  includeSupplierCost = false
} = {}) {
  const filter = {};
  
  if (status === 'active') {
    filter.published = 1;
  } else if (status === 'archived') {
    filter.published = 0;
  }
  // if status === 'all', no published filter is applied

  if (category && category !== 'all') filter.category = category;
  if (brand && brand !== 'all') filter.brand = brand;
  if (powerTier && powerTier !== 'all') filter.power_tier = powerTier;
  
  if (stockStatus && stockStatus !== 'all') {
    filter.stock_status = stockStatus;
  } else if (inStock !== null && inStock !== undefined) {
    filter.stock_status = inStock ? 'in_stock' : { $ne: 'in_stock' };
  }

  if (search && typeof search === 'string' && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sRegex = new RegExp(escaped, 'i');
    filter.$or = [
      { name: sRegex },
      { brand: sRegex },
      { sku: sRegex },
      { category: sRegex },
      { specifications: sRegex },
      { description: sRegex }
    ];
  }

  let sortOption = { id: 1 };
  if (sort === 'price_asc') sortOption = { price_ngn: 1 };
  else if (sort === 'price_desc') sortOption = { price_ngn: -1 };
  else if (sort === 'name_asc') sortOption = { name: 1 };
  else if (sort === 'newest') sortOption = { created_at: -1, id: -1 };
  else if (sort === 'featured') sortOption = { featured: -1, price_ngn: 1 };

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
  const calculatedOffset = offset ? parseInt(offset, 10) : ((Math.max(1, parseInt(page, 10) || 1) - 1) * safeLimit);
  const safeOffset = Math.max(0, calculatedOffset);

  const projection = includeSupplierCost ? {} : { cost_price_ngn: 0, supplier_cost_ngn: 0 };

  const products = await Product.find(filter, projection)
    .sort(sortOption)
    .skip(safeOffset)
    .limit(safeLimit)
    .lean();

  const total = await Product.countDocuments(filter);
  return { products, total, page: Math.floor(safeOffset / safeLimit) + 1, limit: safeLimit };
}

async function getProductBySlug(slug) {
  return Product.findOne({ slug, published: 1 }, { cost_price_ngn: 0, supplier_cost_ngn: 0 }).lean();
}

function buildProductFilter(id) {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number' || (/^\d+$/.test(String(id).trim()))) {
    return { id: Number(id) };
  }
  const strId = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(strId)) {
    return { _id: strId };
  }
  return null;
}

async function getProductById(id, { includeSupplierCost = false } = {}) {
  const filter = buildProductFilter(id);
  if (!filter) return null;
  const projection = includeSupplierCost ? {} : { cost_price_ngn: 0, supplier_cost_ngn: 0 };
  return Product.findOne(filter, projection).lean();
}

async function getProductFacets() {
  const [categories, brands, priceRange] = await Promise.all([
    Product.aggregate([
      { $match: { published: 1 } },
      { $group: { _id: { category: '$category', category_label: '$category_label' }, count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id.category', category_label: '$_id.category_label', count: 1 } },
      { $sort: { count: -1 } }
    ]),
    Product.aggregate([
      { $match: { published: 1 } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $project: { _id: 0, brand: '$_id', count: 1 } },
      { $sort: { count: -1 } }
    ]),
    Product.aggregate([
      { $match: { published: 1 } },
      { $group: { _id: null, min_price: { $min: '$price_ngn' }, max_price: { $max: '$price_ngn' } } }
    ])
  ]);
  const pr = (priceRange && priceRange[0]) || { min_price: 0, max_price: 15000000 };
  return {
    categories,
    brands,
    priceRange: { min: pr.min_price || 0, max: pr.max_price || 15000000 }
  };
}

async function getRelatedProducts(category, productId, limit = 3) {
  const numId = Number(productId);
  const filter = {
    category,
    published: 1,
    ...(isNaN(numId) ? {} : { id: { $ne: numId } })
  };
  return Product.find(filter, { cost_price_ngn: 0 }).limit(limit).lean();
}

async function createProduct(productData = {}, adminUserId = null) {
  let {
    name, brand = 'DEVICE PRO', category = 'accessories',
    category_label, sku, description = '',
    price_ngn, previous_price_ngn = null, cost_price_ngn = 0,
    power_rating = 'Standard', power_tier = 'standard',
    specifications = '', image_url,
    stock_status = 'in_stock', stock_quantity = 50,
    warranty_years = 5, featured = 0, published = 1
  } = productData;

  // 1. Mandatory field validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Product name is required.');
  }
  name = name.trim();

  if (price_ngn === undefined || price_ngn === null || isNaN(price_ngn) || Number(price_ngn) < 0) {
    throw new Error('Selling price must be a valid non-negative number.');
  }
  const numericPrice = Math.round(Number(price_ngn));

  const numericCost = (cost_price_ngn !== undefined && cost_price_ngn !== null && !isNaN(cost_price_ngn))
    ? Math.max(0, Math.round(Number(cost_price_ngn)))
    : 0;

  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error('Category is required.');
  }

  // 2. SKU normalization & uniqueness check
  let finalSku = (sku || '').trim().toUpperCase();
  if (!finalSku) {
    throw new Error('SKU is required.');
  }
  const existingSku = await Product.findOne({ sku: finalSku, published: 1 }).lean();
  if (existingSku) {
    throw new Error(`SKU "${finalSku}" is already in use by product "${existingSku.name}". Please specify a unique SKU.`);
  }

  // 3. Stock status & quantity validation
  const validStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'];
  if (!validStatuses.includes(stock_status)) {
    stock_status = 'in_stock';
  }
  const numericQty = !isNaN(stock_quantity) ? Math.max(0, parseInt(stock_quantity, 10)) : 50;

  // 4. Safe image URL check
  let finalImageUrl = (image_url || '').trim();
  if (finalImageUrl) {
    if (!/^(https?:\/\/|\/|images\/)/i.test(finalImageUrl)) {
      throw new Error('Image URL must start with http://, https://, or a valid path (/images/...). Unsafe protocols are prohibited.');
    }
  } else {
    finalImageUrl = '/images/products/jinko-solar-panel.png';
  }

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = productData.slug || `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

  let id = productData.id;
  if (!id) {
    const maxDoc = await Product.findOne().sort({ id: -1 }).select('id').lean();
    id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
  }

  const product = new Product({
    id,
    name,
    slug,
    brand: (brand || 'DEVICE PRO').trim(),
    category: category.trim(),
    category_label: category_label || category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    sku: finalSku,
    description: (description || '').trim(),
    price_ngn: numericPrice,
    previous_price_ngn: previous_price_ngn && !isNaN(previous_price_ngn) ? Math.round(Number(previous_price_ngn)) : null,
    cost_price_ngn: numericCost,
    power_rating,
    power_tier,
    specifications: (specifications || '').trim(),
    image_url: finalImageUrl,
    stock_status,
    stock_quantity: numericQty,
    warranty_years: parseInt(warranty_years, 10) || 5,
    featured: featured ? 1 : 0,
    published: published !== undefined ? (published ? 1 : 0) : 1
  });

  const saved = await product.save();

  await logAudit({
    userId: adminUserId,
    action: 'CREATE_PRODUCT',
    entityType: 'product',
    entityId: (saved.id || saved._id).toString(),
    details: `Created new product ${name} (${finalSku}) at ₦${numericPrice.toLocaleString()} (Supplier Cost: ₦${numericCost.toLocaleString()})`
  });

  return saved.toObject ? saved.toObject() : saved;
}

async function updateProduct(id, updates = {}, adminUserId = null, { canEditPrice = true } = {}) {
  const filter = buildProductFilter(id);
  if (!filter) {
    throw new Error(`Product with ID "${id}" not found.`);
  }
  const existing = await Product.findOne(filter).lean();
  if (!existing) {
    throw new Error(`Product with ID "${id}" not found.`);
  }

  // Prevent mass-assignment of sensitive internal fields
  delete updates._id;
  delete updates.id;
  delete updates.created_at;

  // Commercial price protection for roles lacking permission (e.g. engineer)
  if (!canEditPrice) {
    delete updates.price_ngn;
    delete updates.previous_price_ngn;
    delete updates.cost_price_ngn;
  }

  if (updates.price_ngn !== undefined) {
    if (isNaN(updates.price_ngn) || Number(updates.price_ngn) < 0) {
      throw new Error('Selling price must be a valid non-negative number.');
    }
    updates.price_ngn = Math.round(Number(updates.price_ngn));
  }

  if (updates.cost_price_ngn !== undefined) {
    if (isNaN(updates.cost_price_ngn) || Number(updates.cost_price_ngn) < 0) {
      throw new Error('Supplier cost must be a valid non-negative number.');
    }
    updates.cost_price_ngn = Math.round(Number(updates.cost_price_ngn));
  }

  if (updates.previous_price_ngn !== undefined && updates.previous_price_ngn !== null) {
    if (isNaN(updates.previous_price_ngn) || Number(updates.previous_price_ngn) < 0) {
      throw new Error('Previous price must be a valid non-negative number.');
    }
    updates.previous_price_ngn = Math.round(Number(updates.previous_price_ngn));
  }

  // If SKU is being updated, check uniqueness
  if (updates.sku !== undefined) {
    const normSku = (updates.sku || '').trim().toUpperCase();
    if (!normSku) {
      throw new Error('SKU cannot be empty.');
    }
    const duplicate = await Product.findOne({ sku: normSku, published: 1, id: { $ne: existing.id } }).lean();
    if (duplicate) {
      throw new Error(`SKU "${normSku}" is already in use by product "${duplicate.name}".`);
    }
    updates.sku = normSku;
  }

  // If image_url is updated, check protocol
  if (updates.image_url) {
    if (!/^(https?:\/\/|\/|images\/)/i.test(updates.image_url.trim())) {
      throw new Error('Image URL must start with http://, https://, or a valid path (/images/...).');
    }
    updates.image_url = updates.image_url.trim();
  }

  if (updates.stock_quantity !== undefined) {
    updates.stock_quantity = Math.max(0, parseInt(updates.stock_quantity, 10) || 0);
  }

  updates.updated_at = new Date();
  const updated = await Product.findOneAndUpdate(filter, { $set: updates }, { returnDocument: 'after' }).lean();

  await logAudit({
    userId: adminUserId,
    action: 'UPDATE_PRODUCT',
    entityType: 'product',
    entityId: (existing.id || existing._id).toString(),
    details: `Updated fields: ${Object.keys(updates).join(', ')} on product ${existing.name} (${existing.sku})`
  });

  return updated;
}

async function archiveProduct(id, archiveState = true, adminUserId = null, { action = null } = {}) {
  const filter = buildProductFilter(id);
  if (!filter) {
    throw new Error(`Product with ID "${id}" not found.`);
  }
  const product = await Product.findOne(filter).lean();
  if (!product) {
    throw new Error(`Product with ID "${id}" not found.`);
  }

  const publishedVal = archiveState ? 0 : 1;
  const actionLabel = action || (archiveState ? 'ARCHIVE_PRODUCT' : 'RESTORE_PRODUCT');
  const descLabel = archiveState ? 'archived' : 'restored';

  // Check if historical orders reference this product
  let orderRefCount = 0;
  try {
    orderRefCount = await Order.countDocuments({
      items_json: new RegExp(`\"(id|slug)\":\\s*\"?(${product.id}|${product.slug})\"?`, 'i')
    });
  } catch (e) {
    orderRefCount = 0;
  }

  await Product.updateOne(filter, { $set: { published: publishedVal, updated_at: new Date() } });

  await logAudit({
    userId: adminUserId,
    action: actionLabel,
    entityType: 'product',
    entityId: (product.id || product._id).toString(),
    details: `${descLabel.toUpperCase()} product ${product.name} (${product.sku}). Historical order references: ${orderRefCount} (preserved intact).`
  });

  return {
    success: true,
    message: `Product "${product.name}" successfully ${descLabel}.`,
    product: { ...product, published: publishedVal },
    orderRefCount
  };
}

async function deleteProduct(id, adminUserId = null) {
  return archiveProduct(id, true, adminUserId, { action: 'DELETE_PRODUCT' });
}

// --- PACKAGES ---
async function getPackages() {
  const packages = await Product.find({ category: 'solar-packages', published: 1 })
    .sort({ price_ngn: 1 })
    .lean();
  return packages.map(pkg => ({
    ...pkg,
    details: PACKAGE_METADATA[pkg.slug] || {}
  }));
}

async function getPackageBySlug(slug) {
  const pkg = await Product.findOne({ category: 'solar-packages', slug, published: 1 }).lean();
  if (!pkg) return null;
  return {
    ...pkg,
    details: PACKAGE_METADATA[pkg.slug] || {}
  };
}

// --- CATEGORIES & CASE STUDIES ---
async function getCategories() {
  return Category.find().sort({ display_order: 1 }).lean();
}

async function getCaseStudies(sector = null) {
  const filter = { published: 1 };
  if (sector) filter.sector = sector;
  return CaseStudy.find(filter).sort({ capacity_kva: -1 }).lean();
}

async function getCaseStudyBySlug(slug) {
  return CaseStudy.findOne({ slug, published: 1 }).lean();
}

// --- ENQUIRIES ---
async function createEnquiry(data) {
  const clientName = (data.name || data.fullName || data.full_name || '').trim();
  const phone = (data.phone || '').trim();
  const referenceId = 'DP-MSG-' + Math.floor(100000 + Math.random() * 900000);
  const maxDoc = await Enquiry.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const enquiry = new Enquiry({
    id,
    reference_id: referenceId,
    name: clientName,
    full_name: clientName,
    email: data.email || '',
    phone,
    state: data.state || '',
    subject: data.subject || data.serviceType || 'General Solar Inquiry',
    service_type: data.serviceType || data.service_type || 'Residential Solar',
    system_scale: data.systemScale || data.system_scale || '5kVA',
    estimated_budget: data.estimatedBudget || data.estimated_budget || 'Flexible',
    message: (data.message || '').trim(),
    ip_address: data.ipAddress || data.ip_address || ''
  });
  await enquiry.save();

  await logAudit({
    userId: null,
    action: 'CREATE_ENQUIRY',
    entityType: 'enquiry',
    entityId: referenceId,
    details: `Solar enquiry received from ${clientName} (${phone}) - Subject: ${enquiry.subject}`,
    ipAddress: data.ipAddress || data.ip_address || ''
  });

  return enquiry.toObject();
}

async function getEnquiries({ limit = 50, offset = 0, status = null } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const enquiries = await Enquiry.find(filter).sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await Enquiry.countDocuments(filter);
  return { enquiries, total };
}

async function getEnquiryById(id) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { reference_id: id };
  return Enquiry.findOne(filter).lean();
}

async function getEnquiryByRef(referenceId) {
  return Enquiry.findOne({ reference_id: referenceId }).lean();
}

async function updateEnquiryStatus(id, status, notes = '', adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updated = await Enquiry.findOneAndUpdate(filter, { status, admin_notes: notes, updated_at: new Date() }, { returnDocument: 'after' }).lean();

  await logAudit({
    userId: adminUserId,
    action: 'UPDATE_ENQUIRY_STATUS',
    entityType: 'enquiry',
    entityId: id.toString(),
    details: `Status changed to ${status}. Notes: ${notes}`
  });

  return updated;
}

// --- QUOTES ---
async function createQuote(data) {
  const clientName = (data.name || data.fullName || data.customerName || data.customer_name || '').trim();
  const phone = (data.phone || '').trim();
  const referenceId = 'DP-' + Math.floor(100000 + Math.random() * 900000);
  const maxDoc = await Quote.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const quote = new Quote({
    id,
    reference_id: referenceId,
    name: clientName,
    customer_name: clientName,
    phone,
    email: data.email || '',
    state: data.state || '',
    property_type: data.propertyType || data.type || 'Residential',
    sector: data.sector || 'residential',
    package_id: data.packageId || null,
    package_slug: data.packageSlug || '',
    package_name: data.packageName || '',
    load_details: typeof data.loadDetails === 'object' ? JSON.stringify(data.loadDetails) : (data.loadDetails || ''),
    indicative_inverter_kva: parseFloat(data.indicativeInverterKva || data.recommendedInverterKva) || null,
    indicative_battery_kwh: parseFloat(data.indicativeBatteryKwh || data.recommendedBatteryKwh) || null,
    indicative_solar_kwp: parseFloat(data.indicativeSolarKwp || data.recommendedPanelsKwp) || null,
    recommended_inverter_kva: parseFloat(data.recommendedInverterKva || data.indicativeInverterKva) || null,
    recommended_battery_kwh: parseFloat(data.recommendedBatteryKwh || data.indicativeBatteryKwh) || null,
    recommended_panels_kwp: parseFloat(data.recommendedPanelsKwp || data.indicativeSolarKwp) || null,
    daily_energy_kwh: parseFloat(data.dailyEnergyKwh) || null,
    peak_power_kw: parseFloat(data.peakPowerKw) || null,
    estimated_price_ngn: parseFloat(data.estimatedPriceNgn) || null,
    appliances_json: data.appliances ? JSON.stringify(data.appliances) : (data.appliances_json || ''),
    notes: data.notes || '',
    ip_address: data.ipAddress || data.ip_address || ''
  });
  await quote.save();

  await logAudit({
    userId: null,
    action: 'CREATE_QUOTE',
    entityType: 'quote',
    entityId: referenceId,
    details: `Solar quote request from ${clientName} (${phone}) - Property: ${quote.property_type}`,
    ipAddress: data.ipAddress || data.ip_address || ''
  });

  return quote.toObject();
}

async function getQuotes({ limit = 50, offset = 0, status = null } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const quotes = await Quote.find(filter).sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await Quote.countDocuments(filter);
  return { quotes, total };
}

async function getQuoteById(id) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { reference_id: id };
  return Quote.findOne(filter).lean();
}

async function getQuoteByRef(referenceId) {
  return Quote.findOne({ reference_id: referenceId }).lean();
}

async function updateQuoteStatus(id, status, notes = '', adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updated = await Quote.findOneAndUpdate(filter, { status, admin_notes: notes, updated_at: new Date() }, { returnDocument: 'after' }).lean();

  await logAudit({
    userId: adminUserId,
    action: 'UPDATE_QUOTE_STATUS',
    entityType: 'quote',
    entityId: id.toString(),
    details: `Quote status updated to ${status}. Notes: ${notes}`
  });

  return updated;
}

// --- ORDERS ---
async function createOrder({
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
  let calculatedSubtotal = 0;
  const verifiedItems = await Promise.all(items.map(async item => {
    const qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10));
    let price = parseInt(item.unitPriceNgn || item.price || item.price_ngn || 0, 10);
    
    // Server-authoritative price lookup from Product catalogue
    let dbProd = null;
    if (item.id !== undefined && item.id !== null) {
      const pFilter = buildProductFilter(item.id);
      if (pFilter) dbProd = await Product.findOne(pFilter).lean();
    }
    if (!dbProd && item.slug) {
      dbProd = await Product.findOne({ slug: item.slug }).lean();
    }
    if (dbProd && typeof dbProd.price_ngn === 'number') {
      price = dbProd.price_ngn;
    }

    const itemSubtotal = price * qty;
    calculatedSubtotal += itemSubtotal;
    return {
      id: (dbProd && dbProd.id) || item.id,
      slug: (dbProd && dbProd.slug) || item.slug,
      name: (dbProd && dbProd.name) || item.name || item.title,
      price,
      price_ngn: price,
      quantity: qty,
      subtotal: itemSubtotal
    };
  }));

  const finalSubtotal = calculatedSubtotal;

  const orderNumber = customOrderNumber || ('DP-ORD-' + Math.floor(100000 + Math.random() * 900000));
  const deliveryFee = deliveryFeeNgn !== null && deliveryFeeNgn !== undefined
    ? parseInt(deliveryFeeNgn, 10)
    : (deliveryState.toLowerCase() === 'lagos' ? 15000 : 35000);

  let installationFee = 0;
  if (installationOption === 'turnkey_install') {
    if (installationFeeNgn !== null && installationFeeNgn !== undefined) {
      installationFee = parseInt(installationFeeNgn, 10);
    } else {
      installationFee = Math.max(120000, Math.round(finalSubtotal * 0.08));
    }
  }

  const totalAmount = (totalNgn !== null && totalNgn !== undefined)
    ? parseInt(totalNgn, 10)
    : (finalSubtotal + deliveryFee + installationFee);

  const maxDoc = await Order.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const order = new Order({
    id,
    order_number: orderNumber,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    delivery_address: deliveryAddress,
    delivery_state: deliveryState,
    items_json: JSON.stringify(verifiedItems),
    subtotal_ngn: finalSubtotal,
    delivery_fee_ngn: deliveryFee,
    installation_fee_ngn: installationFee,
    installation_option: installationOption,
    total_ngn: totalAmount,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    order_status: orderStatus,
    admin_notes: adminNotes,
    notes,
    ip_address: ipAddress
  });

  await order.save();

  await logAudit({
    userId: null,
    action: 'CREATE_ORDER',
    entityType: 'order',
    entityId: orderNumber,
    details: `Order created by ${customerName} for ₦${totalAmount.toLocaleString()} (${verifiedItems.length} items)`,
    ipAddress
  });

  return getOrderByNumber(orderNumber);
}

async function getOrders({ limit = 50, offset = 0, status = null } = {}) {
  const filter = {};
  if (status) filter.order_status = status;
  const orders = await Order.find(filter).sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await Order.countDocuments(filter);
  return { orders, total };
}

async function getOrdersByCustomer({ email, phone, limit = 20, offset = 0 } = {}) {
  const orConditions = [];
  if (email && typeof email === 'string') {
    const trimmed = email.trim();
    const normalized = trimmed.toLowerCase();
    orConditions.push({ customer_email: trimmed });
    orConditions.push({ customer_email: normalized });
  }
  if (phone && typeof phone === 'string' && phone.trim()) {
    orConditions.push({ customer_phone: phone.trim() });
  }

  if (orConditions.length === 0) {
    return { orders: [], total: 0 };
  }

  const filter = { $or: orConditions };
  const rawOrders = await Order.find(filter)
    .sort({ id: -1, created_at: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  const total = await Order.countDocuments(filter);

  const orders = rawOrders.map(o => ({
    id: o.id || o._id,
    orderNumber: o.order_number,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone,
    deliveryAddress: o.delivery_address,
    deliveryState: o.delivery_state,
    items: typeof o.items_json === 'string' ? JSON.parse(o.items_json || '[]') : (o.items || []),
    subtotalNgn: o.subtotal_ngn,
    deliveryFeeNgn: o.delivery_fee_ngn || 0,
    installationFeeNgn: o.installation_fee_ngn || 0,
    installationOption: o.installation_option,
    totalNgn: o.total_ngn,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    orderStatus: o.order_status,
    waybillNumber: o.waybill_number || null,
    courierPartner: o.courier_partner || null,
    estimatedDelivery: o.estimated_delivery || null,
    createdAt: o.created_at
  }));

  return { orders, total };
}

async function getOrderByNumber(orderNumber) {
  const order = await Order.findOne({ order_number: orderNumber }).lean();
  if (!order) return null;
  return {
    ...order,
    items: JSON.parse(order.items_json || '[]')
  };
}

async function updateOrderStatus(id, orderStatus, paymentStatus, adminNotes = '', adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updated = await Order.findOneAndUpdate(
    filter,
    { order_status: orderStatus, payment_status: paymentStatus, admin_notes: adminNotes, updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean();

  await logAudit({
    userId: adminUserId,
    action: 'UPDATE_ORDER_STATUS',
    entityType: 'order',
    entityId: id.toString(),
    details: `Order status: ${orderStatus}, Payment: ${paymentStatus}. Notes: ${adminNotes}`
  });

  return updated;
}

async function updateOrderFulfillment(id, { waybillNumber, courierPartner, estimatedDelivery, adminNotes = '', adminUserId = null }) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updateData = { updated_at: new Date() };
  if (waybillNumber !== undefined) updateData.waybill_number = waybillNumber;
  if (courierPartner !== undefined) updateData.courier_partner = courierPartner;
  if (estimatedDelivery !== undefined) updateData.estimated_delivery = estimatedDelivery;
  if (adminNotes) updateData.admin_notes = adminNotes;
  return Order.findOneAndUpdate(filter, updateData, { returnDocument: 'after' }).lean();
}

async function updateOrderCommissioning(id, { assignedEngineer, engineerPhone, installationScheduledDate, commissioningStatus, commissioningTests, commissioningDate, commissioningCertificateId, adminNotes = '', adminUserId = null }) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updateData = { updated_at: new Date() };
  if (assignedEngineer !== undefined) updateData.assigned_engineer = assignedEngineer;
  if (engineerPhone !== undefined) updateData.engineer_phone = engineerPhone;
  if (installationScheduledDate !== undefined) updateData.installation_scheduled_date = installationScheduledDate;
  if (commissioningStatus !== undefined) updateData.commissioning_status = commissioningStatus;
  if (commissioningTests !== undefined) updateData.commissioning_tests = commissioningTests;
  if (commissioningDate !== undefined) updateData.commissioning_date = commissioningDate;
  if (commissioningCertificateId !== undefined) updateData.commissioning_certificate_id = commissioningCertificateId;
  if (adminNotes) updateData.admin_notes = adminNotes;
  return Order.findOneAndUpdate(filter, updateData, { returnDocument: 'after' }).lean();
}

// --- PAYMENTS ---
async function createPaymentRecord({
  orderId = null, orderNumber, gateway = 'paystack', reference,
  amountKobo, currency = 'NGN', status = 'initialized', channel = null,
  customerEmail = null, metadataJson = null
}) {
  const maxDoc = await Payment.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const payment = new Payment({
    id,
    order_id: orderId,
    order_number: orderNumber,
    gateway,
    reference,
    amount_kobo: amountKobo,
    currency,
    status,
    channel,
    customer_email: customerEmail,
    metadata_json: metadataJson
  });
  await payment.save();
  return payment.toObject();
}

async function getPaymentByReference(reference) {
  return Payment.findOne({ reference }).lean();
}

async function getPaymentsByOrderNumber(orderNumber) {
  return Payment.find({ order_number: orderNumber }).sort({ id: -1 }).lean();
}

async function updatePaymentStatus(reference, status, channel = null, rawResponseJson = null) {
  const updateData = { status, updated_at: new Date() };
  if (channel) updateData.channel = channel;
  if (rawResponseJson) updateData.raw_response_json = rawResponseJson;
  return Payment.findOneAndUpdate({ reference }, updateData, { returnDocument: 'after' }).lean();
}

async function reconcileOrderPayment(arg1, arg2, arg3 = {}, arg4 = null) {
  let orderNumber, reference, reconciliation;
  if (typeof arg3 === 'object' && arg3 !== null && arg3.status) {
    orderNumber = arg1;
    reference = arg2;
    reconciliation = arg3;
  } else {
    reference = arg1;
    reconciliation = {
      status: arg2,
      channel: arg3,
      gatewayResponse: arg4
    };
    const payment = await getPaymentByReference(reference);
    orderNumber = payment ? payment.order_number : null;
  }

  const status = reconciliation.status;
  const channel = reconciliation.channel || null;
  const gatewayResponse = reconciliation.gatewayResponse || null;

  await updatePaymentStatus(reference, status, channel, JSON.stringify({ gatewayResponse }));

  if (orderNumber) {
    if (status === 'paid' || status === 'success') {
      await Order.findOneAndUpdate(
        { order_number: orderNumber },
        { payment_status: 'paid', order_status: 'processing', updated_at: new Date() }
      );
    } else if (status === 'failed') {
      await Order.findOneAndUpdate(
        { order_number: orderNumber },
        { payment_status: 'failed', updated_at: new Date() }
      );
    }
    return getOrderByNumber(orderNumber);
  }

  return null;
}

// --- WARRANTIES ---
async function createWarrantyRecord({
  warrantyCode = null,
  orderNumber = null,
  productName,
  productCategory = 'Solar Equipment',
  productSku = null,
  serialNumber,
  customerName,
  customerPhone,
  customerEmail = null,
  installationAddress = '',
  warrantyYears = null,
  warrantyDurationMonths = null,
  coverageSummary = 'Full parts replacement and tier-1 manufacturer warranty coverage',
  startDate = null,
  endDate = null,
  status = 'active',
  qrCodeData = null
}) {
  if (!serialNumber || !productName || !customerName || !customerPhone) {
    throw new Error('Serial number, product name, customer name, and phone are required.');
  }

  const code = warrantyCode || ('DP-WRN-' + crypto.randomBytes(3).toString('hex').toUpperCase());
  const years = warrantyYears || (warrantyDurationMonths ? Math.round(warrantyDurationMonths / 12) : 5);
  const durationMonths = warrantyDurationMonths || (years * 12);
  const start = startDate || new Date().toISOString().split('T')[0];
  let end = endDate;
  if (!end) {
    const sDate = new Date(start);
    sDate.setFullYear(sDate.getFullYear() + Number(years));
    end = sDate.toISOString().split('T')[0];
  }

  const maxDoc = await Warranty.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const warranty = new Warranty({
    id,
    order_number: orderNumber || '',
    serial_number: serialNumber,
    warranty_code: code,
    product_name: productName,
    product_category: productCategory,
    product_sku: productSku || '',
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    installation_address: installationAddress,
    start_date: start,
    end_date: end,
    expiry_date: end,
    warranty_duration_months: durationMonths,
    warranty_years: years,
    coverage_summary: coverageSummary,
    status,
    qr_code_data: qrCodeData || `DEVICE_PRO_WARRANTY:${code}:${serialNumber}`
  });
  await warranty.save();
  return warranty.toObject();
}

async function getWarrantyBySerialOrCode(query) {
  return Warranty.findOne({
    $or: [{ serial_number: query }, { warranty_code: query }]
  }).lean();
}

async function getWarrantiesByOrder(orderNumber) {
  return Warranty.find({ order_number: orderNumber }).sort({ id: -1 }).lean();
}

async function getWarranties({ limit = 50, offset = 0, status = null } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const warranties = await Warranty.find(filter).sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await Warranty.countDocuments(filter);
  return { warranties, total };
}

// --- SUPPORT TICKETS ---
async function createSupportTicket({
  orderNumber = '', serialNumber = '', customerName, customerPhone,
  customerEmail = '', issueCategory, priority = 'medium', subject = '', description
}) {
  const ticketNumber = 'DP-SPT-' + Math.floor(100000 + Math.random() * 900000);
  const maxDoc = await SupportTicket.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const ticket = new SupportTicket({
    id,
    ticket_number: ticketNumber,
    order_number: orderNumber,
    serial_number: serialNumber,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    issue_category: issueCategory,
    priority,
    subject: subject || 'Equipment Support',
    description
  });
  await ticket.save();
  const obj = ticket.toObject();
  obj.ticketNumber = ticketNumber;
  return obj;
}

async function getSupportTickets({ limit = 50, offset = 0, status = null } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const tickets = await SupportTicket.find(filter).sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await SupportTicket.countDocuments(filter);
  return { tickets, total };
}

async function getSupportTicketByNumber(ticketNumber) {
  return SupportTicket.findOne({ ticket_number: ticketNumber }).lean();
}

async function getSupportTicketsByOrder(orderNumber) {
  return SupportTicket.find({ order_number: orderNumber }).sort({ id: -1 }).lean();
}

async function updateSupportTicketStatus(id, optionsOrStatus, assignedTechnician = null, resolutionNotes = null, adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const updateData = { updated_at: new Date() };

  if (typeof optionsOrStatus === 'object' && optionsOrStatus !== null) {
    const { status, priority, assignedEngineer, assignedTechnician: tech, resolutionNotes: notes } = optionsOrStatus;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedEngineer || tech) {
      updateData.assigned_engineer = assignedEngineer || tech;
      updateData.assigned_technician = assignedEngineer || tech;
    }
    if (notes) {
      updateData.resolution_notes = notes;
      if (status === 'resolved' || status === 'closed') updateData.resolved_at = new Date();
    }
  } else {
    updateData.status = optionsOrStatus;
    if (assignedTechnician) {
      updateData.assigned_technician = assignedTechnician;
      updateData.assigned_engineer = assignedTechnician;
    }
    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
      if (optionsOrStatus === 'resolved' || optionsOrStatus === 'closed') updateData.resolved_at = new Date();
    }
  }

  return SupportTicket.findOneAndUpdate(filter, updateData, { returnDocument: 'after' }).lean();
}

// --- AUTHENTICATION & SESSIONS ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    if (!password || !hash || !salt) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (e) {
    return false;
  }
}

async function getUserByUsername(username) {
  if (!username) return null;
  return User.findOne({ username }).lean();
}

async function getUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  const normalized = trimmed.toLowerCase();
  return User.findOne({
    $or: [
      { email: trimmed },
      { email: normalized },
      { normalized_email: normalized },
      { username: trimmed },
      { username: normalized }
    ]
  }).lean();
}

async function getUserByGoogleSubject(googleSubject) {
  if (!googleSubject) return null;
  return User.findOne({ google_subject: googleSubject }).lean();
}

async function getUserById(id) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const user = await User.findOne(filter).select('-password_hash -salt').lean();
  if (!user) return null;
  return {
    id: user.id || user._id,
    username: user.username,
    email: user.email,
    normalizedEmail: user.normalized_email,
    phone: user.phone,
    fullName: user.full_name,
    role: user.role,
    googleSubject: user.google_subject,
    emailVerified: user.email_verified,
    createdAt: user.created_at
  };
}

async function createUser({
  fullName,
  email,
  phone = null,
  password = null,
  googleSubject = null,
  google_subject = null,
  emailVerified = false,
  role = 'customer'
}) {
  if (!fullName || typeof fullName !== 'string') {
    throw new Error('Full name is required.');
  }
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email address is required.');
  }
  const trimmedEmail = email.trim();
  const normalizedEmail = trimmedEmail.toLowerCase();

  // Enforce customer role for public registration
  const safeRole = role === 'customer' ? 'customer' : 'customer';

  // Check duplicate email
  const existing = await User.findOne({
    $or: [{ email: trimmedEmail }, { normalized_email: normalizedEmail }, { username: normalizedEmail }]
  }).lean();

  if (existing) {
    const err = new Error('An account with this email address already exists.');
    err.code = 'DUPLICATE_EMAIL';
    throw err;
  }

  let passwordHash = null;
  let salt = null;
  if (password) {
    const hashed = hashPassword(password);
    passwordHash = hashed.hash;
    salt = hashed.salt;
  }

  const maxDoc = await User.findOne().sort({ id: -1 }).select('id').lean();
  const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;

  const user = new User({
    id,
    username: normalizedEmail,
    email: trimmedEmail,
    normalized_email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    password_hash: passwordHash,
    salt,
    full_name: fullName.trim(),
    role: safeRole,
    google_subject: googleSubject || google_subject || null,
    email_verified: Boolean(emailVerified)
  });

  await user.save();

  await logAudit({
    userId: id,
    action: 'CREATE_USER',
    entityType: 'user',
    entityId: id.toString(),
    details: `User registered: ${fullName} (${normalizedEmail}) - Role: ${safeRole}`
  });

  return {
    id: user.id || user._id,
    username: user.username,
    email: user.email,
    normalizedEmail: user.normalized_email,
    phone: user.phone,
    fullName: user.full_name,
    role: user.role,
    googleSubject: user.google_subject,
    emailVerified: user.email_verified,
    createdAt: user.created_at
  };
}

async function linkGoogleAccount(userId, googleSubject) {
  const filter = typeof userId === 'number' || !isNaN(userId) ? { id: Number(userId) } : { _id: userId };
  const updated = await User.findOneAndUpdate(
    filter,
    { google_subject: googleSubject, email_verified: true, updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean();

  await logAudit({
    userId,
    action: 'LINK_GOOGLE_ACCOUNT',
    entityType: 'user',
    entityId: userId.toString(),
    details: `Google account linked with subject ID ${googleSubject}`
  });

  return updated;
}

async function verifyUserLogin(username, password) {
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return null;
  }
  const clean = username.trim();
  const normalized = clean.toLowerCase();
  const user = await User.findOne({
    $or: [
      { username: clean },
      { username: normalized },
      { email: clean },
      { email: normalized },
      { normalized_email: normalized }
    ]
  }).lean();
  if (!user || !user.password_hash || !user.salt) return null;

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) return null;

  // Update last_login
  User.updateOne({ _id: user._id }, { $set: { last_login: new Date() } }).exec();

  return {
    id: user.id || user._id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    phone: user.phone || null,
    emailVerified: Boolean(user.email_verified)
  };
}

async function createPasswordResetToken(email) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const filter = typeof user.id === 'number' || !isNaN(user.id) ? { id: Number(user.id) } : { _id: user._id };
  await User.updateOne(filter, {
    reset_token_hash: tokenHash,
    reset_token_expires: expiresAt,
    updated_at: new Date()
  });

  await logAudit({
    userId: user.id || null,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'user',
    entityId: (user.id || user._id).toString(),
    details: `Password reset token generated for ${user.email}`
  });

  return {
    rawToken,
    email: user.email,
    fullName: user.full_name,
    expiresAt
  };
}

async function resetPasswordWithToken(rawToken, newPassword) {
  if (!rawToken || typeof rawToken !== 'string' || !newPassword || typeof newPassword !== 'string') {
    throw new Error('Valid token and password are required.');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    reset_token_hash: tokenHash,
    reset_token_expires: { $gt: new Date() }
  });

  if (!user) {
    throw new Error('Invalid or expired password reset token.');
  }

  const { hash, salt } = hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  user.reset_token_hash = null;
  user.reset_token_expires = null;
  await user.save();

  // Invalidate all existing sessions
  await Session.deleteMany({ user_id: user.id });

  await logAudit({
    userId: user.id,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'user',
    entityId: user.id.toString(),
    details: `Password successfully reset for ${user.email}. All sessions invalidated.`
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name
  };
}

async function updateUserProfile(userId, { fullName, phone = null } = {}) {
  const filter = typeof userId === 'number' || !isNaN(userId) ? { id: Number(userId) } : { _id: userId };
  const updateData = { updated_at: new Date() };
  if (fullName && typeof fullName === 'string') {
    updateData.full_name = fullName.trim();
  }
  if (phone !== undefined) {
    updateData.phone = phone ? phone.trim() : null;
  }

  const updated = await User.findOneAndUpdate(filter, { $set: updateData }, { returnDocument: 'after' }).lean();
  if (!updated) return null;

  await logAudit({
    userId,
    action: 'UPDATE_PROFILE',
    entityType: 'user',
    entityId: userId.toString(),
    details: `Profile updated for ${updated.email}`
  });

  return {
    id: updated.id || updated._id,
    username: updated.username,
    email: updated.email,
    normalizedEmail: updated.normalized_email,
    phone: updated.phone || null,
    fullName: updated.full_name,
    role: updated.role,
    googleSubject: updated.google_subject,
    emailVerified: Boolean(updated.email_verified),
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
}

async function changeUserPassword(userId, currentPassword, newPassword) {
  const filter = typeof userId === 'number' || !isNaN(userId) ? { id: Number(userId) } : { _id: userId };
  const user = await User.findOne(filter);
  if (!user) {
    throw new Error('User account not found.');
  }

  if (!user.password_hash || !user.salt) {
    const err = new Error('This account was created with Google Sign-In and does not support password login.');
    err.code = 'OAUTH_ACCOUNT_NO_PASSWORD';
    throw err;
  }

  const isValid = verifyPassword(currentPassword, user.password_hash, user.salt);
  if (!isValid) {
    const err = new Error('The current password provided is incorrect.');
    err.code = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  const { hash, salt } = hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  user.updated_at = new Date();
  await user.save();

  await logAudit({
    userId,
    action: 'CHANGE_PASSWORD',
    entityType: 'user',
    entityId: userId.toString(),
    details: `Password changed successfully for ${user.email}`
  });

  return { success: true };
}

/**
 * Stage 20: 6-Digit Email Verification Code System
 */
async function createVerificationCode(email, rawCode, durationMinutes = 10) {
  if (!email || typeof email !== 'string') return { status: 'INVALID_EMAIL' };
  const normalizedEmail = email.trim().toLowerCase();

  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    return { status: 'NOT_FOUND', email: normalizedEmail };
  }

  // Google-Only Account Check (Step 7)
  const isGoogleOnly = Boolean(user.google_subject && (!user.password_hash || user.password_hash === ''));
  if (isGoogleOnly) {
    return { status: 'GOOGLE_ONLY', user, email: normalizedEmail };
  }

  // Check resend cooldown on active pending requests (60 seconds)
  const activeRecord = await PasswordReset.findOne({
    email: normalizedEmail,
    used: false,
    expires_at: { $gt: new Date() }
  }).sort({ created_at: -1 });

  if (activeRecord && activeRecord.resend_available_at > new Date()) {
    const secondsRemaining = Math.max(1, Math.ceil((activeRecord.resend_available_at.getTime() - Date.now()) / 1000));
    return { status: 'COOLDOWN_ACTIVE', secondsRemaining, email: normalizedEmail, user };
  }

  // Invalidate any existing unused records for this email
  await PasswordReset.updateMany({ email: normalizedEmail, used: false }, { $set: { used: true } });

  // Hash code with random salt
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = crypto.createHash('sha256').update(rawCode + salt).digest('hex');
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const resendAvailableAt = new Date(Date.now() + 60 * 1000);

  const resetDoc = new PasswordReset({
    email: normalizedEmail,
    user_id: user.id || null,
    code_hash: codeHash,
    code_salt: salt,
    attempts: 0,
    max_attempts: 5,
    expires_at: expiresAt,
    resend_available_at: resendAvailableAt,
    used: false
  });

  await resetDoc.save();

  await logAudit({
    userId: user.id || null,
    action: 'VERIFICATION_CODE_GENERATED',
    entityType: 'user',
    entityId: (user.id || user._id).toString(),
    details: `Verification code generated for ${normalizedEmail}. Expires in ${durationMinutes} minutes.`
  });

  return {
    status: 'CODE_CREATED',
    user,
    email: normalizedEmail,
    expiresAt
  };
}

async function verifyResetCode(email, rawCode) {
  if (!email || !rawCode || typeof email !== 'string' || typeof rawCode !== 'string') {
    return { success: false, error: 'Valid email and 6-digit code are required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = rawCode.trim();

  // Find latest code record for this email
  const record = await PasswordReset.findOne({
    email: normalizedEmail
  }).sort({ created_at: -1 });

  if (!record) {
    return { success: false, error: 'Invalid or expired verification code. Please request a new one.' };
  }

  // Max 5 attempts check (lockout takes precedence)
  if (record.attempts >= record.max_attempts) {
    record.used = true;
    await record.save();
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. For your security, this code has been deactivated. Please request a new code.',
      lockedOut: true,
      attemptsRemaining: 0
    };
  }

  // Single-use check: if already used
  if (record.used) {
    return { success: false, error: 'This verification code has already been used. Please request a new code.' };
  }

  // Explicit expiry check on every request
  if (new Date() > new Date(record.expires_at)) {
    record.used = true;
    await record.save();
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Timing-safe code comparison
  const calculatedHash = crypto.createHash('sha256').update(cleanCode + record.code_salt).digest('hex');
  let isMatch = false;
  try {
    isMatch = crypto.timingSafeEqual(Buffer.from(record.code_hash, 'hex'), Buffer.from(calculatedHash, 'hex'));
  } catch (e) {
    isMatch = false;
  }

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const attemptsLeft = Math.max(0, record.max_attempts - record.attempts);
    if (attemptsLeft === 0) {
      record.used = true;
      await record.save();
      return {
        success: false,
        error: 'Too many incorrect attempts. This verification code has been invalidated for security. Please request a new code.',
        lockedOut: true,
        attemptsRemaining: 0
      };
    }
    return {
      success: false,
      error: `Incorrect verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      attemptsRemaining: attemptsLeft
    };
  }

  // Code verified! Issue single-use 15-minute reset authorization token
  const rawResetAuthToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawResetAuthToken).digest('hex');
  const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  record.used = true;
  record.reset_token_hash = resetTokenHash;
  record.reset_token_expires_at = tokenExpiresAt;
  await record.save();

  await logAudit({
    userId: record.user_id,
    action: 'VERIFICATION_CODE_VERIFIED',
    entityType: 'user',
    entityId: record.user_id ? record.user_id.toString() : 'unknown',
    details: `Verification code successfully verified for ${normalizedEmail}. Reset authorization token issued.`
  });

  return {
    success: true,
    resetToken: rawResetAuthToken,
    message: 'Verification code confirmed. You may now reset your password.'
  };
}

async function executePasswordReset(resetAuthToken, newPassword) {
  if (!resetAuthToken || typeof resetAuthToken !== 'string' || !newPassword || typeof newPassword !== 'string') {
    throw new Error('Reset authorization token and new password are required.');
  }

  const tokenHash = crypto.createHash('sha256').update(resetAuthToken.trim()).digest('hex');
  
  const record = await PasswordReset.findOne({
    reset_token_hash: tokenHash,
    reset_token_expires_at: { $gt: new Date() }
  });

  if (!record) {
    // Check legacy user table for backwards compatibility
    const legacyUser = await User.findOne({
      reset_token_hash: tokenHash,
      reset_token_expires: { $gt: new Date() }
    });
    if (legacyUser) {
      return resetPasswordWithToken(resetAuthToken, newPassword);
    }
    throw new Error('Invalid or expired password reset authorization. Please start over.');
  }

  const user = await User.findOne({
    $or: [
      { email: record.email },
      { normalized_email: record.email },
      { id: record.user_id }
    ]
  });

  if (!user) {
    throw new Error('Associated account could not be found.');
  }

  // Hash new password using scrypt
  const { hash, salt } = hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  user.reset_token_hash = null;
  user.reset_token_expires = null;
  await user.save();

  // Invalidate authorization token after single use
  record.reset_token_hash = null;
  record.reset_token_expires_at = null;
  await record.save();

  // Invalidate all active sessions for this user across all devices
  await Session.deleteMany({ user_id: user.id });

  await logAudit({
    userId: user.id,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'user',
    entityId: user.id.toString(),
    details: `Password reset successfully completed for ${user.email} using verified code authorization.`
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name
  };
}

async function createSession(userId, durationDays = 7, { ipAddress = '', userAgent = '' } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const numericUserId = Number(userId) || 1;
  const session = new Session({
    token_hash: tokenHash,
    user_id: numericUserId,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });
  await session.save();
  return { token, expiresAt: expiresAt.toISOString() };
}

async function getSessionUser(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

  const session = await Session.findOne({
    $or: [
      { token_hash: tokenHash },
      { token: cleanToken }
    ]
  }).lean();
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await revokeSession(cleanToken);
    return null;
  }

  const user = await User.findOne({
    $or: [
      { id: Number(session.user_id) },
      { id: session.user_id }
    ]
  }).lean();
  if (!user) return null;

  return {
    id: user.id || user._id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    phone: user.phone || null,
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
    hasPassword: Boolean(user.password_hash),
    authMethod: user.google_subject && !user.password_hash ? 'google' : (user.google_subject ? 'google_and_password' : 'password')
  };
}

async function revokeSession(token) {
  if (!token || typeof token !== 'string') return;
  const cleanToken = token.trim();
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  return Session.deleteMany({
    $or: [
      { token_hash: tokenHash },
      { token: cleanToken }
    ]
  });
}

// --- AUDIT LOGGING ---
async function logAudit({ userId = null, action, entityType, entityId = '', details = '', ipAddress = '', metadata = {}, session = null, throwOnError = false }) {
  try {
    const query = AuditLog.findOne().sort({ id: -1 }).select('id').lean();
    if (session) query.session(session);
    const maxDoc = await query;
    const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    const log = new AuditLog({
      id,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      metadata: metadata || {}
    });
    await log.save(session ? { session } : {});
    return log;
  } catch (e) {
    console.error('[AUDIT LOG MONGO ERROR]:', e.message);
    if (throwOnError || session) {
      throw e;
    }
  }
}

async function getAuditLogs({ limit = 50, offset = 0 } = {}) {
  const logs = await AuditLog.find().sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await AuditLog.countDocuments();
  return { logs, total };
}

// --- STAGE 5: SUPPLIER PRICE IMPORT INFRASTRUCTURE ---

async function createPriceImport(importData) {
  const maxDoc = await PriceImport.findOne().sort({ id: -1 }).select('id').lean();
  const nextId = (maxDoc && maxDoc.id) ? maxDoc.id + 1 : 1;
  const filename = importData.filename || importData.original_filename || 'supplier_prices.xlsx';
  const importIdStr = importData.import_id || `IMP-${Date.now().toString().slice(-6)}-${nextId}`;

  const doc = new PriceImport({
    ...importData,
    id: importData.id || nextId,
    import_id: importIdStr,
    filename: filename,
    original_filename: filename,
    file_size_bytes: importData.file_size_bytes || 0,
    status: 'analysed' // Stage 5 restriction: Never auto-applied
  });
  await doc.save();
  const obj = doc.toObject();
  obj.id = obj.id || nextId;
  return obj;
}

async function getPriceImports({ page = 1, limit = 20, status = '', format = '', search = '' } = {}) {
  const query = {};
  if (status) {
    query.status = status;
  }
  if (format) {
    query.file_format = format.toLowerCase();
  }
  if (search && typeof search === 'string') {
    const safeRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { filename: safeRegex },
      { supplier_name: safeRegex },
      { uploaded_by_email: safeRegex }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [imports, total] = await Promise.all([
    PriceImport.find(query)
      .select('-rows_preview')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    PriceImport.countDocuments(query)
  ]);

  return {
    imports,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1
  };
}

async function getPriceImportById(id) {
  if (!id) return null;
  let query = null;
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
    query = { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] };
  } else if (!isNaN(id)) {
    query = { id: Number(id) };
  } else {
    return null;
  }
  return PriceImport.findOne(query).lean();
}

async function deletePriceImport(id) {
  if (!id) return false;
  let query = null;
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
    query = { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] };
  } else if (!isNaN(id)) {
    query = { id: Number(id) };
  } else {
    return false;
  }
  const res = await PriceImport.deleteOne(query);
  return res.deletedCount > 0;
}

// --- STAGE 6: SUPPLIER PRICE REVIEW, APPROVAL & CONTROLLED APPLICATION ---

async function reviewPriceImport(id, user = {}) {
  if (!id) return null;
  const query = (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id))
    ? { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] }
    : (!isNaN(id) ? { id: Number(id) } : null);

  if (!query) return null;
  const importDoc = await PriceImport.findOne(query);
  if (!importDoc) return null;

  if (importDoc.status === 'cancelled') {
    const err = new Error('Cannot review a cancelled price import.');
    err.statusCode = 400;
    throw err;
  }

  // Load active products from MongoDB Atlas
  const activeProducts = await Product.find({ published: 1 }).lean();
  const { preparePriceImportForReview } = require('../../lib/price-import-engine');
  const reviewData = preparePriceImportForReview(importDoc, activeProducts);

  importDoc.rows_preview = reviewData.rows;
  importDoc.summary.eligible_for_approval_rows = reviewData.summaryMetrics.eligible_for_approval_rows;
  importDoc.summary.high_variance_rows = reviewData.summaryMetrics.high_variance_rows;

  // Transition from 'analysed' to 'awaiting_approval'
  if (importDoc.status === 'analysed') {
    importDoc.status = 'awaiting_approval';
    importDoc.reviewed_by = user.id || null;
    importDoc.reviewed_by_email = user.email || '';
    importDoc.reviewed_at = new Date();

    await logAudit({
      userId: user.id || null,
      action: 'SUBMIT_PRICE_IMPORT_REVIEW',
      entityType: 'price_import',
      entityId: String(importDoc.id || importDoc._id),
      details: `Opened supplier price import review for "${importDoc.filename}". Eligible for approval: ${reviewData.summaryMetrics.eligible_for_approval_rows} rows. High variance (>30%): ${reviewData.summaryMetrics.high_variance_rows} rows.`,
      ipAddress: user.ip || ''
    });
  }

  await importDoc.save();
  return importDoc.toObject();
}

async function approvePriceImportRows(id, { approvedRowNumbers = [], acknowledgeHighVariance = false, notes = '', user = {} } = {}) {
  if (!id) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }
  const query = (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id))
    ? { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] }
    : (!isNaN(id) ? { id: Number(id) } : null);

  if (!query) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }

  const importDoc = await PriceImport.findOne(query);
  if (!importDoc) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Lifecycle state checks
  if (importDoc.status === 'successfully_applied') {
    const err = new Error('Import has already been applied. Completed imports cannot be approved again.');
    err.statusCode = 400;
    throw err;
  }
  if (importDoc.status === 'cancelled') {
    const err = new Error('Cannot approve a cancelled price import.');
    err.statusCode = 400;
    throw err;
  }
  if (importDoc.status === 'applying') {
    const err = new Error('Import application is currently in progress.');
    err.statusCode = 409;
    throw err;
  }

  if (!Array.isArray(approvedRowNumbers) || approvedRowNumbers.length === 0) {
    const err = new Error('Please select at least one eligible row to approve.');
    err.statusCode = 400;
    throw err;
  }

  // Refresh review state against current catalog before checking
  const activeProducts = await Product.find({ published: 1 }).lean();
  const { preparePriceImportForReview } = require('../../lib/price-import-engine');
  const reviewData = preparePriceImportForReview(importDoc, activeProducts);
  importDoc.rows_preview = reviewData.rows;

  // Validate every selected row
  const selectedRows = [];
  const highVarianceRows = [];

  const targetIdentifiers = approvedRowNumbers.map(String);

  for (const idOrNum of approvedRowNumbers) {
    const row = importDoc.rows_preview.find(r => r.row_number === Number(idOrNum) || String(r.row_number) === String(idOrNum) || (r._id && String(r._id) === String(idOrNum)));
    if (!row) {
      const err = new Error(`Row #${idOrNum} does not belong to this price import.`);
      err.statusCode = 400;
      throw err;
    }
    if (!row.is_eligible_for_approval) {
      const reason = row.validation_errors && row.validation_errors.length > 0
        ? row.validation_errors.join(', ')
        : (row.status || 'ineligible');
      const err = new Error(`Row #${idOrNum} (${row.raw_sku || 'No SKU'}) is not eligible for approval (${reason}). Only valid, matched active products can be approved.`);
      err.statusCode = 400;
      throw err;
    }

    if (row.variance_warning && row.variance_warning !== 'NONE') {
      highVarianceRows.push({
        rowNumber: row.row_number,
        sku: row.matched_product_sku,
        currentCost: row.matched_current_cost_ngn,
        proposedCost: row.normalized_cost_ngn,
        diffPercent: row.cost_diff_percent,
        warning: row.variance_warning
      });
    }

    selectedRows.push(row);
  }

  // Require explicit acknowledgement for high variance warnings
  if (highVarianceRows.length > 0 && !acknowledgeHighVariance) {
    const err = new Error(`High variance (> 30%) detected on ${highVarianceRows.length} selected row(s). Explicit acknowledgement is required.`);
    err.statusCode = 400;
    err.highVariance = true;
    err.highVarianceRows = highVarianceRows;
    throw err;
  }

  // Apply row approval markings
  let approvedCount = 0;
  importDoc.rows_preview.forEach(row => {
    const isSelected = targetIdentifiers.includes(String(row.row_number)) || (row._id && targetIdentifiers.includes(String(row._id)));
    if (isSelected && row.is_eligible_for_approval) {
      row.approval_status = 'approved';
      row.approved_cost_ngn = row.normalized_cost_ngn;
      row.approved_previous_cost_ngn = row.matched_current_cost_ngn;
      row.approved_at = new Date();
      row.approved_by_email = user.email || '';
      approvedCount++;
    } else {
      if (row.approval_status === 'approved') {
        // Unselecting a previously approved row
        row.approval_status = row.is_eligible_for_approval ? 'unapproved' : 'ineligible';
        row.approved_cost_ngn = null;
        row.approved_previous_cost_ngn = null;
      }
    }
  });

  importDoc.status = 'approved_for_application';
  importDoc.approved_by = user.id || null;
  importDoc.approved_by_email = user.email || '';
  importDoc.approved_by_role = user.role || 'admin';
  importDoc.approved_at = new Date();
  importDoc.approved_row_count = approvedCount;
  importDoc.approval_notes = notes ? String(notes).slice(0, 500) : '';
  importDoc.summary.approved_rows = approvedCount;

  await importDoc.save();

  await logAudit({
    userId: user.id || null,
    action: 'APPROVE_PRICE_IMPORT',
    entityType: 'price_import',
    entityId: String(importDoc.id || importDoc._id),
    details: `Approved ${approvedCount} supplier price rows for "${importDoc.filename}". Actor: ${user.email || 'admin'} (${user.role || 'admin'}). No live product prices or costs were modified during approval.`,
    ipAddress: user.ip || '',
    metadata: {
      import_id: String(importDoc.id || importDoc._id),
      filename: importDoc.filename,
      approved_count: approvedCount,
      actor_id: user.id || null,
      actor_email: user.email || '',
      actor_role: user.role || 'admin',
      acknowledged_high_variance: Boolean(acknowledgeHighVariance)
    }
  });

  return importDoc.toObject();
}

async function applyPriceImport(id, user = {}, options = {}) {
  if (!id) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }
  const query = (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id))
    ? { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] }
    : (!isNaN(id) ? { id: Number(id) } : null);

  if (!query) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Support recovering interrupted or dead application lock (> 5 mins inactivity or explicit recoverInterrupted)
  const isExplicitRecovery = options && options.recoverInterrupted === true;
  const staleLockThreshold = new Date(Date.now() - 5 * 60 * 1000);

  const allowedStatuses = ['approved_for_application', 'partially_applied', 'failed'];
  const statusConditions = [{ status: { $in: allowedStatuses } }];
  if (isExplicitRecovery) {
    statusConditions.push({ status: 'applying' });
  } else {
    statusConditions.push({ status: 'applying', updated_at: { $lt: staleLockThreshold } });
  }

  // Preserve query identifier (which has $or for _id / numeric id) using $and
  const lockQuery = {
    $and: [
      query,
      { $or: statusConditions }
    ]
  };

  // Atomic state transition to prevent concurrent application runs
  const importDoc = await PriceImport.findOneAndUpdate(
    lockQuery,
    { $set: { status: 'applying', updated_at: new Date() } },
    { returnDocument: 'after' }
  );

  if (!importDoc) {
    const existing = await PriceImport.findOne(query).lean();
    if (!existing) {
      const err = new Error('Price import record not found.');
      err.statusCode = 404;
      throw err;
    }
    if (existing.status === 'applying') {
      const err = new Error('Import application is currently in progress by another request.');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === 'successfully_applied') {
      const err = new Error('Import has already been successfully applied. Completed imports cannot be applied again.');
      err.statusCode = 400;
      throw err;
    }
    if (existing.status === 'cancelled') {
      const err = new Error('Cancelled imports cannot be applied.');
      err.statusCode = 400;
      throw err;
    }
    const err = new Error(`Import must be approved before application. Current status is "${existing.status}".`);
    err.statusCode = 400;
    throw err;
  }

  // Validate all user-supplied row identifiers before processing
  if (options && Array.isArray(options.rowIds) && options.rowIds.length > 0) {
    for (const rid of options.rowIds) {
      const r = importDoc.rows_preview.find(x => String(x.row_number) === String(rid) || (x._id && String(x._id) === String(rid)));
      if (!r) {
        importDoc.status = 'approved_for_application';
        await importDoc.save();
        const err = new Error(`Row #${rid} does not belong to this price import.`);
        err.statusCode = 400;
        throw err;
      }
      if (r.approval_status !== 'approved') {
        importDoc.status = 'approved_for_application';
        await importDoc.save();
        const err = new Error(`Row #${rid} has not been approved and cannot be applied.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  let pendingRows = importDoc.rows_preview.filter(r => r.approval_status === 'approved' && r.application_status !== 'applied');
  if (options && Array.isArray(options.rowIds) && options.rowIds.length > 0) {
    const filterIds = options.rowIds.map(String);
    pendingRows = pendingRows.filter(r => filterIds.includes(String(r.row_number)) || (r._id && filterIds.includes(String(r._id))));
  }

  if (pendingRows.length === 0) {
    const totalApproved = importDoc.rows_preview.filter(r => r.approval_status === 'approved').length;
    const totalApplied = importDoc.rows_preview.filter(r => r.application_status === 'applied').length;
    if (totalApplied === totalApproved && totalApproved > 0) {
      importDoc.status = 'successfully_applied';
      await importDoc.save();
      const err = new Error('All approved rows for this import have already been applied.');
      err.statusCode = 400;
      throw err;
    }
    importDoc.status = 'approved_for_application';
    await importDoc.save();
    const err = new Error('No pending approved rows found to apply.');
    err.statusCode = 400;
    throw err;
  }

  const { normalizeSku } = require('../../lib/price-import-engine');
  let appliedCount = 0;
  let failedCount = 0;
  const appliedRowsList = [];
  const failedRowsList = [];

  for (const row of pendingRows) {
    try {
      // 1. Validate approved monetary amount
      const newCost = Math.round(Number(row.approved_cost_ngn));
      if (isNaN(newCost) || newCost <= 0 || !Number.isSafeInteger(newCost)) {
        row.application_status = 'failed';
        row.application_error = `Invalid approved price value "${row.approved_cost_ngn}". Price must be a positive finite integer.`;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 2. Tampering safeguard: Ensure approved value matches proposed value
      if (row.approved_cost_ngn !== row.normalized_cost_ngn) {
        row.application_status = 'failed';
        row.application_error = 'Approved price does not match proposed price in file (possible tampering).';
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 3. Currency validation
      if ((row.currency || 'NGN').toUpperCase() !== 'NGN') {
        row.application_status = 'failed';
        row.application_error = `Unsupported currency "${row.currency}". Only NGN is supported.`;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 4. Find product in catalog
      const prodQuery = (mongoose.Types.ObjectId.isValid(row.matched_product_id) && String(new mongoose.Types.ObjectId(row.matched_product_id)) === String(row.matched_product_id))
        ? { $or: [{ _id: row.matched_product_id }, { id: isNaN(row.matched_product_id) ? -1 : Number(row.matched_product_id) }] }
        : { id: Number(row.matched_product_id) };

      const prod = await Product.findOne(prodQuery);

      if (!prod) {
        row.application_status = 'failed';
        row.application_error = 'Referenced product no longer exists in catalog.';
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 5. Safeguard: archived products must NEVER be modified
      if (prod.published !== 1) {
        row.application_status = 'failed';
        row.application_error = `Product "${prod.name}" (SKU: ${prod.sku}) is archived. Archived products cannot be modified.`;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 6. Safeguard: SKU match verification
      if (normalizeSku(prod.sku) !== normalizeSku(row.matched_product_sku)) {
        row.application_status = 'failed';
        row.application_error = `Product SKU in catalog ("${prod.sku}") no longer matches approved SKU ("${row.matched_product_sku}").`;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 7. Safeguard: Catalog baseline cost conflict detection
      const previousCost = prod.cost_price_ngn !== undefined ? prod.cost_price_ngn : (prod.supplier_cost_ngn || 0);
      const baselineCost = row.approved_previous_cost_ngn !== null && row.approved_previous_cost_ngn !== undefined
        ? row.approved_previous_cost_ngn
        : row.matched_current_cost_ngn;

      if (baselineCost !== null && baselineCost !== undefined && previousCost !== baselineCost) {
        row.application_status = 'failed';
        row.application_error = `Catalog supplier cost has changed since approval (approval baseline was ₦${baselineCost.toLocaleString()}, current is ₦${previousCost.toLocaleString()}). Approval is stale.`;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: row.application_error });
        continue;
      }

      // 8. Execute transactional update: product update + audit record + row status persistence
      let session = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (sessErr) {
        session = null;
      }

      try {
        const opts = session ? { session } : {};

        // Apply price update to product based on updateTarget option
        const updateFields = { updated_at: new Date() };
        if (options && (options.updateTarget === 'retail_price' || options.updateTarget === 'selling_price')) {
          updateFields.price_ngn = newCost;
        } else if (options && options.updateTarget === 'both') {
          updateFields.price_ngn = newCost;
          updateFields.cost_price_ngn = newCost;
        } else {
          updateFields.cost_price_ngn = newCost;
        }

        await Product.updateOne(
          { _id: prod._id },
          { $set: updateFields },
          opts
        );

        // Required Audit record: If audit fails, transaction rolls back product update!
        await logAudit({
          userId: user.id || null,
          action: 'PRICE_IMPORT_APPLIED_ROW',
          entityType: 'product',
          entityId: String(prod.id || prod._id),
          details: `Updated supplier cost for SKU "${prod.sku}" from ₦${previousCost.toLocaleString()} to ₦${newCost.toLocaleString()} (Import: ${importDoc.filename || importDoc.import_id}, Row #${row.row_number}). Currency: NGN. Outcome: applied. Actor: ${user.email || 'admin'} (${user.role || 'admin'}). Retail selling price (₦${prod.price_ngn.toLocaleString()}) strictly unchanged.`,
          ipAddress: user.ip || '',
          metadata: {
            import_id: String(importDoc.id || importDoc._id),
            row_id: row.row_number,
            product_id: String(prod.id || prod._id),
            sku: prod.sku,
            previous_cost_ngn: previousCost,
            new_cost_ngn: newCost,
            currency: 'NGN',
            outcome: 'applied',
            actor_id: user.id || null,
            actor_role: user.role || 'admin',
            timestamp: new Date().toISOString()
          },
          session,
          throwOnError: true
        });

        // Persist row application status in PriceImport collection within the same transaction
        await PriceImport.updateOne(
          { _id: importDoc._id, 'rows_preview.row_number': row.row_number },
          {
            $set: {
              'rows_preview.$.application_status': 'applied',
              'rows_preview.$.applied_at': new Date(),
              'rows_preview.$.applied_previous_cost_ngn': previousCost,
              'rows_preview.$.application_error': ''
            }
          },
          opts
        );

        if (session) {
          await session.commitTransaction();
        }

        row.application_status = 'applied';
        row.applied_at = new Date();
        row.applied_previous_cost_ngn = previousCost;
        row.application_error = '';
        appliedCount++;
        appliedRowsList.push({ rowNumber: row.row_number, sku: prod.sku, previousCost, newCost });
      } catch (applyErr) {
        if (session) {
          await session.abortTransaction();
        }
        row.application_status = 'failed';
        row.application_error = applyErr.message;
        failedCount++;
        failedRowsList.push({ rowNumber: row.row_number, error: applyErr.message });

        try {
          await PriceImport.updateOne(
            { _id: importDoc._id, 'rows_preview.row_number': row.row_number },
            {
              $set: {
                'rows_preview.$.application_status': 'failed',
                'rows_preview.$.application_error': applyErr.message
              }
            }
          );
        } catch (e) {}
      } finally {
        if (session) {
          await session.endSession();
        }
      }
    } catch (rowErr) {
      row.application_status = 'failed';
      row.application_error = rowErr.message;
      failedCount++;
      failedRowsList.push({ rowNumber: row.row_number, error: rowErr.message });
    }
  }

  // Update import lifecycle status
  const totalApproved = importDoc.rows_preview.filter(r => r.approval_status === 'approved').length;
  const totalApplied = importDoc.rows_preview.filter(r => r.application_status === 'applied').length;

  if (totalApplied === totalApproved && failedCount === 0) {
    importDoc.status = 'successfully_applied';
  } else if (totalApplied > 0) {
    importDoc.status = 'partially_applied';
  } else {
    importDoc.status = 'failed';
  }

  importDoc.applied_by = user.id || null;
  importDoc.applied_by_email = user.email || '';
  importDoc.applied_by_role = user.role || 'admin';
  importDoc.applied_at = new Date();
  importDoc.applied_row_count = totalApplied;
  importDoc.failed_row_count = failedCount;
  importDoc.summary.applied_rows = totalApplied;
  importDoc.summary.failed_rows = failedCount;

  await importDoc.save();

  await logAudit({
    userId: user.id || null,
    action: 'APPLY_PRICE_IMPORT',
    entityType: 'price_import',
    entityId: String(importDoc.id || importDoc._id),
    details: `Applied supplier costs for import "${importDoc.filename}". Applied: ${appliedCount}, Failed: ${failedCount}. Status: ${importDoc.status}. Retail selling prices strictly untouched.`,
    ipAddress: user.ip || '',
    metadata: {
      import_id: String(importDoc.id || importDoc._id),
      filename: importDoc.filename,
      applied_count: appliedCount,
      failed_count: failedCount,
      total_applied: totalApplied,
      status: importDoc.status,
      actor_id: user.id || null,
      actor_role: user.role || 'admin'
    }
  });

  return {
    success: true,
    status: importDoc.status,
    appliedCount,
    failedCount,
    appliedRows: appliedRowsList,
    failedRows: failedRowsList,
    importRecord: importDoc.toObject(),
    notice: 'Supplier costs successfully applied to catalog. Retail selling prices and stock quantities were not changed.'
  };
}

async function cancelPriceImport(id, user = {}, reason = '') {
  if (!id) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }
  const query = (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id))
    ? { $or: [{ _id: id }, { id: isNaN(id) ? -1 : Number(id) }] }
    : (!isNaN(id) ? { id: Number(id) } : null);

  if (!query) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }

  const importDoc = await PriceImport.findOne(query);
  if (!importDoc) {
    const err = new Error('Price import record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (importDoc.status === 'successfully_applied') {
    const err = new Error('Cannot cancel an import that has already been successfully applied.');
    err.statusCode = 400;
    throw err;
  }
  if (importDoc.status === 'applying') {
    const err = new Error('Cannot cancel an import that is currently being applied.');
    err.statusCode = 409;
    throw err;
  }
  if (importDoc.status === 'cancelled') {
    const err = new Error('Price import is already cancelled.');
    err.statusCode = 400;
    throw err;
  }

  importDoc.status = 'cancelled';
  importDoc.cancelled_by = user.id || null;
  importDoc.cancelled_by_email = user.email || '';
  importDoc.cancelled_at = new Date();
  importDoc.cancellation_reason = reason ? String(reason).slice(0, 500) : 'Administrator cancelled.';

  await importDoc.save();

  await logAudit({
    userId: user.id || null,
    action: 'CANCEL_PRICE_IMPORT',
    entityType: 'price_import',
    entityId: String(importDoc.id || importDoc._id),
    details: `Cancelled supplier price import "${importDoc.filename}". Reason: ${importDoc.cancellation_reason}`,
    ipAddress: user.ip || '',
    metadata: {
      import_id: String(importDoc.id || importDoc._id),
      filename: importDoc.filename,
      reason: importDoc.cancellation_reason,
      actor_id: user.id || null,
      actor_role: user.role || 'admin'
    }
  });

  return { success: true, message: 'Price import cancelled successfully.' };
}


async function getDatabaseStats() {
  const [products, orders, quotes, enquiries, warranties, tickets, categories, caseStudies, users, sessions, auditLogs, payments] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    Quote.countDocuments(),
    Enquiry.countDocuments(),
    Warranty.countDocuments(),
    SupportTicket.countDocuments(),
    Category.countDocuments(),
    CaseStudy.countDocuments(),
    User.countDocuments(),
    Session.countDocuments(),
    AuditLog.countDocuments(),
    Payment.countDocuments()
  ]);
  const tables = {
    products,
    orders,
    quotes,
    enquiries,
    warranties,
    support_tickets: tickets,
    categories,
    case_studies: caseStudies,
    users,
    sessions,
    audit_logs: auditLogs,
    payments
  };
  return {
    engine: 'MongoDB Atlas',
    status: 'connected',
    tables,
    totalRecords: Object.values(tables).reduce((a, b) => a + b, 0),
    timestamp: new Date().toISOString()
  };
}

async function exportDatabaseBackup() {
  const stats = await getDatabaseStats();
  const fs = require('fs');
  const path = require('path');
  const backupsDir = path.join(__dirname, '..', '..', 'data', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-mongo-${timestamp}.json`;
  const backupFilePath = path.join(backupsDir, backupFileName);
  const backupData = {
    engine: 'MongoDB Atlas',
    counts: stats.tables,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  return {
    success: true,
    engine: 'MongoDB Atlas',
    backupFile: backupFilePath,
    sizeBytes: fs.statSync(backupFilePath).size,
    counts: stats.tables,
    timestamp: new Date().toISOString(),
    message: 'Atlas cluster provides continuous automated backups & point-in-time recovery.'
  };
}

// =========================================================================
// STAGE 7: PRICE INTELLIGENCE, MARGIN ANALYSIS & ADVISORY RECOMMENDATIONS
// =========================================================================

const {
  DEFAULT_SETTINGS: DEFAULT_PRICE_INTELLIGENCE_SETTINGS,
  calculateGrossProfit,
  calculateGrossMarginPercent,
  calculateMarkupPercent,
  calculateIndicativePrice,
  evaluateProductProfitability,
  calculateCatalogSummaryMetrics
} = require('../../lib/price-intelligence-engine');

function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getPriceIntelligenceSettings() {
  let settings = await PriceIntelligenceSettings.findOne({ key: 'default' }).lean();
  if (!settings) {
    try {
      settings = await PriceIntelligenceSettings.create({
        key: 'default',
        target_margin_percent: DEFAULT_PRICE_INTELLIGENCE_SETTINGS.target_margin_percent,
        warning_low_margin_threshold: DEFAULT_PRICE_INTELLIGENCE_SETTINGS.warning_low_margin_threshold,
        significant_cost_increase_percent: DEFAULT_PRICE_INTELLIGENCE_SETTINGS.significant_cost_increase_percent
      });
      if (settings.toObject) settings = settings.toObject();
    } catch (e) {
      settings = await PriceIntelligenceSettings.findOne({ key: 'default' }).lean() || DEFAULT_PRICE_INTELLIGENCE_SETTINGS;
    }
  }
  return {
    target_margin_percent: Number(settings.target_margin_percent) || 15.0,
    warning_low_margin_threshold: Number(settings.warning_low_margin_threshold) || 10.0,
    significant_cost_increase_percent: Number(settings.significant_cost_increase_percent) || 20.0,
    updated_at: settings.updated_at || null,
    updated_by_email: settings.updated_by_email || ''
  };
}

async function updatePriceIntelligenceSettings(updates = {}, user = null) {
  const {
    target_margin_percent,
    warning_low_margin_threshold,
    significant_cost_increase_percent
  } = updates;

  const updateFields = {};

  if (target_margin_percent !== undefined) {
    const val = Number(target_margin_percent);
    if (isNaN(val) || !Number.isFinite(val) || val <= 0 || val >= 100) {
      const err = new Error('Target gross margin percentage must be a number strictly between 0% and 100%.');
      err.statusCode = 400;
      throw err;
    }
    updateFields.target_margin_percent = Math.round(val * 100) / 100;
  }

  if (warning_low_margin_threshold !== undefined) {
    const val = Number(warning_low_margin_threshold);
    if (isNaN(val) || !Number.isFinite(val) || val <= 0 || val >= 100) {
      const err = new Error('Warning low margin threshold must be a number strictly between 0% and 100%.');
      err.statusCode = 400;
      throw err;
    }
    updateFields.warning_low_margin_threshold = Math.round(val * 100) / 100;
  }

  if (significant_cost_increase_percent !== undefined) {
    const val = Number(significant_cost_increase_percent);
    if (isNaN(val) || !Number.isFinite(val) || val <= 0 || val > 500) {
      const err = new Error('Significant cost increase threshold must be a positive number up to 500%.');
      err.statusCode = 400;
      throw err;
    }
    updateFields.significant_cost_increase_percent = Math.round(val * 100) / 100;
  }

  if (user) {
    updateFields.updated_by_email = user.email || '';
    updateFields.updated_by_role = user.role || '';
  }

  const updated = await PriceIntelligenceSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: updateFields },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    target_margin_percent: Number(updated.target_margin_percent),
    warning_low_margin_threshold: Number(updated.warning_low_margin_threshold),
    significant_cost_increase_percent: Number(updated.significant_cost_increase_percent),
    updated_at: updated.updated_at,
    updated_by_email: updated.updated_by_email
  };
}

async function getPriceIntelligenceProducts(options = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    category = '',
    brand = '',
    status = 'active',
    margin_filter = 'all',
    missing_cost = null,
    cost_increased = null,
    recommendation = '',
    sort = 'margin_asc'
  } = options;

  const settings = await getPriceIntelligenceSettings();
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);

  const query = {};

  if (status === 'archived') {
    query.published = 0;
  } else if (status === 'all') {
    // all products
  } else {
    // default: active commercial products (strictly published: 1, excluding benchmark records)
    query.published = 1;
  }

  if (category && category !== 'all') {
    query.category = String(category).trim().toLowerCase();
  }

  if (brand && brand !== 'all') {
    query.brand = new RegExp(`^${escapeRegex(String(brand).trim())}$`, 'i');
  }

  if (search && String(search).trim()) {
    const sRegex = new RegExp(escapeRegex(String(search).trim()), 'i');
    query.$or = [{ name: sRegex }, { sku: sRegex }, { brand: sRegex }];
  }

  if (missing_cost === true || missing_cost === 'true') {
    const costOr = [{ cost_price_ngn: { $exists: false } }, { cost_price_ngn: 0 }, { cost_price_ngn: null }];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: costOr }];
      delete query.$or;
    } else {
      query.$or = costOr;
    }
  }

  // Fetch candidate products (READ-ONLY)
  const rawProducts = await Product.find(query).lean();

  // Evaluate profitability and advisory recommendations for each product
  let evaluated = rawProducts.map(prod => evaluateProductProfitability(prod, settings));

  // In-memory filters for calculated properties
  if (margin_filter && margin_filter !== 'all') {
    if (margin_filter === 'positive' || margin_filter === 'healthy') {
      evaluated = evaluated.filter(p => p.gross_margin_percent != null && p.gross_margin_percent >= settings.target_margin_percent);
    } else if (margin_filter === 'low') {
      evaluated = evaluated.filter(p => p.gross_margin_percent != null && p.gross_margin_percent < settings.target_margin_percent && p.estimated_gross_profit_ngn >= 0);
    } else if (margin_filter === 'negative') {
      evaluated = evaluated.filter(p => p.estimated_gross_profit_ngn != null && p.estimated_gross_profit_ngn < 0);
    } else if (margin_filter === 'unavailable') {
      evaluated = evaluated.filter(p => p.gross_margin_percent == null);
    } else if (margin_filter === 'missing_cost') {
      evaluated = evaluated.filter(p => p.data_quality && p.data_quality.has_missing_cost);
    }
  }

  if (recommendation && recommendation !== 'all') {
    const recUpper = String(recommendation).toUpperCase();
    evaluated = evaluated.filter(p => p.recommendation && p.recommendation.status === recUpper);
  }

  if (cost_increased === true || cost_increased === 'true') {
    evaluated = evaluated.filter(p => p.cost_history && p.cost_history.has_increased_significantly);
  }

  // Sorting
  evaluated.sort((a, b) => {
    switch (sort) {
      case 'margin_asc':
        if (a.gross_margin_percent == null && b.gross_margin_percent == null) return 0;
        if (a.gross_margin_percent == null) return 1;
        if (b.gross_margin_percent == null) return -1;
        return a.gross_margin_percent - b.gross_margin_percent;
      case 'margin_desc':
        if (a.gross_margin_percent == null && b.gross_margin_percent == null) return 0;
        if (a.gross_margin_percent == null) return 1;
        if (b.gross_margin_percent == null) return -1;
        return b.gross_margin_percent - a.gross_margin_percent;
      case 'profit_asc':
        if (a.estimated_gross_profit_ngn == null && b.estimated_gross_profit_ngn == null) return 0;
        if (a.estimated_gross_profit_ngn == null) return 1;
        if (b.estimated_gross_profit_ngn == null) return -1;
        return a.estimated_gross_profit_ngn - b.estimated_gross_profit_ngn;
      case 'profit_desc':
        if (a.estimated_gross_profit_ngn == null && b.estimated_gross_profit_ngn == null) return 0;
        if (a.estimated_gross_profit_ngn == null) return 1;
        if (b.estimated_gross_profit_ngn == null) return -1;
        return b.estimated_gross_profit_ngn - a.estimated_gross_profit_ngn;
      case 'markup_desc':
        if (a.markup_percent == null && b.markup_percent == null) return 0;
        if (a.markup_percent == null) return 1;
        if (b.markup_percent == null) return -1;
        return b.markup_percent - a.markup_percent;
      case 'markup_asc':
        if (a.markup_percent == null && b.markup_percent == null) return 0;
        if (a.markup_percent == null) return 1;
        if (b.markup_percent == null) return -1;
        return a.markup_percent - b.markup_percent;
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'price_asc':
        return (a.selling_price_ngn || 0) - (b.selling_price_ngn || 0);
      case 'price_desc':
        return (b.selling_price_ngn || 0) - (a.selling_price_ngn || 0);
      case 'cost_desc':
        return (b.supplier_cost_ngn || 0) - (a.supplier_cost_ngn || 0);
      case 'cost_asc':
        return (a.supplier_cost_ngn || 0) - (b.supplier_cost_ngn || 0);
      case 'newest':
      default:
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    }
  });

  const total = evaluated.length;
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const offset = (safePage - 1) * safeLimit;
  const pagedProducts = evaluated.slice(offset, offset + safeLimit);

  return {
    products: pagedProducts,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    settings,
    metric_label: 'Estimated Gross Profit Before Other Costs'
  };
}

async function getPriceIntelligenceSummary(options = {}) {
  const settings = await getPriceIntelligenceSettings();
  // Strictly query active products (published: 1), excluding benchmark records
  const rawProducts = await Product.find({ published: 1 }).lean();
  const evaluated = rawProducts.map(prod => evaluateProductProfitability(prod, settings));
  const metrics = calculateCatalogSummaryMetrics(evaluated, settings);

  return {
    summary: metrics,
    settings,
    active_catalog_total: rawProducts.length,
    generated_at: new Date()
  };
}

async function getProductCostHistory(productId) {
  const filter = buildProductFilter(productId);
  if (!filter) return null;

  const product = await Product.findOne(filter).lean();
  if (!product) return null;

  const targetIdStr = String(product._id || product.id);
  const sku = product.sku;

  // Search AuditLog for PRICE_IMPORT_APPLIED_ROW records
  const auditEntries = await AuditLog.find({
    action: 'PRICE_IMPORT_APPLIED_ROW',
    $or: [
      { 'metadata.product_id': targetIdStr },
      { 'metadata.sku': sku },
      { target_id: targetIdStr }
    ]
  }).sort({ created_at: -1 }).lean();

  // Search PriceImport for verified applied records
  const appliedImports = await PriceImport.find({
    status: { $in: ['successfully_applied', 'partially_applied'] },
    rows_preview: {
      $elemMatch: {
        application_status: 'applied',
        $or: [
          { matched_product_id: product._id },
          { normalized_sku: sku }
        ]
      }
    }
  }).sort({ applied_at: -1, updated_at: -1 }).lean();

  const history = [];

  for (const imp of appliedImports) {
    const matchingRows = (imp.rows_preview || []).filter(r => 
      r.application_status === 'applied' &&
      (String(r.matched_product_id) === String(product._id) || r.normalized_sku === sku)
    );

    for (const r of matchingRows) {
      history.push({
        applied_at: r.applied_at || imp.applied_at || imp.updated_at,
        previous_cost_ngn: r.applied_previous_cost_ngn ?? r.matched_current_cost_ngn ?? null,
        applied_cost_ngn: r.approved_cost_ngn ?? r.normalized_cost_ngn,
        cost_change_ngn: r.cost_diff_ngn || 0,
        cost_change_percent: r.cost_diff_percent || 0,
        import_id: imp.import_id || String(imp._id || imp.id),
        import_filename: imp.filename || imp.original_filename || 'supplier_prices.xlsx',
        supplier_name: imp.supplier_name || 'Generic Supplier',
        applied_by_email: imp.applied_by_email || imp.approved_by_email || 'Administrator'
      });
    }
  }

  history.sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0));

  return {
    product_id: String(product._id || product.id),
    id: product.id || null,
    sku: product.sku,
    name: product.name,
    current_supplier_cost_ngn: product.cost_price_ngn || null,
    current_selling_price_ngn: product.price_ngn || 0,
    has_history: history.length > 0,
    history_count: history.length,
    history,
    audit_references_count: auditEntries.length,
    message: history.length > 0 
      ? 'Verified historical supplier cost changes from applied imports.' 
      : 'No historical supplier cost movements recorded from applied imports for this product.'
  };
}

// --- STAGE 8.4: SOLAR PACKAGE BILL OF MATERIALS (BOM) ---

async function getAdminSolarPackages() {
  const packages = await Product.find({ category: 'solar-packages' })
    .sort({ price_ngn: 1 })
    .lean();

  const packageIds = packages.map(p => p.id);
  const boms = await PackageBom.find({ package_id: { $in: packageIds } }).lean();
  const bomMap = new Map();
  for (const b of boms) {
    bomMap.set(b.package_id, b);
  }

  return packages.map(pkg => {
    const bom = bomMap.get(pkg.id) || null;
    return {
      id: pkg.id,
      sku: pkg.sku,
      name: pkg.name,
      slug: pkg.slug,
      price_ngn: pkg.price_ngn,
      previous_price_ngn: pkg.previous_price_ngn,
      power_rating: pkg.power_rating,
      stock_status: pkg.stock_status,
      published: pkg.published,
      has_bom: !!bom,
      bom_summary: bom ? {
        bom_id: bom.bom_id,
        revision: bom.revision,
        status: bom.status,
        components_count: (bom.components || []).length,
        non_product_count: (bom.non_product_costs || []).length,
        total_lines_count: bom.cost_summary ? bom.cost_summary.total_lines_count : 0,
        missing_cost_lines_count: bom.cost_summary ? bom.cost_summary.missing_cost_lines_count : 0,
        is_costing_complete: bom.cost_summary ? bom.cost_summary.is_costing_complete : false,
        costing_completeness_pct: bom.cost_summary ? bom.cost_summary.costing_completeness_pct : 0,
        total_estimated_cost_ngn: bom.cost_summary ? bom.cost_summary.total_estimated_cost_ngn : null,
        finance_review_status: bom.finance_review ? bom.finance_review.status : 'pending',
        finance_reviewed_by_id: bom.finance_review ? bom.finance_review.reviewed_by_id : null,
        finance_reviewed_by_email: bom.finance_review ? bom.finance_review.reviewed_by_email : null,
        finance_reviewed_at: bom.finance_review ? bom.finance_review.reviewed_at : null,
        finance_review_decision: bom.finance_review ? bom.finance_review.decision : null,
        approved_by_id: bom.approved_by_id || null,
        approved_by_email: bom.approved_by_email || null,
        approved_at: bom.approved_at || null,
        updated_at: bom.updated_at
      } : null
    };
  });
}

async function getPackageBom(packageId) {
  const pkgId = Number(packageId);
  if (!Number.isFinite(pkgId)) {
    const err = new Error('Invalid package identifier.');
    err.status = 400;
    throw err;
  }

  const pkg = await Product.findOne({ id: pkgId, category: 'solar-packages' }).lean();
  if (!pkg) {
    const err = new Error(`Solar package with ID ${pkgId} not found.`);
    err.status = 404;
    throw err;
  }

  const bom = await PackageBom.findOne({ package_id: pkgId }).lean();

  // Active commercial products eligible for linking in BOM
  const eligibleProducts = await Product.find({
    published: 1,
    category: { $ne: 'solar-packages' }
  }).select('id sku name category brand price_ngn cost_price_ngn stock_status').sort({ category: 1, name: 1 }).lean();

  // If BOM exists, compute live margin analysis (strictly internal calculation)
  let marginAnalysis = null;
  if (bom && bom.cost_summary && bom.cost_summary.is_costing_complete) {
    const calc = calculateBom({
      components: bom.components || [],
      non_product_costs: bom.non_product_costs || [],
      packagePriceNgn: pkg.price_ngn
    });
    marginAnalysis = calc.margin_analysis;
  }

  return {
    package: {
      id: pkg.id,
      sku: pkg.sku,
      name: pkg.name,
      slug: pkg.slug,
      price_ngn: pkg.price_ngn,
      previous_price_ngn: pkg.previous_price_ngn,
      power_rating: pkg.power_rating
    },
    bom: bom ? {
      ...bom,
      margin_analysis: marginAnalysis
    } : null,
    eligible_products: eligibleProducts
  };
}

async function savePackageBomRevision(packageId, bomPayload, userContext = {}, reqMeta = {}) {
  const pkgId = Number(packageId);
  if (!Number.isFinite(pkgId)) {
    const err = new Error('Invalid package identifier.');
    err.status = 400;
    throw err;
  }

  const pkg = await Product.findOne({ id: pkgId, category: 'solar-packages' }).lean();
  if (!pkg) {
    const err = new Error(`Solar package with ID ${pkgId} not found.`);
    err.status = 404;
    throw err;
  }

  // Find existing BOM if present
  let existingBom = await PackageBom.findOne({ package_id: pkgId });

  // Optimistic concurrency check
  if (existingBom && bomPayload.base_revision !== undefined && bomPayload.base_revision !== null) {
    const baseRev = Number(bomPayload.base_revision);
    if (existingBom.revision !== baseRev) {
      const err = new Error(`Concurrent edit conflict: This BOM has been updated to revision ${existingBom.revision} by ${existingBom.updated_by_email || 'another administrator'}. Please reload the latest revision before saving changes.`);
      err.status = 409;
      throw err;
    }
  }

  // Enrich components with product snapshots if linked to catalog
  const rawComponents = Array.isArray(bomPayload.components) ? bomPayload.components : [];
  const processedComponents = [];

  for (const raw of rawComponents) {
    let comp = { ...raw };
    if (comp.product_id) {
      const linkedProduct = await Product.findOne({ id: Number(comp.product_id) }).lean();
      if (!linkedProduct) {
        const err = new Error(`Linked product ID ${comp.product_id} not found in catalog.`);
        err.status = 400;
        throw err;
      }
      // Rejects archived products and circular package references
      validateCatalogProductForBom(linkedProduct);
      comp.product_sku = comp.product_sku || linkedProduct.sku;
      comp.product_name = comp.product_name || linkedProduct.name;
      if ((comp.unit_cost_ngn === undefined || comp.unit_cost_ngn === null) && linkedProduct.cost_price_ngn > 0) {
        comp.unit_cost_ngn = linkedProduct.cost_price_ngn;
        comp.cost_source = COST_SOURCES.CATALOG_DOCUMENTED_COST;
        comp.cost_provenance_ref = comp.cost_provenance_ref || `Catalog SKU ${linkedProduct.sku}`;
      }
    }
    processedComponents.push(comp);
  }

  const rawNonProduct = Array.isArray(bomPayload.non_product_costs) ? bomPayload.non_product_costs : [];

  // Calculate full BOM using calculation engine (handles validation, precision, subtotal, completeness)
  const calc = calculateBom({
    components: processedComponents,
    non_product_costs: rawNonProduct,
    packagePriceNgn: pkg.price_ngn
  });

  // Determine valid status
  let targetStatus = bomPayload.status || (existingBom ? existingBom.status : 'draft');
  if (!['draft', 'incomplete', 'ready_for_review'].includes(targetStatus)) {
    targetStatus = 'draft';
  }
  // If costing is incomplete, cannot set to ready_for_review
  if (targetStatus === 'ready_for_review' && !calc.cost_summary.is_costing_complete) {
    targetStatus = 'incomplete';
  }

  const userEmail = (userContext && userContext.email) ? userContext.email : 'system@devicepro.local';
  const revisionNotes = String(bomPayload.revision_notes || bomPayload.notes || '').trim();

  let savedBom;
  let actionName;

  if (existingBom) {
    actionName = 'UPDATE_BOM_REVISION';
    const wasReviewed = existingBom.finance_review && existingBom.finance_review.status === 'reviewed';

    // Archive current revision snapshot in history
    const historyEntry = {
      revision: existingBom.revision,
      saved_at: existingBom.updated_at || new Date(),
      saved_by_email: existingBom.updated_by_email || existingBom.created_by_email || userEmail,
      status: existingBom.status,
      cost_summary: existingBom.cost_summary,
      components_snapshot: existingBom.components,
      non_product_costs_snapshot: existingBom.non_product_costs,
      revision_notes: existingBom.notes || '',
      finance_review_snapshot: existingBom.finance_review ? JSON.parse(JSON.stringify(existingBom.finance_review)) : null,
      approved_by_id: existingBom.approved_by_id || null,
      approved_by_email: existingBom.approved_by_email || null,
      approved_at: existingBom.approved_at || null
    };

    existingBom.history.push(historyEntry);
    existingBom.revision = existingBom.revision + 1;
    existingBom.status = targetStatus;
    existingBom.components = calc.components;
    existingBom.non_product_costs = calc.non_product_costs;
    existingBom.cost_summary = calc.cost_summary;
    existingBom.notes = revisionNotes;
    existingBom.updated_by_email = userEmail;

    // Dual authorization invariant: modifying a BOM revision invalidates prior finance review
    existingBom.finance_review = {
      status: wasReviewed ? 'invalidated' : 'pending',
      reviewed_by_id: null,
      reviewed_by_email: null,
      reviewed_at: null,
      decision: null,
      notes: wasReviewed ? `Prior review on revision ${historyEntry.revision} invalidated due to revision modification.` : '',
      revision_reviewed: null,
      invalidated_at: wasReviewed ? new Date() : null
    };

    savedBom = await existingBom.save();

    if (wasReviewed) {
      await logAudit({
        userId: userContext ? userContext.id : null,
        action: 'INVALIDATE_BOM_REVIEW',
        entityType: 'PACKAGE_BOM',
        entityId: savedBom.bom_id,
        details: `INVALIDATE_BOM_REVIEW: Finance review on revision ${historyEntry.revision} invalidated by revision update to revision ${savedBom.revision} by ${userEmail}.`,
        ipAddress: reqMeta.ip || '',
        metadata: {
          package_id: pkg.id,
          bom_id: savedBom.bom_id,
          previous_revision: historyEntry.revision,
          new_revision: savedBom.revision
        }
      });
    }
  } else {
    actionName = 'CREATE_BOM';
    const bomId = `BOM-PKG-${pkg.sku}`;
    savedBom = await PackageBom.create({
      bom_id: bomId,
      package_id: pkg.id,
      package_sku: pkg.sku,
      package_name: pkg.name,
      package_slug: pkg.slug,
      revision: 1,
      status: targetStatus,
      currency: 'NGN',
      components: calc.components,
      non_product_costs: calc.non_product_costs,
      cost_summary: calc.cost_summary,
      notes: revisionNotes,
      created_by_email: userEmail,
      updated_by_email: userEmail,
      finance_review: {
        status: 'pending',
        reviewed_by_id: null,
        reviewed_by_email: null,
        reviewed_at: null,
        decision: null,
        notes: '',
        revision_reviewed: null
      },
      approved_by_id: null,
      approved_by_email: null,
      approved_at: null,
      history: []
    });
  }

  // Structured Audit Log
  await logAudit({
    userId: userContext ? userContext.id : null,
    action: actionName,
    entityType: 'PACKAGE_BOM',
    entityId: savedBom.bom_id,
    details: `${actionName}: Revision ${savedBom.revision} saved for package "${pkg.name}" (${pkg.sku}) by ${userEmail}. Status: ${savedBom.status}. Lines: ${savedBom.cost_summary.total_lines_count}, Missing Cost: ${savedBom.cost_summary.missing_cost_lines_count}.`,
    ipAddress: reqMeta.ip || '',
    metadata: {
      package_id: pkg.id,
      package_sku: pkg.sku,
      bom_id: savedBom.bom_id,
      revision: savedBom.revision,
      status: savedBom.status,
      total_lines_count: savedBom.cost_summary.total_lines_count,
      missing_cost_lines_count: savedBom.cost_summary.missing_cost_lines_count,
      is_costing_complete: savedBom.cost_summary.is_costing_complete,
      total_estimated_cost_ngn: savedBom.cost_summary.total_estimated_cost_ngn,
      actor_email: userEmail
    }
  });

  return savedBom;
}

async function reviewPackageBom(packageId, userContext = {}, reviewPayload = {}, reqMeta = {}) {
  const pkgId = Number(packageId);
  if (!Number.isFinite(pkgId)) {
    const err = new Error('Invalid package identifier.');
    err.status = 400;
    throw err;
  }

  const pkg = await Product.findOne({ id: pkgId, category: 'solar-packages' }).lean();
  if (!pkg) {
    const err = new Error(`Solar package with ID ${pkgId} not found.`);
    err.status = 404;
    throw err;
  }

  const bom = await PackageBom.findOne({ package_id: pkgId });
  if (!bom) {
    const err = new Error(`No BOM found for package "${pkg.name}".`);
    err.status = 404;
    throw err;
  }

  // Optimistic revision checking: Prevent reviewing stale revision
  if (reviewPayload.base_revision !== undefined && reviewPayload.base_revision !== null) {
    const baseRev = Number(reviewPayload.base_revision);
    if (baseRev !== bom.revision) {
      const err = new Error(`Concurrent edit conflict: Review was submitted for revision ${baseRev}, but target BOM is currently at revision ${bom.revision}. Please reload before reviewing.`);
      err.status = 409;
      throw err;
    }
  }

  const rawDecision = String(reviewPayload.decision || 'reviewed').toLowerCase().trim();
  const decision = ['approved', 'reviewed'].includes(rawDecision) ? 'reviewed' : rawDecision;
  if (!['reviewed', 'rejected'].includes(decision)) {
    const err = new Error(`Invalid review decision: "${rawDecision}". Permitted values are "reviewed" (or "approved") and "rejected".`);
    err.status = 400;
    throw err;
  }

  const reviewNotes = String(reviewPayload.notes || '').trim();

  // Incomplete costing strictly blocks positive finance review
  if (decision === 'reviewed') {
    if (!bom.cost_summary || !bom.cost_summary.is_costing_complete) {
      const missing = bom.cost_summary ? bom.cost_summary.missing_cost_lines_count : 'unknown';
      const err = new Error(`Cannot approve finance review: Costing is incomplete (${missing} lines missing verified costs). All components and non-product costs must have verified provenance before finance approval.`);
      err.status = 400;
      throw err;
    }
  }

  const userId = userContext && userContext.id ? Number(userContext.id) : null;
  const userEmail = (userContext && userContext.email) ? userContext.email : 'finance@devicepro.local';
  const now = new Date();

  // Transaction support / Compensating revert for safe audit logging
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (sessErr) {
    session = null;
  }

  const prevReviewState = bom.finance_review ? JSON.parse(JSON.stringify(bom.finance_review)) : null;
  const prevStatus = bom.status;
  const prevUpdatedBy = bom.updated_by_email;

  try {
    const opts = session ? { session } : {};

    bom.finance_review = {
      status: decision === 'reviewed' ? 'reviewed' : 'rejected',
      reviewed_by_id: userId,
      reviewed_by_email: userEmail,
      reviewed_at: now,
      decision: decision,
      notes: reviewNotes,
      revision_reviewed: bom.revision
    };

    if (decision === 'reviewed') {
      bom.status = 'ready_for_review';
    } else {
      bom.status = 'incomplete';
    }
    bom.updated_by_email = userEmail;

    await bom.save(opts);

    const action = decision === 'reviewed' ? 'REVIEW_BOM' : 'REJECT_BOM_REVIEW';
    const auditDetails = decision === 'reviewed'
      ? `REVIEW_BOM: Finance review APPROVED for package "${pkg.name}" (${pkg.sku}) revision ${bom.revision} by ${userEmail} (User ID: ${userId}). Total verified cost: ₦${bom.cost_summary.total_estimated_cost_ngn ? bom.cost_summary.total_estimated_cost_ngn.toLocaleString() : 'N/A'}. Notes: ${reviewNotes || 'None'}.`
      : `REJECT_BOM_REVIEW: Finance review REJECTED for package "${pkg.name}" (${pkg.sku}) revision ${bom.revision} by ${userEmail} (User ID: ${userId}). Notes: ${reviewNotes || 'None'}.`;

    // Critical: throwOnError must be true so state transition rolls back if audit fails!
    await logAudit({
      userId: userId,
      action: action,
      entityType: 'PACKAGE_BOM',
      entityId: bom.bom_id,
      details: auditDetails,
      ipAddress: reqMeta.ip || '',
      session: session,
      throwOnError: true,
      metadata: {
        package_id: pkg.id,
        package_sku: pkg.sku,
        bom_id: bom.bom_id,
        revision: bom.revision,
        decision: decision,
        reviewed_by_id: userId,
        reviewed_by_email: userEmail,
        reviewed_at: now,
        notes: reviewNotes,
        total_estimated_cost_ngn: bom.cost_summary ? bom.cost_summary.total_estimated_cost_ngn : null
      }
    });

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    return bom;
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      await session.endSession();
    } else {
      // Revert in-memory document state
      bom.finance_review = prevReviewState;
      bom.status = prevStatus;
      bom.updated_by_email = prevUpdatedBy;
      try { await bom.save(); } catch (revertErr) {}
    }
    throw err;
  }
}

async function approvePackageBom(packageId, userContext = {}, approvalNotes = '', reqMeta = {}) {
  const pkgId = Number(packageId);
  if (!Number.isFinite(pkgId)) {
    const err = new Error('Invalid package identifier.');
    err.status = 400;
    throw err;
  }

  const pkg = await Product.findOne({ id: pkgId, category: 'solar-packages' }).lean();
  if (!pkg) {
    const err = new Error(`Solar package with ID ${pkgId} not found.`);
    err.status = 404;
    throw err;
  }

  const bom = await PackageBom.findOne({ package_id: pkgId });
  if (!bom) {
    const err = new Error(`No BOM found for package "${pkg.name}".`);
    err.status = 404;
    throw err;
  }

  // 1. Strict completeness verification: Cannot approve incomplete costing
  if (!bom.cost_summary || !bom.cost_summary.is_costing_complete) {
    const missing = bom.cost_summary ? bom.cost_summary.missing_cost_lines_count : 'unknown';
    const err = new Error(`Cannot approve BOM: Costing is incomplete (${missing} lines missing verified costs). All components and non-product costs must have verified provenance before approval.`);
    err.status = 400;
    throw err;
  }

  // 2. Dual Authorization: Finance Review Verification
  if (!bom.finance_review || bom.finance_review.status !== 'reviewed' || !['approved', 'reviewed'].includes(bom.finance_review.decision)) {
    const currentReviewStatus = bom.finance_review ? bom.finance_review.status : 'pending';
    const err = new Error(`Cannot approve BOM: Requires a valid Finance review prior to final Superadmin approval. Current finance review status: ${currentReviewStatus}.`);
    err.status = 400;
    throw err;
  }

  // 3. Exact Revision Match: Finance review must match exact current revision
  if (bom.finance_review.revision_reviewed !== bom.revision) {
    const err = new Error(`Cannot approve BOM: Finance review was conducted on revision ${bom.finance_review.revision_reviewed}, but current revision is ${bom.revision}. The BOM was modified after review and requires a renewed Finance review.`);
    err.status = 400;
    throw err;
  }

  // 4. Two-Person Rule: Distinct Approver Verification
  const approverId = userContext && userContext.id ? Number(userContext.id) : null;
  const reviewerId = bom.finance_review && bom.finance_review.reviewed_by_id ? Number(bom.finance_review.reviewed_by_id) : null;
  const approverEmail = (userContext && userContext.email ? userContext.email : '').toLowerCase().trim();
  const reviewerEmail = (bom.finance_review && bom.finance_review.reviewed_by_email ? bom.finance_review.reviewed_by_email : '').toLowerCase().trim();

  const isSameUser = (approverId && reviewerId && approverId === reviewerId) ||
                     (approverEmail && reviewerEmail && approverEmail === reviewerEmail);

  if (isSameUser) {
    // Log security audit event for denied approval attempt
    await logAudit({
      userId: approverId,
      action: 'DENY_BOM_APPROVAL',
      entityType: 'PACKAGE_BOM',
      entityId: bom.bom_id,
      details: `DENY_BOM_APPROVAL: Dual authorization violation. Approver (ID: ${approverId}, Email: ${approverEmail}) cannot be the same user as Finance reviewer (ID: ${reviewerId}, Email: ${reviewerEmail}).`,
      ipAddress: reqMeta.ip || '',
      metadata: {
        package_id: pkg.id,
        bom_id: bom.bom_id,
        revision: bom.revision,
        approver_id: approverId,
        reviewer_id: reviewerId,
        reason: 'dual_authorization_same_user'
      }
    });

    const err = new Error('Two-person rule violation: The finance reviewer and final superadmin approver must be distinct individuals. A user cannot approve a BOM revision they reviewed.');
    err.status = 403;
    throw err;
  }

  const userEmail = approverEmail || 'superadmin@devicepro.local';

  // Transaction support / Compensating revert for safe audit logging
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (sessErr) {
    session = null;
  }

  const prevBomState = JSON.parse(JSON.stringify(bom.toObject ? bom.toObject() : bom));

  try {
    const opts = session ? { session } : {};

    // Snapshot previous state in history
    bom.history.push({
      revision: bom.revision,
      saved_at: bom.updated_at || new Date(),
      saved_by_email: bom.updated_by_email || userEmail,
      status: bom.status,
      cost_summary: bom.cost_summary,
      components_snapshot: bom.components,
      non_product_costs_snapshot: bom.non_product_costs,
      revision_notes: `Pre-approval snapshot. Notes: ${approvalNotes}`,
      finance_review_snapshot: bom.finance_review ? JSON.parse(JSON.stringify(bom.finance_review)) : null,
      approved_by_id: approverId,
      approved_by_email: userEmail,
      approved_at: new Date()
    });

    bom.revision = bom.revision + 1;
    bom.status = 'approved';
    bom.approved_by_id = approverId;
    bom.approved_by_email = userEmail;
    bom.approved_at = new Date();
    bom.updated_by_email = userEmail;
    if (approvalNotes) {
      bom.notes = bom.notes ? `${bom.notes} | Approved: ${approvalNotes}` : `Approved: ${approvalNotes}`;
    }

    await bom.save(opts);

    // Audit Log with throwOnError: true so state transition aborts if audit fails
    await logAudit({
      userId: approverId,
      action: 'APPROVE_BOM',
      entityType: 'PACKAGE_BOM',
      entityId: bom.bom_id,
      details: `APPROVE_BOM: BOM revision ${bom.revision} approved for package "${pkg.name}" (${pkg.sku}) by superadmin ${userEmail} (ID: ${approverId}). Verified Total Cost: ₦${bom.cost_summary.total_estimated_cost_ngn ? bom.cost_summary.total_estimated_cost_ngn.toLocaleString() : 'N/A'}. Finance Reviewer: ${reviewerEmail} (ID: ${reviewerId}).`,
      ipAddress: reqMeta.ip || '',
      session: session,
      throwOnError: true,
      metadata: {
        package_id: pkg.id,
        package_sku: pkg.sku,
        bom_id: bom.bom_id,
        revision: bom.revision,
        status: 'approved',
        approved_by_id: approverId,
        approved_by_email: userEmail,
        approved_at: bom.approved_at,
        finance_reviewer_id: reviewerId,
        finance_reviewed_by_id: reviewerId,
        finance_reviewer_email: reviewerEmail,
        total_estimated_cost_ngn: bom.cost_summary.total_estimated_cost_ngn
      }
    });

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    return bom;
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      await session.endSession();
    } else {
      // Compensating revert
      try {
        await PackageBom.replaceOne({ _id: bom._id }, prevBomState);
      } catch (revErr) {}
    }
    throw err;
  }
}

module.exports = {
  getProducts, getProductBySlug, getProductById, getProductFacets, getRelatedProducts,
  createProduct, updateProduct, deleteProduct, archiveProduct,
  getPackages, getPackageBySlug,
  getCategories, getCaseStudies, getCaseStudyBySlug,
  createEnquiry, getEnquiries, getEnquiryById, getEnquiryByRef, updateEnquiryStatus,
  createQuote, getQuotes, getQuoteById, getQuoteByRef, updateQuoteStatus,
  createOrder, getOrders, getOrdersByCustomer, getOrderByNumber, updateOrderStatus,
  updateOrderFulfillment, updateOrderCommissioning,
  createPaymentRecord, getPaymentByReference, getPaymentsByOrderNumber, updatePaymentStatus, reconcileOrderPayment,
  createWarrantyRecord, getWarrantyBySerialOrCode, getWarrantiesByOrder, getWarranties,
  createSupportTicket, getSupportTickets, getSupportTicketByNumber, getSupportTicketsByOrder, updateSupportTicketStatus,
  hashPassword, verifyPassword,
  getUserByUsername, getUserByEmail, getUserByGoogleSubject, getUserById,
  createUser, linkGoogleAccount, updateUserProfile, changeUserPassword,
  createPasswordResetToken, resetPasswordWithToken,
  createVerificationCode, verifyResetCode, executePasswordReset,
  verifyUserLogin, createSession, getSessionUser, revokeSession,
  logAudit, getAuditLogs, getDatabaseStats, exportDatabaseBackup,
  createPriceImport, getPriceImports, getPriceImportById, deletePriceImport,
  reviewPriceImport, approvePriceImportRows, applyPriceImport, cancelPriceImport,
  // Stage 7: Price Intelligence & Margin Analysis
  getPriceIntelligenceSettings,
  updatePriceIntelligenceSettings,
  getPriceIntelligenceProducts,
  getPriceIntelligenceSummary,
  getProductCostHistory,
  // Stage 8.4: Solar Package BOM
  getAdminSolarPackages,
  getPackageBom,
  savePackageBomRevision,
  reviewPackageBom,
  approvePackageBom
};


