import type { Response, NextFunction } from "express";
import { loadProfileGate } from "../lib/profileGate.js";
import type { AuthedRequest } from "./auth.js";

/**
 * Blocks health-data access until date of birth is on file.
 *
 * Password registration always collects it, but OAuth and passkey sign-in
 * create the `auth.users`/`profiles` row without ever asking — so a minor
 * could otherwise reach every health-data route with `consent_status`
 * defaulted to `not_required`, skipping the DPDP parental-consent gate
 * entirely. This runs before `requireConsent` for exactly that reason: consent
 * status isn't trustworthy until we know the user's actual age.
 */
export async function requireDateOfBirth(req: AuthedRequest, res: Response, next: NextFunction) {
  const profile = await loadProfileGate(req.userId!);

  if (!profile) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (profile.date_of_birth) {
    return next();
  }

  return res.status(403).json({
    error: "Tell us your date of birth to continue",
    code: "DATE_OF_BIRTH_REQUIRED",
  });
}
