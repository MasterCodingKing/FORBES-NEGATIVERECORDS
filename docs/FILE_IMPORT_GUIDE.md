# File Import System — Developer Guide

This document explains exactly how uploading and parsing Excel, CSV, and PDF files works
in the Forbes Negative Records system — from the moment the user picks a file to when
the records appear in the preview table and are saved to the database.

---

## Table of Contents

1. [Overview — The Big Picture](#1-overview)
2. [Files Involved](#2-files-involved)
3. [Step-by-Step: Excel / CSV Import](#3-excel--csv-import)
4. [Step-by-Step: PDF Import](#4-pdf-import)
5. [Header Normalization — Column Name Mapping](#5-header-normalization)
6. [Date Parsing](#6-date-parsing)
7. [PDF Name Parsing Logic](#7-pdf-name-parsing-logic)
8. [Preview Table & Pagination](#8-preview-table--pagination)
9. [Saving to Database — Batched Insert](#9-saving-to-database)
10. [Why a Web Worker?](#10-why-a-web-worker)
11. [Supported File Formats Summary](#11-supported-file-formats-summary)
12. [Common Problems & Solutions](#12-common-problems--solutions)

---

## 1. Overview

All file parsing runs **100% in the browser** — no file is sent to the Node.js backend
or the Python OCR service during the parse step. Only when you click **"Save All Records"**
do the extracted rows get sent to the backend API.

```
User picks file
      │
      ▼
AdminRecords.jsx   ← calls parseFile(file)
      │
      ▼
clientParser.js    ← detects file type (.csv / .xlsx / .pdf)
      │
      ├─ CSV / Excel ──► parseWorker.js  (runs in a Web Worker thread)
      │                        │
      │                        └─► papaparse / xlsx library
      │
      └─ PDF ──────────► clientParser.js  (uses pdfjs-dist worker)
                              │
                              └─► PDF text extraction + regex parsing

      ▼
rows[] returned to AdminRecords.jsx
      │
      ▼
Preview Table (paginated, 100 rows/page)
      │
User clicks "Save All Records"
      │
      ▼
Batched API calls  →  POST /records/bulk-insert  (500 rows per batch)
      │
      ▼
Backend: prisma.negativeRecord.createMany()
```

---

## 2. Files Involved

| File                                           | Purpose                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `client/src/pages/admin/AdminRecords.jsx`      | UI — upload form, preview table, save button                             |
| `client/src/utils/clientParser.js`             | Entry point — detects file type, runs PDF parsing, exports `parseFile()` |
| `client/src/utils/parseWorker.js`              | Web Worker — runs Excel/CSV parsing off the main thread                  |
| `backend/src/controllers/record.controller.js` | `bulkInsert()` — saves rows using `createMany()`                         |
| `backend/src/routes/record.routes.js`          | `POST /records/bulk-insert` route                                        |

---

## 3. Excel / CSV Import

### 3.1 Entry point — `AdminRecords.jsx`

When the user selects a `.csv`, `.xls`, or `.xlsx` file and clicks **"Upload & Extract"**:

```js
// AdminRecords.jsx — handleUploadParse()
const rows = await parseFile(file); // ← this is the main call
setUploadRows(rows); // ← populates the preview table
```

`parseFile()` in `clientParser.js` checks the extension:

```js
export async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "csv") return parseCsvFile(file);
  if (ext === "xlsx" || ext === "xls") return parseExcelFile(file);
  if (ext === "pdf") return parsePdfFile(file);
  throw new Error(`Unsupported file type: .${ext}`);
}
```

---

### 3.2 Transferred to the Web Worker

Both `parseCsvFile()` and `parseExcelFile()` call the same internal function:

```js
function parseInWorker(file, type) {
  return new Promise((resolve, reject) => {
    // Step 1: Spawn a new Web Worker instance
    const worker = new ParseWorker();

    // Step 2: Read the file as an ArrayBuffer (binary)
    const reader = new FileReader();
    reader.onload = (e) => {
      // Step 3: Transfer the buffer to the worker (zero-copy — no cloning overhead)
      worker.postMessage(
        { type, fileBuffer: e.target.result, fileName: file.name },
        [e.target.result], // ← Transferable: ownership moves to worker
      );
    };
    reader.readAsArrayBuffer(file);

    // Step 4: Wait for the worker to reply
    worker.onmessage = (e) => {
      worker.terminate(); // free memory
      if (e.data.status === "done") resolve(e.data.rows);
      else reject(new Error(e.data.message));
    };
  });
}
```

**Why transfer ownership?** Normally `postMessage` copies data, which would take time and
double memory usage for large files. By passing the buffer as a `Transferable`, the memory
is handed over to the worker instantly with zero copy.

---

### 3.3 Inside the Web Worker — `parseWorker.js`

The worker receives the message and parses based on `type`:

#### CSV path

```js
// Step 1: Decode the binary buffer back to a text string
const text = new TextDecoder().decode(fileBuffer);

// Step 2: Parse with papaparse
const result = Papa.parse(text, { header: true, skipEmptyLines: true });

// Step 3: Filter out completely empty rows, then normalize each row
rows = result.data
  .filter((r) => Object.values(r).some((v) => v !== null && v !== ""))
  .map(mapRow); // ← normalizes column names + dates
```

#### Excel path

```js
// Step 1: Read the ArrayBuffer with xlsx library
const workbook = XLSX.read(fileBuffer, { type: "array" });

// Step 2: Get the first sheet
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Step 3: Convert to JSON, using "" as default for empty cells
const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

// Step 4: Normalize each row
rows = jsonData.map((r) => {
  /* mapRow() */
});
```

#### After parsing

Once parsing is complete, the worker sends the result back to the main thread:

```js
self.postMessage({ status: "done", rows, fileName });
```

The main thread receives this, terminates the worker, and resolves the promise — giving
the rows back to `AdminRecords.jsx`.

---

## 4. PDF Import

PDF parsing does **not** use the Web Worker. Instead it uses **pdfjs-dist**, which has
its own built-in worker for rendering. The parsing logic runs on the main thread but is
fully `async` so it doesn't block.

### 4.1 Worker setup

```js
// clientParser.js — top of file
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Point pdfjs at the locally bundled worker file (no CDN required)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
```

The `?url` suffix is a **Vite feature** — it tells Vite to copy the worker file into
`dist/assets/` and return its hashed filename as a string URL.

### 4.2 Text extraction — `parsePdfFile()`

```js
export function parsePdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      // Step 1: Load the PDF document
      const typedarray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      _dateFiled = ""; // reset date state for this file

      const data = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        // Step 2: Get a single page
        const page = await pdf.getPage(i);

        // Step 3: Extract all text items from the page
        const textContent = await page.getTextContent();

        // Step 4: Join all text fragments into a single string
        const pageText = textContent.items.map((item) => item.str).join(" ");

        // Step 5: Run the case-parsing logic against the text
        const pageRows = extractCaseData(pageText);
        data.push(...pageRows);
      }
      resolve(data);
    };
    reader.readAsArrayBuffer(file);
  });
}
```

> **Important:** This only works on **digitally created PDFs** (i.e., PDFs that contain
> real text internally). Scanned image PDFs require OCR which is handled by the Python
> microservice, not this client-side parser.

### 4.3 Case data extraction pipeline

The extracted text from each page goes through a series of parsing functions:

```
pageText (raw string from one PDF page)
      │
      ▼
extractCaseData(text)
      │
      ├─► extractDate(text)
      │         Looks for "List of Raffled Cases" marker,
      │         then reads the date that follows it (e.g. "January 15, 2025").
      │         This date is remembered and used for all rows on this page.
      │
      └─► groupRowsByNumber(text)
                Splits text into individual case entries using
                a numbered list pattern:  1) ... 2) ... 3) ...
                Returns an array of raw case text strings.
                      │
                      ▼  (for each case entry)
                extractCaseDetails(rowText, dateFiled)
                      │
                      ├─► extractCaseNumber()   regex: \b([A-Z0-9-]{10,})\b
                      ├─► extractCaseTitle()    regex: after the case number
                      ├─► extractNatureOfCase() regex: between VS. and MeTC BRANCH
                      ├─► extractBranch()       regex: MeTC BRANCH (\d+)
                      ├─► extractCourtType()    regex: Regular Court | Tax Court
                      │
                      └─► Split "PLAINTIFF VS. ACCUSED" from case title
                                │
                                └─► For each accused name:
                                        parseName(name)
                                              │
                                              └─► Returns { firstName, middleName, lastName, alias }
```

### 4.4 Example PDF input → output

**PDF page text (simplified):**

```
List of Raffled Cases January 15, 2025

1) MC-24-012345-12 PEOPLE OF THE PHILIPPINES VS. JUAN D. REYES MeTC BRANCH 12
```

**Extracted row:**

```json
{
  "firstName": "JUAN",
  "middleName": "D.",
  "lastName": "REYES",
  "alias": "",
  "caseNo": "MC-24-012345-12",
  "plaintiff": "PEOPLE OF THE PHILIPPINES",
  "caseType": "",
  "branch": "12",
  "courtType": "",
  "dateFiled": "January 15, 2025",
  "type": "Individual"
}
```

---

## 5. Header Normalization

When reading Excel/CSV files, the column headers in your file may not exactly match
the database field names. The system automatically maps many variations:

| Your column header (any case)                  | Becomes                           |
| ---------------------------------------------- | --------------------------------- |
| `Last Name`, `lastname`, `last_name`           | `lastName`                        |
| `First Name`, `firstname`, `first_name`        | `firstName`                       |
| `Middle Name`, `middlename`                    | `middleName`                      |
| `Case No`, `Case No.`, `CaseNumber`, `case_no` | `caseNo`                          |
| `Case Type`, `casetype`, `Nature of Case`      | `caseType`                        |
| `Court Type`, `courttype`                      | `courtType`                       |
| `Date Filed`, `datefiled`, `date_filed`        | `dateFiled`                       |
| `Company`, `companyname`, `company_name`       | `companyName`                     |
| `Plaintiff`                                    | `plaintiff`                       |
| `Branch`                                       | `branch`                          |
| `City`                                         | `city`                            |
| `Bounce`, `Decline`, `Delinquent`              | `bounce`, `decline`, `delinquent` |
| `Telecom`, `Watch`                             | `telecom`, `watch`                |
| `Details`, `Source`                            | `details`, `source`               |

**Any column not in this list** is converted to camelCase:
`"Court Branch"` → `courtBranch`

---

## 6. Date Parsing

The `dateFiled` column tries three formats in order:

### Format 1 — `MM.DD.YYYY`

```
Input:  "01.15.2025"
Steps:  split by "."  →  ["01", "15", "2025"]
        reassemble as →  new Date("2025-01-15")
Output: "2025-01-15T00:00:00.000Z"
```

### Format 2 — Natural language

```
Input:  "January 15, 2025"  or  "Dec 16, 2024"
Steps:  new Date("January 15, 2025")
Output: "2025-01-15T00:00:00.000Z"
```

### Format 3 — Native JS Date (fallback)

```
Input:  "2025-01-15"  or  "1/15/2025"
Steps:  new Date(value)
Output: "2025-01-15T00:00:00.000Z"
```

If none match, the raw string is kept as-is.

---

## 7. PDF Name Parsing Logic

The `parseName()` function handles Filipino name formats:

### Rule 1 — Extract alias

```
Input:  "JUAN DELA CRUZ ALIAS JOHNNY"
        or   "JUAN DELA CRUZ @ JOHNNY"
Result: firstName="JUAN", lastName="DELA CRUZ", alias="JOHNNY"
```

### Rule 2 — Middle initial with dot

```
Input:  "JUAN D. REYES"
Detect: "D." matches /^[A-Z]\.$/
Result: firstName="JUAN", middleName="D.", lastName="REYES"
```

### Rule 3 — "Y" connector (Filipino surname convention)

```
Input:  "MARIA SANTOS Y REYES"
Split:  beforeY="MARIA SANTOS"   afterY="REYES"
Result: firstName="MARIA", middleName="SANTOS", lastName="REYES"
```

### Rule 4 — Name prefixes (multi-word surnames)

```
Input (last name part):  "DELA CRUZ"
Prefixes checked:  DEL, DELA, DELOS, SAN, SANTA, STA., DE, MC, VON
Result: lastName="DELA CRUZ"  (kept as one unit, not split)
```

### Rule 5 — Fallback by word count

| Word count | Result                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| 1 word     | `firstName` only                                                              |
| 2 words    | `firstName` + `lastName`                                                      |
| 3+ words   | first word(s) = `firstName`, second-to-last = `middleName`, last = `lastName` |

---

## 8. Preview Table & Pagination

After parsing, rows are shown in a paginated editable table to avoid browser lag:

```
Total rows extracted: e.g. 5,000
Page size: 100 rows
Total pages: 50

Only 100 <tr> elements exist in the DOM at any time.
```

You can:

- **Edit any cell** before saving — changes apply to the full `uploadRows` array in memory
- **Delete a row** — removes it from memory
- **Add a row** — appends a blank row
- **Navigate pages** — first / prev / next / last buttons

The global row index is calculated as:

```js
const globalIdx = (previewPage - 1) * PAGE_SIZE + localIdx;
```

So editing row 3 on page 5 correctly modifies row index 403 in the full array.

---

## 9. Saving to Database

When you click **"Save All Records"**, rows are sent to the backend in batches of 500:

```
Total: 5,000 rows
Batches: 10 requests × 500 rows each
```

### Frontend (AdminRecords.jsx)

```js
for (let i = 0; i < total; i += BATCH_SIZE) {
  const batch = uploadRows.slice(i, i + BATCH_SIZE);
  const res = await api.post("/records/bulk-insert", { records: batch });
  // Update progress bar after each batch
  setSaveProgress({ current: i + BATCH_SIZE, total, inserted, errors });
}
```

A live progress bar shows:

- Rows processed so far
- Rows inserted successfully
- Rows that failed

### Backend (`record.controller.js` — `bulkInsert`)

```js
// Instead of individual create() in a loop (slow):
// ✗  for each record → prisma.negativeRecord.create(record)

// Uses createMany() for a single SQL INSERT with all 500 rows (fast):
// ✓
const result = await prisma.negativeRecord.createMany({
  data, // array of 500 mapped records
  skipDuplicates: true, // silently ignore duplicate entries
});
```

`createMany` with 500 rows = **1 SQL statement** instead of 500.
Speed improvement: roughly **50×** faster than the old loop.

**Maximum batch size:** 1,000 rows per API call (enforced server-side).

---

## 10. Why a Web Worker?

JavaScript in the browser runs on a **single thread**. If a heavy operation (like parsing
a 10,000-row Excel file) runs on that thread, the browser cannot respond to user input,
scroll, or render anything — it appears "frozen" or "unresponsive".

```
❌ Without Web Worker:

  Main Thread: [─────── parse 10,000 rows (3 seconds) ──────────]
  Browser UI:  [──────────── FROZEN ────────────────────────────]


✓ With Web Worker:

  Main Thread: [idle / responsive / can show spinner]
  Worker Thread: [─── parse 10,000 rows (3 seconds) ───]
  Browser UI:  [─── normal, user can interact ───────────────────]
```

Workers cannot access the DOM, but they can use JavaScript libraries like `xlsx`
and `papaparse` — which is exactly what we need.

---

## 11. Supported File Formats Summary

| Format        | Extension | Library    | Thread       | Notes                                              |
| ------------- | --------- | ---------- | ------------ | -------------------------------------------------- |
| CSV           | `.csv`    | papaparse  | Web Worker   | Must have header row                               |
| Excel         | `.xlsx`   | xlsx       | Web Worker   | First sheet only                                   |
| Excel (old)   | `.xls`    | xlsx       | Web Worker   | First sheet only                                   |
| PDF (digital) | `.pdf`    | pdfjs-dist | pdfjs worker | Requires text layer; scanned PDFs need OCR service |

---

## 12. Common Problems & Solutions

### Problem: Columns not mapped correctly

**Cause:** Your file uses a column name not in the `HEADER_MAP`.
**Fix:** Rename the column in your file to one of the supported names (see Section 5),
or add a new entry to `HEADER_MAP` in both `clientParser.js` and `parseWorker.js`.

---

### Problem: Date shows as empty or raw string

**Cause:** The date format in your file is not recognised.
**Fix:** Use one of these formats: `01.15.2025`, `January 15, 2025`, or `2025-01-15`.

---

### Problem: PDF extracts no rows

**Cause:** The PDF is a scanned image (no text layer), or it does not follow the
"List of Raffled Cases" format with numbered entries `1) ... 2) ...`.
**Fix:** Use the Python OCR microservice (`/records/upload-parse`) for scanned PDFs.

---

### Problem: Names are split incorrectly

**Cause:** Unusual name format not covered by the parsing rules.
**Fix:** After extraction, manually edit the affected cells in the preview table before saving.

---

### Problem: Save stops partway through

**Cause:** One batch hit a server error (network issue, DB constraint).
**Fix:** The batch system continues past individual batch failures, counting them as errors.
Check the error count shown in the progress bar. Re-upload only the failed rows if needed.

---

### Problem: "Maximum 1000 records per batch" error

**Cause:** Something sent more than 1,000 rows in a single API call.
**Note:** The frontend batches at 500 so this should not normally occur. If it does,
check that `BATCH_SIZE` in `AdminRecords.jsx` is ≤ 1000.
