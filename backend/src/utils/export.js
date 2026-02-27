/**
 * Export utilities for generating PDF and Excel files from query results.
 * Uses pdfkit for text-based PDF and exceljs for streaming Excel.
 */

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

/**
 * Stream a PDF table to the response.
 *
 * @param {object} res - Express response
 * @param {string} title - Document title
 * @param {Array<{label, key, width?}>} columns - Column definitions
 * @param {Array<object>} rows - Data rows
 * @param {string} filename - Download filename
 */
function exportPdf(res, title, columns, rows, filename = "export.pdf") {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  doc.pipe(res);

  // Title
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  // Calculate column widths
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCount = columns.length;
  const colWidths = columns.map((c) => c.width || Math.floor(tableWidth / colCount));

  // Header row
  const startX = doc.page.margins.left;
  let y = doc.y;

  doc.fontSize(8).font("Helvetica-Bold");
  let x = startX;
  for (let i = 0; i < columns.length; i++) {
    doc.text(columns[i].label, x, y, {
      width: colWidths[i],
      ellipsis: true,
      lineBreak: false,
    });
    x += colWidths[i];
  }
  y += 14;
  doc
    .moveTo(startX, y)
    .lineTo(startX + tableWidth, y)
    .stroke();
  y += 4;

  // Data rows
  doc.font("Helvetica").fontSize(7);
  for (const row of rows) {
    // Check if we need a new page
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;

      // Re-draw header
      doc.font("Helvetica-Bold").fontSize(8);
      x = startX;
      for (let i = 0; i < columns.length; i++) {
        doc.text(columns[i].label, x, y, {
          width: colWidths[i],
          ellipsis: true,
          lineBreak: false,
        });
        x += colWidths[i];
      }
      y += 14;
      doc
        .moveTo(startX, y)
        .lineTo(startX + tableWidth, y)
        .stroke();
      y += 4;
      doc.font("Helvetica").fontSize(7);
    }

    x = startX;
    for (let i = 0; i < columns.length; i++) {
      const val = row[columns[i].key];
      const text = val != null ? String(val) : "—";
      doc.text(text, x, y, {
        width: colWidths[i],
        ellipsis: true,
        lineBreak: false,
      });
      x += colWidths[i];
    }
    y += 12;
  }

  // Footer
  doc.moveDown(2);
  doc
    .fontSize(7)
    .font("Helvetica")
    .text(`Total records: ${rows.length}`, startX, y, { align: "left" });

  doc.end();
}

/**
 * Stream an Excel workbook to the response.
 *
 * @param {object} res - Express response
 * @param {string} title - Sheet name
 * @param {Array<{label, key, width?}>} columns - Column definitions
 * @param {Array<object>} rows - Data rows
 * @param {string} filename - Download filename
 */
async function exportExcel(res, title, columns, rows, filename = "export.xlsx") {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet(title.slice(0, 31)); // Max 31 chars

  // Header row
  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.width ? Math.round(col.width / 6) : 20,
  }));

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF000B5B" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.commit();

  // Data rows
  for (const row of rows) {
    const rowData = {};
    for (const col of columns) {
      rowData[col.key] = row[col.key] != null ? row[col.key] : "—";
    }
    sheet.addRow(rowData).commit();
  }

  await workbook.commit();
}

module.exports = { exportPdf, exportExcel };
