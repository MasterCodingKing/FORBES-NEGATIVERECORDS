"""
CSV extractor — parses CSV files into structured row dictionaries.
Uses pandas for robust CSV parsing with header normalisation.
"""

import pandas as pd
from utils.header_mapping import normalise_header


def extract_csv(file_path: str) -> list[dict]:
    """
    Parse a CSV file and return a list of row dicts with normalised field names.
    """
    try:
        df = pd.read_csv(file_path, dtype=str, keep_default_na=False, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(file_path, dtype=str, keep_default_na=False, encoding="latin-1")

    if df.empty:
        return []

    # Build column mapping
    col_map: dict[str, str] = {}
    for col in df.columns:
        mapped = normalise_header(col)
        if mapped:
            col_map[col] = mapped

    if not col_map:
        return []

    rows: list[dict] = []
    for _, raw_row in df.iterrows():
        row: dict[str, str] = {}
        for orig_key, mapped_key in col_map.items():
            val = raw_row.get(orig_key, "")
            row[mapped_key] = str(val).strip() if val is not None else ""

        # Infer type if not present
        if not row.get("type"):
            row["type"] = "Individual" if (row.get("lastName") or row.get("firstName")) else "Company"

        rows.append(row)

    return rows
