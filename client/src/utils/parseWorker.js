/**
 * Web Worker for parsing CSV/Excel files off the main thread.
 * Prevents browser freeze on large files.
 */
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ─── Header mapping ───
const HEADER_MAP = {
  lastname: "lastName", last_name: "lastName", "last name": "lastName",
  firstname: "firstName", first_name: "firstName", "first name": "firstName",
  middlename: "middleName", middle_name: "middleName", "middle name": "middleName",
  alias: "alias",
  companyname: "companyName", company_name: "companyName", company: "companyName",
  caseno: "caseNo", case_no: "caseNo", "case no": "caseNo", "case no.": "caseNo",
  casenumber: "caseNo", "case number": "caseNo",
  plaintiff: "plaintiff",
  casetype: "caseType", case_type: "caseType", "case type": "caseType",
  natureofcase: "caseType", "nature of case": "caseType",
  courttype: "courtType", court_type: "courtType", "court type": "courtType",
  branch: "branch", city: "city",
  datefiled: "dateFiled", date_filed: "dateFiled", "date filed": "dateFiled",
  bounce: "bounce", decline: "decline", delinquent: "delinquent",
  telecom: "telecom", watch: "watch",
  details: "details", source: "source", type: "type",
};

function toCamelCase(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_m, c) => c.toUpperCase());
}

function normalizeHeader(raw) {
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, " ");
  return HEADER_MAP[key] || HEADER_MAP[key.replace(/ /g, "")] || toCamelCase(raw);
}

// Valid year range guard
function isReasonableDate(d) {
  const y = d.getFullYear();
  return y >= 1900 && y <= 2100;
}

function smartDateParse(value) {
  if (value === null || value === undefined || value === "") return "";
  // Already a JS Date object (xlsx cellDates:true)
  if (value instanceof Date) {
    if (!isNaN(value.getTime()) && isReasonableDate(value)) return value.toISOString();
    return "";
  }
  const s = String(value).trim();
  if (!s) return "";
  // Pure integer — could be an Excel serial that slipped through; skip it
  if (/^\d+$/.test(s)) return "";
  // MM.DD.YYYY
  const cleaned = s.replace(/\.+/g, ".");
  const dotParts = cleaned.split(".");
  if (dotParts.length === 3) {
    const [m, d, y] = dotParts;
    if (!isNaN(m) && !isNaN(d) && !isNaN(y) && y.length === 4) {
      try { const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`); if (!isNaN(dt.getTime()) && isReasonableDate(dt)) return dt.toISOString(); } catch { /* ignore */ }
    }
  }
  // Natural language / ISO
  try { const dt = new Date(s); if (!isNaN(dt.getTime()) && isReasonableDate(dt)) return dt.toISOString(); } catch { /* ignore */ }
  return s;
}

function mapRow(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    const mapped = normalizeHeader(key);
    out[mapped] = mapped === "dateFiled" ? smartDateParse(row[key]) : row[key];
  }
  if (!out.type) out.type = "Individual";
  return out;
}

// ─── Message handler ───
self.onmessage = async (e) => {
  const { type, fileBuffer, fileName } = e.data;
  try {
    let rows;
    if (type === "csv") {
      // Parse CSV from text
      const text = new TextDecoder().decode(fileBuffer);
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      rows = result.data
        .filter((r) => Object.values(r).some((v) => v !== null && v !== ""))
        .map(mapRow);
    } else {
      // Excel — cellDates:true makes xlsx return real Date objects for date cells
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      rows = jsonData.map((r) => {
        const out = {};
        for (const key of Object.keys(r)) {
          const mapped = normalizeHeader(key);
          // Pass raw value so Date objects are handled correctly
          out[mapped] = mapped === "dateFiled" ? smartDateParse(r[key]) : r[key];
        }
        if (!out.type) out.type = "Individual";
        return out;
      });
    }

    // Send progress if large
    self.postMessage({ status: "done", rows, fileName });
  } catch (err) {
    self.postMessage({ status: "error", message: err.message });
  }
};
