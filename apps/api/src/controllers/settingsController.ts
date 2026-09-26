import type { Response } from "express";
import { z } from "zod";
import { createAuthClient, supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { phaseForDate, type DayPhase } from "../lib/cycleInsights.js";
import { loadCycleInsights } from "../lib/cycleService.js";
import { hitRateLimit } from "../lib/rateLimit.js";
import { selfInsights } from "../lib/dailyInsights.js";
import { effectivePhase } from "../lib/partnerGuidance.js";
import type { Lang, Mood } from "../lib/partnerContent.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------ moods

const MOODS = ["great", "good", "okay", "low", "irritable", "anxious", "sad"] as const;
const MOOD_SCORE: Record<(typeof MOODS)[number], number> = { great: 5, good: 4, okay: 3, low: 2, irritable: 2, anxious: 2, sad: 1 };

const moodSchema = z.object({
  mood: z.enum(MOODS),
  energy: z.number().int().min(1).max(5).optional(),
  need: z.enum(["space", "hug", "food", "talk", "rest"]).optional(),
  loggedAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(14400).optional(),
});

export async function createMoodLog(req: AuthedRequest, res: Response) {
  const parsed = moodSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const { data, error } = await supabaseAdmin
    .from("mood_logs")
    .insert({
      user_id: req.userId,
      mood: parsed.data.mood,
      energy: parsed.data.energy,
      need: parsed.data.need,
      logged_at: parsed.data.loggedAt,
      duration_minutes: parsed.data.durationMinutes,
    })
    .select("id, mood, energy, need, logged_at, duration_minutes")
    .single();
  if (error || !data) throw new HttpError(500, "Failed to save mood");
  res.status(201).json({ mood: mapMood(data) });
}

function mapMood(m: { id: string; mood: string; energy: number | null; need: string | null; logged_at: string; duration_minutes?: number | null }) {
  return { id: m.id, mood: m.mood, energy: m.energy, need: m.need, loggedAt: m.logged_at, durationMinutes: m.duration_minutes ?? null };
}

export async function listMoodLogs(req: AuthedRequest, res: Response) {
  const days = Math.min(Number(req.query.days ?? 30) || 30, 180);
  const { data, error } = await supabaseAdmin
    .from("mood_logs")
    .select("id, mood, energy, need, logged_at, duration_minutes")
    .eq("user_id", req.userId)
    .gte("logged_at", new Date(Date.now() - days * DAY_MS).toISOString())
    .order("logged_at", { ascending: false })
    .limit(500);
  if (error) throw new HttpError(500, "Failed to load moods");
  res.json({ moods: (data ?? []).map(mapMood) });
}

export async function deleteMoodLog(req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("mood_logs").delete().eq("id", req.params.id).eq("user_id", req.userId).select("id");
  if (!data || data.length === 0) throw new HttpError(404, "Not found");
  res.status(204).send();
}

const PHASE_LABEL: Record<DayPhase, string> = {
  menstrual: "during your period",
  pms: "in the days before your period",
  follicular: "just after your period",
  ovulation: "around ovulation",
  luteal: "in the second half of your cycle",
};

/** Her own pattern: which phase her mood tends to be lowest in. Needs enough logs to say anything honestly. */
export async function moodInsights(req: AuthedRequest, res: Response) {
  const [{ data }, insights] = await Promise.all([
    supabaseAdmin
      .from("mood_logs")
      .select("mood, logged_at")
      .eq("user_id", req.userId)
      .gte("logged_at", new Date(Date.now() - 120 * DAY_MS).toISOString())
      .limit(1000),
    loadCycleInsights(req.userId!),
  ]);

  const logs = data ?? [];
  if (logs.length < 10 || !insights.lastPeriodStart) {
    return res.json({ ready: false, needed: Math.max(0, 10 - logs.length), insight: null });
  }

  const buckets = new Map<DayPhase, number[]>();
  const all: number[] = [];
  for (const l of logs) {
    const phase = phaseForDate(insights, new Date(l.logged_at));
    if (!phase) continue;
    const score = MOOD_SCORE[l.mood as (typeof MOODS)[number]];
    all.push(score);
    buckets.set(phase, [...(buckets.get(phase) ?? []), score]);
  }
  const overall = all.reduce((a, b) => a + b, 0) / (all.length || 1);
  let lowest: { phase: DayPhase; avg: number } | null = null;
  for (const [phase, scores] of buckets) {
    if (scores.length < 4) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (!lowest || avg < lowest.avg) lowest = { phase, avg };
  }

  if (!lowest || overall - lowest.avg < 0.5) {
    return res.json({ ready: true, insight: null, message: "No clear pattern yet. Keep logging and it will show up." });
  }
  res.json({
    ready: true,
    insight: { phase: lowest.phase, message: `Your mood tends to dip ${PHASE_LABEL[lowest.phase]}. It can help to plan lighter days then.` },
  });
}

// ---------------------------------------------------------- comfort list

const comfortSchema = z.object({ items: z.array(z.string().trim().min(1).max(40)).max(12) });

export async function getComfort(req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("comfort_lists").select("items").eq("user_id", req.userId).maybeSingle();
  res.json({ items: (data?.items as string[] | undefined) ?? [] });
}

export async function putComfort(req: AuthedRequest, res: Response) {
  const parsed = comfortSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  await supabaseAdmin
    .from("comfort_lists")
    .upsert({ user_id: req.userId, items: parsed.data.items, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  res.json({ items: parsed.data.items });
}

// -------------------------------------------------- notification prefs

const prefsSchema = z.object({
  partnerDailyNudge: z.boolean().optional(),
  nudgeHour: z.number().int().min(0).max(23).optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  language: z.enum(["en", "hi"]).optional(),
});

function mapPrefs(p: Record<string, unknown> | null) {
  return {
    partnerDailyNudge: (p?.partner_daily_nudge as boolean | undefined) ?? true,
    nudgeHour: (p?.nudge_hour as number | undefined) ?? 9,
    emailEnabled: (p?.email_enabled as boolean | undefined) ?? true,
    pushEnabled: (p?.push_enabled as boolean | undefined) ?? true,
    language: (p?.language as string | undefined) ?? "en",
  };
}

export async function getPrefs(req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("notification_prefs").select("*").eq("user_id", req.userId).maybeSingle();
  res.json({ prefs: mapPrefs(data) });
}

export async function putPrefs(req: AuthedRequest, res: Response) {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const patch: Record<string, unknown> = { user_id: req.userId, updated_at: new Date().toISOString() };
  if (d.partnerDailyNudge !== undefined) patch.partner_daily_nudge = d.partnerDailyNudge;
  if (d.nudgeHour !== undefined) patch.nudge_hour = d.nudgeHour;
  if (d.emailEnabled !== undefined) patch.email_enabled = d.emailEnabled;
  if (d.pushEnabled !== undefined) patch.push_enabled = d.pushEnabled;
  if (d.language !== undefined) patch.language = d.language;
  const { data, error } = await supabaseAdmin.from("notification_prefs").upsert(patch, { onConflict: "user_id" }).select("*").single();
  if (error) throw new HttpError(500, "Failed to save");
  res.json({ prefs: mapPrefs(data) });
}

const pushSchema = z.object({ token: z.string().min(10).max(200), platform: z.string().max(20).default("expo") });

export async function registerPushToken(req: AuthedRequest, res: Response) {
  const parsed = pushSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  await supabaseAdmin
    .from("push_tokens")
    .upsert({ user_id: req.userId, token: parsed.data.token, platform: parsed.data.platform }, { onConflict: "token" });
  res.status(204).send();
}

export async function removePushToken(req: AuthedRequest, res: Response) {
  const parsed = pushSchema.pick({ token: true }).safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid input");
  await supabaseAdmin.from("push_tokens").delete().eq("token", parsed.data.token).eq("user_id", req.userId);
  res.status(204).send();
}

// --------------------------------------------------- account & security

export async function getSecurity(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.userId!);
  if (error || !data.user) throw new HttpError(500, "Failed to load account");
  const providers = (data.user.app_metadata?.providers as string[] | undefined) ?? [];
  res.json({
    email: data.user.email ?? null,
    providers,
    hasPassword: providers.includes("email"),
  });
}

const passwordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8).max(128),
});

export async function changePassword(req: AuthedRequest, res: Response) {
  if (hitRateLimit(`pw:${req.userId}`, 5, 15 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Try again later.");
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.userId!);
  if (error || !data.user?.email) throw new HttpError(500, "Failed to load account");
  const hasPassword = ((data.user.app_metadata?.providers as string[] | undefined) ?? []).includes("email");

  // Changing an existing password proves you know it; setting a first password on a Google/passkey account
  // relies on the live session already being valid.
  if (hasPassword) {
    if (!parsed.data.currentPassword) throw new HttpError(400, "Enter your current password");
    const { error: signInError } = await createAuthClient().auth.signInWithPassword({
      email: data.user.email,
      password: parsed.data.currentPassword,
    });
    if (signInError) throw new HttpError(401, "Your current password isn't right");
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.userId!, { password: parsed.data.newPassword });
  if (updateError) throw new HttpError(400, updateError.message);

  // Supabase ends every session when the password changes, including the one making this request. Signing in
  // again hands the client a fresh session so the person isn't bounced to the login page.
  const { data: fresh, error: freshError } = await createAuthClient().auth.signInWithPassword({
    email: data.user.email,
    password: parsed.data.newPassword,
  });
  if (freshError || !fresh.session) throw new HttpError(500, "Password changed, but signing you in again failed. Please log in.");
  res.json({
    session: {
      accessToken: fresh.session.access_token,
      refreshToken: fresh.session.refresh_token,
      expiresAt: fresh.session.expires_at ?? null,
    },
  });
}

const profileBasicsSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function updateBasics(req: AuthedRequest, res: Response) {
  const parsed = profileBasicsSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const { error } = await supabaseAdmin.from("profiles").update({ name: parsed.data.name }).eq("id", req.userId);
  if (error) throw new HttpError(500, "Failed to save");
  res.json({ name: parsed.data.name });
}

/** DPDP right of access: everything we hold about the caller, as one download. */
export async function exportData(req: AuthedRequest, res: Response) {
  const uid = req.userId!;
  const [profile, health, symptoms, cycles, moods, comfort, prefs, reports, requests, links] = await Promise.all([
    supabaseAdmin.from("profiles").select("name, date_of_birth, consent_status, created_at").eq("id", uid).maybeSingle(),
    supabaseAdmin.from("health_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabaseAdmin.from("symptom_logs").select("*").eq("user_id", uid),
    supabaseAdmin.from("cycle_logs").select("*").eq("user_id", uid),
    supabaseAdmin.from("mood_logs").select("*").eq("user_id", uid),
    supabaseAdmin.from("comfort_lists").select("*").eq("user_id", uid).maybeSingle(),
    supabaseAdmin.from("notification_prefs").select("*").eq("user_id", uid).maybeSingle(),
    supabaseAdmin.from("health_reports").select("*").eq("user_id", uid),
    supabaseAdmin.from("care_requests").select("*").eq("patient_id", uid),
    supabaseAdmin.from("partner_links").select("id, relationship, status, shared_scopes, created_at").eq("woman_id", uid),
  ]);

  res.setHeader("Content-Disposition", 'attachment; filename="herai-my-data.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    email: req.userEmail,
    profile: profile.data,
    healthProfile: health.data,
    symptomLogs: symptoms.data ?? [],
    cycleLogs: cycles.data ?? [],
    moodLogs: moods.data ?? [],
    comfortList: comfort.data,
    notificationPreferences: prefs.data,
    reports: reports.data ?? [],
    careRequests: requests.data ?? [],
    partnerLinks: links.data ?? [],
  });
}

/** Today's insight cards for the person tracking, based on her phase and any mood she logged in the last day. */
export async function dailyInsights(req: AuthedRequest, res: Response) {
  const [insights, moodRes, prefRes] = await Promise.all([
    loadCycleInsights(req.userId!),
    supabaseAdmin
      .from("mood_logs")
      .select("mood")
      .eq("user_id", req.userId)
      .gte("logged_at", new Date(Date.now() - DAY_MS).toISOString())
      .order("logged_at", { ascending: false })
      .limit(1),
    supabaseAdmin.from("notification_prefs").select("language").eq("user_id", req.userId).maybeSingle(),
  ]);
  const asked = z.enum(["en", "hi"]).safeParse(req.query.lang);
  const lang: Lang = asked.success ? asked.data : prefRes.data?.language === "hi" ? "hi" : "en";
  const phase = effectivePhase(insights);
  if (!phase) return res.json({ phase: null, cards: [] });
  const mood = (moodRes.data?.[0]?.mood as Mood | undefined) ?? null;
  res.json({ phase, cards: selfInsights(phase, mood, lang) });
}
