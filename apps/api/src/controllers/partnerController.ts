import crypto from "node:crypto";
import type { Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { sendPartnerInviteEmail } from "../config/notifier.js";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { phaseForDate, type CycleInsights } from "../lib/cycleInsights.js";
import { loadCycleInsights } from "../lib/cycleService.js";
import { buildGuidance, effectivePhase } from "../lib/partnerGuidance.js";
import { partnerInsights } from "../lib/dailyInsights.js";
import { ensureTrial, getSubscription, loadLink, normaliseScopes, type LinkRow, type SharedScopes } from "../lib/partnerAccess.js";
import { hitRateLimit } from "../lib/rateLimit.js";
import { istDay, istNow } from "../lib/time.js";
import { isMinor, hashConsentToken } from "../utils/consent.js";
import type { Lang, Mood, Need } from "../lib/partnerContent.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const INVITE_TTL_DAYS = 7;
const MAX_PENDING_INVITES = 10;
// No 0/O/1/I/L: codes get read aloud and typed from screenshots.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(`partner-code:${normaliseCode(code)}`).digest("hex");
}

function prettyCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "Someone";
}

async function requireAdult(userId: string): Promise<{ name: string }> {
  const { data } = await supabaseAdmin.from("profiles").select("name, date_of_birth").eq("id", userId).maybeSingle();
  if (!data?.date_of_birth) throw new HttpError(403, "Add your date of birth first");
  if (isMinor(data.date_of_birth)) throw new HttpError(403, "Partner features are for people aged 18 and over");
  return { name: data.name ?? "" };
}

async function namesFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabaseAdmin.from("profiles").select("id, name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, firstName(p.name as string)]));
}

function clientIp(req: AuthedRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() ?? req.ip ?? "unknown";
}

// ---------------------------------------------------------------- invites

const inviteSchema = z.object({
  direction: z.enum(["woman_invites_partner", "partner_requests_woman"]).default("woman_invites_partner"),
  relationship: z.enum(["partner", "family", "friend"]).default("partner"),
  email: z.string().email().max(200).optional(),
});

export async function createInvite(req: AuthedRequest, res: Response) {
  const parsed = inviteSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const me = await requireAdult(req.userId!);

  const { count } = await supabaseAdmin
    .from("partner_invites")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", req.userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_PENDING_INVITES) throw new HttpError(429, "You have too many open invites. Cancel one first.");

  const code = makeCode();
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from("partner_invites")
    .insert({
      inviter_id: req.userId,
      direction: parsed.data.direction,
      relationship: parsed.data.relationship,
      code_hash: hashCode(code),
      token_hash: hashConsentToken(token),
      expires_at: expiresAt,
    })
    .select("id, direction, relationship, expires_at")
    .single();
  if (error || !data) throw new HttpError(500, "Failed to create invite");

  const link = `${env.appBaseUrl.split(",")[0].trim()}/join/${token}`;
  let emailSent = false;
  if (parsed.data.email) {
    emailSent = await sendPartnerInviteEmail({
      to: parsed.data.email,
      fromName: firstName(me.name),
      direction: parsed.data.direction,
      code: prettyCode(code),
      link,
    });
  }

  res.status(201).json({
    invite: { id: data.id, direction: data.direction, relationship: data.relationship, expiresAt: data.expires_at },
    code: prettyCode(code),
    link,
    emailSent,
  });
}

export async function listInvites(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("partner_invites")
    .select("id, direction, relationship, expires_at, created_at")
    .eq("inviter_id", req.userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Failed to list invites");
  res.json({
    invites: (data ?? []).map((i) => ({
      id: i.id,
      direction: i.direction,
      relationship: i.relationship,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
    })),
  });
}

export async function cancelInvite(req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin
    .from("partner_invites")
    .update({ status: "cancelled" })
    .eq("id", req.params.id)
    .eq("inviter_id", req.userId)
    .eq("status", "pending")
    .select("id");
  if (!data || data.length === 0) throw new HttpError(404, "Invite not found");
  res.status(204).send();
}

const acceptSchema = z
  .object({ code: z.string().min(6).max(16).optional(), token: z.string().min(16).max(128).optional() })
  .refine((v) => v.code || v.token, { message: "Enter a code or use the invite link" });

async function findPendingInvite(input: { code?: string; token?: string }) {
  const column = input.token ? "token_hash" : "code_hash";
  const hash = input.token ? hashConsentToken(input.token) : hashCode(input.code!);
  const { data } = await supabaseAdmin.from("partner_invites").select("*").eq(column, hash).maybeSingle();
  if (!data || data.status !== "pending" || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as {
    id: string;
    inviter_id: string;
    direction: "woman_invites_partner" | "partner_requests_woman";
    relationship: LinkRow["relationship"];
  };
}

function throttleAccept(req: AuthedRequest) {
  if (hitRateLimit(`accept:${req.userId}`, 8, 15 * 60 * 1000) || hitRateLimit(`accept-ip:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  }
}

const GENERIC_INVITE_ERROR = "That code or link isn't valid, or it has expired.";

/** Lets the join page show who is asking before the person accepts. Same throttle as accepting. */
export async function previewInvite(req: AuthedRequest, res: Response) {
  throttleAccept(req);
  const parsed = acceptSchema.safeParse({ code: req.query.code, token: req.query.token });
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const invite = await findPendingInvite(parsed.data);
  if (!invite || invite.inviter_id === req.userId) throw new HttpError(404, GENERIC_INVITE_ERROR);
  const names = await namesFor([invite.inviter_id]);
  res.json({
    inviterFirstName: names.get(invite.inviter_id) ?? "Someone",
    direction: invite.direction,
    relationship: invite.relationship,
  });
}

export async function acceptInvite(req: AuthedRequest, res: Response) {
  throttleAccept(req);
  const parsed = acceptSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  await requireAdult(req.userId!);

  const invite = await findPendingInvite(parsed.data);
  if (!invite || invite.inviter_id === req.userId) throw new HttpError(404, GENERIC_INVITE_ERROR);
  await requireAdult(invite.inviter_id).catch(() => {
    throw new HttpError(404, GENERIC_INVITE_ERROR);
  });

  // Whoever holds the cycle data is "she"; she must always be the one who said yes.
  const womanId = invite.direction === "woman_invites_partner" ? invite.inviter_id : req.userId!;
  const partnerId = invite.direction === "woman_invites_partner" ? req.userId! : invite.inviter_id;

  const { data: existing } = await supabaseAdmin
    .from("partner_links")
    .select("id, status")
    .eq("woman_id", womanId)
    .eq("partner_id", partnerId)
    .maybeSingle();

  let linkId: string;
  if (existing && existing.status !== "revoked") {
    throw new HttpError(409, "You're already connected.");
  } else if (existing) {
    await supabaseAdmin
      .from("partner_links")
      .update({ status: "active", relationship: invite.relationship, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    linkId = existing.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("partner_links")
      .insert({ woman_id: womanId, partner_id: partnerId, relationship: invite.relationship })
      .select("id")
      .single();
    if (error || !data) throw new HttpError(500, "Failed to connect");
    linkId = data.id;
  }

  await supabaseAdmin.from("partner_invites").update({ status: "accepted", accepted_by: req.userId }).eq("id", invite.id);
  await ensureTrial(partnerId);

  res.status(201).json({ linkId, role: req.userId === womanId ? "woman" : "partner" });
}

// ------------------------------------------------------------------ links

function linkView(l: LinkRow, name: string) {
  return {
    id: l.id,
    firstName: name,
    nickname: l.nickname,
    relationship: l.relationship,
    status: l.status,
    scopes: normaliseScopes(l.shared_scopes),
    createdAt: l.created_at,
  };
}

/** Her side: the people she shares with. */
export async function listMyPartners(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("partner_links")
    .select("*")
    .eq("woman_id", req.userId)
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  if (error) throw new HttpError(500, "Failed to load partners");
  const rows = (data ?? []) as LinkRow[];
  const names = await namesFor(rows.map((r) => r.partner_id));
  res.json({ partners: rows.map((r) => linkView(r, names.get(r.partner_id) ?? "Partner")) });
}

const scopesSchema = z
  .object({
    phase: z.boolean(),
    mood: z.boolean(),
    symptoms: z.boolean(),
    predictions: z.boolean(),
    comfort: z.boolean(),
    fertility: z.boolean(),
  })
  .partial();

const updateLinkSchema = z.object({
  status: z.enum(["active", "paused"]).optional(),
  scopes: scopesSchema.optional(),
  nickname: z.string().trim().max(40).nullable().optional(),
});

export async function updateLink(req: AuthedRequest, res: Response) {
  const parsed = updateLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const link = await loadLink(req.params.id, req.userId!);
  if (link.woman_id !== req.userId) throw new HttpError(403, "Only the person sharing can change this");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.scopes) patch.shared_scopes = { ...normaliseScopes(link.shared_scopes), ...parsed.data.scopes };
  if (parsed.data.nickname !== undefined) patch.nickname = parsed.data.nickname || null;

  const { data, error } = await supabaseAdmin.from("partner_links").update(patch).eq("id", link.id).select("*").single();
  if (error || !data) throw new HttpError(500, "Failed to update");
  const names = await namesFor([link.partner_id]);
  res.json({ partner: linkView(data as LinkRow, names.get(link.partner_id) ?? "Partner") });
}

/** Either side can end the connection. Revoking is immediate: the next partner request 404s. */
export async function revokeLink(req: AuthedRequest, res: Response) {
  const link = await loadLink(req.params.id, req.userId!);
  await supabaseAdmin.from("partner_links").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", link.id);
  res.status(204).send();
}

/** Her audit trail: when a partner looked at her summary. */
export async function accessLog(req: AuthedRequest, res: Response) {
  const link = await loadLink(req.params.id, req.userId!);
  if (link.woman_id !== req.userId) throw new HttpError(403, "Only the person sharing can see this");
  const { data } = await supabaseAdmin
    .from("partner_access_log")
    .select("action, created_at")
    .eq("link_id", link.id)
    .order("created_at", { ascending: false })
    .limit(30);
  res.json({ entries: (data ?? []).map((e) => ({ action: e.action, at: e.created_at })) });
}

// ---------------------------------------------------------- partner's view

const langSchema = z.enum(["en", "hi"]);

async function preferredLang(userId: string, requested: unknown): Promise<Lang> {
  const asked = langSchema.safeParse(requested);
  if (asked.success) return asked.data;
  const { data } = await supabaseAdmin.from("notification_prefs").select("language").eq("user_id", userId).maybeSingle();
  return data?.language === "hi" ? "hi" : "en";
}

interface WomanSnapshot {
  insights: CycleInsights;
  mood: { mood: Mood; energy: number | null; need: Need | null; at: string } | null;
  symptomNames: string[];
  comfort: string[];
  lang: Lang;
}

async function snapshotFor(womanId: string, scopes: SharedScopes, lang: Lang): Promise<WomanSnapshot> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const twoDays = new Date(Date.now() - 2 * DAY_MS).toISOString();
  const [insights, moodRes, symptomsRes, cycleSymRes, comfortRes] = await Promise.all([
    loadCycleInsights(womanId),
    scopes.mood
      ? supabaseAdmin.from("mood_logs").select("mood, energy, need, logged_at").eq("user_id", womanId).gte("logged_at", since).order("logged_at", { ascending: false }).limit(1)
      : Promise.resolve({ data: null }),
    scopes.symptoms
      ? supabaseAdmin.from("symptom_logs").select("symptoms").eq("user_id", womanId).gte("logged_at", twoDays).limit(10)
      : Promise.resolve({ data: null }),
    scopes.symptoms
      ? supabaseAdmin.from("cycle_logs").select("symptoms").eq("user_id", womanId).gte("logged_at", twoDays).limit(10)
      : Promise.resolve({ data: null }),
    scopes.comfort ? supabaseAdmin.from("comfort_lists").select("items").eq("user_id", womanId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const m = moodRes.data?.[0];
  const names = new Set<string>();
  for (const row of symptomsRes.data ?? []) for (const s of (row.symptoms as { name?: string }[]) ?? []) if (s.name) names.add(s.name);
  for (const row of cycleSymRes.data ?? []) for (const s of (row.symptoms as string[]) ?? []) names.add(s);

  return {
    insights,
    mood: m ? { mood: m.mood as Mood, energy: m.energy, need: (m.need as Need | null) ?? null, at: m.logged_at } : null,
    symptomNames: [...names].slice(0, 5),
    comfort: (comfortRes.data?.items as string[] | undefined) ?? [],
    lang,
  };
}

function sharingOff() {
  // Deliberately neutral: a partner is never told *that* she paused or narrowed sharing.
  return { available: false as const, message: "Nothing to show right now." };
}

/** Partner home list: everyone who shares with me, as light cards. */
export async function listWomen(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("partner_links")
    .select("*")
    .eq("partner_id", req.userId)
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  if (error) throw new HttpError(500, "Failed to load");
  const rows = (data ?? []) as LinkRow[];
  const names = await namesFor(rows.map((r) => r.woman_id));
  const lang = await preferredLang(req.userId!, req.query.lang);
  const subscription = await getSubscription(req.userId!);

  const women = await Promise.all(
    rows.map(async (l) => {
      const base = {
        linkId: l.id,
        firstName: l.nickname || names.get(l.woman_id) || "Her",
        relationship: l.relationship,
      };
      const scopes = normaliseScopes(l.shared_scopes);
      if (l.status !== "active" || !scopes.phase) return { ...base, available: false as const };
      const snap = await snapshotFor(l.woman_id, scopes, lang);
      const key = effectivePhase(snap.insights);
      return {
        ...base,
        available: true as const,
        phaseKey: key,
        cycleDay: snap.insights.currentCycleDay,
        mood: scopes.mood ? snap.mood?.mood ?? null : null,
      };
    }),
  );
  res.json({ women, subscription });
}

async function logView(link: LinkRow) {
  const { data } = await supabaseAdmin
    .from("partner_access_log")
    .select("created_at")
    .eq("link_id", link.id)
    .eq("action", "viewed_summary")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : 0;
  if (Date.now() - last > 60 * 60 * 1000) {
    await supabaseAdmin.from("partner_access_log").insert({ link_id: link.id, partner_id: link.partner_id, action: "viewed_summary" });
  }
}

async function loadPartnerLink(req: AuthedRequest): Promise<LinkRow> {
  const link = await loadLink(req.params.linkId, req.userId!);
  if (link.partner_id !== req.userId) throw new HttpError(404, "Not found");
  return link;
}

function todayIso(): string {
  return istDay(0);
}

async function streakFor(partnerId: string, linkId: string): Promise<{ streak: number; doneToday: string[] }> {
  const since = istDay(-60);
  const { data } = await supabaseAdmin
    .from("partner_task_progress")
    .select("day, done")
    .eq("partner_id", partnerId)
    .eq("link_id", linkId)
    .gte("day", since);
  const byDay = new Map((data ?? []).map((r) => [r.day as string, (r.done as string[]) ?? []]));
  const today = todayIso();
  let streak = 0;
  // Today is still in progress, so an empty today doesn't break the streak; an empty yesterday does.
  for (let i = byDay.get(today)?.length ? 0 : 1; i < 60; i++) {
    const day = istDay(-i);
    if ((byDay.get(day)?.length ?? 0) > 0) streak++;
    else break;
  }
  return { streak, doneToday: byDay.get(today) ?? [] };
}

export async function womanSummary(req: AuthedRequest, res: Response) {
  const link = await loadPartnerLink(req);
  const scopes = normaliseScopes(link.shared_scopes);
  if (link.status !== "active" || !scopes.phase) return res.json(sharingOff());

  const lang = await preferredLang(req.userId!, req.query.lang);
  const [snap, names, progress, events, subscription] = await Promise.all([
    snapshotFor(link.woman_id, scopes, lang),
    namesFor([link.woman_id]),
    streakFor(link.partner_id, link.id),
    supabaseAdmin
      .from("partner_events")
      .select("id, title, event_date")
      .eq("link_id", link.id)
      .eq("partner_id", req.userId)
      .gte("event_date", todayIso())
      .order("event_date", { ascending: true })
      .limit(20),
    getSubscription(req.userId!),
  ]);

  const { insights } = snap;
  const guidance = await buildGuidance(insights, lang, snap.mood?.mood ?? null, snap.mood?.need ?? null);
  await logView(link);

  const calendar = scopes.predictions
    ? Array.from({ length: 14 }, (_, i) => {
        const date = new Date(istNow().getTime() + i * DAY_MS);
        return { date: date.toISOString().slice(0, 10), phase: phaseForDate(insights, date) };
      })
    : null;

  const planEvents = (events.data ?? []).map((e) => {
    const phase = scopes.predictions ? phaseForDate(insights, new Date(`${e.event_date}T12:00:00Z`)) : null;
    return {
      id: e.id,
      title: e.title,
      date: e.event_date,
      // Only flag the days that are usually the hardest, and only when she shares predictions.
      headsUp: phase === "menstrual" || phase === "pms" ? phase : null,
    };
  });

  res.json({
    available: true,
    link: {
      id: link.id,
      firstName: link.nickname || names.get(link.woman_id) || "Her",
      relationship: link.relationship,
      since: link.created_at,
    },
    phase: {
      key: effectivePhase(insights),
      cycleDay: insights.currentCycleDay,
      cycleLengthDays: insights.cycleLengthDays,
      daysUntilNextPeriod: scopes.predictions ? insights.daysUntilNextPeriod : null,
      nextPeriodStart: scopes.predictions ? insights.predictedNextPeriodStart : null,
      confidence: insights.confidence,
      estimated: insights.confidence !== "high",
    },
    mood: snap.mood ? { mood: snap.mood.mood, energy: snap.mood.energy, need: snap.mood.need, at: snap.mood.at } : null,
    symptoms: scopes.symptoms ? snap.symptomNames : null,
    comfort: scopes.comfort ? snap.comfort : null,
    fertility:
      scopes.fertility && insights.fertileWindow
        ? { window: insights.fertileWindow, ovulationDate: insights.ovulationDate }
        : null,
    guidance,
    insights: effectivePhase(insights) ? partnerInsights(effectivePhase(insights)!, snap.mood?.mood ?? null, lang) : [],
    calendar,
    events: planEvents,
    progress: { doneToday: progress.doneToday, streak: progress.streak },
    subscription,
  });
}

const feedbackSchema = z.object({ guidanceKey: z.string().min(1).max(60), helpful: z.boolean() });

export async function submitFeedback(req: AuthedRequest, res: Response) {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const link = await loadPartnerLink(req);
  await supabaseAdmin.from("partner_feedback").insert({
    link_id: link.id,
    partner_id: req.userId,
    guidance_key: parsed.data.guidanceKey,
    helpful: parsed.data.helpful,
  });
  res.status(201).json({ ok: true });
}

const taskSchema = z.object({ taskId: z.string().min(1).max(60), done: z.boolean() });

export async function setTask(req: AuthedRequest, res: Response) {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const link = await loadPartnerLink(req);
  const day = todayIso();
  const { data: row } = await supabaseAdmin
    .from("partner_task_progress")
    .select("done")
    .eq("partner_id", req.userId)
    .eq("link_id", link.id)
    .eq("day", day)
    .maybeSingle();
  const set = new Set<string>((row?.done as string[]) ?? []);
  if (parsed.data.done) set.add(parsed.data.taskId);
  else set.delete(parsed.data.taskId);
  await supabaseAdmin
    .from("partner_task_progress")
    .upsert({ partner_id: req.userId, link_id: link.id, day, done: [...set] }, { onConflict: "partner_id,link_id,day" });
  const progress = await streakFor(link.partner_id, link.id);
  res.json({ doneToday: progress.doneToday, streak: progress.streak });
}

const eventSchema = z.object({ title: z.string().trim().min(1).max(80), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function addEvent(req: AuthedRequest, res: Response) {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const link = await loadPartnerLink(req);
  const { data, error } = await supabaseAdmin
    .from("partner_events")
    .insert({ partner_id: req.userId, link_id: link.id, title: parsed.data.title, event_date: parsed.data.date })
    .select("id, title, event_date")
    .single();
  if (error || !data) throw new HttpError(500, "Failed to add");
  res.status(201).json({ event: { id: data.id, title: data.title, date: data.event_date } });
}

export async function deleteEvent(req: AuthedRequest, res: Response) {
  const link = await loadPartnerLink(req);
  await supabaseAdmin.from("partner_events").delete().eq("id", req.params.eventId).eq("link_id", link.id).eq("partner_id", req.userId);
  res.status(204).send();
}

export async function mySubscription(req: AuthedRequest, res: Response) {
  res.json({ subscription: await getSubscription(req.userId!) });
}
