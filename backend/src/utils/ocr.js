/**
 * OCR utility — extracts text from images and PDF files using Tesseract.js.
 * For PDFs, each page is rendered to an image first using pdf-to-png-converter.
 *
 * Returns an array of extracted text strings (one per page/image).
 */

const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");

/**
 * Extract text from a single image file.
 * @param {string} imagePath - Absolute path to the image
 * @returns {Promise<string>} extracted text
 */
async function ocrImage(imagePath) {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "eng", {
    logger: () => {}, // silent
  });
  return text.trim();
}

/**
 * Extract text from each page of a PDF.
 * Converts each page to PNG first, then runs OCR on each.
 *
 * @param {string} pdfPath - Absolute path to the PDF
 * @returns {Promise<string[]>} array of text per page
 */
async function ocrPdf(pdfPath) {
  const { pdfToPng } = require("pdf-to-png-converter");

  const pages = await pdfToPng(pdfPath, {
    disableFontFace: true,
    useSystemFonts: true,
    viewportScale: 2.0,
  });

  const results = [];
  for (const page of pages) {
    // page.content is a Buffer — write to temp file
    const tmpPath = path.join(
      path.dirname(pdfPath),
      `ocr_tmp_page_${page.pageNumber}.png`
    );

    fs.writeFileSync(tmpPath, page.content);
    try {
      const text = await ocrImage(tmpPath);
      results.push(text);
    } finally {
      // Clean up temp file
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  return results;
}

/**
 * High-level: extract text from any supported file (image or PDF).
 *
 * @param {string} filePath - Absolute file path
 * @returns {Promise<string>} concatenated text from all pages
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const pages = await ocrPdf(filePath);
    return pages.join("\n\n--- Page Break ---\n\n");
  }

  // Image file
  return ocrImage(filePath);
}

module.exports = { ocrImage, ocrPdf, extractText };
