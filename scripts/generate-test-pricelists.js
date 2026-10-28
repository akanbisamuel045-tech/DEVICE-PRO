const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generatePricelists() {
  const sourceCsvPath = path.join(__dirname, '..', 'reports', 'DEVICE_PRO_PRODUCTS_PRICELIST_PLUS_10_PERCENT.csv');
  const sourceContent = fs.readFileSync(sourceCsvPath, 'utf8');
  const lines = sourceContent.trim().split('\n');

  // Parse header and rows
  const header = lines[0].split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line handling any quotes
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    const productId = parseInt(parts[0], 10);
    const sku = parts[1];
    const name = parts[2];
    const brand = parts[3];
    const category = parts[4];
    const basePrice = parseInt(parts[5], 10); // Original baseline price
    const currency = parts[8] || 'NGN';
    const stockStatus = parts[9] || 'in_stock';

    rows.push({
      productId,
      sku,
      name,
      brand,
      category,
      basePrice,
      currency,
      stockStatus
    });
  }

  console.log(`Parsed ${rows.length} product rows from canonical pricelist.`);

  // Define the two versions: +15% and -5%
  const configs = [
    {
      name: 'PLUS_15_PERCENT',
      factor: 1.15,
      deltaPercent: '+15%',
      deltaHeader: 'Price Increase (+15%)',
      prefix: 'DP-PLUS15',
      xlsxFilename: 'DEVICE_PRO_PRODUCTS_PRICELIST_PLUS_15_PERCENT.xlsx',
      csvFilename: 'DEVICE_PRO_PRODUCTS_PRICELIST_PLUS_15_PERCENT.csv',
      sheetName: 'Price List (+15%)'
    },
    {
      name: 'MINUS_5_PERCENT',
      factor: 0.95,
      deltaPercent: '-5%',
      deltaHeader: 'Price Reduction (-5%)',
      prefix: 'DP-MINUS5',
      xlsxFilename: 'DEVICE_PRO_PRODUCTS_PRICELIST_MINUS_5_PERCENT.xlsx',
      csvFilename: 'DEVICE_PRO_PRODUCTS_PRICELIST_MINUS_5_PERCENT.csv',
      sheetName: 'Price List (-5%)'
    }
  ];

  for (const cfg of configs) {
    console.log(`\nGenerating ${cfg.name} (${cfg.deltaPercent})...`);

    // 1. Prepare data
    const computedRows = rows.map(r => {
      const newPrice = Math.round(r.basePrice * cfg.factor);
      const delta = newPrice - r.basePrice;
      const ref = `${cfg.prefix}-${r.sku}`;
      return {
        ...r,
        newPrice,
        delta,
        ref
      };
    });

    // 2. Generate CSV
    const csvHeader = [
      'Product ID',
      'Supplier SKU',
      'Product Name',
      'Brand',
      'Category',
      'Current Price (NGN)',
      'Price (NGN)',
      cfg.deltaHeader,
      'Currency',
      'Stock Status',
      'Supplier Reference'
    ];

    const csvLines = [csvHeader.join(',')];
    computedRows.forEach(r => {
      // Escape commas in product name if any
      const safeName = r.name.includes(',') ? `"${r.name}"` : r.name;
      csvLines.push([
        r.productId,
        r.sku,
        safeName,
        r.brand,
        r.category,
        r.basePrice,
        r.newPrice,
        r.delta,
        r.currency,
        r.stockStatus,
        r.ref
      ].join(','));
    });

    const csvPath = path.join(__dirname, '..', 'reports', cfg.csvFilename);
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
    console.log(`✓ CSV written to: ${csvPath}`);

    // 3. Generate Excel XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DEVICE PRO Commercial Engineering Systems';
    workbook.lastModifiedBy = 'DEVICE PRO Operations';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(cfg.sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Product ID', key: 'productId', width: 14, style: { alignment: { horizontal: 'center' } } },
      { header: 'Supplier SKU', key: 'sku', width: 24 },
      { header: 'Product Name', key: 'name', width: 44 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Current Price (NGN)', key: 'basePrice', width: 22, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
      { header: 'Price (NGN)', key: 'newPrice', width: 22, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
      { header: cfg.deltaHeader, key: 'delta', width: 22, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
      { header: 'Currency', key: 'currency', width: 12, style: { alignment: { horizontal: 'center' } } },
      { header: 'Stock Status', key: 'stockStatus', width: 16, style: { alignment: { horizontal: 'center' } } },
      { header: 'Supplier Reference', key: 'ref', width: 28 }
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
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
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF003B73' } },
        bottom: { style: 'medium', color: { argb: 'FF003B73' } },
        left: { style: 'thin', color: { argb: 'FF003B73' } },
        right: { style: 'thin', color: { argb: 'FF003B73' } }
      };
    });

    // Populate rows
    computedRows.forEach((r, idx) => {
      const row = sheet.addRow({
        productId: r.productId,
        sku: r.sku,
        name: r.name,
        brand: r.brand,
        category: r.category,
        basePrice: r.basePrice,
        newPrice: r.newPrice,
        delta: r.delta,
        currency: r.currency,
        stockStatus: r.stockStatus,
        ref: r.ref
      });

      row.height = 20;

      // Subtle zebra striping
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      row.eachCell((cell, colNumber) => {
        if (!cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBg }
          };
        }
        cell.font = { name: 'Calibri', size: 10.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Highlight the updated price column
        if (colNumber === 7) { // 'Price (NGN)'
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0157A2' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cfg.factor > 1 ? 'FFF0FDF4' : 'FFFFFBEB' } // Light green or light yellow
          };
        }

        // Highlight the delta column
        if (colNumber === 8) { // Delta
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: cfg.factor > 1 ? 'FF16A34A' : 'FFDC2626' } // Green for increase, Red for reduction
          };
        }
      });
    });

    const xlsxPath = path.join(__dirname, '..', 'reports', cfg.xlsxFilename);
    await workbook.xlsx.writeFile(xlsxPath);
    console.log(`✓ Excel XLSX written to: ${xlsxPath}`);
  }

  console.log('\nBoth Excel and CSV pricelist versions successfully generated!');
}

generatePricelists().catch(err => {
  console.error('Error generating pricelists:', err);
  process.exit(1);
});
