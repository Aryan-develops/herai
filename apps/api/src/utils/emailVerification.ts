import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Stateless email-verification tokens: `<userId>.<expiresAtMs>.<signature>`. No table needed, and a
 * token can't be forged without the secret. Verifying twice is harmless (it only marks the email
 * confirmed), so single-use isn't enforced. Falls back to the service-role key as the HMAC secret,
 * which never leaves the server.
 */
const TTL_MS = 48 * 60 * 60 * 1000;

function secret(): string {
  return process.env.EMAIL_VERIFY_SECRET ?? env.supabaseServiceRoleKey;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(`verify-email:${payload}`).digest("base64url");
}

export function createVerificationToken(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id when the token is genuine and unexpired, otherwise null. */
export function readVerificationToken(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  const expected = sign(`${userId}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return null;
  return userId;
}
