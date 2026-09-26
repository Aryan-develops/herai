import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { sendEmail, sendPush } from "../config/notifier.js";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import { loadCycleInsights } from "../lib/cycleService.js";
import { effectivePhase } from "../lib/partnerGuidance.js";
import { normaliseScopes, type LinkRow } from "../lib/partnerAccess.js";
import { PHASE_CONTENT, type Lang, type PhaseKey } from "../lib/partnerContent.js";

const HEADLINES: Record<PhaseKey, { en: string; hi: string }> = {
  pms: { en: "is likely in her pre-period days", hi: "के पीरियड से पहले के दिन चल रहे हो सकते हैं" },
  cramps: { en: "may be dealing with cramps", hi: "को ऐंठन हो सकती है" },
  menstrual: { en: "is likely on her period", hi: "का पीरियड चल रहा हो सकता है" },
  ovulation: { en: "is likely in her peak-energy days", hi: "की ऊर्जा के सबसे अच्छे दिन चल रहे हो सकते हैं" },
  follicular: { en: "is likely feeling fresh and energetic", hi: "शायद ताज़ा और ऊर्जावान महसूस कर रही है" },
  luteal: { en: "may be in her slow-down days", hi: "के धीमे चलने के दिन हो सकते हैं" },
};

function nudgeText(name: string, key: PhaseKey, lang: Lang) {
  const headline = HEADLINES[key][lang];
  const task = PHASE_CONTENT[key].tasks[0].text[lang];
  return lang === "hi"
    ? { title: `${name} ${headline}`, body: `आज की एक छोटी बात: ${task}` }
    : { title: `${name} ${headline}`, body: `One small thing today: ${task}` };
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "She";
}

/**
 * Daily job (Vercel Cron). For each partner who wants nudges, send one short note per woman who currently
 * shares her phase with them. Only derived labels are used; nothing from her logs leaves the database.
 */
export async function runPartnerNudges(req: Request, res: Response) {
  const secret = env.cronSecret;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw new HttpError(401, "Unauthorized");

  const { data: linkRows } = await supabaseAdmin.from("partner_links").select("*").eq("status", "active");
  const links = ((linkRows ?? []) as LinkRow[]).filter((l) => normaliseScopes(l.shared_scopes).phase);
  const byPartner = new Map<string, LinkRow[]>();
  for (const l of links) byPartner.set(l.partner_id, [...(byPartner.get(l.partner_id) ?? []), l]);

  let sent = 0;
  for (const [partnerId, partnerLinks] of byPartner) {
    const { data: prefs } = await supabaseAdmin.from("notification_prefs").select("*").eq("user_id", partnerId).maybeSingle();
    if (prefs && prefs.partner_daily_nudge === false) continue;
    const lang: Lang = prefs?.language === "hi" ? "hi" : "en";

    const womanIds = partnerLinks.map((l) => l.woman_id);
    const { data: names } = await supabaseAdmin.from("profiles").select("id, name").in("id", womanIds);
    const nameOf = new Map((names ?? []).map((n) => [n.id as string, firstName(n.name as string)]));

    const lines: { title: string; body: string }[] = [];
    for (const link of partnerLinks) {
      const insights = await loadCycleInsights(link.woman_id);
      const key = effectivePhase(insights);
      if (!key) continue;
      lines.push(nudgeText(link.nickname || nameOf.get(link.woman_id) || "She", key, lang));
    }
    if (lines.length === 0) continue;

    if (prefs?.push_enabled !== false) {
      const { data: tokens } = await supabaseAdmin.from("push_tokens").select("token").eq("user_id", partnerId);
      const first = lines[0];
      await sendPush(
        (tokens ?? []).map((t) => t.token as string),
        first.title,
        lines.length > 1 ? `${first.body} (+${lines.length - 1} more)` : first.body,
        { type: "partner_nudge" },
      );
    }
    if (prefs?.email_enabled !== false) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(partnerId);
      if (user.user?.email) {
        await sendEmail({
          to: user.user.email,
          subject: lines[0].title,
          text: `${lines.map((l) => `${l.title}\n${l.body}`).join("\n\n")}\n\nOpen Lunee for the full picture.`,
        }).catch((err) => console.error("[nudge] email failed:", err));
      }
    }
    sent++;
  }
  res.json({ partners: byPartner.size, sent });
}
