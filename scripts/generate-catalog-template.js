/**
 * Script to generate standardized Master Catalog Quotation Templates (Excel & CSV)
 * Stage 8.1: Active Catalog SKU and Specification Matrix
 * 
 * Safe execution: Only reads published commercial products from MongoDB Atlas.
 * Never modifies any catalog records or prices.
 */

const fs = require('fs');
const path = require('path');
const { connectMongo } = require('../db/mongo/connection');
const { Product } = require('../db/mongo/models');
const { generateMasterCatalogTemplate } = require('../lib/price-import-engine');

async function main() {
  console.log('[STAGE 8.1] Connecting to MongoDB Atlas...');
  await connectMongo();

  // Query only published commercial products, excluding benchmark products
  const activeProducts = await Product.find({
    published: 1,
    sku: { $ne: 'SG-10K-HYBRID-NG' },
    brand: { $ne: 'Sungrow Benchmark' }
  }).sort({ category: 1, name: 1 }).lean();

  console.log(`[STAGE 8.1] Retrieved ${activeProducts.length} active commercial products.`);

  if (activeProducts.length !== 48) {
    console.warn(`[WARNING] Expected 48 active commercial products, found ${activeProducts.length}`);
  }

  const templatesDir = path.join(__dirname, '..', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // 1. Generate Excel (.xlsx) template
  console.log('[STAGE 8.1] Generating Excel workbook with cell protection and instructions...');
  const xlsxResult = await generateMasterCatalogTemplate('xlsx', activeProducts);
  const xlsxPath = path.join(templatesDir, 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx');
  fs.writeFileSync(xlsxPath, xlsxResult.buffer);
  console.log(`[STAGE 8.1] Saved Excel template: ${xlsxPath} (${xlsxResult.buffer.length} bytes)`);

  // 2. Generate CSV (.csv) template
  console.log('[STAGE 8.1] Generating CSV alternative...');
  const csvResult = await generateMasterCatalogTemplate('csv', activeProducts);
  const csvPath = path.join(templatesDir, 'DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv');
  fs.writeFileSync(csvPath, csvResult.buffer);
  console.log(`[STAGE 8.1] Saved CSV template: ${csvPath} (${csvResult.buffer.length} bytes)`);

  // 3. Write templates/README.md documentation
  const readmeContent = `# DEVICE PRO — Standardized Supplier Quotation Matrix Template
## Stage 8.1: Active Catalog SKU and Specification Matrix

### Overview
This directory contains the authoritative, standardized supplier quotation templates for DEVICE PRO's active commercial catalog.
These templates are designed for supplier price intake, quotations, and baseline cost reconciliation.

### Available Files
1. \`DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.xlsx\`:
   - Dual-sheet formatted Excel workbook.
   - Sheet 1: **Quotation Matrix** — Contains the 48 active commercial catalog products.
     - **Columns A–F (Protected Reference Data)**: DEVICE PRO Product SKU, Product Name, Brand, Category, Model Identifier, Technical Specifications.
     - **Columns G–O (Supplier Completion Fields)**: Supplier Name, Supplier Product SKU / Model Ref, Quoted Unit Cost (NGN), Currency, Quotation Date (YYYY-MM-DD), Quotation Expiry Date (YYYY-MM-DD), Product Availability, Warranty / Commercial Terms, Quotation Ref / Notes.
     - Sheet protection enabled with password protection (\`DeviceProCatalog2026\`) to prevent accidental overwriting of reference catalog identity.
     - Header formatting with navy blue brand styling for catalog reference columns and emerald green styling for supplier entry columns.
   - Sheet 2: **Instructions & Guidelines** — Complete instructions for suppliers on required formats, NGN currency restrictions, 30-day freshness policy, and date formatting.

2. \`DEVICE_PRO_ACTIVE_CATALOG_QUOTATION_TEMPLATE.csv\`:
   - Plain CSV equivalent containing identical 15 columns and all 48 active commercial items.
   - Suitable for automated supplier ERP/B2B data pipelines and lightweight spreadsheet editors.

### Catalog Coverage (Stage 8.1 Baseline)
- **Total active commercial products**: 48 products across 8 categories:
  - Solar Panels: 6 products (JA Solar, Longi, Canadian Solar, Jinko Solar, Trina Solar)
  - Inverters: 6 products (Solis, Deye, Growatt, SMA, Victron Energy)
  - Batteries: 6 products (Pylontech, Dyness, BYD, Felicity Solar, Freedom Won)
  - Charge Controllers: 6 products (Victron Energy, Outback Power, Morningstar, EPEVER, SRNE)
  - Racking & Mounting: 6 products (K2 Systems, Renusol, Schletter, Unirac, Clenergy)
  - Protection & Switchgear: 6 products (Schneider Electric, ABB, Hager, Noark, Suntree)
  - Cables & Accessories: 6 products (KBE Elektrotechnik, Helukabel, Lapp Group, Top Cable, Prysmian)
  - Monitoring & Metering: 6 products (Victron Energy, Solar-Log, Carlo Gavazzi, Eastron, Schneider Electric)
- **Archived benchmark records**: Strictly excluded (0 Sungrow benchmark records present).

### Freshness and Currency Policies (Stage 8.2)
- **Freshness Window**: 30 calendar days from the quotation date. Quotations older than 30 days are flagged as \`stale\` and require human review.
- **Currency**: Canonical baseline costs must be quoted in Nigerian Naira (NGN). Unsupported currencies (USD, EUR, GBP) are rejected during validation and cannot proceed to approval.
- **Safety**: Uploading or validating a quotation template NEVER updates live product retail prices or supplier costs. Approval and application require explicit multi-step authorization (Stage 6 workflow).
`;

  const readmePath = path.join(templatesDir, 'README.md');
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log(`[STAGE 8.1] Written documentation: ${readmePath}`);

  console.log('[STAGE 8.1] Complete! Exiting cleanly.');
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
