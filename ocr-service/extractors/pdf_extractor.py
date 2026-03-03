"""
PDF extractor — handles both text-based and scanned PDFs.

Optimised for large court-case PDF documents (30k–100k+ entries).
Processes pages one at a time (streaming) to avoid memory exhaustion.

Strategy order per page:
  1. Try pdfplumber table extraction (structured tables with cells)
  2. Try columnar text-position parsing (fixed-width CASE NO | CASE TITLE | … )
  3. Try numbered block parsing ("1) M-MNL-…")
  4. Try case-number-line scanning (lines containing VS. + case numbers)
  5. Fall back to generic text row parsing (header detection)
  6. OCR fallback for scanned/image-only PDFs (page-by-page)
"""

import gc
import os
import re
import tempfile
import logging

import pdfplumber

from utils.header_mapping import normalise_header, HEADER_KEYWORDS
from utils.row_parser import parse_text_to_rows, parse_raffled_cases_streaming

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Common regexes
# ---------------------------------------------------------------------------

# Broad case-number pattern — matches M-MNL-24-08474-CR, R-MNL-24-00123-CV, etc.
_CASE_NO_RE = re.compile(
    r"[A-Z]{1,2}-[A-Z]{2,5}-\d{2}-\d{3,6}-[A-Z]{1,5}",
    re.IGNORECASE,
)

# Also match simpler case number formats: "Crim. Case No. 123456", "Civil Case No. R-2024-123"
_CASE_NO_SIMPLE_RE = re.compile(
    r"(?:(?:Crim|Civil|Criminal|Special|Admin)\s*\.?\s*)?Case\s*(?:No\s*\.?\s*)?([\w\-]+)",
    re.IGNORECASE,
)

# Court + branch pattern
_COURT_BRANCH_RE = re.compile(
    r"(MeTC|MTC|RTC|MTCC|MCTC)\s+BRANCH\s+(\d+)",
    re.IGNORECASE,
)

# The header line for column-based format — RELAXED to match more variations
_COLUMN_HEADER_RE = re.compile(
    r"CASE\s*(?:NO|NUMBER)\.?\s+.*(?:CASE\s*TITLE|TITLE|PARTIES)",
    re.IGNORECASE,
)

# Even more relaxed — just needs CASE NO somewhere
_COLUMN_HEADER_LOOSE_RE = re.compile(
    r"CASE\s*(?:NO|NUMBER)\.?",
    re.IGNORECASE,
)

# Known case-type / nature-of-case prefixes to separate accused from case type
_CASE_TYPE_PREFIXES = [
    "Violation of", "Murder", "Homicide", "Theft", "Robbery", "Estafa",
    "Falsification", "Qualified Theft", "Grave Threats", "Slight Physical",
    "Serious Physical", "Physical Injuries", "Acts of Lasciviousness",
    "Rape", "Illegal Possession", "Carnapping", "Frustrated", "Attempted",
    "Reckless Imprudence", "Malicious Mischief", "Unjust Vexation",
    "Grave Coercion", "Grave Misconduct", "Perjury", "Libel", "Cyber Libel",
    "Direct Assault", "Resistance", "Trespass", "Light Threats",
    "Oral Defamation", "Intriguing Against Honor", "Alarms and Scandals",
    r"B\.P\.", "Batas Pambansa", r"R\.A\.", "Republic Act",
    r"P\.D\.", "Presidential Decree", r"Art\.", "Article",
    r"Sec\.", "Section",
]
_CASE_TYPE_RE = re.compile("(" + "|".join(_CASE_TYPE_PREFIXES) + ")", re.IGNORECASE)

# VS. splitting
_VS_RE = re.compile(r"\bVS\.?\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def _clean_case_type(ct: str) -> str:
    if not ct:
        return ""
    ct = ct.replace("*", "")
    ct = re.sub(r"Regular\s+Court", "", ct, flags=re.IGNORECASE)
    return _normalise_ws(ct)


def _split_accused(text: str) -> list[dict]:
    """
    RULE #3: comma (,) = multiple accused → multiple rows, same caseNo
    RULE #4: @ symbol = alias of the SAME person → single row
    """
    if not text:
        return [{"name": "", "alias": ""}]

    raw_parts = text.split(",")
    entries: list[dict] = []

    for part in raw_parts:
        part = part.strip()
        if not part:
            continue

        if "@" in part:
            at_parts = part.split("@", 1)
            name = _normalise_ws(at_parts[0])
            alias = _normalise_ws(at_parts[1]) if len(at_parts) > 1 else ""
            entries.append({"name": name, "alias": alias})
        else:
            entries.append({"name": _normalise_ws(part), "alias": ""})

    return entries if entries else [{"name": "", "alias": ""}]


def _parse_accused_name(full_name: str) -> dict:
    """Parse a Filipino accused name into firstName, middleName, lastName."""
    if not full_name:
        return {"firstName": "", "middleName": "", "lastName": ""}

    name = _normalise_ws(full_name)

    # "Y" separator: "FIRSTNAME LASTNAME Y MOTHERSURNAME"
    y_match = re.match(r"^(.+?)\s+Y\s+(.+)$", name, re.IGNORECASE)
    if y_match:
        before_y = y_match.group(1).strip()
        after_y = y_match.group(2).strip()
        words = before_y.split()
        if len(words) >= 2:
            return {"firstName": " ".join(words[:-1]), "middleName": after_y, "lastName": words[-1]}
        return {"firstName": before_y, "middleName": after_y, "lastName": ""}

    words = name.split()
    if len(words) == 1:
        return {"firstName": "", "middleName": "", "lastName": words[0]}
    if len(words) == 2:
        return {"firstName": words[0], "middleName": "", "lastName": words[1]}
    return {"firstName": words[0], "middleName": " ".join(words[1:-1]), "lastName": words[-1]}


def _make_row(case_no: str, plaintiff: str, accused_entry: dict,
              case_type: str, court_type: str, branch: str,
              date_filed: str, details: str = "") -> dict:
    """Build a single row dict."""
    name_parts = _parse_accused_name(accused_entry["name"])
    return {
        "type": "Individual",
        "firstName": name_parts["firstName"],
        "middleName": name_parts["middleName"],
        "lastName": name_parts["lastName"],
        "alias": accused_entry.get("alias", ""),
        "companyName": "",
        "caseNo": case_no,
        "plaintiff": plaintiff,
        "caseType": _clean_case_type(case_type),
        "courtType": _normalise_ws(court_type),
        "branch": _normalise_ws(branch),
        "dateFiled": date_filed,
        "isScannedPdf": 1,
        "details": details,
    }


def _parse_case_block(case_no: str, case_title: str, nature: str,
                       branch_str: str, court_type_str: str,
                       date_filed: str) -> list[dict]:
    """
    Parse a single case entry.
    RULE #1: everything before VS. → plaintiff
    RULE #2: everything after VS. → accused block
    """
    title = _normalise_ws(case_title)

    vs_parts = _VS_RE.split(title)
    if len(vs_parts) < 2:
        # No VS. — store entire title
        return [_make_row(case_no, title, {"name": "", "alias": ""},
                          nature, court_type_str, branch_str, date_filed, title)]

    plaintiff = _normalise_ws(vs_parts[0])
    accused_raw = _normalise_ws(" ".join(vs_parts[1:]))

    # Remove case-type text from accused if it leaked in
    accused_text = accused_raw
    case_type_extra = ""
    ct_m = _CASE_TYPE_RE.search(accused_raw)
    if ct_m:
        accused_text = accused_raw[:ct_m.start()].strip()
        case_type_extra = accused_raw[ct_m.start():].strip()

    final_nature = nature or case_type_extra

    accused_entries = _split_accused(accused_text)
    rows: list[dict] = []
    for entry in accused_entries:
        rows.append(_make_row(case_no, plaintiff, entry,
                              final_nature, court_type_str, branch_str, date_filed))
    return rows


# ---------------------------------------------------------------------------
# Strategy 1: pdfplumber table extraction
# ---------------------------------------------------------------------------

def _extract_tables_page(page, date_filed: str) -> list[dict]:
    """
    Use pdfplumber's built-in table detection on a single page.
    Returns mapped row dicts if tables are found, else empty list.
    """
    try:
        tables = page.extract_tables()
    except Exception:
        return []

    if not tables:
        return []

    all_rows: list[dict] = []
    for table in tables:
        if not table or len(table) < 2:
            continue

        # First row is assumed to be headers
        raw_headers = [str(cell or "").strip() for cell in table[0]]
        mapped_headers = [normalise_header(h) for h in raw_headers]

        # Check if at least 2 headers map to known fields
        valid_count = sum(1 for m in mapped_headers if m)
        if valid_count < 2:
            # Try interpreting as court-case columns
            lower_headers = [h.lower() for h in raw_headers]
            col_map = {}
            for i, h in enumerate(lower_headers):
                if "case no" in h or "case number" in h:
                    col_map["caseNo"] = i
                elif "case title" in h or "title" in h or "parties" in h:
                    col_map["title"] = i
                elif "nature" in h or "case type" in h or "offense" in h:
                    col_map["nature"] = i
                elif "branch" in h:
                    col_map["branch"] = i
                elif "court" in h:
                    col_map["court"] = i

            if "caseNo" in col_map and ("title" in col_map or len(col_map) >= 2):
                for data_row in table[1:]:
                    cells = [str(c or "").strip() for c in data_row]
                    case_no = cells[col_map["caseNo"]] if col_map.get("caseNo") is not None and col_map["caseNo"] < len(cells) else ""
                    title = cells[col_map["title"]] if col_map.get("title") is not None and col_map["title"] < len(cells) else ""
                    nature = cells[col_map.get("nature", -1)] if col_map.get("nature") is not None and col_map["nature"] < len(cells) else ""
                    branch = cells[col_map.get("branch", -1)] if col_map.get("branch") is not None and col_map["branch"] < len(cells) else ""
                    court = cells[col_map.get("court", -1)] if col_map.get("court") is not None and col_map["court"] < len(cells) else ""

                    if not case_no and not title:
                        continue

                    parsed = _parse_case_block(case_no, title, nature, branch, court, date_filed)
                    all_rows.extend(parsed)
                continue

            continue

        for data_row in table[1:]:
            row: dict[str, str] = {}
            for j, val in enumerate(data_row):
                if j < len(mapped_headers) and mapped_headers[j]:
                    row[mapped_headers[j]] = str(val or "").strip()

            if not row.get("type"):
                row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"

            meaningful = ["lastName", "firstName", "companyName", "caseNo", "plaintiff"]
            if any(row.get(f) for f in meaningful):
                all_rows.append(row)

    return all_rows


# ---------------------------------------------------------------------------
# Strategy 2: Column-position text parsing
# ---------------------------------------------------------------------------

def _detect_columns_from_header(header_line: str) -> dict | None:
    """Detect column start positions from the header row."""
    lower = header_line.lower()

    cols = {}
    for label, key in [
        ("case no", "case_no"), ("case number", "case_no"),
        ("case title", "case_title"), ("title", "case_title"), ("parties", "case_title"),
        ("nature of case", "nature"), ("nature", "nature"),
        ("offense", "nature"), ("case type", "nature"),
        ("branch", "branch"),
        ("court type", "court_type"), ("court", "court_type"),
    ]:
        if key in cols:
            continue  # keep first detected position
        idx = lower.find(label)
        if idx >= 0:
            cols[key] = idx

    if "case_no" not in cols:
        return None
    # Need at least one more column
    if len(cols) < 2:
        return None

    return cols


def _extract_columnar_row(line: str, cols: dict) -> dict | None:
    """Extract fields from a single line using column positions."""
    if len(line) < 5:
        return None

    sorted_keys = sorted(cols.keys(), key=lambda k: cols[k])

    values = {}
    for i, key in enumerate(sorted_keys):
        start = cols[key]
        end = cols[sorted_keys[i + 1]] if i + 1 < len(sorted_keys) else None
        if start >= len(line):
            values[key] = ""
        else:
            raw = line[start:end] if end else line[start:]
            values[key] = raw.strip()

    return values if any(values.values()) else None


def _parse_columnar_page(page_text: str, cols: dict, date_filed: str) -> list[dict]:
    """Parse a single page of columnar court-case PDF text."""
    lines = page_text.split("\n")
    rows: list[dict] = []

    # Skip header lines on each page
    data_start = 0
    for i, line in enumerate(lines):
        if _COLUMN_HEADER_RE.search(line) or _COLUMN_HEADER_LOOSE_RE.search(line):
            data_start = i + 1
            break

    current: dict | None = None

    for line in lines[data_start:]:
        stripped = line.strip()
        if not stripped:
            continue

        # Skip noise
        if _COLUMN_HEADER_RE.search(stripped):
            continue
        if re.match(r"^\d+$", stripped):
            continue
        if re.match(r"^(Time\s+Generated|Excluded\s+Division|List\s+of\s+Raffled|Page\s+\d)", stripped, re.IGNORECASE):
            continue

        # Strip row number prefix "23) "
        line_clean = re.sub(r"^\s*\d+\)\s*", "", line)

        extracted = _extract_columnar_row(line_clean if line_clean != line else line, cols)
        has_case_no = extracted and extracted.get("case_no") and _CASE_NO_RE.search(extracted["case_no"])

        if has_case_no:
            # Flush previous
            if current and current.get("case_no"):
                parsed = _parse_case_block(
                    current["case_no"], current["case_title"],
                    current["nature"], current["branch"],
                    current["court_type"], date_filed)
                rows.extend(parsed)

            current = {
                "case_no": _CASE_NO_RE.search(extracted["case_no"]).group(0).upper(),
                "case_title": extracted.get("case_title", ""),
                "nature": extracted.get("nature", ""),
                "branch": extracted.get("branch", ""),
                "court_type": extracted.get("court_type", ""),
            }
        elif current:
            # Continuation line — RULE #5: multi-line title
            cont = _extract_columnar_row(line, cols)
            if cont:
                if cont.get("case_title"):
                    current["case_title"] += " " + cont["case_title"]
                if cont.get("nature"):
                    current["nature"] += " " + cont["nature"]
                if cont.get("branch"):
                    current["branch"] = cont["branch"] or current["branch"]
                if cont.get("court_type"):
                    current["court_type"] = cont["court_type"] or current["court_type"]

    # Flush final
    if current and current.get("case_no"):
        parsed = _parse_case_block(
            current["case_no"], current["case_title"],
            current["nature"], current["branch"],
            current["court_type"], date_filed)
        rows.extend(parsed)

    return rows


# ---------------------------------------------------------------------------
# Strategy 4: Line-scan for case numbers + VS.
# ---------------------------------------------------------------------------

def _scan_lines_for_cases(page_text: str, date_filed: str) -> list[dict]:
    """
    Scan every line for case numbers. When we find a line with a case number
    AND a VS. pattern, parse it as a case. This is a catch-all for PDFs
    whose layout doesn't match columnar or numbered block formats.
    """
    lines = page_text.split("\n")
    rows: list[dict] = []
    current_case_no = ""
    accumulated_text = ""

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        case_match = _CASE_NO_RE.search(stripped)
        if case_match:
            # Flush previous
            if current_case_no and accumulated_text:
                rows.extend(_parse_from_text_block(current_case_no, accumulated_text, date_filed))

            current_case_no = case_match.group(0).upper()
            # Text after the case number
            accumulated_text = stripped[case_match.end():].strip()
        elif current_case_no:
            accumulated_text += " " + stripped

    # Flush final
    if current_case_no and accumulated_text:
        rows.extend(_parse_from_text_block(current_case_no, accumulated_text, date_filed))

    return rows


def _parse_from_text_block(case_no: str, text: str, date_filed: str) -> list[dict]:
    """Parse a text block associated with a case number."""
    text = _normalise_ws(text)

    # Extract court/branch if present
    court_type = ""
    branch = ""
    cm = _COURT_BRANCH_RE.search(text)
    if cm:
        court_type = cm.group(1).upper()
        branch = cm.group(2)
        text = text[:cm.start()].strip()

    # Extract nature of case
    nature = ""
    ct_m = _CASE_TYPE_RE.search(text)
    if ct_m:
        nature = text[ct_m.start():].strip()
        text = text[:ct_m.start()].strip()

    # Split at VS.
    vs_parts = _VS_RE.split(text)
    if len(vs_parts) >= 2:
        plaintiff = _normalise_ws(vs_parts[0])
        accused_raw = _normalise_ws(" ".join(vs_parts[1:]))
        accused_entries = _split_accused(accused_raw)
        rows = []
        for entry in accused_entries:
            rows.append(_make_row(case_no, plaintiff, entry, nature, court_type, branch, date_filed))
        return rows

    # No VS. — use entire text as details
    return [_make_row(case_no, "", {"name": text, "alias": ""}, nature, court_type, branch, date_filed, text)]


# ---------------------------------------------------------------------------
# Strategy 6: OCR fallback for scanned/image PDFs
# ---------------------------------------------------------------------------

def _ocr_pdf_page(page, page_num: int) -> str:
    """Render a single PDF page to image and run EasyOCR. Returns text."""
    try:
        img = page.to_image(resolution=300)
        tmp_path = os.path.join(tempfile.gettempdir(), f"ocr_page_{page_num}.png")
        img.save(tmp_path, format="PNG")

        from extractors.image_extractor import ocr_image
        text = ocr_image(tmp_path)

        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        return text
    except Exception as e:
        logger.warning("OCR failed for page %d: %s", page_num, e)
        return ""


# ---------------------------------------------------------------------------
# Format detection — tries the first few pages
# ---------------------------------------------------------------------------

def _detect_format(pdf, sample_pages: int = 3) -> tuple[str, dict | None, str]:
    """
    Detect the PDF format by examining the first few pages.
    Returns: (format_type, column_positions, date_filed)
    format_type: "table" | "columnar" | "numbered" | "line_scan" | "generic"
    """
    date_filed = ""
    first_texts = []

    for i in range(min(sample_pages, len(pdf.pages))):
        text = pdf.pages[i].extract_text() or ""
        first_texts.append(text)

        # Check for "List of Raffled Cases" header on any sample page
        if not date_filed:
            date_m = re.search(
                r"List\s+of\s+Raffled\s+Cases\s*\n?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})",
                text, re.IGNORECASE,
            )
            if date_m:
                date_filed = date_m.group(1).strip()

    combined_sample = "\n".join(first_texts)

    # --- Check for pdfplumber tables ---
    for i in range(min(sample_pages, len(pdf.pages))):
        try:
            tables = pdf.pages[i].extract_tables()
            if tables:
                for table in tables:
                    if table and len(table) >= 2 and len(table[0]) >= 2:
                        logger.info("Detected structured table format (pdfplumber)")
                        return "table", None, date_filed
        except Exception:
            pass

    # --- Check for columnar header ---
    for text in first_texts:
        for line in text.split("\n"):
            if _COLUMN_HEADER_RE.search(line):
                cols = _detect_columns_from_header(line)
                if cols:
                    logger.info("Detected columnar court-case format (cols: %s)", list(cols.keys()))
                    return "columnar", cols, date_filed

    # --- Check for numbered blocks: "1) M-MNL-..." ---
    if re.search(r"^\s*\d+\)\s+[A-Z]{1,2}-[A-Z]{2,5}-", combined_sample, re.MULTILINE):
        logger.info("Detected numbered case-block format")
        return "numbered", None, date_filed

    # --- Check if there are case numbers + VS. patterns anywhere ---
    has_case_nos = bool(_CASE_NO_RE.search(combined_sample))
    has_vs = bool(_VS_RE.search(combined_sample))
    if has_case_nos:
        if has_vs:
            logger.info("Detected case-number + VS. line-scan format")
            return "line_scan", None, date_filed
        logger.info("Detected case-numbers, using line-scan format")
        return "line_scan", None, date_filed

    # --- Check if pages have any text at all ---
    total_text = sum(len(t.strip()) for t in first_texts)
    if total_text < 50:
        logger.info("Very little text detected — will use OCR fallback")
        return "ocr", None, date_filed

    logger.info("Using generic text parser")
    return "generic", None, date_filed


# ---------------------------------------------------------------------------
# Main PDF extractor (streaming, memory-efficient)
# ---------------------------------------------------------------------------

def extract_pdf(file_path: str) -> list[dict]:
    """
    High-level PDF extraction — streams pages one at a time.
    Handles 50k+ entry PDFs without crashing.

    Multi-strategy: tries table → columnar → numbered → line_scan → generic → OCR
    """
    all_rows: list[dict] = []

    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        if total_pages == 0:
            return []

        logger.info("PDF has %d pages, detecting format...", total_pages)

        format_type, cols, date_filed = _detect_format(pdf)

        # --- Stream pages ---
        for page_num, page in enumerate(pdf.pages, 1):
            page_text = page.extract_text() or ""
            page_rows: list[dict] = []

            if format_type == "table":
                page_rows = _extract_tables_page(page, date_filed)
                # If table extraction returns nothing for this page, fall back
                if not page_rows and page_text.strip():
                    page_rows = _scan_lines_for_cases(page_text, date_filed)
                    if not page_rows:
                        page_rows = parse_text_to_rows(page_text)

            elif format_type == "columnar":
                # Re-detect column positions per page (headers repeat)
                page_cols = cols
                for line in page_text.split("\n"):
                    if _COLUMN_HEADER_RE.search(line):
                        detected = _detect_columns_from_header(line)
                        if detected:
                            page_cols = detected
                        break

                if page_cols:
                    page_rows = _parse_columnar_page(page_text, page_cols, date_filed)
                # If columnar returns nothing, try line-scan
                if not page_rows and page_text.strip():
                    page_rows = _scan_lines_for_cases(page_text, date_filed)

            elif format_type == "numbered":
                page_rows = parse_raffled_cases_streaming(page_text, date_filed)
                if not page_rows and page_text.strip():
                    page_rows = _scan_lines_for_cases(page_text, date_filed)

            elif format_type == "line_scan":
                page_rows = _scan_lines_for_cases(page_text, date_filed)
                if not page_rows and page_text.strip():
                    page_rows = parse_text_to_rows(page_text)

            elif format_type == "ocr":
                ocr_text = _ocr_pdf_page(page, page_num)
                if ocr_text.strip():
                    page_rows = _scan_lines_for_cases(ocr_text, date_filed)
                    if not page_rows:
                        page_rows = parse_text_to_rows(ocr_text)

            else:  # generic
                if page_text.strip():
                    page_rows = parse_text_to_rows(page_text)

            # Filter out junk rows (no meaningful data)
            meaningful_keys = ["lastName", "firstName", "companyName", "caseNo", "plaintiff"]
            page_rows = [
                r for r in page_rows
                if any(r.get(k) for k in meaningful_keys) or r.get("details")
            ]

            all_rows.extend(page_rows)

            # Progress log every 100 pages
            if page_num % 100 == 0:
                logger.info("Processed %d/%d pages (%d rows so far)", page_num, total_pages, len(all_rows))

            # Periodic GC for very large files
            if page_num % 500 == 0:
                gc.collect()

    logger.info("PDF extraction complete: %d pages → %d rows", total_pages, len(all_rows))
    return all_rows