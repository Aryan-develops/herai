import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { sendGuardianConsentEmail } from "../config/notifier.js";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { createConsentToken, hashConsentToken } from "../utils/consent.js";

interface CreateConsentRequestArgs {
  userId: string;
  minorName: string;
  guardianEmail: string;
  guardianName?: string;
}

/**
 * Issues a consent request and emails the guardian a one-time link.
 *
 * Called at registration for a minor, and again on resend. Any earlier
 * pending request for the same user is expired first so only one live link
 * exists at a time.
 */
export async function createConsentRequest(args: CreateConsentRequestArgs): Promise<void> {
  const { token, tokenHash, expiresAt } = createConsentToken();

  await supabaseAdmin
    .from("parental_consents")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("user_id", args.userId)
    .eq("status", "pending");

  const { error } = await supabaseAdmin.from("parental_consents").insert({
    user_id: args.userId,
    guardian_email: args.guardianEmail,
    guardian_name: args.guardianName,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new HttpError(500, "Failed to create the parental consent request");
  }

  await sendGuardianConsentEmail({
    guardianEmail: args.guardianEmail,
    guardianName: args.guardianName,
    minorName: args.minorName,
    consentUrl: `${env.appBaseUrl}/consent/${token}`,
  });
}

async function loadByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("parental_consents")
    .select("id, user_id, guardian_email, guardian_name, status, expires_at")
    .eq("token_hash", hashConsentToken(token))
    .single();

  if (error || !data) {
    throw new HttpError(404, "This consent link is not valid");
  }
  return data;
}

/** Guardian-facing, unauthenticated: the guardian has a link, not an account. */
export async function getConsentRequest(req: Request, res: Response) {
  const record = await loadByToken(req.params.token);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name")
    .eq("id", record.user_id)
    .single();

  res.json({
    request: {
      minorName: profile?.name ?? "this account",
      guardianEmail: record.guardian_email,
      guardianName: record.guardian_name,
      status: record.status,
      expired: new Date(record.expires_at) < new Date(),
    },
  });
}

const decisionSchema = z.object({ decision: z.enum(["grant", "decline"]) });

export async function respondToConsentRequest(req: Request, res: Response) {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "decision must be 'grant' or 'decline'");
  }

  const record = await loadByToken(req.params.token);

  if (record.status !== "pending") {
    throw new HttpError(409, "This consent request has already been answered");
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new HttpError(410, "This consent link has expired. Ask them to request a new one.");
  }

  const status = parsed.data.decision === "grant" ? "granted" : "declined";

  const { error } = await supabaseAdmin
    .from("parental_consents")
    .update({
      status,
      responded_at: new Date().toISOString(),
      // Evidence of who consented and from where — the DPDP audit trail.
      responded_ip: req.ip,
      responded_user_agent: req.get("user-agent"),
    })
    .eq("id", record.id);

  if (error) {
    throw new HttpError(500, "Failed to record the decision");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ consent_status: status })
    .eq("id", record.user_id);

  if (profileError) {
    throw new HttpError(500, "Failed to apply the decision to the account");
  }

  res.json({ status });
}

/**
 * Withdrawal, also via the guardian's original link — the guardian has no
 * account to log into, and consent that cannot be withdrawn is not consent.
 */
export async function withdrawConsent(req: Request, res: Response) {
  const record = await loadByToken(req.params.token);

  if (record.status !== "granted") {
    throw new HttpError(409, "There is no granted consent to withdraw");
  }

  await supabaseAdmin
    .from("parental_consents")
    .update({
      status: "withdrawn",
      responded_at: new Date().toISOString(),
      responded_ip: req.ip,
      responded_user_agent: req.get("user-agent"),
    })
    .eq("id", record.id);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ consent_status: "withdrawn" })
    .eq("id", record.user_id);

  if (error) {
    throw new HttpError(500, "Failed to withdraw consent");
  }

  res.json({ status: "withdrawn" });
}

const resendSchema = z.object({
  guardianEmail: z.string().email(),
  guardianName: z.string().min(1).max(120).optional(),
});

/** Authenticated: lets the minor correct a mistyped guardian address. */
export async function resendConsentRequest(req: AuthedRequest, res: Response) {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "A valid guardian email is required");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, consent_status")
    .eq("id", req.userId)
    .single();

  if (!profile) {
    throw new HttpError(404, "Profile not found");
  }
  if (profile.consent_status === "not_required") {
    throw new HttpError(400, "This account does not require parental consent");
  }
  if (profile.consent_status === "granted") {
    throw new HttpError(409, "Consent has already been granted");
  }

  await supabaseAdmin.from("profiles").update({ consent_status: "pending" }).eq("id", req.userId);

  await createConsentRequest({
    userId: req.userId!,
    minorName: profile.name,
    guardianEmail: parsed.data.guardianEmail,
    guardianName: parsed.data.guardianName,
  });

  res.status(202).json({ status: "pending" });
}
