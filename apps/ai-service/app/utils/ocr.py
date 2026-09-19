"""Text extraction from an uploaded report — the OCR stage of the document pipeline.

PDFs get real text-layer extraction via pypdf (genuine, not mocked — this is
the fully-supported path for the synthetic demo reports). JPG/PNG go through
pytesseract if a Tesseract binary is actually installed on the host; when it
isn't (common in a fresh dev/demo environment with no system OCR engine),
this returns an honest low-confidence empty result rather than fabricating
text — consistent with "say so explicitly rather than guessing".
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field


@dataclass
class OcrResult:
    text: str
    confidence: float  # 0..1, real signal from the extraction method itself
    method: str  # "pdf_text" | "image_ocr" | "unavailable"
    warnings: list[str] = field(default_factory=list)


def extract_text(file_bytes: bytes, mime_type: str) -> OcrResult:
    if mime_type == "application/pdf":
        return _extract_pdf_text(file_bytes)
    if mime_type in ("image/jpeg", "image/png"):
        return _extract_image_text(file_bytes)
    return OcrResult(text="", confidence=0.0, method="unavailable", warnings=[f"Unsupported file type: {mime_type}"])


def _extract_pdf_text(file_bytes: bytes) -> OcrResult:
    try:
        from pypdf import PdfReader
    except ImportError:
        return OcrResult(text="", confidence=0.0, method="unavailable", warnings=["pypdf is not installed"])

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text).strip()
    except Exception as exc:  # noqa: BLE001 - a malformed/corrupt PDF shouldn't crash the pipeline
        return OcrResult(text="", confidence=0.0, method="unavailable", warnings=[f"Could not read PDF: {exc}"])

    if not text:
        return OcrResult(
            text="",
            confidence=0.1,
            method="pdf_text",
            warnings=["No extractable text layer found — this PDF may be a scanned image without OCR support."],
        )
    return OcrResult(text=text, confidence=0.95, method="pdf_text")


def _extract_image_text(file_bytes: bytes) -> OcrResult:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return OcrResult(
            text="",
            confidence=0.0,
            method="unavailable",
            warnings=["Image OCR isn't available in this environment (Tesseract not installed). Upload a PDF instead, or configure a real OCR/vision provider."],
        )

    try:
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image).strip()
    except Exception as exc:  # noqa: BLE001 - missing Tesseract binary, unreadable image, etc.
        return OcrResult(
            text="",
            confidence=0.0,
            method="unavailable",
            warnings=[f"Image OCR failed in this environment: {exc}. Upload a PDF instead, or configure a real OCR/vision provider."],
        )

    if not text:
        return OcrResult(text="", confidence=0.2, method="image_ocr", warnings=["OCR found no readable text in this image."])
    return OcrResult(text=text, confidence=0.6, method="image_ocr", warnings=["Image OCR is lower-confidence than PDF text extraction — double-check extracted values against the original report."])
