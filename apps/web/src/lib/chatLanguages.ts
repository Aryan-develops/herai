export const CHAT_LANGUAGES: { code: string; label: string }[] = [
  { code: "auto", label: "Auto" },
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "ur", label: "اردو" },
];

const KEY = "lunee.chatLanguage";

export function loadChatLanguage(): string {
  try {
    const v = localStorage.getItem(KEY);
    return v && CHAT_LANGUAGES.some((l) => l.code === v) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function saveChatLanguage(code: string) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}
