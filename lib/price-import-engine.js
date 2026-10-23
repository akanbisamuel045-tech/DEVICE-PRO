/**
 * DEVICE PRO — Supplier Price Import Processing & Review Engine (Stage 5 & Stage 6)
 * 
 * Provides:
 * 1. Safe, bounded parsing for Excel (.xlsx, .xls) and CSV formats in memory.
 * 2. Strict formula execution and macro prevention (zero formula evaluation, CSV formula sanitization).
 * 3. Automatic and manual column mapping for supplier fields.
 * 4. Conservative SKU matching against active catalog products (published: 1 only).
 * 5. Complete exclusion of archived / benchmark records from automatic matching.
 * 6. Internal supplier file duplicate SKU detection (flags all duplicate instances).
 * 7. Monetary validation for Nigerian Naira (NGN), rejecting negative, infinite, non-numeric, or foreign currencies.
 * 8. Summary statistics reconciliation across all rows.
 * 9. Standardized Excel & CSV template generation.
 * 10. STAGE 6: Review diff calculations, percentage changes, threshold warnings, eligibility assessment.
 */

const ExcelJS = require('exceljs');

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4.0 MB (Vercel serverless compatible)
const MAX_DATA_ROWS = 1000; // Safe upper bound to prevent event loop starvation

// Configurable threshold constants for cost variance alerts
const HIGH_VARIANCE_PERCENT = 30; // 30% delta triggers review warning
const SEVERE_VARIANCE_PERCENT = 100; // 100% delta triggers severe warning

/**
 * Standard column aliases for intelligent automatic mapping
 */
const COLUMN_ALIASES = {
  sku: [
    'sku', 'supplier sku', 'item sku', 'product sku', 'part number', 'part #',
    'part no', 'part no.', 'item code', 'item no', 'item #', 'product code',
    'model', 'model number', 'code', 'item part code', 'part code'
  ],
  name: [
    'product name', 'item name', 'name', 'product', 'item', 'description',
    'title', 'product description', 'item description', 'model description',
    'model title', 'item title'
  ],
  cost: [
    'supplier cost', 'cost', 'supplier price', 'cost price', 'unit cost',
    'purchase price', 'price', 'buying price', 'trade price', 'cost (ngn)',
    'price (ngn)', 'dealer price', 'wholesale price', 'net price',
    'supplier cost ngn', 'cost price ngn', 'wholesale rate ngn',
    'wholesale rate', 'rate', 'rate ngn', 'rate (ngn)'
  ],
  currency: [
    'currency', 'curr', 'curr.', 'currency code', 'curr code'
  ],
  brand: [
    'brand', 'manufacturer', 'mfr', 'make', 'brand name'
  ],
  category: [
    'category', 'cat', 'group', 'type', 'product category', 'classification'
  ],
  stock: [
    'stock', 'quantity', 'qty', 'stock status', 'availability', 'stock qty',
    'in stock', 'quantity available', 'stock info'
  ],
  supplier_ref: [
    'supplier ref', 'reference', 'ref', 'vendor sku', 'vendor code',
    'supplier reference', 'ref #'
  ]
};

/**
 * Normalizes an incoming SKU string: trims, removes unprintable characters, and converts to uppercase.
 */
function normalizeSku(rawSku) {
  if (rawSku === null || rawSku === undefined) return '';
  return String(rawSku)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Sanitizes cell text to protect against formula injection and XSS
 */
function sanitizeCellText(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Strip formula prefixes if present (=, +, -, @, \t, \r)
  str = str.replace(/^[=+\-@\t\r]+/, '');
  // Neutralize script / HTML tags
  str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return str;
}

/**
 * Parses monetary amounts, ensuring strictly valid non-negative NGN values.
 */
function parsePrice(rawVal, rowCurrency = 'NGN') {
  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return { valid: false, error: 'Price is empty' };
  }

  // Check currency
  const cleanCurr = (rowCurrency || 'NGN').toString().trim().toUpperCase();
  if (cleanCurr && !['NGN', 'NAIRA', '₦'].includes(cleanCurr)) {
    return { valid: false, error: `Unsupported currency "${cleanCurr}". Only NGN is supported.` };
  }

  let str = String(rawVal).trim();
  // Strip currency symbols and formatting commas
  str = str.replace(/[₦N]|NGN/gi, '').replace(/,/g, '').trim();

  // Validate numeric format
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    return { valid: false, error: `Invalid numeric price format "${rawVal}"` };
  }

  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Price is not a finite number' };
  }

  if (num < 0) {
    return { valid: false, error: `Invalid price: negative prices are not permitted (received ${num})` };
  }

  return { valid: true, value: Math.round(num) };
}

/**
 * Parses CSV buffer or string into 2D array of strings conforming to RFC 4180
 */
function parseCsv(bufferOrString) {
  const content = Buffer.isBuffer(bufferOrString)
    ? bufferOrString.toString('utf8')
    : String(bufferOrString);

  // Normalize newlines
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Parses Excel workbook (.xlsx) from buffer via ExcelJS
 */
async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Workbook contains no valid worksheets.');
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed in ExcelJS
    const values = Array.isArray(row.values)
      ? row.values.slice(1).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') {
            // Formula result or rich text
            return v.result !== undefined ? String(v.result) : (v.text || '');
          }
          return String(v);
        })
      : [];
    if (values.some(v => v.trim().length > 0)) {
      rows.push(values);
    }
  });

  return rows;
}

/**
 * Detects automatic column mappings based on header text
 * Returns an object mapping standard field name -> matched header text string
 */
function detectColumnMapping(headers) {
  const mapping = {};
  const lowerHeaders = headers.map(h => (h || '').toString().trim().toLowerCase());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let colIdx = 0; colIdx < lowerHeaders.length; colIdx++) {
      const header = lowerHeaders[colIdx];
      if (aliases.includes(header)) {
        mapping[field] = headers[colIdx]; // Store header string
        break;
      }
    }
  }

  return mapping;
}

/**
 * Resolves a mapping configuration value (header string or column index) to a column index
 */
function resolveColumnIndex(mappingVal, headers) {
  if (mappingVal === null || mappingVal === undefined || mappingVal === '') return -1;
  if (typeof mappingVal === 'number') {
    return (mappingVal >= 0 && mappingVal < headers.length) ? mappingVal : -1;
  }
  const str = String(mappingVal).trim();
  if (/^\d+$/.test(str)) {
    const parsed = parseInt(str, 10);
    if (parsed >= 0 && parsed < headers.length) return parsed;
  }
  const target = str.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if ((headers[i] || '').toString().trim().toLowerCase() === target) {
      return i;
    }
  }
  return -1;
}

/**
 * Computes simple token similarity score between 0 and 1
 */
function computeNameSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  if (!s1.length || !s2.length) return 0;

  const set2 = new Set(s2);
  const intersection = s1.filter(t => set2.has(t));
  return (2 * intersection.length) / (s1.length + s2.length);
}

/**
 * Main ingestion and analysis engine
 */
async function processSupplierPriceFile(input, options = {}) {
  let fileContent;
  let filename = 'supplier-prices.csv';
  let fileFormat = null;
  let customMapping = null;
  let activeProducts = [];
  let supplierName = 'Solar Equipment Supplier';

  if (Buffer.isBuffer(input) || typeof input === 'string') {
    fileContent = input;
    filename = options.filename || filename;
    fileFormat = options.fileFormat || options.format || null;
    customMapping = options.customMapping || options.mapping || null;
    activeProducts = options.activeProducts || [];
    supplierName = options.supplierName || supplierName;
  } else if (input && typeof input === 'object') {
    fileContent = input.buffer !== undefined ? input.buffer : (input.fileContent !== undefined ? input.fileContent : (input.csvText || ''));
    filename = input.filename || filename;
    fileFormat = input.fileFormat || input.format || null;
    customMapping = input.customMapping || input.mapping || null;
    activeProducts = input.activeProducts || [];
    supplierName = input.supplierName || supplierName;
  } else {
    throw new Error('Empty file provided. The uploaded file is empty.');
  }

  // 1. Format and size validation
  const extMatch = String(filename).match(/\.([a-zA-Z0-9]+)$/);
  const derivedFormat = extMatch ? extMatch[1].toLowerCase() : '';
  const cleanFormat = (fileFormat || derivedFormat || '').toLowerCase().replace(/^\./, '');

  if (!['xlsx', 'xls', 'csv'].includes(cleanFormat)) {
    throw new Error(`Unsupported file format ".${cleanFormat || 'unknown'}". Supported formats: .xlsx, .csv`);
  }

  const byteLength = Buffer.isBuffer(fileContent) ? fileContent.length : Buffer.byteLength(String(fileContent || ''));
  if (byteLength === 0) {
    throw new Error('Empty file provided. The uploaded file is empty.');
  }

  if (byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum permitted limit of 4.0 MB.`);
  }

  // 2. Parse raw tabular rows
  let rawRows = [];
  try {
    if (cleanFormat === 'csv') {
      rawRows = parseCsv(fileContent);
    } else {
      rawRows = await parseExcel(fileContent);
    }
  } catch (err) {
    throw new Error(`Corrupted or invalid ${cleanFormat.toUpperCase()} file: ${err.message}`);
  }

  if (!rawRows || rawRows.length < 2) {
    throw new Error('File must contain at least a header row and one valid data row.');
  }

  const headerRow = rawRows[0];
  const dataRows = rawRows.slice(1);

  if (dataRows.length > MAX_DATA_ROWS) {
    throw new Error(`File contains ${dataRows.length} data rows, which exceeds the maximum permitted limit of 1,000 rows.`);
  }

  // 3. Determine Column Mapping
  const autoMapping = detectColumnMapping(headerRow);
  const mapping = customMapping && typeof customMapping === 'object'
    ? { ...autoMapping, ...customMapping }
    : autoMapping;

  // Resolve column indexes
  const skuIdx = resolveColumnIndex(mapping.sku, headerRow);
  const costIdx = resolveColumnIndex(mapping.cost, headerRow);
  const nameIdx = resolveColumnIndex(mapping.name, headerRow);
  const brandIdx = resolveColumnIndex(mapping.brand, headerRow);
  const catIdx = resolveColumnIndex(mapping.category, headerRow);
  const currIdx = resolveColumnIndex(mapping.currency, headerRow);
  const stockIdx = resolveColumnIndex(mapping.stock, headerRow);
  const refIdx = resolveColumnIndex(mapping.supplier_ref, headerRow);

  if (skuIdx === -1 || costIdx === -1) {
    const missing = [];
    if (skuIdx === -1) missing.push('Supplier SKU');
    if (costIdx === -1) missing.push('Supplier Price/Cost');
    throw new Error(`Cannot map columns automatically. Missing required mappings for: ${missing.join(', ')}. Please configure column mapping.`);
  }

  // 4. Pre-index Active Catalog by SKU
  // Strict rule: Only active products (published: 1) are matched. Archived benchmark records are 100% excluded.
  const activeCatalogMap = new Map();
  const activeSkuCollisions = new Set();

  for (const prod of activeProducts) {
    if (prod.published !== 1) continue; // Exclude archived items
    const normSku = normalizeSku(prod.sku);
    if (!normSku) continue;

    if (activeCatalogMap.has(normSku)) {
      activeSkuCollisions.add(normSku);
    } else {
      activeCatalogMap.set(normSku, prod);
    }
  }

  // 5. Detect File-Level Duplicate SKUs
  const fileSkuCounts = new Map();
  for (const row of dataRows) {
    const rawSku = skuIdx !== -1 && row[skuIdx] !== undefined ? row[skuIdx] : '';
    const norm = normalizeSku(rawSku);
    if (norm) {
      fileSkuCounts.set(norm, (fileSkuCounts.get(norm) || 0) + 1);
    }
  }

  // 6. Process each row
  const processedRows = [];
  let validCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let duplicateInFileCount = 0;
  let duplicateInCatalogCount = 0;
  let invalidCount = 0;
  let requiresReviewCount = 0;
  let eligibleCount = 0;
  let highVarianceCount = 0;

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    const rowNumber = idx + 2; // 1-indexed, accounting for header
    const validationErrors = [];
    const warnings = [];

    const rawSku = skuIdx !== -1 && row[skuIdx] !== undefined ? sanitizeCellText(row[skuIdx]) : '';
    const normalizedSkuVal = normalizeSku(rawSku);

    const rawName = nameIdx !== -1 && row[nameIdx] !== undefined ? sanitizeCellText(row[nameIdx]) : '';
    const rawBrand = brandIdx !== -1 && row[brandIdx] !== undefined ? sanitizeCellText(row[brandIdx]) : '';
    const rawCategory = catIdx !== -1 && row[catIdx] !== undefined ? sanitizeCellText(row[catIdx]) : '';
    const rawCost = costIdx !== -1 && row[costIdx] !== undefined ? row[costIdx] : '';
    const rawCurrency = currIdx !== -1 && row[currIdx] !== undefined ? String(row[currIdx]).trim() : 'NGN';
    const rawStock = stockIdx !== -1 && row[stockIdx] !== undefined ? sanitizeCellText(row[stockIdx]) : '';
    const rawSupplierRef = refIdx !== -1 && row[refIdx] !== undefined ? sanitizeCellText(row[refIdx]) : '';

    // Price validation
    const priceResult = parsePrice(rawCost, rawCurrency);
    let normalizedCostNgn = 0;
    if (!priceResult.valid) {
      validationErrors.push(priceResult.error);
    } else {
      normalizedCostNgn = priceResult.value;
    }

    // SKU presence check
    if (!normalizedSkuVal) {
      validationErrors.push('Missing supplier SKU');
    }

    // Duplicate in file check
    const isDuplicateInFile = normalizedSkuVal && (fileSkuCounts.get(normalizedSkuVal) > 1);
    if (isDuplicateInFile) {
      warnings.push(`Duplicate SKU "${normalizedSkuVal}" appears ${fileSkuCounts.get(normalizedSkuVal)} times in this supplier file.`);
    }

    // Duplicate in catalog collision check
    const hasCatalogCollision = normalizedSkuVal && activeSkuCollisions.has(normalizedSkuVal);
    if (hasCatalogCollision) {
      validationErrors.push(`Multiple active products share SKU "${normalizedSkuVal}" in catalog. Manual resolution required.`);
    }

    // Catalog Matching Logic
    let matchedProduct = null;
    let matchingMethod = 'none';
    let suggestedMatch = null;

    if (normalizedSkuVal && !hasCatalogCollision) {
      matchedProduct = activeCatalogMap.get(normalizedSkuVal) || null;
      if (matchedProduct) {
        matchingMethod = 'exact_sku';
      } else {
        // Find possible name similarity suggestion (never treated as confirmed match)
        if (rawName && rawName.length >= 4) {
          let highestScore = 0;
          for (const prod of activeProducts) {
            if (prod.published !== 1) continue;
            const score = computeNameSimilarity(rawName, prod.name);
            if (score > 0.65 && score > highestScore) {
              highestScore = score;
              suggestedMatch = {
                id: prod.id,
                name: prod.name,
                sku: prod.sku,
                score: Math.round(score * 100)
              };
            }
          }
          if (suggestedMatch) {
            matchingMethod = 'No SKU match (name suggestion available)';
            warnings.push(`Suggested match by name similarity (${suggestedMatch.score}%): "${suggestedMatch.name}" [SKU: ${suggestedMatch.sku}]. Human confirmation required.`);
          } else {
            matchingMethod = 'No SKU match';
          }
        } else {
          matchingMethod = 'No SKU match';
        }
      }
    } else {
      matchingMethod = 'No SKU match';
    }

    // Determine row classification status
    let rowStatus = 'valid';
    if (!normalizedSkuVal) {
      rowStatus = 'missing_sku';
      invalidCount++;
    } else if (validationErrors.some(e => e.includes('Unsupported currency'))) {
      rowStatus = 'unsupported_currency';
      invalidCount++;
    } else if (validationErrors.some(e => e.toLowerCase().includes('price') || e.toLowerCase().includes('numeric') || e.toLowerCase().includes('negative'))) {
      rowStatus = 'invalid_price';
      invalidCount++;
    } else if (hasCatalogCollision) {
      rowStatus = 'duplicate_in_catalog';
      duplicateInCatalogCount++;
      requiresReviewCount++;
      invalidCount++;
    } else if (isDuplicateInFile) {
      rowStatus = 'duplicate_in_file';
      duplicateInFileCount++;
      requiresReviewCount++;
      invalidCount++;
    } else if (validationErrors.length > 0) {
      rowStatus = 'invalid_row';
      invalidCount++;
    } else {
      // Row has valid SKU, valid price, supported currency, no duplicates!
      validCount++;
      if (matchedProduct) {
        rowStatus = 'matched';
        matchedCount++;
      } else {
        rowStatus = 'unmatched';
        unmatchedCount++;
      }
    }

    // Stage 6: Current cost, diff calculation, variance detection, and eligibility
    const currentCost = matchedProduct
      ? (matchedProduct.cost_price_ngn !== undefined ? matchedProduct.cost_price_ngn : (matchedProduct.supplier_cost_ngn || 0))
      : 0;
    const costDiffNgn = (normalizedCostNgn > 0 && currentCost > 0) ? (normalizedCostNgn - currentCost) : (normalizedCostNgn > 0 ? normalizedCostNgn : 0);
    const costDiffPercent = currentCost > 0 ? Number(((costDiffNgn / currentCost) * 100).toFixed(1)) : 0;

    let varianceWarning = 'NONE';
    if (currentCost > 0) {
      if (costDiffPercent >= HIGH_VARIANCE_PERCENT) {
        varianceWarning = 'HIGH_VARIANCE_INCREASE';
        highVarianceCount++;
      } else if (costDiffPercent <= -HIGH_VARIANCE_PERCENT) {
        varianceWarning = 'HIGH_VARIANCE_DECREASE';
        highVarianceCount++;
      }
    }

    const isEligible = rowStatus === 'matched' &&
      matchedProduct !== null &&
      matchedProduct.published === 1 &&
      normalizedCostNgn > 0 &&
      (rawCurrency || 'NGN').toUpperCase() === 'NGN' &&
      validationErrors.length === 0 &&
      !isDuplicateInFile &&
      !hasCatalogCollision;

    if (isEligible) {
      eligibleCount++;
    }

    processedRows.push({
      row_number: rowNumber,
      raw_sku: rawSku,
      normalized_sku: normalizedSkuVal,
      raw_name: rawName,
      raw_brand: rawBrand,
      raw_category: rawCategory,
      raw_cost: rawCost,
      normalized_cost_ngn: normalizedCostNgn,
      currency: rawCurrency || 'NGN',
      stock_info: rawStock,
      supplier_ref: rawSupplierRef,
      matched_product_id: matchedProduct ? (matchedProduct.id || matchedProduct._id) : null,
      matched_product_name: matchedProduct ? matchedProduct.name : (suggestedMatch ? suggestedMatch.name : null),
      matched_product_sku: matchedProduct ? matchedProduct.sku : (suggestedMatch ? suggestedMatch.sku : null),
      matched_current_price_ngn: matchedProduct ? matchedProduct.price_ngn : null,
      matched_current_cost_ngn: currentCost,
      matching_method: matchingMethod,
      suggested_match: suggestedMatch,
      status: rowStatus,
      validation_errors: validationErrors,
      warnings,
      // Stage 6 review & approval fields
      cost_diff_ngn: costDiffNgn,
      cost_diff_percent: costDiffPercent,
      is_eligible_for_approval: isEligible,
      variance_warning: varianceWarning,
      approval_status: isEligible ? 'unapproved' : 'ineligible',
      approved_cost_ngn: null,
      approved_at: null,
      approved_by_email: '',
      application_status: 'pending',
      application_error: '',
      applied_at: null,
      applied_previous_cost_ngn: null
    });
  }

  const summary = {
    total_rows: dataRows.length,
    valid_rows: validCount,
    matched_rows: matchedCount,
    unmatched_rows: unmatchedCount,
    duplicate_in_file_rows: duplicateInFileCount,
    duplicate_in_catalog_rows: duplicateInCatalogCount,
    invalid_rows: invalidCount,
    requires_review_rows: requiresReviewCount,
    // Stage 6 metrics
    eligible_for_approval_rows: eligibleCount,
    approved_rows: 0,
    applied_rows: 0,
    failed_rows: 0,
    skipped_rows: 0,
    high_variance_rows: highVarianceCount
  };

  return {
    filename: sanitizeCellText(filename),
    file_format: cleanFormat,
    file_size_bytes: byteLength,
    headers: headerRow.map(h => sanitizeCellText(h)),
    detected_mapping: autoMapping,
    active_mapping: mapping,
    supplier_name: supplierName,
    summary,
    rows: processedRows
  };
}

/**
 * Re-validates an array of import rows against current active catalog
 */
function matchSupplierItemsAgainstCatalog(rows, activeProducts = []) {
  const activeCatalogMap = new Map();
  const activeSkuCollisions = new Set();

  for (const prod of activeProducts) {
    if (prod.published !== 1) continue;
    const normSku = normalizeSku(prod.sku);
    if (!normSku) continue;

    if (activeCatalogMap.has(normSku)) {
      activeSkuCollisions.add(normSku);
    } else {
      activeCatalogMap.set(normSku, prod);
    }
  }

  let matchedCount = 0;
  let unmatchedCount = 0;
  let validCount = 0;
  let invalidCount = 0;
  let eligibleCount = 0;
  let highVarianceCount = 0;

  const revalidatedRows = rows.map(r => {
    const normSku = r.normalized_sku;
    if (!normSku) {
      invalidCount++;
      return { ...r, status: 'missing_sku', matched_product_id: null, matched_product_sku: null, is_eligible_for_approval: false };
    }
    if (r.status === 'invalid_price' || r.status === 'unsupported_currency') {
      invalidCount++;
      return { ...r, is_eligible_for_approval: false };
    }
    if (activeSkuCollisions.has(normSku)) {
      invalidCount++;
      return { ...r, status: 'duplicate_in_catalog', matched_product_id: null, matched_product_sku: null, is_eligible_for_approval: false };
    }

    const matchedProduct = activeCatalogMap.get(normSku) || null;
    validCount++;

    if (matchedProduct) {
      matchedCount++;
      const currentCost = matchedProduct.cost_price_ngn !== undefined ? matchedProduct.cost_price_ngn : (matchedProduct.supplier_cost_ngn || 0);
      const proposedCost = Number(r.normalized_cost_ngn) || 0;
      const costDiffNgn = (proposedCost > 0 && currentCost > 0) ? (proposedCost - currentCost) : (proposedCost > 0 ? proposedCost : 0);
      const costDiffPercent = currentCost > 0 ? Number(((costDiffNgn / currentCost) * 100).toFixed(1)) : 0;

      let varianceWarning = 'NONE';
      if (currentCost > 0) {
        if (costDiffPercent >= HIGH_VARIANCE_PERCENT) {
          varianceWarning = 'HIGH_VARIANCE_INCREASE';
          highVarianceCount++;
        } else if (costDiffPercent <= -HIGH_VARIANCE_PERCENT) {
          varianceWarning = 'HIGH_VARIANCE_DECREASE';
          highVarianceCount++;
        }
      }

      const isEligible = matchedProduct.published === 1 &&
        proposedCost > 0 &&
        (r.currency || 'NGN').toUpperCase() === 'NGN' &&
        (!r.validation_errors || r.validation_errors.length === 0);

      if (isEligible) {
        eligibleCount++;
      }

      return {
        ...r,
        status: 'matched',
        matched_product_id: matchedProduct.id || matchedProduct._id,
        matched_product_name: matchedProduct.name,
        matched_product_sku: matchedProduct.sku,
        matched_current_price_ngn: matchedProduct.price_ngn,
        matched_current_cost_ngn: currentCost,
        cost_diff_ngn: costDiffNgn,
        cost_diff_percent: costDiffPercent,
        variance_warning: varianceWarning,
        is_eligible_for_approval: isEligible,
        matching_method: 'exact_sku'
      };
    } else {
      unmatchedCount++;
      return {
        ...r,
        status: 'unmatched',
        matched_product_id: null,
        matched_product_sku: null,
        is_eligible_for_approval: false,
        matching_method: 'No SKU match'
      };
    }
  });

  return {
    rows: revalidatedRows,
    summary: {
      total_rows: rows.length,
      valid_rows: validCount,
      matched_rows: matchedCount,
      unmatched_rows: unmatchedCount,
      invalid_rows: invalidCount,
      eligible_for_approval_rows: eligibleCount,
      high_variance_rows: highVarianceCount
    }
  };
}

/**
 * Stage 6: Prepares and refreshes an existing import document for review
 */
function preparePriceImportForReview(importDoc, activeProducts = []) {
  const activeCatalogMap = new Map();
  const activeSkuCollisions = new Set();

  for (const prod of activeProducts) {
    if (prod.published !== 1) continue;
    const normSku = normalizeSku(prod.sku);
    if (!normSku) continue;

    if (activeCatalogMap.has(normSku)) {
      activeSkuCollisions.add(normSku);
    } else {
      activeCatalogMap.set(normSku, prod);
    }
  }

  const rows = Array.isArray(importDoc.rows_preview) ? importDoc.rows_preview : (Array.isArray(importDoc) ? importDoc : []);
  let eligibleCount = 0;
  let highVarianceCount = 0;
  let totalCostDiff = 0;

  const refreshedRows = rows.map(r => {
    const normSku = r.normalized_sku || normalizeSku(r.raw_sku);
    let matchedProduct = null;
    let hasCatalogCollision = false;

    if (normSku) {
      if (activeSkuCollisions.has(normSku)) {
        hasCatalogCollision = true;
      } else {
        matchedProduct = activeCatalogMap.get(normSku) || null;
      }
    }

    const currentCost = matchedProduct
      ? (matchedProduct.cost_price_ngn !== undefined ? matchedProduct.cost_price_ngn : (matchedProduct.supplier_cost_ngn || 0))
      : (r.matched_current_cost_ngn || 0);

    const proposedCost = Number(r.normalized_cost_ngn) || 0;
    const costDiffNgn = (proposedCost > 0 && currentCost > 0) ? (proposedCost - currentCost) : (proposedCost > 0 ? proposedCost : 0);
    const costDiffPercent = currentCost > 0 ? Number(((costDiffNgn / currentCost) * 100).toFixed(1)) : 0;

    let varianceWarning = 'NONE';
    if (currentCost > 0) {
      if (costDiffPercent >= HIGH_VARIANCE_PERCENT) {
        varianceWarning = 'HIGH_VARIANCE_INCREASE';
      } else if (costDiffPercent <= -HIGH_VARIANCE_PERCENT) {
        varianceWarning = 'HIGH_VARIANCE_DECREASE';
      }
    }
    if (varianceWarning !== 'NONE') {
      highVarianceCount++;
    }

    const isEligible = (r.status === 'matched' || (!r.status && matchedProduct)) &&
      matchedProduct !== null &&
      matchedProduct.published === 1 &&
      proposedCost > 0 &&
      (r.currency || 'NGN').toUpperCase() === 'NGN' &&
      (!r.validation_errors || r.validation_errors.length === 0) &&
      r.status !== 'duplicate_in_file' &&
      !hasCatalogCollision;

    if (isEligible) {
      eligibleCount++;
      totalCostDiff += costDiffNgn;
    }

    let approvalStatus = r.approval_status;
    if (!isEligible) {
      approvalStatus = 'ineligible';
    } else if (!approvalStatus || approvalStatus === 'ineligible') {
      approvalStatus = 'unapproved';
    }

    return {
      ...r,
      matched_product_id: matchedProduct ? (matchedProduct.id || matchedProduct._id) : r.matched_product_id,
      matched_product_name: matchedProduct ? matchedProduct.name : r.matched_product_name,
      matched_product_sku: matchedProduct ? matchedProduct.sku : r.matched_product_sku,
      matched_current_price_ngn: matchedProduct ? matchedProduct.price_ngn : r.matched_current_price_ngn,
      matched_current_cost_ngn: currentCost,
      cost_diff_ngn: costDiffNgn,
      cost_diff_percent: costDiffPercent,
      is_eligible_for_approval: isEligible,
      variance_warning: varianceWarning,
      approval_status: approvalStatus,
      approved_cost_ngn: approvalStatus === 'approved' ? r.approved_cost_ngn : null,
      application_status: r.application_status || 'pending',
      application_error: r.application_error || ''
    };
  });

  return {
    rows: refreshedRows,
    summaryMetrics: {
      eligible_for_approval_rows: eligibleCount,
      high_variance_rows: highVarianceCount,
      total_estimated_cost_diff_ngn: totalCostDiff
    }
  };
}

/**
 * Generates an empty standardized template in Excel or CSV format
 */
async function generateImportTemplate(format = 'xlsx') {
  const headers = [
    'Supplier SKU',
    'Product Name',
    'Brand',
    'Category',
    'Supplier Cost',
    'Currency',
    'Stock Status',
    'Supplier Reference'
  ];

  const sampleRows = [
    ['JK-TIGER-NEO-550W', 'Jinko 550W Monocrystalline Bifacial Panel', 'Jinko Solar', 'solar-panels', 195000, 'NGN', 'in_stock', 'REF-JK-550'],
    ['GW-SPF-5000ES', 'Growatt 5kW 48V Off-Grid Hybrid Inverter', 'Growatt', 'inverters', 850000, 'NGN', 'in_stock', 'REF-GW-5K'],
    ['PY-US5000-48V', 'Pylontech 4.8kWh LiFePO4 Lithium Battery', 'Pylontech', 'batteries', 1350000, 'NGN', 'in_stock', 'REF-PY-48']
  ];

  if (format === 'csv') {
    let csv = headers.join(',') + '\n';
    for (const r of sampleRows) {
      csv += r.map(f => typeof f === 'string' && f.includes(',') ? `"${f}"` : f).join(',') + '\n';
    }
    return Buffer.from(csv, 'utf8');
  }

  // ExcelJS .xlsx format
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DEVICE PRO Price Template');
  ws.addRow(headers);
  for (const r of sampleRows) {
    ws.addRow(r);
  }

  // Styling header row for premium aesthetics
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0B2240' } // DEVICE PRO Deep Blue
  };

  ws.columns = [
    { width: 22 },
    { width: 42 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 20 }
  ];

  return wb.xlsx.writeBuffer();
}

module.exports = {
  processSupplierPriceFile,
  matchSupplierItemsAgainstCatalog,
  preparePriceImportForReview,
  generateImportTemplate,
  parseCsv,
  parseExcel,
  parsePrice,
  normalizeSku,
  sanitizeCellText,
  COLUMN_ALIASES,
  MAX_FILE_SIZE_BYTES,
  MAX_DATA_ROWS,
  HIGH_VARIANCE_PERCENT,
  SEVERE_VARIANCE_PERCENT
};
