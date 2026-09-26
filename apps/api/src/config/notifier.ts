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

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/** Sends through Resend when RESEND_API_KEY is set. Returns false when no provider is configured. */
export async function sendEmail(message: OutgoingEmail): Promise<boolean> {
  if (!env.resendApiKey) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [message.to], subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the message (${response.status})`);
  return true;
}

export async function sendGuardianConsentEmail(message: GuardianConsentEmail): Promise<void> {
  const sent = await sendEmail({
    to: message.guardianEmail,
    subject: `${message.minorName} needs your consent to use Lunee`,
    text:
      `Hello${message.guardianName ? ` ${message.guardianName}` : ""},

` +
      `${message.minorName} has created a Lunee account and needs a parent or guardian's consent before ` +
      `any health information is recorded.

Review and decide here: ${message.consentUrl}

` +
      "If you don't recognise this request, ignore this email and nothing will be recorded.",
  });
  if (sent) return;

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

export interface PartnerInviteEmail {
  to: string;
  fromName: string;
  direction: "woman_invites_partner" | "partner_requests_woman";
  code: string;
  link: string;
}

/** Best effort: the code and link are also shown in the app, so a missing provider never blocks an invite. */
export async function sendPartnerInviteEmail(message: PartnerInviteEmail): Promise<boolean> {
  const ask =
    message.direction === "woman_invites_partner"
      ? `${message.fromName} invited you to follow her cycle on Lunee so you can support her better. She controls exactly what you see and can stop sharing at any time.`
      : `${message.fromName} would like to connect with you on Lunee. You decide whether to share anything with them.`;
  try {
    const sent = await sendEmail({
      to: message.to,
      subject: `${message.fromName} invited you to Lunee`,
      text: `${ask}

Open this link: ${message.link}
Or enter the code ${message.code} in the app.

The invite expires in 7 days.`,
    });
    if (!sent) console.log(`[partner] invite for ${message.to}: ${message.link} (code ${message.code}) — no email provider configured`);
    return sent;
  } catch (err) {
    console.error("[partner] invite email failed:", err);
    return false;
  }
}

/** Expo push. No credentials needed for basic sends; failures are logged, never thrown. */
export async function sendPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  if (tokens.length === 0) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body, data, sound: "default" }))),
    });
  } catch (err) {
    console.error("[push] send failed:", err);
  }
}
