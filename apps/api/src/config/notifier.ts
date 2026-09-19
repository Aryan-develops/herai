import { env } from "./env.js";

/**
 * Guardian notifications.
 *
 * No transactional email provider is wired up yet, so in development the
 * consent link is logged instead of sent — the flow stays fully testable
 * without a vendor account, in the same spirit as MockLLMProvider.
 *
 * In production, silently logging a consent link would be worse than
 * failing: the guardian would never receive it and the minor's account would
 * hang in `pending` forever, so this throws instead.
 */
export interface GuardianConsentEmail {
  guardianEmail: string;
  guardianName?: string;
  minorName: string;
  consentUrl: string;
}

export async function sendGuardianConsentEmail(message: GuardianConsentEmail): Promise<void> {
  if (env.isProduction) {
    throw new Error(
      "No email provider configured: cannot send the parental consent link. " +
        "Wire up a transactional email sender before serving minors in production."
    );
  }

  console.log(
    [
      "",
      "[consent] ---------------------------------------------",
      `[consent] To:       ${message.guardianEmail}`,
      `[consent] Guardian: ${message.guardianName ?? "(not given)"}`,
      `[consent] Regarding: ${message.minorName}`,
      `[consent] Link:     ${message.consentUrl}`,
      "[consent] (dev only — no email was actually sent)",
      "[consent] ---------------------------------------------",
      "",
    ].join("\n")
  );
}
