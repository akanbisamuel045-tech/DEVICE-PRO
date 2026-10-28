const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { parseProductCatalogFile } = require('../lib/product-catalog-importer');

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DEVICE PRO Operations';
  workbook.lastModifiedBy = 'DEVICE PRO Commercial Engineering';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Data Sheet
  const sheet = workbook.addWorksheet('Products Catalog', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Product Name *', key: 'name', width: 38 },
    { header: 'SKU *', key: 'sku', width: 24 },
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
    { header: 'Short Description', key: 'short_description', width: 45 },
    { header: 'Full Description', key: 'description', width: 55 },
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

  const products = [
    {
      name: 'JA Solar 600W DeepBlue 4.0 Pro Bifacial Monocrystalline Panel',
      sku: 'JAM78D40-600/MB',
      category: 'Solar Panels',
      brand: 'JA Solar',
      price_ngn: 285000,
      cost_price_ngn: 245000,
      previous_price_ngn: 310000,
      power_rating: '600W',
      power_tier: 'up_to_1kw',
      warranty_years: 25,
      stock_status: 'in_stock',
      stock_quantity: 80,
      short_description: 'High-density 600W N-type bifacial monocrystalline module engineered for commercial and high-yield residential solar arrays.',
      description: 'Featuring 16BB SMBB half-cut cell technology, the JA Solar DeepBlue 4.0 Pro provides exceptional lower levelized cost of energy (LCOE), low temperature coefficient, and up to 25% bifacial rear-side gain for Nigerian rooftop and ground installations.',
      specifications: 'Peak Power: 600W | Module Efficiency: 22.2% | Max Power Voltage (Vmp): 45.48V | Max Power Current (Imp): 13.20A | Open-Circuit Voltage (Voc): 54.80V | Cell Type: N-Type Mono Bifacial | Dimensions: 2465 x 1134 x 35mm | Weight: 31.8kg',
      image_url: '/images/products/jinko-solar-panel.png',
      featured: 'YES'
    },
    {
      name: 'Deye 12kW Three-Phase Hybrid Inverter 48V (SUN-12K-SG04LP3-EU)',
      sku: 'DEYE-SUN-12K-SG04LP3',
      category: 'Inverters',
      brand: 'Deye',
      price_ngn: 3850000,
      cost_price_ngn: 3400000,
      previous_price_ngn: 4100000,
      power_rating: '12kVA',
      power_tier: '10kw_to_15kw',
      warranty_years: 5,
      stock_status: 'in_stock',
      stock_quantity: 15,
      short_description: 'Commercial-grade 12kW low-voltage 48V three-phase hybrid inverter with dual MPPT and generator auto-start integration.',
      description: 'The Deye 12kW 48V Low Voltage Three-Phase Hybrid Inverter is engineered for large homes, hospitals, and commercial facilities. Supports parallel connection of up to 16 units, frequency droop control for diesel generator sync, and seamless grid/solar/battery dispatch.',
      specifications: 'Nominal AC Output: 12,000W | Max DC Input Power: 15,600W | Max DC Input Voltage: 800V | MPPT Voltage Range: 200V-650V | Battery Voltage Range: 40V-60V | Max Charge/Discharge Current: 240A | Grid Type: Three Phase 400V/230V | Protection Rating: IP65',
      image_url: '/images/products/growatt-inverter.png',
      featured: 'YES'
    },
    {
      name: 'Victron Energy MultiPlus-II 48V 5000VA Pure Sine Wave Inverter Charger',
      sku: 'VIC-MULTI-48V-5KVA',
      category: 'Inverters',
      brand: 'Victron Energy',
      price_ngn: 2450000,
      cost_price_ngn: 2150000,
      previous_price_ngn: 2600000,
      power_rating: '5kVA',
      power_tier: '3kw_to_5kw',
      warranty_years: 5,
      stock_status: 'in_stock',
      stock_quantity: 25,
      short_description: 'European benchmark 5000VA pure sine wave inverter charger with PowerAssist and ultra-fast UPS switching.',
      description: 'Victron MultiPlus-II seamlessly combines a multi-functional inverter and adaptive battery charger. Equipped with PowerAssist anti-overload protection for weak grids or generators, zero-break transfer switch (<20ms), and full compatibility with GX monitoring hardware.',
      specifications: 'Continuous Output: 5000VA (4000W) | Peak Power: 9000W | Input Voltage: 38V-66V DC | Charger Output Current: 70A | Transfer Switch: 50A | Efficiency: 95% | Zero Load Power: 18W | Operating Temp: -40°C to +65°C',
      image_url: '/images/products/growatt-inverter.png',
      featured: 'NO'
    },
    {
      name: 'Felicity Solar 10.24kWh LiFePO4 Wall-Mount Lithium Battery 51.2V 200Ah',
      sku: 'FEL-LFP-51.2V-200AH',
      category: 'Batteries',
      brand: 'Felicity Solar',
      price_ngn: 2950000,
      cost_price_ngn: 2600000,
      previous_price_ngn: 3200000,
      power_rating: '10.24kWh',
      power_tier: '6kw_to_10kw',
      warranty_years: 10,
      stock_status: 'in_stock',
      stock_quantity: 30,
      short_description: 'Heavy-duty 10.24kWh 51.2V 200Ah wall-mount LiFePO4 battery pack with intelligent LCD display and RS485/CAN protocol.',
      description: 'Built with Grade-A prismatic lithium iron phosphate cells, this 10.24kWh power storage unit delivers >6000 cycles at 80% DOD. Features built-in smart BMS with overcharge, over-discharge, and temperature protection, supporting up to 12 packs in parallel.',
      specifications: 'Usable Capacity: 10.24kWh | Nominal Voltage: 51.2V | Nominal Capacity: 200Ah | Cycle Life: >6000 Cycles @ 80% DOD | Max Continuous Discharge: 150A | Peak Discharge: 200A (10s) | Communication: CAN/RS485 | Weight: 88kg',
      image_url: '/images/products/pylontech-battery.png',
      featured: 'YES'
    },
    {
      name: 'Growatt ARK 10.2kWh High-Voltage Lithium Battery System (4 Modules + BMS)',
      sku: 'GROW-ARK-10.2KWH-LFP',
      category: 'Batteries',
      brand: 'Growatt',
      price_ngn: 4350000,
      cost_price_ngn: 3850000,
      previous_price_ngn: 4650000,
      power_rating: '10.2kWh',
      power_tier: '10kw_to_15kw',
      warranty_years: 10,
      stock_status: 'in_stock',
      stock_quantity: 12,
      short_description: 'Modular stackable high-voltage LiFePO4 energy storage system engineered for Growatt SPH and MOD hybrid inverters.',
      description: 'Growatt ARK-2.5H-A1 modular system features Cobalt-Free LiFePO4 chemistry with auto-balancing BMS. Stackable design eliminates inter-module cable clutter, delivering 90% depth of discharge and flexible modular expansion up to 25.6kWh.',
      specifications: 'Energy Capacity: 10.24kWh | Usable Energy: 9.21kWh | Nominal Voltage: 204.8V | Operating Voltage: 180V-230V | Battery Type: Cobalt-Free LiFePO4 | IP Rating: IP65 | Installation: Floor Standing or Wall Mounted',
      image_url: '/images/products/pylontech-battery.png',
      featured: 'NO'
    },
    {
      name: 'Schneider Electric 1000V DC 40kA Type 2 Surge Protective Device (Acti9 iPRD-DC)',
      sku: 'SCH-SPD-1000V-DC',
      category: 'Electrical Accessories',
      brand: 'Schneider Electric',
      price_ngn: 85000,
      cost_price_ngn: 65000,
      previous_price_ngn: 95000,
      power_rating: '1000V DC',
      power_tier: 'standard',
      warranty_years: 5,
      stock_status: 'in_stock',
      stock_quantity: 150,
      short_description: 'DIN-rail mounted Type 2 1000V DC surge arrester with pluggable cartridges for solar array lightning and surge defense.',
      description: 'Schneider Electric Acti9 iPRD-DC protects photovoltaic inverters and sensitive solar electronics from overvoltages caused by lightning strikes and switching surges. Features visual cartridge wear indicators and high surge discharge capacity (Imax 40kA).',
      specifications: 'Rated Operational Voltage (Ue): 1000V DC | Maximum Discharge Current (Imax): 40kA | Nominal Discharge Current (In): 15kA | Voltage Protection Level (Up): 3.9kV | Mounting: 35mm DIN Rail | Operating Temp: -25°C to +60°C',
      image_url: '/images/logo-mark.svg',
      featured: 'NO'
    }
  ];

  products.forEach((p, idx) => {
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

  // Sheet 2: Instructions & Guidance
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
    { field: 'Product Name', required: 'YES', guidance: 'Commercial product title (e.g. JA Solar 600W DeepBlue 4.0 Pro). 3–150 characters.' },
    { field: 'SKU', required: 'YES', guidance: 'Unique alphanumeric identifier. If SKU exists, product updates; if new, a new product is created.' },
    { field: 'Category', required: 'YES', guidance: 'Solar Panels, Inverters, Batteries, Solar Packages, Mounting Accessories, Electrical Accessories, or Portable Power.' },
    { field: 'Brand', required: 'Optional', guidance: 'Manufacturer name (e.g. JA Solar, Deye, Victron Energy, Felicity Solar). Defaults to DEVICE PRO.' },
    { field: 'Selling Price (NGN)', required: 'YES', guidance: 'Customer retail price in Nigerian Naira (e.g. 285000 or ₦285,000).' },
    { field: 'Cost Price (NGN)', required: 'Optional', guidance: 'Internal supplier wholesale cost. Used for profit calculation and cost tracking.' },
    { field: 'Previous Price (NGN)', required: 'Optional', guidance: 'Original price for strikethrough discount display on storefront.' },
    { field: 'Power Rating', required: 'Optional', guidance: 'Equipment capacity rating (e.g. 600W, 12kVA, 10.24kWh, 1000V DC).' },
    { field: 'Power Tier', required: 'Optional', guidance: 'Residential, Commercial, Industrial, or power classification.' },
    { field: 'Warranty (Years)', required: 'Optional', guidance: 'Number of warranty years (e.g. 5, 10, 25). Defaults to 5 years.' },
    { field: 'Stock Status', required: 'Optional', guidance: 'in_stock, low_stock, out_of_stock, or pre_order. Defaults to in_stock.' },
    { field: 'Stock Quantity', required: 'Optional', guidance: 'Units in warehouse. Defaults to 50.' },
    { field: 'Short Description', required: 'Optional', guidance: '1-2 sentence lead summary shown on category product cards.' },
    { field: 'Full Description', required: 'Optional', guidance: 'Detailed product description displayed on public product detail page.' },
    { field: 'Technical Specifications', required: 'Optional', guidance: 'Pipe-separated key:value pairs. Example: Peak Power: 600W | Module Efficiency: 22.2%' },
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

  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const xlsxPath = path.join(reportsDir, 'DEVICE_PRO_6_NEW_PRODUCTS_CATALOG_TEST.xlsx');
  await workbook.xlsx.writeFile(xlsxPath);
  console.log('Saved XLSX:', xlsxPath, '(' + fs.statSync(xlsxPath).size + ' bytes)');

  // Also write CSV version
  const csvHeaders = sheet.columns.map(c => c.header).join(',');
  const csvRows = products.map(p => {
    return [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      `"${p.brand}"`,
      p.price_ngn,
      p.cost_price_ngn,
      p.previous_price_ngn,
      `"${p.power_rating}"`,
      `"${p.power_tier}"`,
      p.warranty_years,
      `"${p.stock_status}"`,
      p.stock_quantity,
      `"${p.short_description.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      `"${p.specifications.replace(/"/g, '""')}"`,
      `"${p.image_url}"`,
      `"${p.featured}"`
    ].join(',');
  });
  const csvContent = [csvHeaders, ...csvRows].join('\r\n');
  const csvPath = path.join(reportsDir, 'DEVICE_PRO_6_NEW_PRODUCTS_CATALOG_TEST.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log('Saved CSV:', csvPath, '(' + fs.statSync(csvPath).size + ' bytes)');

  // Also copy to public/downloads for direct browser URL access if desired
  const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
  fs.copyFileSync(xlsxPath, path.join(downloadsDir, 'DEVICE_PRO_6_NEW_PRODUCTS_CATALOG_TEST.xlsx'));
  fs.copyFileSync(csvPath, path.join(downloadsDir, 'DEVICE_PRO_6_NEW_PRODUCTS_CATALOG_TEST.csv'));
  console.log('Copied to public/downloads/ for direct browser download availability.');

  // Verify parser in memory against database
  const buf = fs.readFileSync(xlsxPath);
  const parsed = await parseProductCatalogFile(buf, 'DEVICE_PRO_6_NEW_PRODUCTS_CATALOG_TEST.xlsx');
  console.log('\n--- In-Memory Parser Verification ---');
  console.log('Summary:', JSON.stringify(parsed.summary, null, 2));
  console.log('Total Rows Parsed:', parsed.rows.length);
  parsed.rows.forEach((r, i) => {
    console.log(` Row ${i+1}: [${r.action}] ${r.status} | SKU: ${r.sku} | Name: ${r.name} | Category: ${r.category_label} | Price: NGN ${r.price_ngn.toLocaleString()} | Valid: ${r.is_valid}`);
  });
}

createTestExcel().then(() => {
  console.log('\nGeneration complete.');
  process.exit(0);
}).catch(e => {
  console.error('Generation failed:', e);
  process.exit(1);
});
