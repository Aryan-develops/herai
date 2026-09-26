"""Deterministic, dependency-free text extraction used by the Intake Agent
and the Safety/Triage Agent's hard gate.

This is intentionally NOT LLM-based. The Intake Agent uses it so the demo
pipeline works with zero API cost under MockLLMProvider, and a real
LLMProvider would eventually replace/augment it with actual NLP. The
Safety/Triage Agent uses `detect_emergency` as its hard gate specifically
BECAUSE it is deterministic and doesn't depend on a model's judgment for a
safety-critical decision.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# --- generic tokenization (used by the mock embedding + knowledge retrieval) -

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")

STOPWORDS: frozenset[str] = frozenset(
    """
    the a an and or but if then else for nor so yet with without within
    this that these those is are was were be been being have has had do
    does did will would shall should can could may might must not no yes
    you your yours i me my mine we our ours they their theirs he she it
    its him her his to of in on at by from as about into over under again
    further than too very just also more most some such only own same
    what which who whom how when where why here there all any both each
    few because while during before after above below up down out off
    once been having having between
    """.split()
)

# --- symptom vocabulary -----------------------------------------------------

_SYMPTOM_PATTERNS: list[tuple[str, str]] = [
    ("fatigue", r"\b(tired|tiredness|fatigue[d]?|exhaust(ed|ion)|low energy|no energy|drained|worn out)\b"),
    ("headache", r"\b(headache[s]?|migraine[s]?)\b"),
    ("cramps", r"\b(cramp(s|ing)?)\b"),
    ("nausea", r"\b(nausea(ted)?|nauseous|queasy)\b"),
    ("dizziness", r"\b(dizzy|dizziness|light[- ]?headed)\b"),
    ("bloating", r"\b(bloat(ing|ed)?)\b"),
    ("mood changes", r"\b(mood swing[s]?|irritab(le|ility)|anxious|anxiety|low mood|depressed)\b"),
    ("acne", r"\b(acne|breakout[s]?|pimple[s]?)\b"),
    ("hair loss", r"\b(hair loss|hair thinning|thinning hair|hair fall(ing)?)\b"),
    ("sleep disturbance", r"\b(insomnia|can'?t sleep|trouble sleeping|sleepless|sleep issues)\b"),
    (
        "abnormal bleeding",
        r"\b(heavy (bleeding|period[s]?)|spotting|abnormal bleeding|"
        r"(bleeding|period[s]?) (is|are|has been|have been|feels?) (really |very |quite )?heavy)\b",
    ),
    ("fever", r"\b(fever(ish)?|chills)\b"),
    (
        "weight change",
        r"\b(weight (gain|loss)|gaining weight|losing weight|gained weight|lost weight|put on weight|"
        r"weight (has|have) (gone up|gone down|increased|decreased|changed))\b",
    ),
    ("hot flashes", r"\b(hot flash(es)?|night sweats)\b"),
    ("brain fog", r"\b(brain fog|trouble concentrating|difficulty concentrating|forgetful(ness)?)\b"),
    ("hirsutism", r"\b(excess (facial )?hair|unwanted hair growth|facial hair growth)\b"),
    (
        "irregular cycle",
        r"\b(irregular (period|cycle)[s]?|missed period|late period|skipped period|"
        r"(period|cycle)[s]? (is|are|has been|have been) (really |very |quite )?irregular|"
        r"(period|cycle)[s]? (is|are) (always |never )?(unpredictable|all over the place|off))\b",
    ),
    ("breast tenderness", r"\b(breast (pain|tenderness)|sore breasts)\b"),
    ("pain", r"\b(pain|ache[s]?|aching|sore(ness)?)\b"),
]
_SYMPTOM_REGEXES = [(name, re.compile(pattern, re.IGNORECASE)) for name, pattern in _SYMPTOM_PATTERNS]

_WOMENS_HEALTH_KEYWORDS = re.compile(
    r"\b(period|periods|cycle|menstrual|menstruation|pregnan\w*|pcos|hormon\w*|ovulat\w*|"
    r"pms|contracepti\w*|birth control|pad|tampon|vaginal)\b",
    re.IGNORECASE,
)
_WOMENS_HEALTH_SYMPTOMS = {
    "cramps", "abnormal bleeding", "irregular cycle", "hot flashes", "acne",
    "hirsutism", "breast tenderness", "bloating", "mood changes",
}

# --- duration ----------------------------------------------------------------

_WORD_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "couple": 2, "few": 3, "several": 4,
}
_NUMERIC_DURATION_RE = re.compile(r"\b(\d+)\s*(day|days|week|weeks|month|months|year|years|hour|hours)\b", re.IGNORECASE)
_WORD_DURATION_RE = re.compile(
    r"\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple(?: of)?|few|several)\s*"
    r"(day|days|week|weeks|month|months|year|years|hour|hours)\b",
    re.IGNORECASE,
)


def extract_duration(text: str) -> str | None:
    match = _NUMERIC_DURATION_RE.search(text)
    if match:
        n, unit = match.group(1), match.group(2).lower()
        return f"{n} {unit}"
    match = _WORD_DURATION_RE.search(text)
    if match:
        word = match.group(1).lower().split(" ")[0]
        n = _WORD_NUMBERS.get(word, 1)
        unit = match.group(2).lower()
        return f"{n} {unit}"
    return None


# --- severity ------------------------------------------------------------------

_SEVERITY_SCALE_RE = re.compile(r"\b(\d{1,2})\s*(?:/|out of)\s*10\b", re.IGNORECASE)
_SEVERE_WORDS = re.compile(
    r"\b(severe|intense|unbearable|excruciating|extreme|worst|debilitating|can'?t function)\b",
    re.IGNORECASE,
)
_MODERATE_WORDS = re.compile(r"\b(moderate|noticeable|somewhat|pretty bad)\b", re.IGNORECASE)
_MILD_WORDS = re.compile(r"\b(mild|slight|a little|minor|barely)\b", re.IGNORECASE)


def extract_severity(text: str) -> str | None:
    match = _SEVERITY_SCALE_RE.search(text)
    if match:
        score = int(match.group(1))
        if score >= 7:
            return "severe"
        if score >= 4:
            return "moderate"
        return "mild"
    if _SEVERE_WORDS.search(text):
        return "severe"
    if _MODERATE_WORDS.search(text):
        return "moderate"
    if _MILD_WORDS.search(text):
        return "mild"
    return None


# --- symptoms ------------------------------------------------------------------

def extract_symptoms(text: str) -> list[str]:
    found = []
    for name, regex in _SYMPTOM_REGEXES:
        if regex.search(text):
            found.append(name)
    return found


def is_womens_health_relevant(text: str, symptoms: list[str]) -> bool:
    if _WOMENS_HEALTH_KEYWORDS.search(text):
        return True
    return any(s in _WOMENS_HEALTH_SYMPTOMS for s in symptoms)


def extract_context(text: str) -> str | None:
    """Best-effort life-context clue (stress, travel, new medication, diet)."""
    context_patterns = [
        ("recent stress", r"\b(stress(ed|ful)?|overwhelmed|deadline|exam[s]?)\b"),
        ("recent travel", r"\b(travel(l?ed|ling)?|jet ?lag|flight)\b"),
        ("medication change", r"\b(new (medication|pill|prescription)|started (taking|a new))\b"),
        ("diet or lifestyle change", r"\b(diet|new workout|started exercising|stopped exercising)\b"),
    ]
    for label, pattern in context_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return label
    return None


_GREETING_RE = re.compile(
    r"^\s*(hi|hello|hey|thanks|thank you|ok|okay|yo|sup|good (morning|afternoon|evening))[\s!.,]*$",
    re.IGNORECASE,
)


def classify_request(text: str, symptoms: list[str], is_emergency: bool) -> str:
    if is_emergency:
        return "emergency_like"
    if symptoms:
        return "symptom_query"
    if _GREETING_RE.match(text.strip()):
        return "greeting"
    lowered = text.lower()
    if any(
        q in lowered
        for q in ("what is", "what are", "why do", "why does", "how do", "how can", "is it normal", "should i")
    ):
        return "general_question"
    return "informational"


# --- emergency (hard safety gate) ----------------------------------------------

_EMERGENCY_PATTERNS: dict[str, list[str]] = {
    "cardiac_or_respiratory": [
        "chest pain", "chest tightness", "can't breathe", "cant breathe",
        "difficulty breathing", "shortness of breath", "turning blue", "blue lips",
    ],
    "neurological": [
        "worst headache of my life", "slurred speech", "face drooping",
        "sudden numbness", "sudden weakness", "seizure", "can't speak",
        "loss of consciousness", "passed out", "fainted",
    ],
    "mental_health_crisis": [
        "suicidal", "kill myself", "want to die", "end my life",
        "self-harm", "self harm", "hurting myself", "harming myself",
    ],
    "obstetric_gynecologic_emergency": [
        "soaking a pad every hour", "soaking through a pad in an hour",
        "soaking a pad an hour", "severe abdominal pain and pregnant",
        "heavy bleeding and pregnant", "severe pelvic pain and fever",
    ],
    "severe_bleeding_or_pain": [
        "uncontrolled bleeding", "severe abdominal pain", "worst pain of my life",
        "can't stop the bleeding", "cant stop the bleeding",
    ],
}

# The gate is keyword based, so it needs the words people actually type. Hindi (Devanagari) and Hinglish
# are covered here; other Indian languages are caught by the risk agent's "urgent" level and the language
# specific phrases below for the most common crisis wording.
_EMERGENCY_PATTERNS_IN: dict[str, list[str]] = {
    "cardiac_or_respiratory": [
        "सीने में दर्द", "सांस नहीं", "साँस नहीं", "सांस लेने में तकलीफ", "seene mein dard", "sine me dard",
        "saans nahi", "sans nahi aa", "saans lene mein takleef", "छाती में दर्द",
    ],
    "neurological": [
        "बेहोश", "दौरा पड़", "behosh", "daura pad", "zubaan lad", "बोल नहीं पा",
    ],
    "mental_health_crisis": [
        "मरना चाहती", "जान देना", "आत्महत्या", "खुद को नुकसान", "marna chahti", "jaan dena", "khudkushi",
        "suicide karna", "khud ko nuksan", "মরে যেতে চাই", "আত্মহত্যা", "இறக்க வேண்டும்", "தற்கொலை",
        "చనిపోవాలని", "ఆత్మహత్య", "મરી જવું છે", "આત્મહત્યા", "ಸಾಯಬೇಕು", "ആത്മഹത്യ", "ਖੁਦਕੁਸ਼ੀ", "خودکشی",
    ],
    "obstetric_gynecologic_emergency": [
        "बहुत ज़्यादा ब्लीडिंग", "बहुत ज्यादा ब्लीडिंग", "ब्लीडिंग रुक नहीं", "bleeding ruk nahi",
        "bahut zyada bleeding", "pad har ghante", "हर घंटे पैड",
    ],
    "severe_bleeding_or_pain": [
        "बहुत तेज़ दर्द", "बहुत तेज दर्द", "बर्दाश्त नहीं", "bahut tez dard", "bardasht nahi",
    ],
}


@dataclass
class EmergencyCheck:
    is_emergency: bool
    matched_signals: list[str] = field(default_factory=list)
    category: str | None = None


def detect_emergency(text: str) -> EmergencyCheck:
    lowered = text.lower()
    for patterns in (_EMERGENCY_PATTERNS, _EMERGENCY_PATTERNS_IN):
        for category, phrases in patterns.items():
            matched = [p for p in phrases if p in lowered]
            if matched:
                return EmergencyCheck(is_emergency=True, matched_signals=matched, category=category)
    return EmergencyCheck(is_emergency=False)
