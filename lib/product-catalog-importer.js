/**
 * DEVICE PRO — Bulk Product Creation & Catalog Management Importer
 * 
 * Provides:
 * 1. Standardized Excel Template generator (.xlsx) with formatting and sample products.
 * 2. In-memory parsing for .xlsx and .csv files with safe formula stripping.
 * 3. Fuzzy column alias normalization.
 * 4. Validation, in-file duplicate detection, and SKU diffing against MongoDB Atlas.
 * 5. Atomic execution for creating new products and updating existing products.
 * 6. Audit trail attribution.
 */

const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { Product, AuditLog } = require('../db/mongo/models');
const { connectMongo } = require('../db/mongo/connection');

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await connectMongo();
  }
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DATA_ROWS = 1000;

// Canonical Category Normalizer Map
const CATEGORY_MAP = {
  'solar-panels': { slug: 'solar-panels', label: 'Solar Panels' },
  'solar panels': { slug: 'solar-panels', label: 'Solar Panels' },
  'panels': { slug: 'solar-panels', label: 'Solar Panels' },
  'solar panel': { slug: 'solar-panels', label: 'Solar Panels' },
  'pv': { slug: 'solar-panels', label: 'Solar Panels' },

  'inverters': { slug: 'inverters', label: 'Inverters' },
  'inverter': { slug: 'inverters', label: 'Inverters' },
  'hybrid inverters': { slug: 'inverters', label: 'Inverters' },
  'hybrid inverter': { slug: 'inverters', label: 'Inverters' },
  'solar inverters': { slug: 'inverters', label: 'Inverters' },

  'batteries': { slug: 'batteries', label: 'Batteries' },
  'battery': { slug: 'batteries', label: 'Batteries' },
  'lithium storage': { slug: 'batteries', label: 'Batteries' },
  'storage': { slug: 'batteries', label: 'Batteries' },
  'lifepo4': { slug: 'batteries', label: 'Batteries' },

  'solar-packages': { slug: 'solar-packages', label: 'Solar Packages' },
  'solar packages': { slug: 'solar-packages', label: 'Solar Packages' },
  'packages': { slug: 'solar-packages', label: 'Solar Packages' },
  'package': { slug: 'solar-packages', label: 'Solar Packages' },
  'kits': { slug: 'solar-packages', label: 'Solar Packages' },
  'turnkey': { slug: 'solar-packages', label: 'Solar Packages' },

  'mounting accessories': { slug: 'mounting-accessories', label: 'Mounting Accessories' },
  'mounting-accessories': { slug: 'mounting-accessories', label: 'Mounting Accessories' },
  'mounting': { slug: 'mounting-accessories', label: 'Mounting Accessories' },
  'racks': { slug: 'mounting-accessories', label: 'Mounting Accessories' },

  'electrical accessories': { slug: 'electrical-accessories', label: 'Electrical Accessories' },
  'electrical-accessories': { slug: 'electrical-accessories', label: 'Electrical Accessories' },
  'cables': { slug: 'electrical-accessories', label: 'Electrical Accessories' },
  'connectors': { slug: 'electrical-accessories', label: 'Electrical Accessories' },

  'accessories': { slug: 'accessories', label: 'Accessories' },
  'accessory': { slug: 'accessories', label: 'Accessories' },

  'portable power': { slug: 'portable-power', label: 'Portable Power' },
  'portable-power': { slug: 'portable-power', label: 'Portable Power' },
  'power station': { slug: 'portable-power', label: 'Portable Power' },
  'generators': { slug: 'portable-power', label: 'Portable Power' }
};

// Column aliases for resilient header matching
const COLUMN_ALIASES = {
  name: ['product name', 'name', 'item name', 'product', 'title', 'item'],
  sku: ['sku', 'supplier sku', 'item code', 'product sku', 'part number', 'model', 'code'],
  category: ['category', 'product category', 'cat', 'group', 'type'],
  brand: ['brand', 'manufacturer', 'mfr', 'make', 'brand name'],
  price_ngn: ['selling price (ngn)', 'selling price', 'price (ngn)', 'price', 'retail price', 'rate'],
  cost_price_ngn: ['cost price (ngn)', 'cost price', 'cost (ngn)', 'cost', 'supplier cost', 'wholesale price'],
  previous_price_ngn: ['previous price (ngn)', 'previous price', 'original price', 'old price', 'was price'],
  power_rating: ['power rating', 'rating', 'wattage', 'capacity', 'kva', 'kwh', 'watts'],
  power_tier: ['power tier', 'tier', 'capacity tier'],
  warranty_years: ['warranty (years)', 'warranty years', 'warranty', 'guarantee'],
  stock_status: ['stock status', 'availability', 'stock state', 'status'],
  stock_quantity: ['stock quantity', 'quantity', 'qty', 'stock qty', 'units'],
  short_description: ['short description', 'brief', 'summary', 'tagline'],
  description: ['full description', 'description', 'details', 'overview'],
  specifications: ['technical specifications', 'specifications', 'specs', 'technical specs'],
  image_url: ['image url', 'image', 'photo', 'picture url', 'photo url', 'thumbnail'],
  featured: ['featured', 'is featured', 'promote', 'highlight']
};

/**
 * Normalizes a column header string
 */
function normalizeHeader(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\*/g, '')
    .trim()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Resolves a field key from aliases
 */
function matchFieldKey(headerText) {
  const norm = normalizeHeader(headerText);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(norm)) {
      return key;
    }
  }
  return null;
}

/**
 * Generates official Excel template with styling and sample rows
 */
async function generateProductImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DEVICE PRO Engineering & Procurement';
  workbook.lastModifiedBy = 'DEVICE PRO Operations';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Data Sheet
  const sheet = workbook.addWorksheet('Products Catalog', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Product Name *', key: 'name', width: 38 },
    { header: 'SKU *', key: 'sku', width: 22 },
    { header: 'Category *', key: 'category', width: 22 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Selling Price (NGN) *', key: 'price_ngn', width: 22, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
    { header: 'Cost Price (NGN)', key: 'cost_price_ngn', width: 20, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
    { header: 'Previous Price (NGN)', key: 'previous_price_ngn', width: 22, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
    { header: 'Power Rating', key: 'power_rating', width: 16 },
    { header: 'Power Tier', key: 'power_tier', width: 18 },
    { header: 'Warranty (Years)', key: 'warranty_years', width: 18, style: { alignment: { horizontal: 'center' } } },
    { header: 'Stock Status', key: 'stock_status', width: 16, style: { alignment: { horizontal: 'center' } } },
    { header: 'Stock Quantity', key: 'stock_quantity', width: 16, style: { alignment: { horizontal: 'right' } } },
    { header: 'Short Description', key: 'short_description', width: 40 },
    { header: 'Full Description', key: 'description', width: 50 },
    { header: 'Technical Specifications', key: 'specifications', width: 45 },
    { header: 'Image URL', key: 'image_url', width: 35 },
    { header: 'Featured', key: 'featured', width: 12, style: { alignment: { horizontal: 'center' } } }
  ];

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0157A2' } // DEVICE PRO Navy
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF003B73' } },
      bottom: { style: 'medium', color: { argb: 'FF003B73' } },
      left: { style: 'thin', color: { argb: 'FF003B73' } },
      right: { style: 'thin', color: { argb: 'FF003B73' } }
    };
  });

  // Sample hardware rows
  const sampleProducts = [
    {
      name: 'Jinko Solar 620W Tiger Neo N-Type Bifacial Panel',
      sku: 'JKM-620N-78HL4-BDV',
      category: 'Solar Panels',
      brand: 'Jinko Solar',
      price_ngn: 310000,
      cost_price_ngn: 270000,
      previous_price_ngn: 335000,
      power_rating: '620W',
      power_tier: 'up_to_1kw',
      warranty_years: 25,
      stock_status: 'in_stock',
      stock_quantity: 120,
      short_description: 'Ultra-high efficiency 620W N-type dual-glass bifacial solar panel with 30-year performance guarantee.',
      description: 'The Jinko Tiger Neo 620W represents next-generation TOPCon cell technology offering superior temperature coefficient (-0.29%/°C) optimized for the high ambient Nigerian climate.',
      specifications: 'Max Power: 620W | Module Efficiency: 22.8% | Cell Type: N-Type Monocrystalline | Dimensions: 2465×1134×30mm | Weight: 34.0kg',
      image_url: '/images/products/jinko-solar-panel.png',
      featured: 'YES'
    },
    {
      name: 'Deye 10kW Three-Phase Low-Voltage Hybrid Inverter',
      sku: 'SUN-10K-SG04LP3-EU',
      category: 'Inverters',
      brand: 'Deye',
      price_ngn: 2650000,
      cost_price_ngn: 2350000,
      previous_price_ngn: 2850000,
      power_rating: '10kW',
      power_tier: '10kw_50kw',
      warranty_years: 5,
      stock_status: 'in_stock',
      stock_quantity: 25,
      short_description: 'Heavy-duty 10kW 3-phase hybrid inverter with dual MPPT controllers and generator auto-start integration.',
      description: 'Commercial grade 3-phase hybrid inverter with 48V low voltage battery architecture for maximum safety and high surge tolerance (up to 20,000W peak).',
      specifications: 'Rated AC Power: 10,000W | Max DC Input: 13,000W | Battery Voltage: 40-60V | Efficiency: 97.6% | IP Rating: IP65 Outdoor',
      image_url: '/images/products/deye-hybrid-inverter.png',
      featured: 'YES'
    },
    {
      name: 'Felicity Solar 15kWh Wall-Mount LiFePO4 Battery 51.2V 300Ah',
      sku: 'FL-LPBF48300-H',
      category: 'Batteries',
      brand: 'Felicity Solar',
      price_ngn: 4150000,
      cost_price_ngn: 3700000,
      previous_price_ngn: 4450000,
      power_rating: '15kWh',
      power_tier: '10kw_50kw',
      warranty_years: 10,
      stock_status: 'in_stock',
      stock_quantity: 40,
      short_description: 'High-density 15kWh wall-mounted energy storage system with 6,000+ deep discharge cycles and smart BMS.',
      description: 'Premium lithium iron phosphate (LiFePO4) battery system with built-in LCD screen, CAN/RS485 communications compatible with Deye, Victron, and Growatt inverters.',
      specifications: 'Usable Energy: 15.36kWh | Nominal Voltage: 51.2V | Capacity: 300Ah | Cycle Life: 6000 Cycles @ 80% DoD | Dimensions: 880×550×260mm',
      image_url: '/images/products/felicity-solar-battery.png',
      featured: 'NO'
    }
  ];

  sampleProducts.forEach((p, idx) => {
    const row = sheet.addRow(p);
    row.height = 22;
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: 'Calibri', size: 10.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // 2. Instructions Sheet
  const instructionsSheet = workbook.addWorksheet('Instructions & Guidance');
  instructionsSheet.columns = [
    { header: 'Column Field', key: 'field', width: 26 },
    { header: 'Required?', key: 'required', width: 14 },
    { header: 'Valid Format & Guidance', key: 'guidance', width: 65 }
  ];

  const instructionsHeader = instructionsSheet.getRow(1);
  instructionsHeader.height = 26;
  instructionsHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const guidelines = [
    { field: 'Product Name', required: 'YES', guidance: 'Commercial product title (e.g. Jinko Solar 550W Bifacial Panel). Length 3–150 characters.' },
    { field: 'SKU', required: 'YES', guidance: 'Unique alphanumeric identifier. If SKU exists in store, product will be updated. If SKU is new, a new product is created.' },
    { field: 'Category', required: 'YES', guidance: 'Solar Panels, Inverters, Batteries, Solar Packages, Mounting Accessories, Electrical Accessories, or Portable Power.' },
    { field: 'Brand', required: 'Optional', guidance: 'Manufacturer name (e.g. Jinko, Growatt, Deye, EcoFlow). Defaults to DEVICE PRO if left blank.' },
    { field: 'Selling Price (NGN)', required: 'YES', guidance: 'Customer retail price in Nigerian Naira. Numbers only (e.g. 245000 or ₦245,000).' },
    { field: 'Cost Price (NGN)', required: 'Optional', guidance: 'Internal supplier wholesale cost. Used for profit calculation and cost tracking.' },
    { field: 'Previous Price (NGN)', required: 'Optional', guidance: 'Original price for strikethrough discount display on storefront.' },
    { field: 'Power Rating', required: 'Optional', guidance: 'Equipment capacity rating (e.g. 550W, 5kVA, 10kWh, 100A).' },
    { field: 'Warranty (Years)', required: 'Optional', guidance: 'Number of warranty years (e.g. 5, 10, 25). Defaults to 5 years.' },
    { field: 'Stock Status', required: 'Optional', guidance: 'in_stock, low_stock, out_of_stock, or pre_order. Defaults to in_stock.' },
    { field: 'Stock Quantity', required: 'Optional', guidance: 'Units in warehouse. Defaults to 50.' },
    { field: 'Short Description', required: 'Optional', guidance: '1-2 sentence lead summary shown on category product cards.' },
    { field: 'Full Description', required: 'Optional', guidance: 'Detailed product description displayed on public product detail page.' },
    { field: 'Technical Specifications', required: 'Optional', guidance: 'Pipe-separated key:value pairs. Example: Max Power: 550W | Voltage: 48V | Efficiency: 21.5%' },
    { field: 'Image URL', required: 'Optional', guidance: 'Web URL (https://...) or site image path (/images/products/...).' },
    { field: 'Featured', required: 'Optional', guidance: 'YES or NO. If YES, pins item to the homepage and catalog top.' }
  ];

  guidelines.forEach((g, idx) => {
    const row = instructionsSheet.addRow(g);
    row.height = 20;
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: 'Calibri', size: 10.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildProductImportTemplateWorkbook() {
  return generateProductImportTemplate();
}

/**
 * Parses raw cell value into clean string or number
 */
function cleanCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.result !== undefined) return cleanCellValue(val.result);
    if (val.text !== undefined) return cleanCellValue(val.text);
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map(t => t.text || '').join('').trim();
    }
    return String(val).trim();
  }
  return String(val).trim();
}

/**
 * Parses raw monetary input into integer NGN
 */
function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || val < 0 ? null : Math.round(val);
  }
  const cleanStr = String(val).replace(/[^0-9.]/g, '');
  if (!cleanStr) return null;
  const num = parseFloat(cleanStr);
  return isNaN(num) || num < 0 ? null : Math.round(num);
}

/**
 * Parses uploaded spreadsheet file in memory
 */
async function parseProductCatalogFile(bufferOrBase64, filename = 'products.xlsx') {
  let buffer;
  if (Buffer.isBuffer(bufferOrBase64)) {
    buffer = bufferOrBase64;
  } else if (typeof bufferOrBase64 === 'string') {
    const base64Clean = bufferOrBase64.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64Clean, 'base64');
  } else {
    throw new Error('Invalid file payload: Expected Buffer or Base64 string.');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds the maximum allowed limit of 5.0MB.`);
  }

  const isCsv = /\.csv$/i.test(filename);
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error('Spreadsheet must contain a header row and at least one product data row.');
  }

  // 1. Identify columns from header row
  const headerRow = worksheet.getRow(1);
  const colIndexToKey = {};
  const detectedMapping = {};

  headerRow.eachCell((cell, colNumber) => {
    const rawText = cleanCellValue(cell.value);
    const matchedKey = matchFieldKey(rawText);
    if (matchedKey) {
      colIndexToKey[colNumber] = matchedKey;
      detectedMapping[matchedKey] = rawText;
    }
  });

  // Verify mandatory columns
  const missingRequired = [];
  if (!detectedMapping.name) missingRequired.push('Product Name');
  if (!detectedMapping.sku) missingRequired.push('SKU');
  if (!detectedMapping.price_ngn) missingRequired.push('Selling Price (NGN)');

  if (missingRequired.length > 0) {
    throw new Error(`Missing mandatory columns: ${missingRequired.join(', ')}. Please use the official template.`);
  }

  // 2. Load existing active products from DB to perform SKU matching
  await ensureDb();
  const existingProducts = await Product.find({ published: 1 }).lean();
  const skuToExisting = new Map();
  existingProducts.forEach(p => {
    if (p.sku) {
      skuToExisting.set(p.sku.trim().toUpperCase(), p);
    }
  });

  // 3. Parse and validate each data row
  const parsedRows = [];
  const seenSkusInFile = new Map();
  const rowCount = Math.min(worksheet.rowCount, MAX_DATA_ROWS + 1);

  for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    
    // Check if entire row is empty
    let hasAnyData = false;
    row.eachCell(() => { hasAnyData = true; });
    if (!hasAnyData) continue;

    const rowData = {};
    for (const [colIndex, key] of Object.entries(colIndexToKey)) {
      rowData[key] = cleanCellValue(row.getCell(Number(colIndex)).value);
    }

    const rowErrors = [];

    // Name validation
    const name = (rowData.name || '').trim();
    if (!name || name.length < 2) {
      rowErrors.push('Product name is required (min 2 characters).');
    }

    // SKU validation & duplicate check
    const rawSku = (rowData.sku || '').trim().toUpperCase();
    if (!rawSku) {
      rowErrors.push('SKU is required.');
    } else {
      if (seenSkusInFile.has(rawSku)) {
        rowErrors.push(`Duplicate SKU "${rawSku}" in spreadsheet (Row ${seenSkusInFile.get(rawSku)} and Row ${rowNumber}).`);
      } else {
        seenSkusInFile.set(rawSku, rowNumber);
      }
    }

    // Selling Price validation
    const priceNgn = parsePrice(rowData.price_ngn);
    if (priceNgn === null || priceNgn <= 0) {
      rowErrors.push('Selling Price must be a valid positive number in NGN.');
    }

    // Cost Price validation
    const costPriceNgn = parsePrice(rowData.cost_price_ngn) || 0;

    // Previous Price validation
    const prevPriceNgn = parsePrice(rowData.previous_price_ngn);

    // Category normalization
    let categoryKey = 'accessories';
    let categoryLabel = 'Accessories';
    if (rowData.category) {
      const normCat = normalizeHeader(rowData.category);
      if (CATEGORY_MAP[normCat]) {
        categoryKey = CATEGORY_MAP[normCat].slug;
        categoryLabel = CATEGORY_MAP[normCat].label;
      } else {
        categoryKey = normCat.replace(/[^a-z0-9]+/g, '-');
        categoryLabel = rowData.category.trim();
      }
    }

    // Brand
    const brand = (rowData.brand || 'DEVICE PRO').trim();

    // Stock Status & Qty
    let stockStatus = (rowData.stock_status || 'in_stock').toLowerCase().replace(/\s+/g, '_');
    if (!['in_stock', 'low_stock', 'out_of_stock', 'pre_order', 'discontinued'].includes(stockStatus)) {
      stockStatus = 'in_stock';
    }
    const stockQty = !isNaN(parseInt(rowData.stock_quantity, 10)) ? parseInt(rowData.stock_quantity, 10) : 50;

    // Warranty
    const warrantyYears = !isNaN(parseInt(rowData.warranty_years, 10)) ? parseInt(rowData.warranty_years, 10) : 5;

    // Featured flag
    const featured = /^(yes|true|1|y)$/i.test(rowData.featured || '') ? 1 : 0;

    // Image URL check
    let imageUrl = (rowData.image_url || '').trim();
    if (imageUrl && !/^(https?:\/\/|\/|images\/)/i.test(imageUrl)) {
      rowErrors.push('Image URL must start with http://, https://, or /images/...');
    }

    // SKU diffing against DB
    const existing = rawSku ? skuToExisting.get(rawSku) : null;
    let action = 'CREATE_NEW';
    let matchedProductId = null;
    let matchedProductSlug = null;
    let oldPriceNgn = null;
    let priceDiffNgn = null;
    let priceDiffPercent = null;

    if (existing) {
      action = 'UPDATE_EXISTING';
      matchedProductId = existing.id;
      matchedProductSlug = existing.slug;
      oldPriceNgn = existing.price_ngn || 0;
      priceDiffNgn = priceNgn ? (priceNgn - oldPriceNgn) : 0;
      priceDiffPercent = oldPriceNgn > 0 ? Number(((priceDiffNgn / oldPriceNgn) * 100).toFixed(1)) : 0;
    }

    const isValid = rowErrors.length === 0;

    parsedRows.push({
      row_index: rowNumber,
      action: isValid ? action : 'VALIDATION_ERROR',
      status: isValid ? (action === 'CREATE_NEW' ? 'NEW PRODUCT' : 'UPDATE EXISTING') : 'ERROR',
      is_valid: isValid,
      errors: rowErrors,
      
      // Parsed product attributes
      name,
      sku: rawSku,
      category: categoryKey,
      category_label: categoryLabel,
      brand,
      price_ngn: priceNgn,
      cost_price_ngn: costPriceNgn,
      previous_price_ngn: prevPriceNgn,
      power_rating: rowData.power_rating || '',
      power_tier: rowData.power_tier || '',
      warranty_years: warrantyYears,
      stock_status: stockStatus,
      stock_quantity: stockQty,
      short_description: rowData.short_description || '',
      description: rowData.description || rowData.short_description || '',
      specifications: rowData.specifications || '',
      image_url: imageUrl || '',
      featured,

      // Match info
      matched_product_id: matchedProductId,
      matched_product_slug: matchedProductSlug,
      old_price_ngn: oldPriceNgn,
      price_diff_ngn: priceDiffNgn,
      price_diff_percent: priceDiffPercent,
      price_diff: oldPriceNgn !== null ? {
        current: oldPriceNgn,
        new: priceNgn,
        diff: priceDiffNgn,
        pct: priceDiffPercent
      } : null
    });
  }

  // Summary counts
  const validRows = parsedRows.filter(r => r.is_valid);
  const createCount = validRows.filter(r => r.action === 'CREATE_NEW').length;
  const updateCount = validRows.filter(r => r.action === 'UPDATE_EXISTING').length;
  const errorCount = parsedRows.filter(r => !r.is_valid).length;

  const summary = {
    total_rows: parsedRows.length,
    valid_rows: validRows.length,
    create_count: createCount,
    new_products_count: createCount,
    update_count: updateCount,
    update_products_count: updateCount,
    error_count: errorCount
  };

  return {
    success: true,
    summary,
    rows: parsedRows,
    detected_mapping: detectedMapping
  };
}

/**
 * Applies validated product rows to MongoDB Atlas (Creates new and/or updates existing)
 */
async function applyProductCatalogImport(rowsToApply = [], options = {}, adminUser = null) {
  if (!Array.isArray(rowsToApply) || rowsToApply.length === 0) {
    throw new Error('No product rows provided for import.');
  }

  await ensureDb();

  const mode = options.mode || 'all'; // 'all', 'create_only', 'update_only'
  const filterRows = rowsToApply.filter(r => {
    if (!r.is_valid) return false;
    if (mode === 'create_only') return r.action === 'CREATE_NEW';
    if (mode === 'update_only') return r.action === 'UPDATE_EXISTING';
    return true; // 'all'
  });

  if (filterRows.length === 0) {
    throw new Error(`No eligible product rows match selected mode "${mode}".`);
  }

  // Find max sequence ID in catalog
  const maxDoc = await Product.findOne().sort({ id: -1 }).select('id').lean();
  let nextId = (maxDoc && maxDoc.id) ? maxDoc.id + 1 : 1;

  let createdCount = 0;
  let updatedCount = 0;
  const results = [];

  for (const r of filterRows) {
    try {
      if (r.action === 'CREATE_NEW') {
        // Generate unique slug
        const baseSlug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let slug = baseSlug;
        const slugExists = await Product.findOne({ slug }).lean();
        if (slugExists) {
          slug = `${baseSlug}-${r.sku.toLowerCase()}`;
          const secondCheck = await Product.findOne({ slug }).lean();
          if (secondCheck) {
            slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
          }
        }

        // Determine fallback image if empty
        let finalImage = r.image_url;
        if (!finalImage) {
          if (r.category === 'solar-panels') finalImage = '/images/products/jinko-solar-panel.png';
          else if (r.category === 'inverters') finalImage = '/images/products/growatt-inverter.png';
          else if (r.category === 'batteries') finalImage = '/images/products/pylontech-battery.png';
          else if (r.category === 'portable-power') finalImage = '/images/products/ecoflow-power-station.png';
          else finalImage = '/images/logo-mark.svg';
        }

        const newProd = new Product({
          id: nextId++,
          name: r.name,
          slug,
          brand: r.brand,
          category: r.category,
          category_label: r.category_label,
          sku: r.sku,
          price_ngn: r.price_ngn,
          cost_price_ngn: r.cost_price_ngn || 0,
          previous_price_ngn: r.previous_price_ngn || null,
          power_rating: r.power_rating || 'Standard',
          power_tier: r.power_tier || 'standard',
          warranty_years: r.warranty_years || 5,
          stock_status: r.stock_status || 'in_stock',
          stock_quantity: r.stock_quantity || 50,
          description: r.description || r.short_description || '',
          specifications: r.specifications || '',
          image_url: finalImage,
          featured: r.featured || 0,
          published: 1
        });

        await newProd.save();
        createdCount++;

        // Audit log for each creation
        await AuditLog.create({
          id: Date.now() + Math.floor(Math.random() * 1000),
          user_id: adminUser?.id || null,
          username: adminUser?.username || 'admin',
          action: 'CREATE_PRODUCT',
          entity_type: 'product',
          entity_id: String(newProd.id),
          details: `Bulk Onboarded new product: "${r.name}" (SKU: ${r.sku}, ₦${r.price_ngn.toLocaleString()})`,
          metadata: { productId: newProd.id, sku: r.sku, price_ngn: r.price_ngn },
          ip_address: adminUser?.ip || '127.0.0.1'
        });

        results.push({
          sku: r.sku,
          name: r.name,
          action: 'CREATED',
          id: newProd.id,
          slug: newProd.slug,
          price_ngn: newProd.price_ngn
        });

      } else if (r.action === 'UPDATE_EXISTING') {
        const updateFields = {
          price_ngn: r.price_ngn,
          name: r.name,
          brand: r.brand,
          category: r.category,
          category_label: r.category_label,
          warranty_years: r.warranty_years,
          stock_status: r.stock_status,
          stock_quantity: r.stock_quantity
        };

        if (r.cost_price_ngn) updateFields.cost_price_ngn = r.cost_price_ngn;
        if (r.previous_price_ngn) updateFields.previous_price_ngn = r.previous_price_ngn;
        if (r.description) updateFields.description = r.description;
        if (r.specifications) updateFields.specifications = r.specifications;
        if (r.image_url) updateFields.image_url = r.image_url;
        if (r.power_rating) updateFields.power_rating = r.power_rating;
        if (r.power_tier) updateFields.power_tier = r.power_tier;

        const updatedDoc = await Product.findOneAndUpdate(
          { sku: r.sku },
          { $set: updateFields },
          { new: true }
        ).lean();

        if (updatedDoc) {
          updatedCount++;

          await AuditLog.create({
            id: Date.now() + Math.floor(Math.random() * 1000),
            user_id: adminUser?.id || null,
            username: adminUser?.username || 'admin',
            action: 'UPDATE_PRODUCT',
            entity_type: 'product',
            entity_id: String(updatedDoc.id),
            details: `Bulk Updated product: "${r.name}" (SKU: ${r.sku}, ₦${r.price_ngn.toLocaleString()})`,
            metadata: { productId: updatedDoc.id, sku: r.sku, price_ngn: r.price_ngn },
            ip_address: adminUser?.ip || '127.0.0.1'
          });

          results.push({
            sku: r.sku,
            name: r.name,
            action: 'UPDATED',
            id: updatedDoc.id,
            slug: updatedDoc.slug,
            price_ngn: updatedDoc.price_ngn
          });
        }
      }
    } catch (rowErr) {
      console.error(`[BULK PRODUCT IMPORT ERROR on SKU ${r.sku}]:`, rowErr.message);
      results.push({
        sku: r.sku,
        name: r.name,
        action: 'FAILED',
        error: rowErr.message
      });
    }
  }

  // Include non-eligible / invalid rows in results
  const skippedOrInvalidRows = rowsToApply.filter(r => !filterRows.includes(r));
  for (const s of skippedOrInvalidRows) {
    results.push({
      sku: s.sku || '—',
      name: s.name || '—',
      action: s.is_valid ? 'SKIPPED_BY_MODE' : 'FAILED_VALIDATION',
      error: !s.is_valid ? ((s.errors && s.errors.length) ? s.errors.join('; ') : 'Row failed validation') : `Skipped due to mode "${mode}"`
    });
  }

  // Summary audit log
  await AuditLog.create({
    id: Date.now() + Math.floor(Math.random() * 1000),
    user_id: adminUser?.id || null,
    username: adminUser?.username || 'admin',
    action: 'PRODUCT_BULK_ONBOARDED',
    entity_type: 'product_catalog',
    entity_id: 'bulk_import',
    details: `Executed bulk product import: ${createdCount} created, ${updatedCount} updated across ${filterRows.length} rows.`,
    metadata: { createdCount, updatedCount, totalProcessed: filterRows.length, totalSubmitted: rowsToApply.length },
    ip_address: adminUser?.ip || '127.0.0.1'
  });

  return {
    success: true,
    summary: {
      total_submitted: rowsToApply.length,
      total_processed: filterRows.length,
      created_count: createdCount,
      updated_count: updatedCount,
      failed_count: rowsToApply.length - (createdCount + updatedCount)
    },
    results
  };
}

module.exports = {
  generateProductImportTemplate,
  buildProductImportTemplateWorkbook,
  parseProductCatalogFile,
  applyProductCatalogImport,
  CATEGORY_MAP
};
