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

// Stage 8.2: Configurable quotation freshness policy window (30 calendar days)
const FRESHNESS_WINDOW_DAYS = 30;

/**
 * Standard column aliases for intelligent automatic mapping
 */
const COLUMN_ALIASES = {
  sku: [
    'sku', 'supplier sku', 'item sku', 'product sku', 'part number', 'part #',
    'part no', 'part no.', 'item code', 'item no', 'item #', 'product code',
    'model', 'model number', 'code', 'item part code', 'part code',
    'device pro sku', 'catalog sku', 'devicepro sku', 'internal sku'
  ],
  name: [
    'product name', 'item name', 'name', 'product', 'item', 'description',
    'title', 'product description', 'item description', 'model description',
    'model title', 'item title'
  ],
  cost: [
    'supplier cost', 'cost', 'supplier price', 'cost price', 'cost price (ngn)', 'unit cost',
    'purchase price', 'price', 'buying price', 'trade price', 'cost (ngn)',
    'price (ngn)', 'dealer price', 'wholesale price', 'net price',
    'selling price', 'selling price (ngn)', 'selling price ngn',
    'supplier cost ngn', 'cost price ngn', 'wholesale rate ngn',
    'wholesale rate', 'rate', 'rate ngn', 'rate (ngn)',
    'quoted unit cost (ngn)', 'quoted unit cost', 'quoted cost', 'quoted cost (ngn)', 'quoted price'
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
    'supplier reference', 'ref #', 'supplier sku / model ref', 'supplier model ref', 'supplier product sku'
  ],
  quote_date: [
    'quote date', 'quotation date', 'date', 'price date', 'rate date',
    'quote_date', 'quoted date', 'date quoted', 'effective date',
    'quotation date (yyyy-mm-dd)'
  ],
  quote_expiry_date: [
    'quote expiry date', 'expiry date', 'valid until', 'validity date',
    'quote_expiry_date', 'expiry', 'valid to', 'expiration date',
    'quote valid until', 'quote expiry', 'validity expiry (yyyy-mm-dd)'
  ],
  availability: [
    'availability', 'lead time', 'delivery time', 'product availability',
    'stock status', 'stock availability', 'lead_time', 'availability / lead time'
  ],
  warranty: [
    'warranty', 'warranty terms', 'warranty period', 'guarantee',
    'commercial terms', 'terms', 'warranty & commercial terms'
  ],
  supplier_quote_ref: [
    'quotation ref', 'quote ref', 'quote id', 'quote #', 'quote no',
    'quotation ref / id', 'quote number', 'quotation reference', 'source reference'
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

  if (num === 0) {
    return { valid: false, error: 'Invalid price: price must be greater than zero' };
  }

  if (num > 100000000000 || !Number.isSafeInteger(Math.round(num))) {
    return { valid: false, error: `Invalid price: price exceeds maximum allowable threshold (${num})` };
  }

  return { valid: true, value: Math.round(num) };
}

/**
 * Parses a quotation date string, Date object, or Excel serial number.
 * Supports ISO (YYYY-MM-DD), Nigerian/UK (DD/MM/YYYY, DD-MM-YYYY), US (MM/DD/YYYY), and Excel serial numbers.
 * Timezone interpretation: West Africa Time (WAT, UTC+1) / standard UTC calendar dates.
 * 
 * Policy for ambiguous dates (e.g. 04/05/2026):
 * - If options.dateFormat is explicitly specified ('DD/MM/YYYY' or 'MM/DD/YYYY'), that format is strictly used.
 * - If options.dateFormat is not provided, and part1 <= 12 and part2 <= 12 and part1 !== part2:
 *   The date is flagged as ambiguous (isAmbiguous: true, valid: false) requiring explicit user resolution.
 * - If part1 > 12: unambiguously DD/MM/YYYY.
 * - If part2 > 12: unambiguously MM/DD/YYYY.
 * - If part1 === part2 (e.g. 05/05/2026): unambiguous identical calendar day/month.
 * 
 * Strict Calendar Validation:
 * - Prevents silent calendar rollover (e.g. 2026-04-31 or 2025-02-29).
 * 
 * @param {any} rawDate
 * @param {object} [options]
 * @param {string} [options.dateFormat] Optional explicit format: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
 * @returns {{ valid: boolean, date: Date | null, isAmbiguous: boolean, error: string | null }}
 */
function parseDate(rawDate, options = {}) {
  if (rawDate === null || rawDate === undefined || rawDate === '') {
    return { valid: false, date: null, isAmbiguous: false, error: 'Date is empty' };
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return { valid: true, date: rawDate, isAmbiguous: false, error: null };
  }

  // Handle Excel date serial number (number or numeric string between 25000 and 100000)
  const numericVal = typeof rawDate === 'number' ? rawDate : (typeof rawDate === 'string' && /^\d{5}$/.test(rawDate.trim()) ? parseInt(rawDate.trim(), 10) : null);
  if (numericVal !== null && numericVal >= 25000 && numericVal <= 100000) {
    // Excel 1900 leap year bug offset: serial > 60 corresponds to epoch 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + numericVal * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      return { valid: true, date: jsDate, isAmbiguous: false, error: null };
    }
  }

  const str = String(rawDate).trim();
  if (!str) {
    return { valid: false, date: null, isAmbiguous: false, error: 'Date is empty' };
  }

  // ISO format: YYYY-MM-DD or YYYY/MM/DD (optionally with time)
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);

    if (month < 0 || month > 11 || day < 1 || day > 31) {
      return { valid: false, date: null, isAmbiguous: false, error: `Invalid calendar month or day in ISO date "${rawDate}"` };
    }

    const date = new Date(Date.UTC(year, month, day));
    // Strict calendar verification: catches month day overflow like 2026-04-31 or 2025-02-29
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
      return { valid: false, date: null, isAmbiguous: false, error: `Invalid calendar date in ISO date "${rawDate}" (calendar rollover detected, e.g. non-leap year or invalid day of month)` };
    }
    return { valid: true, date, isAmbiguous: false, error: null };
  }

  // 1-2 digit parts followed by 4-digit year: Part1 / Part2 / Year or Part1 - Part2 - Year
  const sepMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (sepMatch) {
    const part1 = parseInt(sepMatch[1], 10);
    const part2 = parseInt(sepMatch[2], 10);
    const year = parseInt(sepMatch[3], 10);

    const explicitFormat = (options.dateFormat || options.format || '').toUpperCase();
    let day = null;
    let month = null;

    if (explicitFormat === 'DD/MM/YYYY' || explicitFormat === 'DD-MM-YYYY' || explicitFormat === 'DMY') {
      day = part1;
      month = part2 - 1;
    } else if (explicitFormat === 'MM/DD/YYYY' || explicitFormat === 'MM-DD-YYYY' || explicitFormat === 'MDY') {
      month = part1 - 1;
      day = part2;
    } else {
      // No explicit format declared: evaluate ambiguity
      if (part1 <= 12 && part2 <= 12) {
        if (part1 === part2) {
          // Identical numbers (e.g. 05/05/2026), not ambiguous
          day = part1;
          month = part1 - 1;
        } else {
          // Ambiguous: could be DD/MM/YYYY or MM/DD/YYYY
          return {
            valid: false,
            date: null,
            isAmbiguous: true,
            error: `Ambiguous date format "${rawDate}": cannot reliably distinguish day from month. Please specify dateFormat ('DD/MM/YYYY' or 'MM/DD/YYYY') or provide ISO format (YYYY-MM-DD).`
          };
        }
      } else if (part1 > 12 && part2 <= 12) {
        // Unambiguously DD/MM/YYYY (e.g. 24/10/2026)
        day = part1;
        month = part2 - 1;
      } else if (part1 <= 12 && part2 > 12) {
        // Unambiguously MM/DD/YYYY (e.g. 10/24/2026)
        month = part1 - 1;
        day = part2;
      } else {
        // Both part1 and part2 are > 12
        return { valid: false, date: null, isAmbiguous: false, error: `Invalid date format "${rawDate}": both parts exceed 12` };
      }
    }

    if (month === null || month < 0 || month > 11 || day === null || day < 1 || day > 31) {
      return { valid: false, date: null, isAmbiguous: false, error: `Invalid calendar values in date "${rawDate}"` };
    }

    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
      return { valid: false, date: null, isAmbiguous: false, error: `Invalid calendar date in "${rawDate}" (calendar rollover detected, e.g. non-leap year or invalid day of month)` };
    }

    return { valid: true, date, isAmbiguous: false, error: null };
  }

  // Handle standard ISO timestamp strings (e.g. 2026-10-24T12:00:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return { valid: true, date: parsed, isAmbiguous: false, error: null };
    }
  }

  return { valid: false, date: null, isAmbiguous: false, error: `Invalid date format "${rawDate}"` };
}

/**
 * Evaluates supplier quotation freshness against the 30-calendar-day business policy window.
 * Calendar interpretation: UTC / West Africa Time (WAT, GMT+1).
 * 
 * Rules:
 * 1. Missing date -> status: 'date_missing' with review warning.
 * 2. Ambiguous date -> status: 'date_ambiguous' with review warning.
 * 3. Future date (> 1 day clock skew) -> status: 'future_date' with review warning.
 * 4. Expired quotation (expiry_date < referenceDate) -> status: 'expired' with review warning.
 * 5. Stale quotation (age > 30 calendar days) -> status: 'stale' with review warning.
 * 6. Fresh quotation (age <= 30 calendar days) -> status: 'fresh' with zero warnings.
 * 
 * Under NO circumstances does the engine silently discard or auto-apply stale quotes.
 * 
 * @param {Date | string | null} quoteDate
 * @param {Date | string | null} [quoteExpiryDate]
 * @param {Date} [referenceDate] Defaults to current system time
 * @param {object} [options]
 * @returns {{ status: string, warnings: string[], daysOld: number | null, stale: boolean, expired: boolean, ambiguous: boolean }}
 */
function evaluateQuotationFreshness(quoteDate, quoteExpiryDate = null, referenceDate = new Date(), options = {}) {
  const warnings = [];
  let status = 'date_missing';

  if (!quoteDate) {
    status = 'date_missing';
    warnings.push('Quotation date was not provided; quote freshness cannot be verified. Human review required.');
    return { status, stale: false, expired: false, ambiguous: false, warning: warnings.join('; '), warnings, daysOld: null };
  }

  const qResult = parseDate(quoteDate, options);
  if (!qResult.valid || !qResult.date) {
    if (qResult.isAmbiguous) {
      status = 'date_ambiguous';
      warnings.push(qResult.error || `Ambiguous quotation date format ("${quoteDate}"). Clarification required.`);
      return { status, stale: false, expired: false, ambiguous: true, warning: warnings.join('; '), warnings, daysOld: null };
    }
    status = 'date_missing';
    warnings.push(`Quotation date format is invalid ("${quoteDate}"). Human review required.`);
    return { status, stale: false, expired: false, ambiguous: false, warning: warnings.join('; '), warnings, daysOld: null };
  }

  const qDate = qResult.date;
  const refTime = referenceDate instanceof Date ? referenceDate.getTime() : Date.now();
  const qTime = qDate.getTime();
  const diffMs = refTime - qTime;
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Check future date (> 1 day in future to allow for timezone offset)
  if (diffMs < -86400 * 1000) {
    status = 'future_date';
    warnings.push(`Quotation date (${qDate.toISOString().slice(0, 10)}) is in the future. Verification required.`);
    return { status, stale: false, expired: false, ambiguous: false, warning: warnings.join('; '), warnings, daysOld };
  }

  // Check explicit expiry date
  if (quoteExpiryDate) {
    const expResult = parseDate(quoteExpiryDate, options);
    if (expResult.valid && expResult.date) {
      if (expResult.date.getTime() < refTime) {
        status = 'expired';
        warnings.push(`Quotation expired on ${expResult.date.toISOString().slice(0, 10)}. Supplier re-validation required.`);
        return { status, stale: false, expired: true, ambiguous: false, warning: warnings.join('; '), warnings, daysOld };
      }
    } else if (expResult.isAmbiguous) {
      warnings.push(expResult.error || `Ambiguous quotation expiry date format ("${quoteExpiryDate}").`);
    }
  }

  // Check 30-day window policy
  if (daysOld > FRESHNESS_WINDOW_DAYS) {
    status = 'stale';
    warnings.push(`Quotation is ${daysOld} days old (exceeds the ${FRESHNESS_WINDOW_DAYS} calendar days freshness window). Market price re-verification recommended.`);
    return { status, stale: true, expired: false, ambiguous: false, warning: warnings.join('; '), warnings, daysOld };
  }

  status = 'fresh';
  return { status, stale: false, expired: false, ambiguous: false, warning: warnings.join('; '), warnings, daysOld };
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
  const cleanHeaders = headers.map(h => (h || '').toString().replace(/[*()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const rawLower = lowerHeaders[colIdx];
      const cleaned = cleanHeaders[colIdx];
      if (aliases.includes(rawLower) || aliases.includes(cleaned)) {
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
  // Stage 8.2 Quotation traceability columns
  const quoteDateIdx = resolveColumnIndex(mapping.quote_date, headerRow);
  const quoteExpiryIdx = resolveColumnIndex(mapping.quote_expiry_date, headerRow);
  const availIdx = resolveColumnIndex(mapping.availability, headerRow);
  const warrantyIdx = resolveColumnIndex(mapping.warranty, headerRow);
  const quoteRefIdx = resolveColumnIndex(mapping.supplier_quote_ref, headerRow);

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
  let staleRowCount = 0;
  let expiredRowCount = 0;

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

    // Stage 8.2: Quotation traceability fields
    const rawQuoteDate = quoteDateIdx !== -1 && row[quoteDateIdx] !== undefined ? row[quoteDateIdx] : (options.quoteDate || null);
    const rawQuoteExpiry = quoteExpiryIdx !== -1 && row[quoteExpiryIdx] !== undefined ? row[quoteExpiryIdx] : (options.quoteExpiryDate || null);
    const rawAvailability = availIdx !== -1 && row[availIdx] !== undefined ? sanitizeCellText(row[availIdx]) : (rawStock || '');
    const rawWarranty = warrantyIdx !== -1 && row[warrantyIdx] !== undefined ? sanitizeCellText(row[warrantyIdx]) : '';
    const rawQuoteRef = quoteRefIdx !== -1 && row[quoteRefIdx] !== undefined ? sanitizeCellText(row[quoteRefIdx]) : (options.supplierQuoteRef || rawSupplierRef || '');

    // Parse quotation dates & evaluate row freshness
    let rowParsedQuoteDate = null;
    let rowParsedExpiryDate = null;
    if (rawQuoteDate) {
      const qResult = parseDate(rawQuoteDate, { dateFormat: options.dateFormat });
      if (qResult.valid) {
        rowParsedQuoteDate = qResult.date;
      } else {
        warnings.push(qResult.error || `Invalid quotation date format "${rawQuoteDate}".`);
      }
    }
    if (rawQuoteExpiry) {
      const expResult = parseDate(rawQuoteExpiry, { dateFormat: options.dateFormat });
      if (expResult.valid) {
        rowParsedExpiryDate = expResult.date;
      } else {
        warnings.push(expResult.error || `Invalid quotation expiry date format "${rawQuoteExpiry}".`);
      }
    }

    const rowFreshness = evaluateQuotationFreshness(
      rawQuoteDate || rowParsedQuoteDate,
      rawQuoteExpiry || rowParsedExpiryDate,
      options.referenceDate,
      { dateFormat: options.dateFormat }
    );
    if (rowFreshness.status !== 'fresh' && rowFreshness.warnings.length > 0) {
      warnings.push(...rowFreshness.warnings);
    }
    if (rowFreshness.status === 'stale') {
      staleRowCount++;
    } else if (rowFreshness.status === 'expired') {
      expiredRowCount++;
    } else if (rowFreshness.status === 'date_ambiguous') {
      requiresReviewCount++;
    }

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
      match_status: rowStatus,
      matched_sku: matchedProduct ? matchedProduct.sku : null,
      validation_errors: validationErrors,
      warnings,
      // Stage 8.2 row-level quotation metadata
      quote_date: rowParsedQuoteDate,
      quote_expiry_date: rowParsedExpiryDate,
      availability: rawAvailability,
      warranty_terms: rawWarranty,
      quote_ref: rawQuoteRef,
      freshness_status: rowFreshness.status,
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

  // Derive file-level quotation dates and overall freshness status
  const fileQuoteDateResult = options.quoteDate
    ? parseDate(options.quoteDate, { dateFormat: options.dateFormat })
    : null;
  const fileQuoteDate = fileQuoteDateResult?.date || (processedRows.find(r => r.quote_date)?.quote_date || null);

  const fileQuoteExpiryResult = options.quoteExpiryDate
    ? parseDate(options.quoteExpiryDate, { dateFormat: options.dateFormat })
    : null;
  const fileQuoteExpiryDate = fileQuoteExpiryResult?.date || (processedRows.find(r => r.quote_expiry_date)?.quote_expiry_date || null);

  const overallFreshness = evaluateQuotationFreshness(
    options.quoteDate || fileQuoteDate,
    options.quoteExpiryDate || fileQuoteExpiryDate,
    options.referenceDate,
    { dateFormat: options.dateFormat }
  );
  const fileQuoteRef = options.supplierQuoteRef || (processedRows.find(r => r.quote_ref)?.quote_ref || '');

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
    high_variance_rows: highVarianceCount,
    // Stage 8.2 metrics
    stale_rows: staleRowCount,
    expired_rows: expiredRowCount
  };

  const fileWarnings = [...(overallFreshness.warnings || [])];
  if (!supplierName || supplierName === 'Solar Equipment Supplier' || (input && typeof input === 'object' && input.supplierName === '')) {
    fileWarnings.push('Supplier name was not specified; default placeholder assigned.');
  }

  return {
    filename: sanitizeCellText(filename),
    file_format: cleanFormat,
    file_size_bytes: byteLength,
    headers: headerRow.map(h => sanitizeCellText(h)),
    detected_mapping: autoMapping,
    active_mapping: mapping,
    supplier_name: supplierName || 'Solar Equipment Supplier',
    supplier_quote_ref: fileQuoteRef,
    quote_date: fileQuoteDate,
    quote_expiry_date: fileQuoteExpiryDate,
    currency: 'NGN',
    import_source: options.importSource || options.import_source || 'manual_upload',
    freshness_status: overallFreshness.status,
    freshness_days_old: overallFreshness.daysOld,
    validation_warnings: fileWarnings,
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

    // Stage 8.2 & 8.3: Freshness re-evaluation at review time against current system time
    let rowFreshness = r.freshness_status || 'date_missing';
    let rowFreshnessWarnings = Array.isArray(r.validation_warnings) ? [...r.validation_warnings] : [];
    if (r.quote_date || r.quote_expiry_date) {
      const refreshedFreshness = evaluateQuotationFreshness(r.quote_date, r.quote_expiry_date);
      rowFreshness = refreshedFreshness.status;
      if (refreshedFreshness.warnings && refreshedFreshness.warnings.length > 0) {
        for (const w of refreshedFreshness.warnings) {
          if (!rowFreshnessWarnings.includes(w)) rowFreshnessWarnings.push(w);
        }
      }
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
      application_error: r.application_error || '',
      freshness_status: rowFreshness,
      validation_warnings: rowFreshnessWarnings
    };
  });

  const fileFreshness = evaluateQuotationFreshness(importDoc.quote_date, importDoc.quote_expiry_date);

  return {
    rows: refreshedRows,
    freshness_status: fileFreshness.status,
    freshness_warnings: fileFreshness.warnings,
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
    const nodeBuf = Buffer.from(csv, 'utf8');
    return {
      buffer: nodeBuf,
      contentType: 'text/csv',
      filename: 'device_pro_supplier_price_template.csv'
    };
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

  const rawBuffer = await wb.xlsx.writeBuffer();
  const nodeBuf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  return {
    buffer: nodeBuf,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'device_pro_supplier_price_template.xlsx'
  };
}

/**
 * Master Active Catalog Quotation Matrix Columns (Stage 8.1)
 * Clearly separates reference specifications from supplier completed fields.
 */
const MASTER_CATALOG_COLUMNS = [
  // Group A: DEVICE PRO Catalog Reference Specifications (Read-Only / Protected)
  { key: 'sku', header: 'DEVICE PRO SKU', width: 24, group: 'reference' },
  { key: 'name', header: 'Product Name', width: 36, group: 'reference' },
  { key: 'brand', header: 'Brand', width: 18, group: 'reference' },
  { key: 'category', header: 'Category', width: 18, group: 'reference' },
  { key: 'power_rating', header: 'Model / Rating', width: 18, group: 'reference' },
  { key: 'specifications', header: 'Technical Specifications', width: 45, group: 'reference' },

  // Group B: Supplier Quotation Input (Editable)
  { key: 'supplier_name', header: 'Supplier Name', width: 22, group: 'supplier' },
  { key: 'supplier_sku', header: 'Supplier SKU / Model Ref', width: 24, group: 'supplier' },
  { key: 'quoted_cost_ngn', header: 'Quoted Unit Cost (NGN)', width: 22, group: 'supplier' },
  { key: 'currency', header: 'Currency', width: 12, group: 'supplier' },
  { key: 'quote_date', header: 'Quotation Date (YYYY-MM-DD)', width: 24, group: 'supplier' },
  { key: 'quote_expiry_date', header: 'Validity Expiry (YYYY-MM-DD)', width: 24, group: 'supplier' },
  { key: 'availability', header: 'Availability / Lead Time', width: 22, group: 'supplier' },
  { key: 'warranty_terms', header: 'Warranty & Commercial Terms', width: 30, group: 'supplier' },
  { key: 'quote_ref', header: 'Quotation Ref / ID', width: 22, group: 'supplier' }
];

/**
 * Generates a standardized quotation matrix template populated with all active commercial products.
 * Excludes archived benchmark products (published: 0).
 * 
 * @param {'xlsx' | 'csv'} format
 * @param {Array} [activeProducts] Array of active commercial catalog items (published: 1)
 * @returns {Promise<Buffer>} Buffer with .buffer, .contentType, and .filename properties
 */
async function generateMasterCatalogTemplate(format = 'xlsx', activeProducts = []) {
  // Ensure only authentic active commercial products are included (exclude benchmark records)
  const commercialItems = (Array.isArray(activeProducts) ? activeProducts : [])
    .filter(p => p && p.published === 1)
    .sort((a, b) => {
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
      return (a.id || 0) - (b.id || 0);
    });

  const headers = MASTER_CATALOG_COLUMNS.map(c => c.header);

  if (format === 'csv') {
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    for (const item of commercialItems) {
      const row = [
        item.sku || '',
        item.name || '',
        item.brand || '',
        item.category_label || item.category || '',
        item.power_rating || '',
        item.specifications || '',
        '', // Supplier Name
        '', // Supplier SKU
        '', // Quoted Unit Cost
        'NGN', // Currency default
        '', // Quotation Date
        '', // Validity Expiry
        '', // Availability
        '', // Warranty Terms
        ''  // Quote Ref
      ];
      csv += row.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    }
    const nodeBuf = Buffer.from(csv, 'utf8');
    return {
      buffer: nodeBuf,
      contentType: 'text/csv',
      filename: 'device_pro_active_catalog_quotation_template.csv'
    };
  }

  // ExcelJS Workbook (.xlsx)
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DEVICE PRO Platform Engineering';
  wb.created = new Date();

  // Sheet 1: Quotation Matrix
  const ws = wb.addWorksheet('Quotation Matrix', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  // Top Banner / Group Header (Row 1)
  ws.mergeCells('A1:F1');
  const bannerRef = ws.getCell('A1');
  bannerRef.value = 'DEVICE PRO CATALOG SPECIFICATIONS (REFERENCE ONLY — DO NOT EDIT)';
  bannerRef.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  bannerRef.alignment = { horizontal: 'center', vertical: 'middle' };
  bannerRef.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0B2240' } // Navy
  };

  ws.mergeCells('G1:O1');
  const bannerSup = ws.getCell('G1');
  bannerSup.value = 'SUPPLIER QUOTATION INPUT (PLEASE COMPLETE ALL APPLICABLE CELLS IN NGN)';
  bannerSup.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  bannerSup.alignment = { horizontal: 'center', vertical: 'middle' };
  bannerSup.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB45309' } // Deep Amber
  };
  ws.getRow(1).height = 28;

  // Column Headers (Row 2)
  ws.addRow(headers);
  const headerRow = ws.getRow(2);
  headerRow.height = 26;

  MASTER_CATALOG_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: col.group === 'reference' ? 'left' : 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.group === 'reference' ? 'FF1E3A8A' : 'FFD97706' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // Set column widths
  ws.columns = MASTER_CATALOG_COLUMNS.map(c => ({ width: c.width }));

  // Populate data rows (Row 3+)
  commercialItems.forEach(item => {
    const rowValues = [
      item.sku || '',
      item.name || '',
      item.brand || '',
      item.category_label || item.category || '',
      item.power_rating || '',
      item.specifications || '',
      '', // Supplier Name
      '', // Supplier SKU
      '', // Quoted Unit Cost
      'NGN', // Currency default
      '', // Quotation Date
      '', // Validity Expiry
      '', // Availability
      '', // Warranty Terms
      ''  // Quote Ref
    ];
    const row = ws.addRow(rowValues);
    row.height = 22;

    // Apply cell protection & styling per column
    for (let c = 1; c <= MASTER_CATALOG_COLUMNS.length; c++) {
      const cell = row.getCell(c);
      const isRef = c <= 6;
      cell.protection = { locked: isRef };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (isRef) {
        cell.font = { color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Subtle light slate for read-only
        };
      } else {
        cell.font = { color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFBEB' } // Soft warm cream/amber for editable input
        };
      }
    }
  });

  // Sheet protection (UX guard against accidental catalog SKU editing)
  await ws.protect('DevicePro2026', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false
  });

  // Sheet 2: Instructions & Guidelines
  const wsGuide = wb.addWorksheet('Instructions & Guidelines');
  wsGuide.columns = [{ width: 28 }, { width: 85 }];

  const guideTitle = wsGuide.addRow(['DEVICE PRO — SUPPLIER QUOTATION INSTRUCTIONS', '']);
  guideTitle.font = { bold: true, size: 14, color: { argb: 'FF0B2240' } };
  wsGuide.addRow([]);

  const instructions = [
    ['1. Scope of Quotation', 'This matrix contains all 48 active commercial equipment items in the DEVICE PRO catalog across Solar Panels, Inverters, Batteries, Mounting Structures, and Accessories.'],
    ['2. Mandatory Currency (NGN)', 'All equipment pricing MUST be quoted in Nigerian Naira (NGN). Quotations in foreign currencies (USD, EUR, CNY) are not accepted and will be rejected by the import pre-validation engine.'],
    ['3. Quotation Validity (30 Days)', 'Quoted prices must remain firm and valid for a minimum of thirty (30) calendar days from the date of quotation. Quotations exceeding 30 days old are flagged as stale and require market re-verification.'],
    ['4. Date Format Standard', 'All quotation and expiration dates must follow the ISO 8601 standard format: YYYY-MM-DD (e.g., 2026-10-24).'],
    ['5. Stock & Availability', 'Please indicate current warehouse availability (e.g. "In Stock Lagos", "In Stock Abuja", "In Stock Port Harcourt", or estimated import lead time).'],
    ['6. Warranty & Terms', 'Specify manufacturer and distributor warranty periods (e.g. "5 Years Inverter Warranty", "10 Years Battery Warranty", "25 Years Panel Linear Output").'],
    ['7. Reference Isolation', 'Columns A through F contain reference catalog data and are locked to prevent accidental corruption. Complete columns G through O with your quotation details.'],
    ['8. Spreadsheet Protection Notice', 'Cell protection is provided as a data-entry convenience to prevent accidental formula or SKU modification. It does not constitute an operational security boundary. All data is verified independently upon ingestion.']
  ];

  instructions.forEach(([title, desc]) => {
    const row = wsGuide.addRow([title, desc]);
    row.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
    row.getCell(2).font = { color: { argb: 'FF334155' } };
    row.getCell(2).alignment = { wrapText: true };
    row.height = 24;
  });

  const rawBuffer = await wb.xlsx.writeBuffer();
  const nodeBuf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  return {
    buffer: nodeBuf,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'device_pro_active_catalog_quotation_template.xlsx'
  };
}

/**
 * Groups and compares multiple supplier quotations for the same SKU.
 * Allows transparent comparison of competing quotes without auto-selecting a winner.
 * 
 * @param {Array} rows Array of analyzed supplier rows
 * @returns {Array} Array of grouped comparison objects
 */
function compareSupplierQuotations(rows = []) {
  const skuGroups = new Map();

  for (const row of rows) {
    const sku = normalizeSku(row.normalized_sku || row.raw_sku || row.matched_sku || row.sku);
    if (!sku) continue;

    if (!skuGroups.has(sku)) {
      skuGroups.set(sku, {
        sku,
        product_name: row.matched_product_name || row.raw_name || 'Unmatched Product',
        matched_product_id: row.matched_product_id || null,
        current_catalog_cost_ngn: row.matched_current_cost_ngn || 0,
        current_retail_price_ngn: row.matched_current_price_ngn || 0,
        quotation_count: 0,
        has_competing_quotes: false,
        quotations: []
      });
    }

    const group = skuGroups.get(sku);
    group.quotations.push({
      row_number: row.row_number,
      supplier_name: row.supplier_name || 'Generic Supplier',
      supplier_ref: row.supplier_ref || row.quote_ref || '',
      quoted_cost_ngn: row.normalized_cost_ngn || 0,
      currency: row.currency || 'NGN',
      quote_date: row.quote_date || null,
      quote_expiry_date: row.quote_expiry_date || null,
      freshness_status: row.freshness_status || 'date_missing',
      availability: row.availability || '',
      warranty_terms: row.warranty_terms || '',
      variance_warning: row.variance_warning || 'NONE',
      is_eligible_for_approval: row.is_eligible_for_approval || false,
      warnings: row.warnings || []
    });
    group.quotation_count = group.quotations.length;
    group.has_competing_quotes = group.quotations.length > 1;
  }

  return Array.from(skuGroups.values());
}

module.exports = {
  processSupplierPriceFile,
  matchSupplierItemsAgainstCatalog,
  preparePriceImportForReview,
  generateImportTemplate,
  generateMasterCatalogTemplate,
  evaluateQuotationFreshness,
  compareSupplierQuotations,
  parseDate,
  parseCsv,
  parseExcel,
  parsePrice,
  normalizeSku,
  sanitizeCellText,
  detectColumnMapping,
  resolveColumnIndex,
  COLUMN_ALIASES,
  MASTER_CATALOG_COLUMNS,
  MAX_FILE_SIZE_BYTES,
  MAX_DATA_ROWS,
  HIGH_VARIANCE_PERCENT,
  SEVERE_VARIANCE_PERCENT,
  FRESHNESS_WINDOW_DAYS
};
