const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function exportData(data, fieldsConfig, format, res, filename, reportOptions = {}) {
  if (!data?.length) {
    return res.status(400).json({ error: 'No data to export' });
  }

  const fieldKeys = fieldsConfig.map(f => f.key);
  const fieldLabels = fieldsConfig.map(f => f.label);

  if (format === 'csv') {
    const parser = new Parser({ fields: fieldKeys });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`${filename}.csv`);
    return res.send(csv);
  }

  if (format === 'pdf') {
    const buffers = [];
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      autoFirstPage: false,
    });

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_report.pdf"`);
      res.send(pdfBuffer);
    });

    const options = {
      companyName: 'Truk Company',
      companyAddress: '123 Business Street\nNairobi, Kenya\n+254 700 000 000',
      reportTitle: `${filename.charAt(0).toUpperCase() + filename.slice(1)} Report`,
      logoPath: 'https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png',
      primaryColor: '#059669',
      secondaryColor: '#64748b',
      ...reportOptions,
    };

    doc.addPage();
    console.log('Starting PDF generation for', filename);

    // Header
    addHeader(doc, options);

    // Report Title and Date
    addReportTitleSection(doc, options, data.length);

    // Data Table
    addDataTable(doc, data, fieldsConfig, options);

    // End the document
    doc.end();
  }
}

function addHeader(doc, options) {
  if (options.logoPath && options.logoPath.startsWith('http')) {
    doc.image(options.logoPath, 50, 50, { width: 80, height: 80 });
  } else if (options.logoPath && fs.existsSync(options.logoPath)) {
    doc.image(options.logoPath, 50, 50, { width: 80, height: 80 });
  }

  const logoOffset = options.logoPath ? 140 : 50;
  doc.fontSize(18)
    .fillColor(options.primaryColor)
    .text(options.companyName, logoOffset, 60);

  doc.fontSize(10)
    .fillColor(options.secondaryColor)
    .text(options.companyAddress, logoOffset, 85, { width: 400, align: 'left' });

  doc.moveTo(50, 140)
    .lineTo(545, 140)
    .strokeColor(options.primaryColor)
    .lineWidth(2)
    .stroke();

  doc.moveDown(2);
}

function addReportTitleSection(doc, options, recordCount) {
  const currentY = doc.y + 20;
  doc.fontSize(20)
    .fillColor('#000000')
    .text(options.reportTitle, 50, currentY, { align: 'center', width: 445 });

  doc.fontSize(12)
    .fillColor(options.secondaryColor)
    .text(`Generated on: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`, 50, currentY + 40, { align: 'center', width: 445 });

  doc.text(`Total Records: ${recordCount}`, 50, currentY + 55, { align: 'center', width: 445 });

  doc.moveDown(3);
}

function addDataTable(doc, data, fieldsConfig, options) {
  const margin = 50;
  const pageWidth = doc.page.width - (margin * 2);
  const columnWidth = pageWidth / fieldsConfig.length;

  data.forEach((item, rowIndex) => {
    if (doc.y > doc.page.height - 150) { // Reserve space for footer
      addPageFooter(doc, options, doc.bufferedPageRange().count);
      doc.addPage();
    }

    const rowY = doc.y;
    const rowHeight = 20;

    if (rowIndex === 0) {
      // Table Header
      doc.fontSize(10)
        .fillColor('#ffffff');
      doc.rect(margin, rowY, pageWidth, 25)
        .fillColor(options.primaryColor)
        .fill();

      fieldsConfig.forEach((field, index) => {
        const x = margin + (index * columnWidth);
        doc.fillColor('#ffffff')
          .text(field.label, x + 5, rowY + 5, {
            width: columnWidth - 10,
            align: 'left',
          });
      });
      doc.y += 25;
    }

    const dataRowY = doc.y;
    if (rowIndex % 2 === 0) {
      doc.rect(margin, dataRowY, pageWidth, rowHeight)
        .fillColor('#f8f9fa')
        .fill();
    }

    fieldsConfig.forEach((field, colIndex) => {
      const x = margin + (colIndex * columnWidth);
      const value = formatCellValue(item[field.key]);
      doc.fontSize(8)
        .fillColor('#000000')
        .text(value, x + 5, dataRowY + 3, {
          width: columnWidth - 10,
          align: 'left',
          ellipsis: true,
        });
    });

    doc.y = dataRowY + rowHeight;
  });

  // Add footer to the last page
  if (doc.bufferedPageRange().count > 0) {
    addPageFooter(doc, options, doc.bufferedPageRange().count);
  }
}

function addPageFooter(doc, options, pageCount) {
  const currentPage = doc.bufferedPageRange().count;
  doc.moveTo(50, doc.page.height - 80)
    .lineTo(545, doc.page.height - 80)
    .strokeColor(options.secondaryColor)
    .lineWidth(1)
    .stroke();

  doc.fontSize(8)
    .fillColor(options.secondaryColor)
    .text(`Page ${currentPage} of ${pageCount}`, 50, doc.page.height - 65, { align: 'center', width: 445 })
    .text(`Generated by ${options.companyName}`, 50, doc.page.height - 50, { align: 'center', width: 445 })
    .text(`Report Date: ${new Date().toLocaleDateString()}`, 50, doc.page.height - 35, { align: 'center', width: 445 });
}

function formatCellValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object' && value._seconds) return new Date(value._seconds * 1000).toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

module.exports = exportData;