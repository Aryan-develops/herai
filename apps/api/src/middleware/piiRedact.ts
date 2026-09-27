/**
 * Replace PII patterns in a string with [REDACTED] before forwarding to the AI service.
 * Patterns: email addresses, phone numbers (E.164, Indian, common formats), Aadhaar, PAN.
 */

const PATTERNS: RegExp[] = [
  // Email
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  // Phone — E.164 (+91..., +1...), common separators, 10-digit Indian mobile
  /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{3,4}([\s\-.]?\d{2,4})?/g,
  // Aadhaar — 12 digits (spaced or plain)
  /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  // PAN — 5 letters, 4 digits, 1 letter
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
];

export function redactPii(text: string): string {
  let out = text;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}
