"""Structured value extraction + validation for uploaded lab reports.

Deliberately NOT LLM-based, same reasoning as app/agents/safety_triage.py:
"never invent a value that wasn't actually extracted" is a hard correctness
requirement, and an LLM (mock or real) can too easily produce a plausible-
looking number that isn't actually in the source text. This module only ever
emits a value it found evidence for in the OCR'd text; anything it can't
parse cleanly is marked "unparseable" rather than guessed.

Two stages, matching the pipeline spec:
  extract_values()  — parameter, raw value, unit, and any reference range
                       text found directly in the document
  validate_values()  — range sanity checks against REFERENCE_RANGES,
                       producing a status per value
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

REFERENCE_RANGES: dict[str, dict] = {
    "Hemoglobin": {"unit": "g/dL", "low": 12.0, "high": 15.5, "critical_low": 7.0, "critical_high": 20.0},
    "WBC": {"unit": "x10^9/L", "low": 4.5, "high": 11.0, "critical_low": 2.0, "critical_high": 30.0},
    "Platelets": {"unit": "x10^9/L", "low": 150, "high": 450, "critical_low": 50, "critical_high": 1000},
    "Glucose (Fasting)": {"unit": "mg/dL", "low": 70, "high": 99, "critical_low": 54, "critical_high": 250},
    "HbA1c": {"unit": "%", "low": 4.0, "high": 5.6, "critical_low": None, "critical_high": 10.0},
    "TSH": {"unit": "mIU/L", "low": 0.4, "high": 4.0, "critical_low": 0.05, "critical_high": 20.0},
    "Vitamin D": {"unit": "ng/mL", "low": 30, "high": 100, "critical_low": None, "critical_high": None},
    "Ferritin": {"unit": "ng/mL", "low": 15, "high": 150, "critical_low": 5, "critical_high": None},
    "LH": {"unit": "IU/L", "low": 2, "high": 12, "critical_low": None, "critical_high": None},
    "FSH": {"unit": "IU/L", "low": 3, "high": 10, "critical_low": None, "critical_high": None},
    "Testosterone": {"unit": "ng/dL", "low": 15, "high": 70, "critical_low": None, "critical_high": None},
    "Estradiol": {"unit": "pg/mL", "low": 15, "high": 350, "critical_low": None, "critical_high": None},
    "Total Cholesterol": {"unit": "mg/dL", "low": 0, "high": 200, "critical_low": None, "critical_high": None},
    "Creatinine": {"unit": "mg/dL", "low": 0.5, "high": 1.1, "critical_low": None, "critical_high": 4.0},
}

# Alias -> canonical parameter name, so "Hb"/"Hgb" both resolve to "Hemoglobin".
ALIASES: dict[str, str] = {
    "hb": "Hemoglobin",
    "hgb": "Hemoglobin",
    "hemoglobin": "Hemoglobin",
    "wbc": "WBC",
    "white blood cell": "WBC",
    "white blood cell count": "WBC",
    "platelet": "Platelets",
    "platelets": "Platelets",
    "platelet count": "Platelets",
    "glucose": "Glucose (Fasting)",
    "glucose (fasting)": "Glucose (Fasting)",
    "fasting glucose": "Glucose (Fasting)",
    "hba1c": "HbA1c",
    "a1c": "HbA1c",
    "tsh": "TSH",
    "thyroid stimulating hormone": "TSH",
    "vitamin d": "Vitamin D",
    "vitamin d, 25-hydroxy": "Vitamin D",
    "25-oh vitamin d": "Vitamin D",
    "ferritin": "Ferritin",
    "lh": "LH",
    "luteinizing hormone": "LH",
    "fsh": "FSH",
    "follicle stimulating hormone": "FSH",
    "testosterone": "Testosterone",
    "total testosterone": "Testosterone",
    "estradiol": "Estradiol",
    "total cholesterol": "Total Cholesterol",
    "cholesterol, total": "Total Cholesterol",
    "creatinine": "Creatinine",
}

# Parameters where women's-health-intelligence layering is relevant.
WOMENS_HEALTH_PARAMETERS = {"Hemoglobin", "Ferritin", "TSH", "LH", "FSH", "Testosterone", "Estradiol"}

_ALIAS_PATTERN = re.compile(
    r"(?i)\b(" + "|".join(re.escape(a) for a in sorted(ALIASES, key=len, reverse=True)) + r")\b"
)
_NUMBER_PATTERN = re.compile(r"[<>]?\s*(-?\d+\.?\d*)")
_UNIT_PATTERN = re.compile(r"([a-zA-Z%µ][a-zA-Z0-9%µ^]*(?:/[a-zA-Z0-9%µ]+)?)")
_RANGE_PATTERN = re.compile(r"(-?\d+\.?\d*)\s*(?:-|to)\s*(-?\d+\.?\d*)")


@dataclass
class RawExtractedValue:
    parameter: str
    value: float | None
    unit: str | None
    reference_range_text: str | None
    source_line: str
    parseable: bool


def extract_values(raw_text: str) -> list[RawExtractedValue]:
    """Stage 1: find recognized lab parameters in the OCR'd text and pull out
    whatever value/unit/range is actually present on that line — never a
    parameter that isn't named in the text, never a value that isn't there.
    """
    results: list[RawExtractedValue] = []
    seen_params: set[str] = set()

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _ALIAS_PATTERN.search(line)
        if not match:
            continue

        canonical = ALIASES[match.group(1).lower()]
        if canonical in seen_params:
            continue  # first occurrence wins — don't emit duplicate rows for repeated header/legend text

        remainder = line[match.end():]
        number_match = _NUMBER_PATTERN.search(remainder)
        value: float | None = None
        unit: str | None = None
        parseable = False

        if number_match:
            try:
                value = float(number_match.group(1))
                parseable = True
            except ValueError:
                value = None

            after_number = remainder[number_match.end():]
            unit_match = _UNIT_PATTERN.search(after_number)
            if unit_match and unit_match.group(1).lower() not in ("to",):
                unit = unit_match.group(1)

        range_match = _RANGE_PATTERN.search(remainder[number_match.end():] if number_match else remainder)
        reference_range_text = None
        if range_match:
            reference_range_text = f"{range_match.group(1)}-{range_match.group(2)}"
            if unit:
                reference_range_text += f" {unit}"

        seen_params.add(canonical)
        results.append(
            RawExtractedValue(
                parameter=canonical,
                value=value,
                unit=unit or REFERENCE_RANGES.get(canonical, {}).get("unit"),
                reference_range_text=reference_range_text,
                source_line=line,
                parseable=parseable,
            )
        )

    return results


def validate_values(raw_values: list[RawExtractedValue]) -> list[dict]:
    """Stage 2: range sanity checks. Malformed values are surfaced as
    "unparseable" rather than silently dropped or guessed at.
    """
    validated: list[dict] = []

    for rv in raw_values:
        table = REFERENCE_RANGES.get(rv.parameter)

        if not rv.parseable or rv.value is None:
            validated.append(
                {
                    "parameter": rv.parameter,
                    "value": None,
                    "unit": rv.unit,
                    "reference_range": rv.reference_range_text or (_table_range_text(table) if table else None),
                    "status": "unparseable",
                    "source_line": rv.source_line,
                }
            )
            continue

        low, high, crit_low, crit_high = _resolve_range(rv, table)

        status = "in_range"
        if low is not None and rv.value < low:
            status = "critical_low" if (crit_low is not None and rv.value <= crit_low) else "below_range"
        elif high is not None and rv.value > high:
            status = "critical_high" if (crit_high is not None and rv.value >= crit_high) else "above_range"

        reference_range = rv.reference_range_text
        if not reference_range and low is not None and high is not None:
            unit_suffix = f" {rv.unit}" if rv.unit else ""
            reference_range = f"{low}-{high}{unit_suffix}"

        validated.append(
            {
                "parameter": rv.parameter,
                "value": rv.value,
                "unit": rv.unit,
                "reference_range": reference_range,
                "status": status,
                "source_line": rv.source_line,
            }
        )

    return validated


def _resolve_range(rv: RawExtractedValue, table: dict | None) -> tuple[float | None, float | None, float | None, float | None]:
    if rv.reference_range_text:
        range_match = _RANGE_PATTERN.search(rv.reference_range_text)
        if range_match:
            low, high = float(range_match.group(1)), float(range_match.group(2))
            crit_low = table.get("critical_low") if table else None
            crit_high = table.get("critical_high") if table else None
            return low, high, crit_low, crit_high
    if table:
        return table["low"], table["high"], table.get("critical_low"), table.get("critical_high")
    return None, None, None, None


def _table_range_text(table: dict) -> str:
    return f"{table['low']}-{table['high']} {table['unit']}"
