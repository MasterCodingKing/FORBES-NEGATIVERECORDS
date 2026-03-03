"""
Excel extractor — parses XLS and XLSX files into structured row dictionaries.
Uses openpyxl for .xlsx and xlrd for .xls, via pandas.
"""

import pandas as pd
from utils.header_mapping import normalise_header


def extract_excel(file_path: str) -> list[dict]:
    """
    Parse an Excel file (.xlsx or .xls) and return a list of row dicts
    with normalised field names.
    """
    ext = file_path.rsplit(".", 1)[-1].lower()

    if ext == "xls":
        engine = "xlrd"
    else:
        engine = "openpyxl"

    try:
        df = pd.read_excel(file_path, engine=engine, dtype=str, keep_default_na=False)
    except Exception as e:
        raise ValueError(f"Failed to read Excel file: {e}")

    if df.empty:
        return []

    # Build column mapping
    col_map: dict[str, str] = {}
    for col in df.columns:
        mapped = normalise_header(str(col))
        if mapped:
            col_map[col] = mapped

    if not col_map:
        return []

    rows: list[dict] = []
    for _, raw_row in df.iterrows():
        row: dict[str, str] = {}
        for orig_key, mapped_key in col_map.items():
            val = raw_row.get(orig_key, "")
            if pd.api.types.is_datetime64_any_dtype(type(val)):
                val = str(val).split(" ")[0]  # YYYY-MM-DD
            row[mapped_key] = str(val).strip() if val is not None else ""

        # Infer type if not present
        if not row.get("type"):
            row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"

        rows.append(row)

    return rows
