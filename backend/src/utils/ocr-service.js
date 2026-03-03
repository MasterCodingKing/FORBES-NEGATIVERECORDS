/**
 * OCR Service Client — HTTP client for the Python OCR microservice.
 *
 * Replaces local Tesseract.js / pdf-parse / csv-parser extraction
 * by delegating to the Python FastAPI service running on a separate container.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8000";

/**
 * Send a file to the Python OCR service for extraction.
 *
 * @param {string} filePath - Absolute path to the file to extract
 * @returns {Promise<{ rows: Array, fileName: string, format: string, rowCount: number, processingTimeMs: number }>}
 */
async function callOcrService(filePath) {
  const url = `${OCR_SERVICE_URL}/extract`;
  return _uploadFile(url, filePath);
}

/**
 * Send a PDF file specifically for extraction (uses the /extract/pdf endpoint).
 *
 * @param {string} filePath - Absolute path to the PDF
 * @returns {Promise<{ rows: Array, fileName: string, format: string, rowCount: number, processingTimeMs: number }>}
 */
async function callOcrServicePdf(filePath) {
  const url = `${OCR_SERVICE_URL}/extract/pdf`;
  return _uploadFile(url, filePath);
}

/**
 * Check if the OCR service is reachable.
 *
 * @returns {Promise<boolean>}
 */
async function checkOcrServiceHealth() {
  return new Promise((resolve) => {
    const url = `${OCR_SERVICE_URL}/health`;
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.status === "ok");
        } catch {
          resolve(false);
        }
      });
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

/**
 * Upload a file to the OCR service using multipart/form-data.
 * Uses only built-in Node.js modules (no axios dependency needed).
 *
 * @param {string} url - Full URL to POST to
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<object>} - Parsed JSON response
 */
function _uploadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    const boundary = `----FormBoundary${Date.now().toString(16)}`;

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    // Build multipart header and footer
    const headerPart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    );
    const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`);

    // We need to know the file size to set Content-Length
    const stat = fs.statSync(filePath);
    const contentLength = headerPart.length + stat.size + footerPart.length;

    const options = {
      method: "POST",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": contentLength,
      },
      timeout: 900000, // 15-minute timeout for large PDF files (50k+ entries)
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`OCR service returned invalid JSON: ${data.slice(0, 200)}`));
          }
        } else {
          let errorMsg = `OCR service returned status ${res.statusCode}`;
          try {
            const errBody = JSON.parse(data);
            errorMsg += `: ${errBody.detail || errBody.message || data.slice(0, 200)}`;
          } catch {
            errorMsg += `: ${data.slice(0, 200)}`;
          }
          reject(new Error(errorMsg));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`OCR service unreachable at ${url}: ${err.message}`));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`OCR service request timed out after 15 minutes`));
    });

    // Write multipart body: header → file stream → footer
    req.write(headerPart);

    fileStream.on("data", (chunk) => req.write(chunk));
    fileStream.on("end", () => {
      req.write(footerPart);
      req.end();
    });
    fileStream.on("error", (err) => {
      req.destroy();
      reject(new Error(`Failed to read file ${filePath}: ${err.message}`));
    });
  });
}

/**
 * Fetch a chunk of extraction results by jobId.
 *
 * @param {string} jobId - The job ID returned from extraction
 * @param {number} offset - Row offset
 * @param {number} limit - Number of rows to fetch
 * @returns {Promise<object>}
 */
async function fetchOcrChunk(jobId, offset = 0, limit = 5000) {
  const url = `${OCR_SERVICE_URL}/extract/chunk/${jobId}?offset=${offset}&limit=${limit}`;
  return _httpGet(url);
}

/**
 * Fetch ALL remaining rows from a chunked extraction by iterating through chunks.
 *
 * @param {string} jobId - The job ID
 * @param {Array} initialRows - Already-received rows
 * @param {number} totalRows - Total expected rows
 * @param {number} chunkSize - Chunk size
 * @returns {Promise<Array>} - All rows combined
 */
async function fetchAllOcrChunks(jobId, initialRows, totalRows, chunkSize = 5000) {
  const allRows = [...initialRows];
  let offset = initialRows.length;

  while (offset < totalRows) {
    const chunk = await fetchOcrChunk(jobId, offset, chunkSize);
    if (chunk.rows && chunk.rows.length > 0) {
      allRows.push(...chunk.rows);
      offset += chunk.rows.length;
    } else {
      break;
    }
  }

  return allRows;
}

/**
 * Simple HTTP GET request.
 * @param {string} url
 * @returns {Promise<object>}
 */
function _httpGet(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const req = client.get(url, { timeout: 60000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`OCR service returned invalid JSON: ${data.slice(0, 200)}`));
          }
        } else {
          reject(new Error(`OCR service returned status ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (err) => reject(new Error(`OCR chunk fetch failed: ${err.message}`)));
    req.on("timeout", () => { req.destroy(); reject(new Error("OCR chunk fetch timed out")); });
  });
}

module.exports = { callOcrService, callOcrServicePdf, checkOcrServiceHealth, fetchOcrChunk, fetchAllOcrChunks };
