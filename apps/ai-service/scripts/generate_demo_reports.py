"""Generates 3 synthetic demo lab report PDFs for testing the Document
Intelligence pipeline end-to-end. Every value here is invented for demo
purposes - NOT real patient data.

Run: .venv/Scripts/python.exe scripts/generate_demo_reports.py
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT_DIR = Path(__file__).resolve().parents[1] / "demo_reports"


def _render(filename: str, title: str, patient: str, lines: list[str]) -> None:
    OUT_DIR.mkdir(exist_ok=True)
    path = OUT_DIR / filename
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    y = height - 60

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "SYNTHETIC DEMO DATA - NOT A REAL PATIENT RECORD")
    y -= 24
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, title)
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Patient: {patient} (synthetic)")
    y -= 14
    c.drawString(50, y, "Lab: HERAI Demo Laboratory")
    y -= 28

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Parameter")
    c.drawString(220, y, "Result")
    c.drawString(320, y, "Reference Range")
    y -= 16
    c.setFont("Helvetica", 10)

    for line in lines:
        c.drawString(50, y, line)
        y -= 16

    c.save()
    print(f"wrote {path}")


def main() -> None:
    _render(
        "demo_report_normal.pdf",
        "Annual Wellness Panel",
        "Demo Patient A",
        [
            "Hemoglobin        13.5 g/dL        (12.0-15.5 g/dL)",
            "TSH               2.1 mIU/L         (0.4-4.0 mIU/L)",
            "Glucose (Fasting) 88 mg/dL           (70-99 mg/dL)",
            "Vitamin D         42 ng/mL           (30-100 ng/mL)",
            "Ferritin          65 ng/mL           (15-150 ng/mL)",
        ],
    )

    _render(
        "demo_report_abnormal_moderate.pdf",
        "Hormone & Iron Panel",
        "Demo Patient B",
        [
            "Hemoglobin        10.8 g/dL        (12.0-15.5 g/dL)",
            "Ferritin          12 ng/mL          (15-150 ng/mL)",
            "TSH               2.8 mIU/L         (0.4-4.0 mIU/L)",
            "LH                15 IU/L           (2-12 IU/L)",
            "Testosterone      85 ng/dL          (15-70 ng/dL)",
            "Glucose (Fasting) 96 mg/dL           (70-99 mg/dL)",
        ],
    )

    _render(
        "demo_report_critical.pdf",
        "Complete Blood Count - Urgent Follow-up",
        "Demo Patient C",
        [
            "Hemoglobin        6.5 g/dL         (12.0-15.5 g/dL)",
            "Platelets         42 x10^9/L        (150-450 x10^9/L)",
            "WBC               5.2 x10^9/L        (4.5-11.0 x10^9/L)",
            "Ferritin          4 ng/mL           (15-150 ng/mL)",
        ],
    )


if __name__ == "__main__":
    main()
