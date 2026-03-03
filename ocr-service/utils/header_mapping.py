"""
Header mapping utility — normalises column headers from uploaded files
to the standard negativeRecord schema field names.

This is a direct port of the HEADER_MAP and normaliseHeader() logic
from the Node.js record.controller.js.
"""

import re

# Maps raw (lowercased, cleaned) header strings to schema field names
HEADER_MAP: dict[str, str] = {
    # Last name
    "last name": "lastName",
    "lastname": "lastName",
    "last_name": "lastName",
    "surname": "lastName",
    "family name": "lastName",
    # First name
    "first name": "firstName",
    "firstname": "firstName",
    "first_name": "firstName",
    "given name": "firstName",
    "givenname": "firstName",
    # Middle name
    "middle name": "middleName",
    "middlename": "middleName",
    "middle_name": "middleName",
    "mi": "middleName",
    "middle initial": "middleName",
    # Company
    "company": "companyName",
    "company name": "companyName",
    "companyname": "companyName",
    "company_name": "companyName",
    "corporation": "companyName",
    "business name": "companyName",
    # Case number
    "case no": "caseNo",
    "case no.": "caseNo",
    "caseno": "caseNo",
    "case_no": "caseNo",
    "case number": "caseNo",
    "case #": "caseNo",
    "case": "caseNo",
    "docket no": "caseNo",
    "docket number": "caseNo",
    # Plaintiff
    "plaintiff": "plaintiff",
    "complainant": "plaintiff",
    "petitioner": "plaintiff",
    # Case type
    "case type": "caseType",
    "casetype": "caseType",
    "case_type": "caseType",
    "nature of case": "caseType",
    "nature": "caseType",
    # Court type
    "court type": "courtType",
    "courttype": "courtType",
    "court_type": "courtType",
    "court": "courtType",
    "court name": "courtType",
    # Branch
    "branch": "branch",
    "sala": "branch",
    # City
    "city": "city",
    "location": "city",
    # Date filed
    "date filed": "dateFiled",
    "datefiled": "dateFiled",
    "date_filed": "dateFiled",
    "filing date": "dateFiled",
    "filed date": "dateFiled",
    "date": "dateFiled",
    # Others
    "alias": "alias",
    "aka": "alias",
    "bounce": "bounce",
    "decline": "decline",
    "delinquent": "delinquent",
    "telecom": "telecom",
    "watch": "watch",
    "details": "details",
    "source": "source",
    "type": "type",
    "remarks": "details",
    "notes": "details",
}

# Keywords used to detect header rows in PDF / text extraction
HEADER_KEYWORDS: list[str] = [
    "last name", "lastname", "surname",
    "first name", "firstname", "given name",
    "middle name", "middlename",
    "case no", "caseno", "case number", "docket",
    "plaintiff", "complainant", "petitioner",
    "date filed", "filing date", "filed date",
    "case type", "casetype", "nature of case",
    "court type", "courttype", "court",
    "company", "company name",
    "branch", "sala",
]


def normalise_header(raw: str | None) -> str | None:
    """
    Normalise a raw column header string to a schema field name.
    Returns None if the header is not recognised.
    """
    if not raw:
        return None

    # Strip invisible chars, normalise whitespace, lowercase
    key = raw.strip().lower()
    key = re.sub(r"[\u200b-\u200d\ufeff]", "", key)       # zero-width chars
    key = re.sub(r"[^a-z0-9 _#.]", "", key)               # keep only alphanumeric, space, _, #, .
    key = re.sub(r"\s+", " ", key).strip()

    if key in HEADER_MAP:
        return HEADER_MAP[key]

    # Try without dots and hashes
    key = re.sub(r"[#.]", "", key).strip()
    return HEADER_MAP.get(key)
