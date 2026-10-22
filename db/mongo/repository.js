const crypto = require('crypto');
const {
  Product, Category, CaseStudy, Enquiry, Quote,
  Order, Payment, Warranty, SupportTicket, User, Session, AuditLog, PasswordReset
} = require('./models');

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
  search = null,
  limit = 50,
  offset = 0,
  sort = 'featured'
} = {}) {
  const filter = { published: 1 };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (powerTier) filter.power_tier = powerTier;
  if (inStock !== null && inStock !== undefined) {
    filter.stock_status = inStock ? 'in_stock' : { $ne: 'in_stock' };
  }
  if (search && typeof search === 'string') {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sRegex = new RegExp(escaped, 'i');
    filter.$or = [
      { name: sRegex },
      { brand: sRegex },
      { sku: sRegex },
      { specifications: sRegex },
      { description: sRegex }
    ];
  }

  let sortOption = { featured: -1, price_ngn: 1 };
  if (sort === 'price_asc') sortOption = { price_ngn: 1 };
  else if (sort === 'price_desc') sortOption = { price_ngn: -1 };
  else if (sort === 'name_asc') sortOption = { name: 1 };

  const products = await Product.find(filter)
    .sort(sortOption)
    .skip(offset)
    .limit(limit)
    .lean();

  const total = await Product.countDocuments(filter);
  return { products, total };
}

async function getProductBySlug(slug) {
  return Product.findOne({ slug, published: 1 }).lean();
}

async function getProductById(id) {
  if (typeof id === 'number' || !isNaN(id)) {
    return Product.findOne({ id: Number(id) }).lean();
  }
  return Product.findById(id).lean();
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
  return Product.find(filter).limit(limit).lean();
}

async function createProduct(productData = {}, adminUserId = null) {
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

  let id = productData.id;
  if (!id) {
    const maxDoc = await Product.findOne().sort({ id: -1 }).select('id').lean();
    id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
  }

  const product = new Product({
    id,
    name,
    slug,
    brand,
    category,
    category_label,
    sku: finalSku,
    description,
    price_ngn: parseInt(price_ngn, 10) || 0,
    previous_price_ngn: previous_price_ngn ? parseInt(previous_price_ngn, 10) : null,
    power_rating,
    power_tier,
    specifications,
    image_url,
    stock_status,
    featured: featured ? 1 : 0,
    published: published !== undefined ? published : 1
  });

  const saved = await product.save();

  await logAudit({
    userId: adminUserId,
    action: 'CREATE_PRODUCT',
    entityType: 'product',
    entityId: (saved.id || saved._id).toString(),
    details: `Created new product ${name} (${finalSku}) at ₦${parseInt(price_ngn, 10).toLocaleString()}`
  });

  return saved.toObject ? saved.toObject() : saved;
}

async function updateProduct(id, updates = {}, adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const existing = await Product.findOne(filter).lean();
  if (!existing) {
    throw new Error(`Product with ID ${id} not found.`);
  }

  updates.updated_at = new Date();
  const updated = await Product.findOneAndUpdate(filter, { $set: updates }, { returnDocument: 'after' }).lean();

  await logAudit({
    userId: adminUserId,
    action: 'UPDATE_PRODUCT',
    entityType: 'product',
    entityId: id.toString(),
    details: `Updated fields: ${Object.keys(updates).join(', ')} on product ${existing.name} (${existing.sku})`
  });

  return updated;
}

async function deleteProduct(id, adminUserId = null) {
  const filter = typeof id === 'number' || !isNaN(id) ? { id: Number(id) } : { _id: id };
  const product = await Product.findOne(filter).lean();
  if (!product) {
    throw new Error(`Product with ID ${id} not found.`);
  }

  // Soft delete / archive
  await Product.updateOne(filter, { $set: { published: 0, updated_at: new Date() } });

  await logAudit({
    userId: adminUserId,
    action: 'DELETE_PRODUCT',
    entityType: 'product',
    entityId: id.toString(),
    details: `Unpublished/archived product ${product.name} (${product.sku})`
  });

  return { success: true, message: `Product ${product.name} archived.` };
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

  const finalSubtotal = subtotalNgn !== null && subtotalNgn !== undefined
    ? parseInt(subtotalNgn, 10)
    : calculatedSubtotal;

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

async function createSession(userId, durationDays = 7) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const numericUserId = Number(userId) || 1;
  const session = new Session({
    token,
    user_id: numericUserId,
    expires_at: expiresAt
  });
  await session.save();
  return { token, expiresAt: expiresAt.toISOString() };
}

async function getSessionUser(token) {
  if (!token) return null;
  const session = await Session.findOne({ token }).lean();
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await revokeSession(token);
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
    emailVerified: Boolean(user.email_verified)
  };
}

async function revokeSession(token) {
  return Session.deleteOne({ token });
}

// --- AUDIT LOGGING ---
async function logAudit({ userId = null, action, entityType, entityId = '', details = '', ipAddress = '' }) {
  try {
    const maxDoc = await AuditLog.findOne().sort({ id: -1 }).select('id').lean();
    const id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    const log = new AuditLog({
      id,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress
    });
    await log.save();
  } catch (e) {
    console.error('[AUDIT LOG MONGO ERROR]:', e);
  }
}

async function getAuditLogs({ limit = 50, offset = 0 } = {}) {
  const logs = await AuditLog.find().sort({ id: -1 }).skip(offset).limit(limit).lean();
  const total = await AuditLog.countDocuments();
  return { logs, total };
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

module.exports = {
  getProducts, getProductBySlug, getProductById, getProductFacets, getRelatedProducts,
  createProduct, updateProduct, deleteProduct,
  getPackages, getPackageBySlug,
  getCategories, getCaseStudies, getCaseStudyBySlug,
  createEnquiry, getEnquiries, getEnquiryById, getEnquiryByRef, updateEnquiryStatus,
  createQuote, getQuotes, getQuoteById, getQuoteByRef, updateQuoteStatus,
  createOrder, getOrders, getOrderByNumber, updateOrderStatus,
  updateOrderFulfillment, updateOrderCommissioning,
  createPaymentRecord, getPaymentByReference, getPaymentsByOrderNumber, updatePaymentStatus, reconcileOrderPayment,
  createWarrantyRecord, getWarrantyBySerialOrCode, getWarrantiesByOrder, getWarranties,
  createSupportTicket, getSupportTickets, getSupportTicketByNumber, getSupportTicketsByOrder, updateSupportTicketStatus,
  hashPassword, verifyPassword,
  getUserByUsername, getUserByEmail, getUserByGoogleSubject, getUserById,
  createUser, linkGoogleAccount,
  createPasswordResetToken, resetPasswordWithToken,
  createVerificationCode, verifyResetCode, executePasswordReset,
  verifyUserLogin, createSession, getSessionUser, revokeSession,
  logAudit, getAuditLogs, getDatabaseStats, exportDatabaseBackup
};
