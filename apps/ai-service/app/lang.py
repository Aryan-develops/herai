"""Reply language and tone for user-facing agents.

The chat request may carry a `language` code. "auto" (or nothing) means: answer in whatever language the
person wrote in, including romanised Hindi ("Hinglish") and other Indian languages typed in Latin letters.
"""

from __future__ import annotations

from contextvars import ContextVar

LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi (Devanagari)",
    "bn": "Bengali",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi (Gurmukhi)",
    "or": "Odia",
    "ur": "Urdu",
}

# Set once per request by the orchestrator; read by the LLM wrapper in agents/base.py.
current_language: ContextVar[str] = ContextVar("current_language", default="auto")


def normalize(code: str | None) -> str:
    code = (code or "auto").strip().lower()
    return code if code in LANGUAGES else "auto"


def directive(code: str) -> str:
    if code == "auto":
        who = (
            "Reply in the same language the person's latest message is written in. That includes Hindi, Bengali, "
            "Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia and Urdu, and also Indian languages "
            "typed in English letters (for example Hinglish): answer in the same script and mix they used. "
            "If the message is too short to tell, use English."
        )
    else:
        who = f"Write every human-readable string in {LANGUAGES[code]}, even if the person writes in another language."
    return (
        "\n\nLanguage and tone:\n"
        f"- {who}\n"
        "- Keep JSON keys, enum values and numbers exactly as specified (English keys, lowercase enum values); "
        "only the human-readable string values are translated.\n"
        "- Sound like a caring friend, not a leaflet. Be brief: say only what helps right now. "
        "No repeated disclaimers, no restating what they just told you, and never open two replies the same way.\n"
    )


# Emergency copy. Safety-critical, so it is fixed text, not generated. 108 is India's ambulance number.
EMERGENCY: dict[str, tuple[str, str]] = {
    "en": (
        "This could be a medical emergency. Please call 108 or go to the nearest hospital right now. Don't wait to see if it passes.",
        "Get emergency care now.",
    ),
    "hi": (
        "यह आपातकालीन स्थिति हो सकती है। कृपया अभी 108 पर कॉल करें या नज़दीकी अस्पताल जाएँ। इंतज़ार न करें।",
        "अभी आपातकालीन इलाज लें।",
    ),
    "bn": (
        "এটি জরুরি অবস্থা হতে পারে। এখনই ১০৮ নম্বরে ফোন করুন বা নিকটতম হাসপাতালে যান। অপেক্ষা করবেন না।",
        "এখনই জরুরি চিকিৎসা নিন।",
    ),
    "mr": (
        "ही आणीबाणीची स्थिती असू शकते. कृपया आत्ताच १०८ वर कॉल करा किंवा जवळच्या रुग्णालयात जा. थांबू नका.",
        "आत्ताच तातडीने उपचार घ्या.",
    ),
    "ta": (
        "இது அவசர நிலையாக இருக்கலாம். உடனே 108 ஐ அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும். காத்திருக்க வேண்டாம்.",
        "உடனே அவசர சிகிச்சை பெறுங்கள்.",
    ),
    "te": (
        "ఇది అత్యవసర పరిస్థితి కావచ్చు. వెంటనే 108కి కాల్ చేయండి లేదా దగ్గరలోని ఆసుపత్రికి వెళ్లండి. ఆలస్యం చేయవద్దు.",
        "వెంటనే అత్యవసర చికిత్స పొందండి.",
    ),
    "gu": (
        "આ કટોકટીની સ્થિતિ હોઈ શકે છે. કૃપા કરીને હમણાં જ 108 પર કૉલ કરો અથવા નજીકની હૉસ્પિટલમાં જાઓ. રાહ ન જુઓ.",
        "હમણાં જ કટોકટીની સારવાર લો.",
    ),
    "kn": (
        "ಇದು ತುರ್ತು ಪರಿಸ್ಥಿತಿ ಆಗಿರಬಹುದು. ದಯವಿಟ್ಟು ಈಗಲೇ 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಿ. ಕಾಯಬೇಡಿ.",
        "ಈಗಲೇ ತುರ್ತು ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.",
    ),
    "ml": (
        "ഇത് അടിയന്തര സാഹചര്യമാകാം. ഉടൻ 108 ലേക്ക് വിളിക്കുക അല്ലെങ്കിൽ അടുത്തുള്ള ആശുപത്രിയിൽ പോകുക. കാത്തിരിക്കരുത്.",
        "ഉടൻ അടിയന്തര ചികിത്സ തേടുക.",
    ),
    "pa": (
        "ਇਹ ਐਮਰਜੈਂਸੀ ਹੋ ਸਕਦੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੁਣੇ 108 'ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਨੇੜਲੇ ਹਸਪਤਾਲ ਜਾਓ। ਉਡੀਕ ਨਾ ਕਰੋ।",
        "ਹੁਣੇ ਐਮਰਜੈਂਸੀ ਇਲਾਜ ਲਓ।",
    ),
    "or": (
        "ଏହା ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି ହୋଇପାରେ। ଦୟାକରି ବର୍ତ୍ତମାନ 108 କୁ କଲ୍ କରନ୍ତୁ କିମ୍ବା ନିକଟସ୍ଥ ହସ୍ପିଟାଲକୁ ଯାଆନ୍ତୁ। ଅପେକ୍ଷା କରନ୍ତୁ ନାହିଁ।",
        "ବର୍ତ୍ତମାନ ଜରୁରୀ ଚିକିତ୍ସା ନିଅନ୍ତୁ।",
    ),
    "ur": (
        "یہ ہنگامی صورتحال ہو سکتی ہے۔ براہِ کرم ابھی 108 پر کال کریں یا قریبی ہسپتال جائیں۔ انتظار نہ کریں۔",
        "ابھی ہنگامی علاج لیں۔",
    ),
}


def detect_script(text: str) -> str | None:
    """Best-effort language from the script of the message. Used only to pick fixed emergency copy."""
    ranges = {
        "hi": (0x0900, 0x097F),  # Devanagari; Marathi shares it, treated as Hindi unless the caller says mr
        "bn": (0x0980, 0x09FF),
        "pa": (0x0A00, 0x0A7F),
        "gu": (0x0A80, 0x0AFF),
        "or": (0x0B00, 0x0B7F),
        "ta": (0x0B80, 0x0BFF),
        "te": (0x0C00, 0x0C7F),
        "kn": (0x0C80, 0x0CFF),
        "ml": (0x0D00, 0x0D7F),
        "ur": (0x0600, 0x06FF),
    }
    counts: dict[str, int] = {}
    for ch in text:
        o = ord(ch)
        for code, (lo, hi) in ranges.items():
            if lo <= o <= hi:
                counts[code] = counts.get(code, 0) + 1
    return max(counts, key=counts.get) if counts else None


def emergency_copy(code: str, message: str) -> tuple[str, str]:
    lang = code if code in EMERGENCY else (detect_script(message) or "en")
    return EMERGENCY.get(lang, EMERGENCY["en"])
