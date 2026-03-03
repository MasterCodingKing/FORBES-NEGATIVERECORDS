"""
Row parser utility — converts raw extracted text (from PDFs or OCR)
into structured row dictionaries matching the negativeRecord schema.

Ported from parsePdfText(), parseRaffledCasesPdf() and related helpers
in the Node.js record.controller.js.
"""

import re
from .header_mapping import normalise_header, HEADER_KEYWORDS


# ---------------------------------------------------------------------------
# Raffled-Cases PDF parser
# ---------------------------------------------------------------------------

# Known case-type prefixes for splitting accused text from case type
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


def _normalise_ws(s: str) -> str:
    """Collapse all whitespace to single spaces."""
    return re.sub(r"\s+", " ", (s or "")).strip()


def _clean_case_type(ct: str) -> str:
    if not ct:
        return ""
    ct = ct.replace("*", "")
    ct = re.sub(r"Regular\s+Court", "", ct, flags=re.IGNORECASE)
    return _normalise_ws(ct)


def _extract_accused_and_case_type(text: str) -> tuple[str, str]:
    m = _CASE_TYPE_RE.search(text)
    if m:
        return text[:m.start()].strip(), text[m.start():].strip()
    return text.strip(), ""


def _split_accused(text: str) -> list[dict]:
    if not text:
        return [{"name": "", "alias": ""}]

    raw_parts = text.split(",")
    entries: list[dict] = []
    current_name = ""
    current_alias = ""

    for part in raw_parts:
        part = part.strip()
        if not part:
            continue

        if "@" in part:
            at_parts = part.split("@")
            if current_name:
                current_name += " " + at_parts[0].strip()
            else:
                current_name = at_parts[0].strip()
            current_alias = " / ".join(a.strip() for a in at_parts[1:] if a.strip())
        elif current_name and not current_alias and len(entries) == 0 and not re.match(r"^[A-Z]", part):
            current_name += " " + part
        else:
            if current_name:
                entries.append({"name": _normalise_ws(current_name), "alias": _normalise_ws(current_alias)})
            current_name = part
            current_alias = ""

    if current_name:
        entries.append({"name": _normalise_ws(current_name), "alias": _normalise_ws(current_alias)})

    return entries if entries else [{"name": "", "alias": ""}]


def _parse_accused_name(full_name: str) -> dict:
    if not full_name:
        return {"firstName": "", "middleName": "", "lastName": ""}

    name = _normalise_ws(full_name)

    # Check for "Y" separator (Filipino naming: "FIRSTNAME LASTNAME Y MOTHERSURNAME")
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


def _parse_single_case_block(block: str, date_filed: str) -> list[dict]:
    raw = block.replace("\r\n", "\n").replace("\r", "\n")

    case_no_m = re.search(r"([A-Z]-[A-Z]{2,4}-\d{2}-\d{4,6}-[A-Z]{1,4})", raw, re.IGNORECASE)
    if not case_no_m:
        return []
    case_no = case_no_m.group(1).upper()

    vs_parts = re.split(r"\bVS\.?\s*", raw, flags=re.IGNORECASE)
    if len(vs_parts) < 2:
        return []

    complainant_raw = vs_parts[0].replace(case_no_m.group(0), "").strip()
    complainant = _normalise_ws(complainant_raw)

    after_vs = " ".join(vs_parts[1:]).strip()

    court_match = re.search(r"(MeTC|MTC|RTC|MTCC|MCTC)\s+BRANCH\s+(\d+)\s*(Regular\s+Court)?", after_vs, re.IGNORECASE)
    court_type = ""
    branch = ""
    if court_match:
        court_type = court_match.group(1).upper()
        if court_type == "METC":
            court_type = "MTC"
        branch = court_match.group(2)
        after_vs = after_vs[:court_match.start()].strip()

    accused_text, case_type = _extract_accused_and_case_type(after_vs)
    accused_entries = _split_accused(accused_text)

    rows = []
    for entry in accused_entries:
        name_parts = _parse_accused_name(entry["name"])
        rows.append({
            "type": "Individual",
            "firstName": name_parts["firstName"],
            "middleName": name_parts["middleName"],
            "lastName": name_parts["lastName"],
            "alias": entry.get("alias", ""),
            "companyName": "",
            "caseNo": case_no,
            "plaintiff": complainant,
            "caseType": _clean_case_type(case_type),
            "courtType": court_type,
            "branch": branch,
            "dateFiled": date_filed,
            "isScannedPdf": 1,
            "details": "",
        })

    return rows


def parse_raffled_cases(text: str) -> list[dict]:
    """Parse 'List of Raffled Cases' PDF format."""
    date_m = re.search(
        r"List\s+of\s+Raffled\s+Cases\s*\n\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})",
        text, re.IGNORECASE,
    )
    date_filed = date_m.group(1).strip() if date_m else ""

    cleaned = text
    cleaned = re.sub(r"Time\s+Generated[^\n]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Excluded\s+Division[^\n]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"List\s+of\s+Raffled\s+Cases[^\n]*", "", cleaned, flags=re.IGNORECASE)
    if date_filed:
        cleaned = cleaned.replace(date_filed, "")

    parts = re.split(r"(?:^|\n)\s*\d+\)\s+", cleaned)
    parts = [p for p in parts if p.strip()]

    rows: list[dict] = []
    for block in parts:
        try:
            parsed = _parse_single_case_block(block, date_filed)
            rows.extend(parsed)
        except Exception:
            pass

    return rows


def parse_raffled_cases_streaming(page_text: str, date_filed: str = "") -> list[dict]:
    """
    Parse 'List of Raffled Cases' format from a SINGLE page of text.
    This is the streaming-friendly version — called once per page
    instead of on the entire concatenated PDF text.
    """
    cleaned = page_text
    cleaned = re.sub(r"Time\s+Generated[^\n]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Excluded\s+Division[^\n]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"List\s+of\s+Raffled\s+Cases[^\n]*", "", cleaned, flags=re.IGNORECASE)
    if date_filed:
        cleaned = cleaned.replace(date_filed, "")

    parts = re.split(r"(?:^|\n)\s*\d+\)\s+", cleaned)
    parts = [p for p in parts if p.strip()]

    rows: list[dict] = []
    for block in parts:
        try:
            parsed = _parse_single_case_block(block, date_filed)
            rows.extend(parsed)
        except Exception:
            pass

    return rows


# ---------------------------------------------------------------------------
# Generic text → rows parser (ported from parsePdfText)
# ---------------------------------------------------------------------------

def _detect_column_positions(header_line: str) -> list[dict]:
    """Detect column boundaries from a header line using character positions."""
    lower = header_line.lower()
    positions = []

    for kw in HEADER_KEYWORDS:
        idx = lower.find(kw)
        if idx != -1:
            field = normalise_header(kw)
            if field and not any(p["field"] == field for p in positions):
                positions.append({"start": idx, "label": kw, "field": field})

    positions.sort(key=lambda p: p["start"])

    # Deduplicate overlapping headers
    seen: set[str] = set()
    unique = []
    for p in positions:
        if p["field"] not in seen:
            seen.add(p["field"])
            unique.append(p)

    # Compute end positions
    for i, col in enumerate(unique):
        col["end"] = unique[i + 1]["start"] if i + 1 < len(unique) else None

    return unique


def _extract_cells_by_position(line: str, columns: list[dict]) -> dict:
    row: dict[str, str] = {}
    for col in columns:
        raw = line[col["start"]:col["end"]] if col["end"] is not None else line[col["start"]:]
        row[col["field"]] = (raw or "").strip()
    return row


def _is_header_line(line: str) -> bool:
    lower = line.lower()
    return sum(1 for kw in HEADER_KEYWORDS if kw in lower) >= 2


def parse_text_to_rows(text: str) -> list[dict]:
    """
    Best-effort parser for tabular text extracted from PDFs.
    Detects headers, then extracts rows using position-based, tab, CSV, or
    multi-space strategies. Falls back to raw-details rows.
    """
    lines = [l for l in text.replace("\r\n", "\n").replace("\r", "\n").split("\n") if l.strip()]
    if not lines:
        return []

    # --- Strategy 1: Detect a header row ---
    header_idx = -1
    best_match_count = 0

    for i in range(min(len(lines), 20)):
        lower = lines[i].lower()
        match_count = sum(1 for kw in HEADER_KEYWORDS if kw in lower)
        if match_count >= 2 and match_count > best_match_count:
            best_match_count = match_count
            header_idx = i

    if header_idx >= 0:
        header_line = lines[header_idx]
        has_tabs = "\t" in header_line

        rows: list[dict] = []
        if has_tabs:
            headers = [h.strip() for h in header_line.split("\t")]
            mapped = [normalise_header(h) for h in headers]
            for i in range(header_idx + 1, len(lines)):
                cells = [c.strip() for c in lines[i].split("\t")]
                if len(cells) < 2:
                    continue
                row: dict[str, str] = {}
                for j in range(min(len(mapped), len(cells))):
                    if mapped[j]:
                        row[mapped[j]] = cells[j]
                if not row.get("type"):
                    row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"
                if len(row) >= 2:
                    rows.append(row)
        else:
            columns = _detect_column_positions(header_line)
            if len(columns) >= 2:
                for i in range(header_idx + 1, len(lines)):
                    line = lines[i]
                    if re.match(r"^[-=_\s]+$", line):
                        continue
                    if _is_header_line(line):
                        continue
                    row = _extract_cells_by_position(line, columns)
                    if not row.get("type"):
                        row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"
                    meaningful = ["lastName", "firstName", "companyName", "caseNo", "plaintiff"]
                    if any(row.get(f) for f in meaningful):
                        rows.append(row)
            else:
                # Multi-space splitting fallback
                headers = [h.strip() for h in re.split(r"\s{2,}", header_line)]
                mapped = [normalise_header(h) for h in headers]
                for i in range(header_idx + 1, len(lines)):
                    cells = [c.strip() for c in re.split(r"\s{2,}", lines[i])]
                    if len(cells) < 2:
                        continue
                    row = {}
                    for j in range(min(len(mapped), len(cells))):
                        if mapped[j]:
                            row[mapped[j]] = cells[j]
                    if not row.get("type"):
                        row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"
                    if len(row) >= 2:
                        rows.append(row)

        if rows:
            return rows

    # --- Strategy 2: CSV / pipe delimited ---
    first_few = "\n".join(lines[:5]).lower()
    if "," in first_few and any(kw in first_few for kw in HEADER_KEYWORDS):
        csv_header_idx = -1
        for i, line in enumerate(lines):
            if _is_header_line(line):
                csv_header_idx = i
                break

        if csv_header_idx >= 0:
            headers = [h.strip() for h in lines[csv_header_idx].split(",")]
            mapped = [normalise_header(h) for h in headers]
            rows = []
            for i in range(csv_header_idx + 1, len(lines)):
                cells = [c.strip() for c in lines[i].split(",")]
                if len(cells) < 2:
                    continue
                row = {}
                for j in range(min(len(mapped), len(cells))):
                    if mapped[j]:
                        row[mapped[j]] = cells[j]
                if not row.get("type"):
                    row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"
                if len(row) >= 2:
                    rows.append(row)
            if rows:
                return rows

    # --- Fallback: each non-empty line as raw details ---
    cleaned = [l for l in lines if "--- Page Break ---" not in l]
    return [
        {
            "type": "Individual",
            "lastName": "",
            "firstName": "",
            "middleName": "",
            "companyName": "",
            "caseNo": "",
            "plaintiff": "",
            "caseType": "",
            "courtType": "",
            "branch": "",
            "dateFiled": "",
            "details": line,
        }
        for line in cleaned
    ]
