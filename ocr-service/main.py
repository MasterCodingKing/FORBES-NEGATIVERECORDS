"""
OCR Microservice — FastAPI application for extracting text and structured
data from PDF, CSV, Excel, and image files.

This service replaces the Node.js Tesseract.js / pdf-parse / csv-parser logic
for the FORBES Negative Records system, providing better OCR accuracy via
EasyOCR and better PDF table detection via pdfplumber.
"""

import os
import sys
import time
import uuid
import logging
import tempfile
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Load .env from service directory
load_dotenv(Path(__file__).parent / ".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ocr-service")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OCR Extraction Service",
    description="Extracts structured record data from PDF, CSV, Excel, and image files.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allowed extensions
ALLOWED_EXTENSIONS = {".pdf", ".csv", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
SPREADSHEET_EXTENSIONS = {".csv", ".xls", ".xlsx"}

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))

# Default chunk size for chunked responses
DEFAULT_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "5000"))

# ---------------------------------------------------------------------------
# In-memory cache for chunked extraction results
# ---------------------------------------------------------------------------

_extraction_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 600  # 10 minutes


def _cache_put(job_id: str, data: dict) -> None:
    with _cache_lock:
        data["_created"] = time.time()
        _extraction_cache[job_id] = data
        # Evict old entries
        now = time.time()
        expired = [k for k, v in _extraction_cache.items()
                   if now - v.get("_created", 0) > _CACHE_TTL_SECONDS]
        for k in expired:
            del _extraction_cache[k]


def _cache_get(job_id: str) -> dict | None:
    with _cache_lock:
        data = _extraction_cache.get(job_id)
        if data and time.time() - data.get("_created", 0) > _CACHE_TTL_SECONDS:
            del _extraction_cache[job_id]
            return None
        return data


def _cache_delete(job_id: str) -> None:
    with _cache_lock:
        _extraction_cache.pop(job_id, None)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ExtractionResponse(BaseModel):
    message: str
    fileName: str
    format: str
    rowCount: int
    rows: list[dict]
    processingTimeMs: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _save_upload(upload: UploadFile) -> tuple[str, str]:
    """Save an uploaded file to a temp directory using chunked writing. Returns (tmp_path, extension)."""
    filename = upload.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    chunk_size = 1024 * 1024  # 1 MB chunks

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        total_written = 0
        while True:
            chunk = upload.file.read(chunk_size)
            if not chunk:
                break
            total_written += len(chunk)
            if total_written > max_bytes:
                # Clean up oversized file
                tmp.close()
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_MB} MB.",
                )
            tmp.write(chunk)

        return tmp.name, ext


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for the Node.js backend to verify connectivity."""
    return HealthResponse(
        status="ok",
        service="ocr-extraction-service",
        version="1.0.0",
    )


@app.post("/extract")
async def extract_file(file: UploadFile = File(...)):
    """
    Universal extraction endpoint.
    Accepts PDF, CSV, XLS, XLSX, PNG, JPG, JPEG files.
    For small results (<=CHUNK_SIZE rows): returns all rows inline.
    For large results: returns first chunk + jobId for paginated fetching.
    """
    start = time.time()
    tmp_path, ext = _save_upload(file)

    try:
        if ext == ".pdf":
            from extractors.pdf_extractor import extract_pdf
            rows = extract_pdf(tmp_path)
            fmt = "pdf"
        elif ext == ".csv":
            from extractors.csv_extractor import extract_csv
            rows = extract_csv(tmp_path)
            fmt = "csv"
        elif ext in (".xls", ".xlsx"):
            from extractors.excel_extractor import extract_excel
            rows = extract_excel(tmp_path)
            fmt = "excel"
        elif ext in IMAGE_EXTENSIONS:
            from extractors.image_extractor import extract_image
            rows = extract_image(tmp_path)
            fmt = "image"
        else:
            raise HTTPException(status_code=400, detail=f"No extractor for '{ext}'")

        elapsed = int((time.time() - start) * 1000)
        logger.info(
            "Extracted %d rows from %s (%s) in %dms",
            len(rows), file.filename, fmt, elapsed,
        )

        total = len(rows)
        chunk_size = DEFAULT_CHUNK_SIZE

        if total <= chunk_size:
            # Small result — return everything inline
            return JSONResponse(content={
                "message": f"Extracted {total} row(s)",
                "fileName": file.filename or "upload",
                "format": fmt,
                "rowCount": total,
                "rows": rows,
                "chunked": False,
                "processingTimeMs": elapsed,
            })
        else:
            # Large result — cache and return first chunk
            job_id = str(uuid.uuid4())
            _cache_put(job_id, {
                "rows": rows,
                "fileName": file.filename or "upload",
                "format": fmt,
                "totalRows": total,
                "processingTimeMs": elapsed,
            })
            first_chunk = rows[:chunk_size]
            return JSONResponse(content={
                "message": f"Extracted {total} row(s) — returning first {chunk_size}, use jobId to fetch more",
                "fileName": file.filename or "upload",
                "format": fmt,
                "rowCount": total,
                "rows": first_chunk,
                "chunked": True,
                "jobId": job_id,
                "chunkSize": chunk_size,
                "offset": 0,
                "hasMore": total > chunk_size,
                "processingTimeMs": elapsed,
            })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Extraction failed for %s", file.filename)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/extract/pdf")
async def extract_pdf_endpoint(file: UploadFile = File(...)):
    """
    PDF-specific extraction endpoint.
    For large results: returns first chunk + jobId for paginated fetching.
    """
    start = time.time()
    filename = file.filename or "upload.pdf"
    ext = os.path.splitext(filename)[1].lower()

    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted on this endpoint.")

    tmp_path, _ = _save_upload(file)

    try:
        from extractors.pdf_extractor import extract_pdf
        rows = extract_pdf(tmp_path)
        elapsed = int((time.time() - start) * 1000)
        total = len(rows)
        chunk_size = DEFAULT_CHUNK_SIZE

        logger.info("PDF extraction: %d rows from %s in %dms", total, filename, elapsed)

        if total <= chunk_size:
            return JSONResponse(content={
                "message": f"Extracted {total} row(s) from PDF",
                "fileName": filename,
                "format": "pdf",
                "rowCount": total,
                "rows": rows,
                "chunked": False,
                "processingTimeMs": elapsed,
            })
        else:
            job_id = str(uuid.uuid4())
            _cache_put(job_id, {
                "rows": rows,
                "fileName": filename,
                "format": "pdf",
                "totalRows": total,
                "processingTimeMs": elapsed,
            })
            first_chunk = rows[:chunk_size]
            return JSONResponse(content={
                "message": f"Extracted {total} row(s) — returning first {chunk_size}",
                "fileName": filename,
                "format": "pdf",
                "rowCount": total,
                "rows": first_chunk,
                "chunked": True,
                "jobId": job_id,
                "chunkSize": chunk_size,
                "offset": 0,
                "hasMore": total > chunk_size,
                "processingTimeMs": elapsed,
            })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF extraction failed for %s", filename)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Chunk retrieval endpoint
# ---------------------------------------------------------------------------

@app.get("/extract/chunk/{job_id}")
async def get_extraction_chunk(
    job_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_CHUNK_SIZE, ge=1, le=50000),
):
    """
    Retrieve a chunk of rows from a previously extracted large file.
    Use the jobId returned from /extract or /extract/pdf.
    """
    cached = _cache_get(job_id)
    if not cached:
        raise HTTPException(status_code=404, detail="Job not found or expired. Please re-upload the file.")

    all_rows = cached["rows"]
    total = len(all_rows)
    chunk = all_rows[offset:offset + limit]
    next_offset = offset + limit

    return JSONResponse(content={
        "jobId": job_id,
        "fileName": cached.get("fileName", ""),
        "format": cached.get("format", ""),
        "rowCount": total,
        "rows": chunk,
        "offset": offset,
        "limit": limit,
        "hasMore": next_offset < total,
        "nextOffset": next_offset if next_offset < total else None,
    })


@app.delete("/extract/chunk/{job_id}")
async def delete_extraction_cache(job_id: str):
    """Delete cached extraction data to free memory."""
    _cache_delete(job_id)
    return JSONResponse(content={"message": "Cache cleared"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    logger.info("Starting OCR service on %s:%d", host, port)
    uvicorn.run("main:app", host=host, port=port, reload=True)
