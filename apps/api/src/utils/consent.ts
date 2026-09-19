import crypto from "node:crypto";

// India's DPDP Act 2023 defines a child as under 18 and requires verifiable
// parental consent before processing their data. That is stricter than the
// 13 used by COPPA, so 18 is the threshold the product has to meet.
export const MINOR_AGE = 18;

const CONSENT_TOKEN_TTL_DAYS = 14;

export function ageFromDateOfBirth(dateOfBirth: string, now = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function isMinor(dateOfBirth: string, now = new Date()): boolean {
  return ageFromDateOfBirth(dateOfBirth, now) < MINOR_AGE;
}

export interface ConsentToken {
  /** Sent to the guardian. Never stored. */
  token: string;
  /** Stored instead of the token, so a database leak can't grant consent. */
  tokenHash: string;
  expiresAt: string;
}

export function createConsentToken(): ConsentToken {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashConsentToken(token),
    expiresAt: new Date(Date.now() + CONSENT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function hashConsentToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
