/**
 * Client-side file parsing utilities.
 * CSV/Excel parsing runs in a Web Worker to avoid freezing the browser.
 * PDF parsing uses pdfjs-dist's own worker.
 */
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ParseWorker from "./parseWorker.js?worker";

// Load the worker from the local bundle (no CDN required)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ───────────────────────────────────────────────
// Shared helpers
// ───────────────────────────────────────────────
const cleanString = (str) =>
  str ? str.replace(/^[.,'"]+|[.,'"]+$/g, "").trim() : "";

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
}

// ───────────────────────────────────────────────
// CSV / Excel helpers  (from OCR_CSV.js)
// ───────────────────────────────────────────────

/** Mapping from common header variations → our canonical field names */
const HEADER_MAP = {
  lastname: "lastName",
  last_name: "lastName",
  "last name": "lastName",
  firstname: "firstName",
  first_name: "firstName",
  "first name": "firstName",
  middlename: "middleName",
  middle_name: "middleName",
  "middle name": "middleName",
  alias: "alias",
  companyname: "companyName",
  company_name: "companyName",
  company: "companyName",
  caseno: "caseNo",
  case_no: "caseNo",
  "case no": "caseNo",
  "case no.": "caseNo",
  casenumber: "caseNo",
  "case number": "caseNo",
  plaintiff: "plaintiff",
  casetype: "caseType",
  case_type: "caseType",
  "case type": "caseType",
  natureofcase: "caseType",
  "nature of case": "caseType",
  courttype: "courtType",
  court_type: "courtType",
  "court type": "courtType",
  branch: "branch",
  city: "city",
  datefiled: "dateFiled",
  date_filed: "dateFiled",
  "date filed": "dateFiled",
  bounce: "bounce",
  decline: "decline",
  delinquent: "delinquent",
  telecom: "telecom",
  watch: "watch",
  details: "details",
  source: "source",
  type: "type",
};

function normalizeHeader(raw) {
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, " ");
  return HEADER_MAP[key] || HEADER_MAP[key.replace(/ /g, "")] || toCamelCase(raw);
}

function convertToISO(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.replace(/\.+/g, ".");
  const parts = cleaned.split(".");
  if (parts.length !== 3) return "";
  const [month, day, year] = parts;
  if (isNaN(month) || isNaN(day) || isNaN(year)) return "";
  try {
    return new Date(`${year}-${month}-${day}`).toISOString();
  } catch { return ""; }
}

function convertToISO2(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.replace(/^input\s+/i, "").trim();
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch { return ""; }
}

function smartDateParse(value) {
  if (!value) return "";
  const s = String(value).trim();
  // Try MM.DD.YYYY
  const iso1 = convertToISO(s);
  if (iso1) return iso1;
  // Try natural language like "Dec 16, 2024"
  const iso2 = convertToISO2(s);
  if (iso2) return iso2;
  // Try native Date parse
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return s; // return as-is
}

// ───────────────────────────────────────────────
// CSV / Excel — delegate to Web Worker
// ───────────────────────────────────────────────

function parseInWorker(file, type) {
  return new Promise((resolve, reject) => {
    const worker = new ParseWorker();
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.status === "done") resolve(e.data.rows);
      else reject(new Error(e.data.message || "Worker parse failed"));
    };
    worker.onerror = (err) => { worker.terminate(); reject(err); };

    const reader = new FileReader();
    reader.onload = (e) => {
      worker.postMessage(
        { type, fileBuffer: e.target.result, fileName: file.name },
        [e.target.result] // transfer buffer (zero-copy)
      );
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function parseCsvFile(file) { return parseInWorker(file, "csv"); }
export function parseExcelFile(file) { return parseInWorker(file, "excel"); }

// ───────────────────────────────────────────────
// PDF helpers  (from ocr_pdf.js)
// ───────────────────────────────────────────────

const NAME_PREFIXES = ["DEL", "DELA", "DELOS", "SAN", "SANTA", "STA.", "DE", "MC", "VON"];

function parseName(fullNameRaw) {
  let fullName = cleanString(fullNameRaw);
  let alias = "";

  const aliasMatch = fullName.match(/(?:@|ALIAS)\s*(.*)$/i);
  if (aliasMatch) {
    alias = cleanString(aliasMatch[1]);
    fullName = fullName.replace(/(?:@|ALIAS)\s*.*$/i, "").trim();
  }

  const ySplit = fullName.split(/\s+Y\s+/i);
  let beforeY = fullName;
  let afterY = "";
  if (ySplit.length === 2) {
    beforeY = ySplit[0].trim();
    afterY = cleanString(ySplit[1]);
  }

  const parts = beforeY.split(/\s+/);
  let firstName = "", middleName = "", lastName = "";

  const middleDotIndex = parts.findIndex((p) => /^[A-Z]\.$/.test(p));
  if (middleDotIndex > 0) {
    firstName = parts.slice(0, middleDotIndex).join(" ");
    middleName = parts[middleDotIndex];
    lastName = parts.slice(middleDotIndex + 1).join(" ");
  } else if (afterY) {
    if (parts.length >= 2) { firstName = parts[0]; middleName = parts.slice(1).join(" "); }
    else { firstName = beforeY; }
    lastName = afterY;
  } else if (parts.length === 2) {
    firstName = parts[0]; lastName = parts[1];
  } else if (parts.length >= 3) {
    firstName = parts.slice(0, parts.length - 2).join(" ");
    middleName = parts[parts.length - 2];
    lastName = parts[parts.length - 1];
  } else {
    firstName = parts[0] || "";
  }

  if (lastName) {
    const tokens = lastName.split(" ");
    for (let i = 0; i < tokens.length - 1; i++) {
      if (NAME_PREFIXES.includes(tokens[i].toUpperCase())) {
        tokens[i] = tokens[i] + " " + tokens[i + 1];
        tokens.splice(i + 1, 1);
        break;
      }
    }
    lastName = tokens.join(" ");
  }

  return { firstName: cleanString(firstName), middleName: cleanString(middleName), lastName: cleanString(lastName), alias: cleanString(alias) };
}

let _dateFiled = "";

function extractDate(ocrText) {
  const marker = "List of Raffled Cases";
  const idx = ocrText.indexOf(marker);
  if (idx !== -1) {
    const after = ocrText.slice(idx + marker.length).trim();
    const m = after.match(/([A-Za-z]+\s\d{2},\s\d{4})/);
    if (m) return m[0];
  }
  return null;
}

function groupRowsByNumber(text) {
  const rows = [];
  let cur = null;
  const regex = /(\d+)\)(.*?)(?=\d+\)|$)/gs;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const num = m[1], content = m[2].trim();
    if (cur && cur.number === num) { cur.content += "\n" + content; }
    else { if (cur) rows.push(cur.content); cur = { number: num, content }; }
  }
  if (cur) rows.push(cur.content);
  return rows;
}

function extractCaseNumber(input) {
  const m = input.match(/\b([A-Z0-9-]{10,})\b/);
  return m ? m[1] : "";
}

function extractCaseTitle(input) {
  const m = input.match(
    /\b[A-Z0-9-]{10,}\b\s+(.*?)(?=\s+Collection|Forcible Entry|Violation|Other Laws|Alarms|Theft|DOING|MeTC BRANCH|\s+Regular Court|\s+Tax Court|$)/i
  );
  return m ? cleanString(m[1]) : "";
}

function extractNatureOfCase(text) {
  const mr = text.match(/VS\.\s(.*?)\sMeTC BRANCH/);
  const match = mr && mr[1]
    ? mr[1].replace(/[,.\s]+$/, "").replace(/[\s,~.\-!;:?()]*\b[A-Z]+\b[\s,~.\-!;:?()]*\b/g, "").trim()
    : "";
  const continuation = text.split("\n").slice(1).join(" ")
    .split(/Manila City Hall|Excluded Division\/s:/)[0]
    .replace(/\b[A-Z]+\b/g, "").replace(/\s*@\s*/g, " ").replace(/[,.\s]+$/, "").trim();
  return `${match || ""} ${continuation || ""}`.trim();
}

function extractBranch(input) {
  const m = input.match(/MeTC BRANCH\s*(\d+)/i);
  return m ? m[1] : "";
}

function extractCourtType(input) {
  const m = input.match(/(Regular Court|Tax Court)/i);
  return m ? m[1] : "";
}

function extractCaseDetails(input, dateFiled) {
  if (!input) return [];
  const caseNumber = extractCaseNumber(input);
  const caseTitle = extractCaseTitle(input);
  const natureOfCase = extractNatureOfCase(input);
  const branch = extractBranch(input);
  const courtType = extractCourtType(input);

  let plaintiff = "", accused = "";
  const vsMatch = caseTitle.match(/(.*?)\s+VS\.?\s+(.*)/i);
  if (vsMatch) { plaintiff = cleanString(vsMatch[1]); accused = cleanString(vsMatch[2]); }
  else { plaintiff = caseTitle; }

  const accusedNames = accused
    ? accused.split(/\s*,\s*|\s+AND\s+/i).map(cleanString).filter(Boolean)
    : [];

  return (accusedNames.length === 0 ? [""] : accusedNames)
    .map((name) => ({
      ...parseName(name),
      caseNo: caseNumber,
      plaintiff,
      caseType: natureOfCase,
      branch,
      courtType,
      dateFiled,
      type: "Individual",
    }))
    .filter((o) => (o.firstName && o.firstName.length > 0) || (o.lastName && o.lastName.length > 0));
}

function extractCaseData(text) {
  _dateFiled = extractDate(text) || _dateFiled;
  const rows = groupRowsByNumber(text);
  return rows.flatMap((row) => extractCaseDetails(row, _dateFiled));
}

// ───────────────────────────────────────────────
// Public: parse PDF file → rows[]
// Uses pdfjs text extraction (fast, no OCR needed
// for digitally-created PDFs).
// ───────────────────────────────────────────────
export function parsePdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const numPages = pdf.numPages;
        const data = [];

        _dateFiled = ""; // reset for each new file

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          const pageRows = extractCaseData(pageText);
          data.push(...pageRows);
        }

        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ───────────────────────────────────────────────
// Public: auto-detect file type and parse
// ───────────────────────────────────────────────
export async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "csv") return parseCsvFile(file);
  if (ext === "xlsx" || ext === "xls") return parseExcelFile(file);
  if (ext === "pdf") return parsePdfFile(file);
  throw new Error(`Unsupported file type: .${ext}`);
}
