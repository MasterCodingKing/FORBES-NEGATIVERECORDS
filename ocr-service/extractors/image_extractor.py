"""
Image extractor — performs OCR on image files (PNG, JPG, JPEG)
using EasyOCR for high-accuracy text recognition.
"""

import os
import easyocr

from utils.row_parser import parse_text_to_rows

# Lazy-initialised EasyOCR reader (heavyweight, load once)
_reader: easyocr.Reader | None = None


def _get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        languages = os.getenv("OCR_LANGUAGES", "en").split(",")
        use_gpu = os.getenv("USE_GPU", "false").lower() == "true"
        _reader = easyocr.Reader(languages, gpu=use_gpu)
    return _reader


def ocr_image(file_path: str) -> str:
    """
    Extract text from a single image file using EasyOCR.
    Returns the full extracted text as a string.
    """
    reader = _get_reader()
    results = reader.readtext(file_path, detail=0, paragraph=True)
    return "\n".join(results)


def extract_image(file_path: str) -> list[dict]:
    """
    Extract text from an image file and parse into structured rows.
    """
    text = ocr_image(file_path)
    if not text.strip():
        return []
    return parse_text_to_rows(text)
