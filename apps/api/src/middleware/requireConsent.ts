import type { Response, NextFunction } from "express";
import { loadProfileGate } from "../lib/profileGate.js";
import type { AuthedRequest } from "./auth.js";

/**
 * Blocks health-data access for a minor whose guardian has not consented.
 *
 * The DPDP Act requires verifiable parental consent *before* a child's data
 * is processed, so this guards every route that reads or writes health data.
 * Authentication alone is not enough: a minor can hold a valid session while
 * having no right to have their data processed yet.
 *
 * Adults are `not_required` and pass straight through.
 */
export async function requireConsent(req: AuthedRequest, res: Response, next: NextFunction) {
  const profile = await loadProfileGate(req.userId!);

  if (!profile) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (profile.consent_status === "not_required" || profile.consent_status === "granted") {
    return next();
  }

  // A distinct code so the client can route to the "waiting for your guardian"
  // screen instead of showing a generic permission error.
  return res.status(403).json({
    error:
      profile.consent_status === "pending"
        ? "Waiting for a parent or guardian to approve this account"
        : "A parent or guardian has not approved this account",
    code: "PARENTAL_CONSENT_REQUIRED",
    consentStatus: profile.consent_status,
  });
}
