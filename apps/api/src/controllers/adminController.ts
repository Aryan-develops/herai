import type { Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { audit } from "../lib/admin.js";

const DAY = 86400000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

async function count(table: string, apply?: (q: any) => any): Promise<number> {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count: n } = await q;
  return n ?? 0;
}

/** Headline numbers for the admin dashboard. Counts only, no health data. */
export async function overview(_req: AuthedRequest, res: Response) {
  const [
    users, users7, users30, onboarded,
    linksActive, linksPaused, partners,
    subTrial, subActive, subCanceled, subExpired,
    giftsIssued, giftsRedeemed,
    providers, providersLive, applicationsNew,
    requestsTotal, requestsNew,
    supportOpen, errors24h,
    cycleLogs7, moodLogs7, chats7,
  ] = await Promise.all([
    count("profiles"),
    count("profiles", (q) => q.gte("created_at", since(7))),
    count("profiles", (q) => q.gte("created_at", since(30))),
    count("profiles", (q) => q.eq("onboarding_complete", true)),
    count("partner_links", (q) => q.eq("status", "active")),
    count("partner_links", (q) => q.eq("status", "paused")),
    count("partner_subscriptions"),
    count("partner_subscriptions", (q) => q.eq("status", "trialing")),
    count("partner_subscriptions", (q) => q.eq("status", "active")),
    count("partner_subscriptions", (q) => q.eq("status", "canceled")),
    count("partner_subscriptions", (q) => q.eq("status", "expired")),
    count("gift_codes"),
    count("gift_codes", (q) => q.not("redeemed_at", "is", null)),
    count("care_providers", (q) => q.eq("is_sample", false)),
    count("care_providers", (q) => q.eq("is_sample", false).eq("verified", true).eq("available", true)),
    count("provider_applications", (q) => q.eq("status", "new")),
    count("care_requests"),
    count("care_requests", (q) => q.eq("status", "new")),
    count("support_requests", (q) => q.eq("status", "open")),
    count("client_errors", (q) => q.gte("created_at", since(1))),
    count("cycle_logs", (q) => q.gte("created_at", since(7))),
    count("mood_logs", (q) => q.gte("created_at", since(7))),
    count("agent_executions", (q) => q.gte("created_at", since(7))),
  ]);

  // Sign-ups per day for the last 14 days.
  const { data: recent } = await supabaseAdmin.from("profiles").select("created_at").gte("created_at", since(14));
  const signups: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    signups.push({ day, count: (recent ?? []).filter((r) => r.created_at.slice(0, 10) === day).length });
  }

  res.json({
    users: { total: users, last7: users7, last30: users30, onboarded },
    partner: { linksActive, linksPaused, followers: partners },
    premium: {
      paywallOn: env.partnerPaywall,
      priceInr: env.partnerPriceInr,
      trialing: subTrial,
      active: subActive,
      canceled: subCanceled,
      expired: subExpired,
      giftsIssued,
      giftsRedeemed,
      mrrInr: subActive * env.partnerPriceInr,
    },
    care: { providers, providersLive, applicationsNew, requestsTotal, requestsNew },
    ops: { supportOpen, errors24h },
    activity: { cycleLogs7, moodLogs7, chats7 },
    signups,
  });
}

const usersQuery = z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(0).max(1000).default(0) });

/** Accounts with email, join date and premium status. Paged by the auth user list (50 a page). */
export async function listUsers(req: AuthedRequest, res: Response) {
  const { q, page } = usersQuery.parse(req.query);
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: page + 1, perPage: 50 });
  if (error) throw new HttpError(500, "Couldn't list users");
  let users = data.users;
  if (q) users = users.filter((u) => u.email?.toLowerCase().includes(q.toLowerCase()));
  const ids = users.map((u) => u.id);
  const [profiles, subs, following] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, name, onboarding_complete, consent_status").in("id", ids),
    supabaseAdmin.from("partner_subscriptions").select("partner_id, status, trial_ends_at, current_period_end, provider").in("partner_id", ids),
    supabaseAdmin.from("partner_links").select("partner_id, woman_id, status").or(`partner_id.in.(${ids.join(",") || "00000000-0000-0000-0000-000000000000"}),woman_id.in.(${ids.join(",") || "00000000-0000-0000-0000-000000000000"})`),
  ]);
  const prof = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const sub = new Map((subs.data ?? []).map((s) => [s.partner_id, s]));
  res.json({
    page,
    hasMore: data.users.length === 50,
    users: users.map((u) => {
      const links = (following.data ?? []).filter((l) => l.status !== "revoked" && (l.partner_id === u.id || l.woman_id === u.id));
      return {
        id: u.id,
        email: u.email,
        name: prof.get(u.id)?.name ?? null,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        provider: (u.app_metadata?.provider as string | undefined) ?? "email",
        onboarded: prof.get(u.id)?.onboarding_complete ?? false,
        consent: prof.get(u.id)?.consent_status ?? null,
        sharesWith: links.filter((l) => l.woman_id === u.id).length,
        follows: links.filter((l) => l.partner_id === u.id).length,
        subscription: sub.get(u.id) ?? null,
      };
    }),
  });
}

const premiumSchema = z.object({
  action: z.enum(["grant", "extend_trial", "revoke"]),
  months: z.number().int().min(1).max(24).optional(),
  days: z.number().int().min(1).max(365).optional(),
});

/** Grant or take away Partner premium for one account. Every change is audited. */
export async function setPremium(req: AuthedRequest, res: Response) {
  const userId = z.string().uuid().parse(req.params.userId);
  const p = premiumSchema.safeParse(req.body);
  if (!p.success) throw new HttpError(400, "Invalid input");
  const now = new Date();
  const base = { partner_id: userId, plan: "monthly_100_inr", updated_at: now.toISOString() };
  let row: Record<string, unknown>;
  if (p.data.action === "grant") {
    row = { ...base, status: "active", provider: "admin_grant", current_period_end: new Date(now.getTime() + (p.data.months ?? 1) * 30 * DAY).toISOString() };
  } else if (p.data.action === "extend_trial") {
    row = { ...base, status: "trialing", trial_ends_at: new Date(now.getTime() + (p.data.days ?? 14) * DAY).toISOString() };
  } else {
    row = { ...base, status: "canceled", current_period_end: now.toISOString(), autopay: false };
  }
  const { data, error } = await supabaseAdmin.from("partner_subscriptions").upsert(row, { onConflict: "partner_id" }).select("*").single();
  if (error) throw new HttpError(500, "Couldn't update premium");
  await audit(req, `premium.${p.data.action}`, userId, p.data);
  res.json({ subscription: data });
}

/** Real (non-sample) providers and pending applications. */
export async function listProviders(_req: AuthedRequest, res: Response) {
  const [providers, applications] = await Promise.all([
    supabaseAdmin
      .from("care_providers")
      .select("id, name, type, city, verified, available, is_sample, rating_avg, rating_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("provider_applications").select("id, org_name, type, contact_name, email, phone, city, status, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  res.json({ providers: providers.data ?? [], applications: applications.data ?? [] });
}

const providerPatch = z.object({ verified: z.boolean().optional(), available: z.boolean().optional() });

export async function updateProvider(req: AuthedRequest, res: Response) {
  const id = z.string().uuid().parse(req.params.id);
  const p = providerPatch.safeParse(req.body);
  if (!p.success || Object.keys(p.data).length === 0) throw new HttpError(400, "Invalid input");
  const { data, error } = await supabaseAdmin.from("care_providers").update(p.data).eq("id", id).select("id, verified, available").single();
  if (error) throw new HttpError(500, "Couldn't update");
  await audit(req, "provider.update", id, p.data);
  res.json({ provider: data });
}

const appPatch = z.object({ status: z.enum(["new", "contacted", "approved", "rejected"]) });

export async function updateApplication(req: AuthedRequest, res: Response) {
  const id = z.string().uuid().parse(req.params.id);
  const p = appPatch.safeParse(req.body);
  if (!p.success) throw new HttpError(400, "Invalid input");
  await supabaseAdmin.from("provider_applications").update(p.data).eq("id", id);
  await audit(req, "application.status", id, p.data);
  res.json({ ok: true });
}

export async function listSupport(_req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("support_requests").select("*").order("created_at", { ascending: false }).limit(200);
  res.json({ requests: data ?? [] });
}

const supportPatch = z.object({ status: z.enum(["open", "answered", "closed"]) });

export async function updateSupport(req: AuthedRequest, res: Response) {
  const id = z.string().uuid().parse(req.params.id);
  const p = supportPatch.safeParse(req.body);
  if (!p.success) throw new HttpError(400, "Invalid input");
  await supabaseAdmin.from("support_requests").update(p.data).eq("id", id);
  await audit(req, "support.status", id, p.data);
  res.json({ ok: true });
}

export async function recentErrors(_req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("client_errors").select("id, source, message, route, http_status, fatal, created_at").order("created_at", { ascending: false }).limit(100);
  res.json({ errors: data ?? [] });
}

export async function auditLog(_req: AuthedRequest, res: Response) {
  const { data } = await supabaseAdmin.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(100);
  res.json({ entries: data ?? [] });
}
