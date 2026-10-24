/**
 * DEVICE PRO Price Intelligence & Margin Analysis Engine
 * Stage 7: Pure analytical calculation functions, data quality checks,
 * indicative pricing models, and advisory recommendation generators.
 *
 * CRITICAL RULE:
 * This engine performs READ-ONLY calculations. It NEVER modifies retail prices,
 * supplier costs, promotional pricing, inventory, or publication status.
 * All pricing recommendations remain strictly advisory.
 */

const DEFAULT_SETTINGS = {
  target_margin_percent: 15.0, // Default target gross margin (15%)
  warning_low_margin_threshold: 10.0, // Alert threshold for dangerously low margin
  significant_cost_increase_percent: 20.0 // Threshold for large supplier cost increases
};

/**
 * Calculate Estimated Gross Profit per Unit (in NGN).
 * Formula: Selling Price - Supplier Cost
 * Returns null if supplier cost or selling price is invalid/missing.
 */
function calculateGrossProfit(sellingPrice, costPrice) {
  if (sellingPrice == null || costPrice == null) return null;
  const sell = Number(sellingPrice);
  const cost = Number(costPrice);
  if (isNaN(sell) || isNaN(cost) || !Number.isFinite(sell) || !Number.isFinite(cost)) return null;
  if (cost <= 0 || sell <= 0) return null;
  return Math.round((sell - cost) * 100) / 100;
}

/**
 * Calculate Gross Margin Percentage.
 * Formula: ((Selling Price - Supplier Cost) / Selling Price) * 100
 * Returns null if selling price <= 0 or cost is invalid (division by zero protected).
 */
function calculateGrossMarginPercent(sellingPrice, costPrice) {
  if (sellingPrice == null || costPrice == null) return null;
  const sell = Number(sellingPrice);
  const cost = Number(costPrice);
  if (isNaN(sell) || isNaN(cost) || !Number.isFinite(sell) || !Number.isFinite(cost)) return null;
  if (cost <= 0 || sell <= 0) return null;
  const margin = ((sell - cost) / sell) * 100;
  return Math.round(margin * 100) / 100;
}

/**
 * Calculate Cost Markup Percentage.
 * Formula: ((Selling Price - Supplier Cost) / Supplier Cost) * 100
 * Clearly distinguishes markup from gross margin.
 * Returns null if cost <= 0 or selling price is invalid (division by zero protected).
 */
function calculateMarkupPercent(sellingPrice, costPrice) {
  if (sellingPrice == null || costPrice == null) return null;
  const sell = Number(sellingPrice);
  const cost = Number(costPrice);
  if (isNaN(sell) || isNaN(cost) || !Number.isFinite(sell) || !Number.isFinite(cost)) return null;
  if (cost <= 0 || sell <= 0) return null;
  const markup = ((sell - cost) / cost) * 100;
  return Math.round(markup * 100) / 100;
}

/**
 * Calculate Indicative Selling Price for Review based on target margin.
 * Formula: Supplier Cost / (1 - (targetMarginPercent / 100))
 * Valid only when targetMargin is strictly between 0% and 100%.
 */
function calculateIndicativePrice(costPrice, targetMarginPercent) {
  if (costPrice == null) return null;
  const cost = Number(costPrice);
  if (isNaN(cost) || !Number.isFinite(cost) || cost <= 0) return null;

  const target = Number(targetMarginPercent);
  if (isNaN(target) || !Number.isFinite(target)) {
    throw new Error('Target margin percentage must be a valid number.');
  }
  if (target <= 0 || target >= 100) {
    throw new Error('Target margin percentage must be strictly between 0% and 100%.');
  }

  const marginDecimal = target / 100;
  const indicative = cost / (1 - marginDecimal);
  return Math.round(indicative);
}

/**
 * Evaluate single product profitability and advisory recommendations.
 */
function evaluateProductProfitability(product = {}, settings = {}) {
  const targetMargin = Number(settings.target_margin_percent) || DEFAULT_SETTINGS.target_margin_percent;
  const significantIncreaseThreshold = Number(settings.significant_cost_increase_percent) || DEFAULT_SETTINGS.significant_cost_increase_percent;

  const costPrice = product.cost_price_ngn != null ? Number(product.cost_price_ngn) : (product.supplier_cost_ngn != null ? Number(product.supplier_cost_ngn) : 0);
  const sellingPrice = product.price_ngn != null ? Number(product.price_ngn) : 0;
  const regularPrice = product.previous_price_ngn != null ? Number(product.previous_price_ngn) : null;

  // Determine Data Quality
  let dataQuality = 'COMPLETE';
  let qualityIssue = null;
  if (costPrice <= 0) {
    dataQuality = 'MISSING_COST';
    qualityIssue = 'Supplier acquisition cost is missing or ₦0.';
  } else if (sellingPrice <= 0) {
    dataQuality = 'INVALID_PRICE';
    qualityIssue = 'Retail selling price is non-positive or invalid.';
  }

  // Calculate Primary Metrics
  const grossProfit = calculateGrossProfit(sellingPrice, costPrice);
  const grossMarginPercent = calculateGrossMarginPercent(sellingPrice, costPrice);
  const markupPercent = calculateMarkupPercent(sellingPrice, costPrice);

  // Promotional vs Regular Comparison
  let regularGrossProfit = null;
  let regularGrossMarginPercent = null;
  let hasPromotionalDiscount = false;
  if (regularPrice && regularPrice > sellingPrice && costPrice > 0) {
    regularGrossProfit = calculateGrossProfit(regularPrice, costPrice);
    regularGrossMarginPercent = calculateGrossMarginPercent(regularPrice, costPrice);
    hasPromotionalDiscount = true;
  }

  // Indicative Price Calculation (Advisory Only)
  let indicativeSellingPrice = null;
  if (costPrice > 0) {
    try {
      indicativeSellingPrice = calculateIndicativePrice(costPrice, targetMargin);
    } catch (e) {
      indicativeSellingPrice = null;
    }
  }

  // Supplier Cost Movement (from attached history if present)
  const previousCost = product.previous_applied_cost_ngn != null ? Number(product.previous_applied_cost_ngn) : null;
  let costChangeNgn = null;
  let costChangePercent = null;
  let hasCostIncreasedSignificantly = false;

  if (previousCost != null && previousCost > 0 && costPrice > 0 && previousCost !== costPrice) {
    costChangeNgn = Math.round((costPrice - previousCost) * 100) / 100;
    costChangePercent = Math.round(((costPrice - previousCost) / previousCost) * 10000) / 100;
    if (costChangePercent >= significantIncreaseThreshold) {
      hasCostIncreasedSignificantly = true;
    }
  }

  // Recommendation Status & Advisory Reasoning
  let recommendationStatus = 'HEALTHY_MARGIN';
  let recommendationLabel = 'Margin Healthy';
  let recommendationExplanation = '';

  if (dataQuality === 'MISSING_COST') {
    recommendationStatus = 'MISSING_COST';
    recommendationLabel = 'Missing Supplier Cost';
    recommendationExplanation = 'Supplier acquisition cost is not recorded. Profitability cannot be computed until cost is entered.';
  } else if (dataQuality === 'INVALID_PRICE') {
    recommendationStatus = 'INVALID_PRICE';
    recommendationLabel = 'Invalid Retail Price';
    recommendationExplanation = 'Selling price is zero or invalid. Immediate catalog review required.';
  } else if (grossProfit < 0) {
    recommendationStatus = 'NEGATIVE_MARGIN';
    recommendationLabel = 'Negative Gross Margin';
    recommendationExplanation = `Selling price (₦${sellingPrice.toLocaleString()}) is below supplier acquisition cost (₦${costPrice.toLocaleString()}). Unit loss is ₦${Math.abs(grossProfit).toLocaleString()}. Immediate price review recommended.`;
  } else if (grossMarginPercent < targetMargin) {
    recommendationStatus = 'LOW_MARGIN';
    recommendationLabel = 'Below Target Margin';
    recommendationExplanation = `Current gross margin (${grossMarginPercent}%) is below target threshold (${targetMargin}%). Indicative price to achieve target margin is ₦${(indicativeSellingPrice || 0).toLocaleString()}.`;
  } else if (hasCostIncreasedSignificantly) {
    recommendationStatus = 'COST_INCREASED';
    recommendationLabel = 'Cost Increased Significantly';
    recommendationExplanation = `Supplier cost increased by ${costChangePercent}% from previous applied cost. Review retail price to preserve margin.`;
  } else {
    recommendationStatus = 'HEALTHY_MARGIN';
    recommendationLabel = 'Margin Healthy';
    recommendationExplanation = `Gross margin (${grossMarginPercent}%) meets or exceeds the target margin of ${targetMargin}%.`;
  }

  return {
    product_id: product.id || product._id,
    sku: product.sku || '',
    name: product.name || '',
    brand: product.brand || 'Unspecified',
    category: product.category || 'accessories',
    category_label: product.category_label || product.category || 'Accessories',
    published: product.published !== undefined ? product.published : 1,
    supplier_cost_ngn: costPrice > 0 ? costPrice : null,
    selling_price_ngn: sellingPrice > 0 ? sellingPrice : null,
    regular_price_ngn: regularPrice,
    has_promotional_discount: hasPromotionalDiscount,
    estimated_gross_profit_ngn: grossProfit,
    gross_margin_percent: grossMarginPercent,
    markup_percent: markupPercent,
    regular_gross_profit_ngn: regularGrossProfit,
    regular_gross_margin_percent: regularGrossMarginPercent,
    indicative_selling_price_ngn: indicativeSellingPrice,
    target_margin_percent: targetMargin,
    cost_history: {
      has_history: previousCost != null && previousCost > 0,
      previous_cost_ngn: previousCost,
      current_cost_ngn: costPrice > 0 ? costPrice : null,
      cost_change_ngn: costChangeNgn,
      cost_change_percent: costChangePercent,
      has_increased_significantly: hasCostIncreasedSignificantly,
      latest_applied_at: product.latest_cost_applied_at || null,
      source_import_id: product.latest_cost_import_id || null
    },
    data_quality: {
      status: dataQuality,
      is_complete: dataQuality === 'COMPLETE',
      has_missing_cost: costPrice <= 0,
      issue: qualityIssue
    },
    recommendation: {
      status: recommendationStatus,
      label: recommendationLabel,
      explanation: recommendationExplanation,
      indicative_price_ngn: indicativeSellingPrice,
      is_advisory_only: true
    },
    updated_at: product.updated_at || null,
    metric_label: 'Estimated Gross Profit Before Other Costs',
    disclaimer: 'Estimated Gross Profit Before Other Costs does not include shipping, customs duties, payment fees, installation labour, warranty reserves, taxes, or operating overheads.'
  };
}

/**
 * Calculate catalog summary metrics across active products.
 */
function calculateCatalogSummaryMetrics(evaluatedProducts = [], settings = {}) {
  const targetMargin = Number(settings.target_margin_percent) || DEFAULT_SETTINGS.target_margin_percent;

  let totalActive = 0;
  let completePricing = 0;
  let missingCost = 0;
  let invalidPrice = 0;
  let unavailableMargin = 0;
  let negativeMargin = 0;
  let lowMargin = 0;
  let healthyMargin = 0;
  let costIncreased = 0;
  let costChanged = 0;

  for (const item of evaluatedProducts) {
    // Only analyze active commercial products
    if (item.published === 0) continue;

    totalActive++;

    if (item.data_quality.is_complete) {
      completePricing++;
    }

    if (item.data_quality.has_missing_cost) {
      missingCost++;
    }

    if (item.data_quality.status === 'INVALID_PRICE') {
      invalidPrice++;
    }

    if (item.gross_margin_percent == null) {
      unavailableMargin++;
    } else if (item.estimated_gross_profit_ngn < 0) {
      negativeMargin++;
    } else if (item.gross_margin_percent < targetMargin) {
      lowMargin++;
    } else {
      healthyMargin++;
    }

    if (item.cost_history.has_increased_significantly) {
      costIncreased++;
    }

    if (item.cost_history.cost_change_ngn != null && item.cost_history.cost_change_ngn !== 0) {
      costChanged++;
    }
  }

  return {
    total_active_products: totalActive,
    products_with_complete_pricing: completePricing,
    products_with_missing_cost: missingCost,
    products_with_invalid_price: invalidPrice,
    products_with_unavailable_margin: unavailableMargin,
    products_with_negative_margin: negativeMargin,
    products_below_target_margin: lowMargin,
    products_with_healthy_margin: healthyMargin,
    products_with_recent_cost_increases: costIncreased,
    products_with_cost_changes: costChanged,
    target_margin_percent: targetMargin,
    metric_label: 'Estimated Gross Profit Before Other Costs',
    limitations_notice: 'Metrics reflect catalog data before taxes, freight, duties, payment fees, and operating overheads. Recommendations are strictly advisory.'
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  calculateGrossProfit,
  calculateGrossMarginPercent,
  calculateMarkupPercent,
  calculateIndicativePrice,
  evaluateProductProfitability,
  calculateCatalogSummaryMetrics
};
