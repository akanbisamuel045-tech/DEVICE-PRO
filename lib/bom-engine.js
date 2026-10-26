/**
 * lib/bom-engine.js
 * 
 * DEVICE PRO Solar Package Bill of Materials (BOM) Calculation & Validation Engine
 * Implements strict costing provenance, high-precision integer arithmetic,
 * snapshotting, and completeness validation.
 * 
 * STAGE 8.4 MANDATES:
 * 1. Zero activation or invention of supplier acquisition costs.
 * 2. Never treat missing costs as zero.
 * 3. Never copy retail selling prices (price_ngn) to cost fields.
 * 4. Never calculate gross margin on incomplete costing data.
 */

const ALLOWED_UNITS = Object.freeze([
  'pcs',
  'meters',
  'sets',
  'roll',
  'lot',
  'hours',
  'units'
]);

const ALLOWED_COMPONENT_TYPES = Object.freeze([
  'solar-panels',
  'hybrid-inverter',
  'battery',
  'mounting-structure',
  'dc-ac-protection',
  'cables-connectors',
  'installation-materials',
  'accessories',
  'other'
]);

const ALLOWED_NON_PRODUCT_TYPES = Object.freeze([
  'labour_installation',
  'logistics_transport',
  'electrical_switchgear_bos',
  'contingency_commissioning',
  'other'
]);

const COST_SOURCES = Object.freeze({
  VERIFIED_SUPPLIER_QUOTE: 'verified_supplier_quote',
  CATALOG_DOCUMENTED_COST: 'catalog_documented_cost',
  MANUAL_SOURCED_COST: 'manual_sourced_cost',
  UNKNOWN: 'unknown'
});

const BOM_STATUSES = Object.freeze([
  'draft',
  'incomplete',
  'ready_for_review',
  'approved'
]);

/**
 * Validates and sanitizes a numerical quantity.
 * Must be a finite, positive number > 0.
 */
function validateQuantity(qty) {
  const num = Number(qty);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`Invalid quantity: "${qty}". Quantity must be a positive number greater than 0.`);
  }
  // Max reasonable quantity to prevent overflow / malformed inputs
  if (num > 1000000) {
    throw new Error(`Quantity ${num} exceeds maximum permitted threshold (1,000,000).`);
  }
  return num;
}

/**
 * Validates and sanitizes a waste allowance percentage.
 * Must be a finite number between 0 and 100.
 */
function validateWasteAllowance(wastePct) {
  if (wastePct === undefined || wastePct === null || wastePct === '') return 0;
  const num = Number(wastePct);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    throw new Error(`Invalid waste allowance: "${wastePct}". Must be between 0% and 100%.`);
  }
  return Math.round(num * 100) / 100;
}

/**
 * Validates a unit of measure against approved list.
 */
function validateUnit(unit) {
  const normalized = String(unit || '').trim().toLowerCase();
  if (!ALLOWED_UNITS.includes(normalized)) {
    throw new Error(`Invalid unit of measure: "${unit}". Permitted units: ${ALLOWED_UNITS.join(', ')}.`);
  }
  return normalized;
}

/**
 * Validates component type against approved categories.
 */
function validateComponentType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (!ALLOWED_COMPONENT_TYPES.includes(normalized)) {
    throw new Error(`Invalid component type: "${type}". Permitted types: ${ALLOWED_COMPONENT_TYPES.join(', ')}.`);
  }
  return normalized;
}

/**
 * Validates non-product cost type against approved categories.
 */
function validateNonProductType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (!ALLOWED_NON_PRODUCT_TYPES.includes(normalized)) {
    throw new Error(`Invalid non-product cost type: "${type}". Permitted types: ${ALLOWED_NON_PRODUCT_TYPES.join(', ')}.`);
  }
  return normalized;
}

/**
 * Normalizes monetary value to 2 decimal places using integer kobo rounding.
 * Rejects negative, infinite, NaN, or non-numeric values.
 */
function normalizeCurrencyNgn(val, fieldName = 'Cost') {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a finite numerical value.`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
  if (num > 1000000000) {
    throw new Error(`${fieldName} exceeds maximum permitted threshold (₦1,000,000,000).`);
  }
  // Convert to integer kobo, round, convert back to Naira
  return Math.round(num * 100) / 100;
}

/**
 * Calculates a single component line's effective quantity and subtotal.
 * Strict Rule: If unit_cost_ngn is null/unknown, line_cost_ngn MUST be null.
 */
function calculateComponentLine(rawLine, index = 0) {
  const lineId = rawLine.line_id || `line_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
  const componentType = validateComponentType(rawLine.component_type);
  const name = String(rawLine.product_name || rawLine.name || '').trim();
  if (!name) {
    throw new Error(`Line ${index + 1}: Component name is required.`);
  }

  const quantity = validateQuantity(rawLine.quantity);
  const unit = validateUnit(rawLine.unit);
  const wasteAllowancePct = validateWasteAllowance(rawLine.waste_allowance_pct);

  // Effective quantity with waste allowance
  const effectiveQty = quantity * (1 + wasteAllowancePct / 100);

  // Validate cost source classification
  let costSource = rawLine.cost_source || COST_SOURCES.UNKNOWN;
  if (!Object.values(COST_SOURCES).includes(costSource)) {
    costSource = COST_SOURCES.UNKNOWN;
  }

  // Cost validation & normalization
  let unitCostNgn = normalizeCurrencyNgn(rawLine.unit_cost_ngn, `Line ${index + 1} unit cost`);
  const provenanceRef = String(rawLine.cost_provenance_ref || '').trim();

  // If cost source is manual or quote, require provenance reference if cost is provided
  if (unitCostNgn !== null && unitCostNgn > 0 && costSource === COST_SOURCES.UNKNOWN) {
    // If a cost is provided without classification, classify as manual if provenance provided, else reject
    if (provenanceRef) {
      costSource = COST_SOURCES.MANUAL_SOURCED_COST;
    } else {
      costSource = COST_SOURCES.UNKNOWN;
      unitCostNgn = null; // Unverified cost cannot be accepted without provenance
    }
  }

  let lineCostNgn = null;
  let validationStatus = 'valid';

  if (unitCostNgn === null || unitCostNgn === undefined) {
    costSource = COST_SOURCES.UNKNOWN;
    lineCostNgn = null;
    validationStatus = 'missing_cost';
  } else {
    // High-precision arithmetic via kobo
    const koboUnit = Math.round(unitCostNgn * 100);
    const totalKobo = Math.round(koboUnit * effectiveQty);
    lineCostNgn = totalKobo / 100;
  }

  return {
    line_id: lineId,
    component_type: componentType,
    product_id: rawLine.product_id ? Number(rawLine.product_id) : null,
    product_sku: String(rawLine.product_sku || '').trim(),
    product_name: name,
    quantity,
    unit,
    waste_allowance_pct: wasteAllowancePct,
    effective_quantity: Math.round(effectiveQty * 1000) / 1000,
    cost_source: costSource,
    unit_cost_ngn: unitCostNgn,
    line_cost_ngn: lineCostNgn,
    cost_provenance_ref: provenanceRef,
    notes: String(rawLine.notes || '').trim(),
    validation_status: validationStatus
  };
}

/**
 * Calculates a non-product cost line (labour, transport, switchgear).
 */
function calculateNonProductLine(rawLine, index = 0) {
  const lineId = rawLine.line_id || `np_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
  const costType = validateNonProductType(rawLine.cost_type);
  const name = String(rawLine.name || '').trim();
  if (!name) {
    throw new Error(`Non-product line ${index + 1}: Name / description is required.`);
  }

  const costNgn = normalizeCurrencyNgn(rawLine.cost_ngn, `Non-product line ${index + 1} cost`);
  const provenanceRef = String(rawLine.provenance_ref || '').trim();

  return {
    line_id: lineId,
    cost_type: costType,
    name,
    cost_ngn: costNgn,
    provenance_ref: provenanceRef,
    notes: String(rawLine.notes || '').trim()
  };
}

/**
 * Calculates full BOM summary, evaluating completeness, subtotals, and margins.
 * 
 * @param {Array} rawComponents - Array of raw component lines
 * @param {Array} rawNonProduct - Array of raw non-product cost lines
 * @param {Number|null} packagePriceNgn - Optional package retail selling price for internal margin analysis
 */
function calculateBom({
  components = [],
  non_product_costs = [],
  packagePriceNgn = null
} = {}) {
  const calculatedComponents = components.map((line, idx) => calculateComponentLine(line, idx));
  const calculatedNonProduct = non_product_costs.map((line, idx) => calculateNonProductLine(line, idx));

  let missingCostCount = 0;
  let componentsSubtotalKobo = 0;
  let nonProductSubtotalKobo = 0;

  for (const comp of calculatedComponents) {
    if (comp.line_cost_ngn === null || comp.unit_cost_ngn === null || comp.cost_source === COST_SOURCES.UNKNOWN) {
      missingCostCount++;
    } else {
      componentsSubtotalKobo += Math.round(comp.line_cost_ngn * 100);
    }
  }

  for (const np of calculatedNonProduct) {
    if (np.cost_ngn === null || np.cost_ngn === undefined) {
      missingCostCount++;
    } else {
      nonProductSubtotalKobo += Math.round(np.cost_ngn * 100);
    }
  }

  const totalLinesCount = calculatedComponents.length + calculatedNonProduct.length;
  const isCostingComplete = totalLinesCount > 0 && missingCostCount === 0;

  const componentsSubtotalNgn = componentsSubtotalKobo / 100;
  const nonProductSubtotalNgn = nonProductSubtotalKobo / 100;
  const totalEstimatedCostNgn = isCostingComplete ? (componentsSubtotalKobo + nonProductSubtotalKobo) / 100 : null;

  const linesWithCost = totalLinesCount - missingCostCount;
  const costingCompletenessPct = totalLinesCount > 0 
    ? Math.round((linesWithCost / totalLinesCount) * 1000) / 10 
    : 0;

  // Margin calculation: strictly internal, only if 100% complete and verified
  let marginAnalysis = null;
  if (isCostingComplete && packagePriceNgn !== null && packagePriceNgn !== undefined) {
    const price = Number(packagePriceNgn);
    if (Number.isFinite(price) && price > 0) {
      const grossProfitNgn = Math.round((price - totalEstimatedCostNgn) * 100) / 100;
      const grossMarginPct = Math.round((grossProfitNgn / price) * 10000) / 100;
      marginAnalysis = {
        retail_price_ngn: price,
        total_cost_ngn: totalEstimatedCostNgn,
        gross_profit_ngn: grossProfitNgn,
        gross_margin_percent: grossMarginPct,
        formula: 'gross_profit = retail_price - total_cost; gross_margin = (gross_profit / retail_price) * 100',
        disclaimer: 'Internal estimation only based on verified BOM components. Does not alter commercial retail prices.'
      };
    }
  }

  return {
    components: calculatedComponents,
    non_product_costs: calculatedNonProduct,
    cost_summary: {
      components_subtotal_ngn: componentsSubtotalNgn,
      non_product_subtotal_ngn: nonProductSubtotalNgn,
      total_estimated_cost_ngn: totalEstimatedCostNgn,
      missing_cost_lines_count: missingCostCount,
      total_lines_count: totalLinesCount,
      is_costing_complete: isCostingComplete,
      costing_completeness_pct: costingCompletenessPct
    },
    margin_analysis: marginAnalysis
  };
}

/**
 * Validates eligibility of a catalog product to be attached to a BOM component.
 * Rejects:
 * - Inactive or soft-archived products (published !== 1)
 * - Turnkey packages (category === 'solar-packages') to avoid circular references
 */
function validateCatalogProductForBom(product) {
  if (!product) {
    throw new Error('Catalog product does not exist.');
  }
  if (product.published !== 1) {
    throw new Error(`Product "${product.name}" (${product.sku}) is archived and cannot be selected for new BOM lines.`);
  }
  if (product.category === 'solar-packages') {
    throw new Error(`Turnkey solar package "${product.name}" cannot be added as a subcomponent of another package.`);
  }
  return true;
}

/**
 * Creates an immutable snapshot of an active catalog product for a BOM line.
 */
function createProductSnapshot(product) {
  validateCatalogProductForBom(product);
  
  // Cost provenance check: only use cost_price_ngn if greater than 0
  const hasCost = Number.isFinite(product.cost_price_ngn) && product.cost_price_ngn > 0;
  
  return {
    product_id: product.id,
    product_sku: product.sku || '',
    product_name: product.name,
    unit_cost_ngn: hasCost ? Math.round(product.cost_price_ngn * 100) / 100 : null,
    cost_source: hasCost ? COST_SOURCES.CATALOG_DOCUMENTED_COST : COST_SOURCES.UNKNOWN,
    cost_provenance_ref: hasCost ? `Catalog product SKU: ${product.sku}` : ''
  };
}

module.exports = {
  ALLOWED_UNITS,
  ALLOWED_COMPONENT_TYPES,
  ALLOWED_NON_PRODUCT_TYPES,
  COST_SOURCES,
  BOM_STATUSES,
  validateQuantity,
  validateUnit,
  validateComponentType,
  validateNonProductType,
  validateWasteAllowance,
  normalizeCurrencyNgn,
  calculateComponentLine,
  calculateNonProductLine,
  calculateBom,
  validateCatalogProductForBom,
  createProductSnapshot
};
