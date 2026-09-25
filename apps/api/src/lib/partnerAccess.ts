import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface SharedScopes {
  phase: boolean;
  mood: boolean;
  symptoms: boolean;
  predictions: boolean;
  comfort: boolean;
  fertility: boolean;
}

export const DEFAULT_SCOPES: SharedScopes = {
  phase: true,
  mood: true,
  symptoms: false,
  predictions: true,
  comfort: true,
  fertility: false,
};

export function normaliseScopes(raw: unknown): SharedScopes {
  const r = (raw ?? {}) as Partial<SharedScopes>;
  return {
    phase: r.phase ?? DEFAULT_SCOPES.phase,
    mood: r.mood ?? DEFAULT_SCOPES.mood,
    symptoms: r.symptoms ?? DEFAULT_SCOPES.symptoms,
    predictions: r.predictions ?? DEFAULT_SCOPES.predictions,
    comfort: r.comfort ?? DEFAULT_SCOPES.comfort,
    fertility: r.fertility ?? DEFAULT_SCOPES.fertility,
  };
}

export interface LinkRow {
  id: string;
  woman_id: string;
  partner_id: string;
  relationship: "partner" | "family" | "friend";
  status: "active" | "paused" | "revoked";
  shared_scopes: unknown;
  nickname: string | null;
  created_at: string;
}

/** Loads a link the caller is a member of. The caller's id always comes from the session, never the request. */
export async function loadLink(linkId: string, userId: string): Promise<LinkRow> {
  const { data } = await supabaseAdmin.from("partner_links").select("*").eq("id", linkId).maybeSingle();
  const link = data as LinkRow | null;
  if (!link || (link.woman_id !== userId && link.partner_id !== userId) || link.status === "revoked") {
    throw new HttpError(404, "Not found");
  }
  return link;
}

export type SubscriptionState = "trialing" | "active" | "expired" | "none";

export interface SubscriptionView {
  state: SubscriptionState;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  autopay: boolean;
  /** True while everything is free (testing phase). */
  paywallOn: boolean;
  priceInr: number;
  hasAccess: boolean;
  daysLeft: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Starts the free trial the first time someone becomes a partner. Idempotent. */
export async function ensureTrial(partnerId: string): Promise<void> {
  const { data } = await supabaseAdmin.from("partner_subscriptions").select("partner_id").eq("partner_id", partnerId).maybeSingle();
  if (data) return;
  await supabaseAdmin.from("partner_subscriptions").insert({
    partner_id: partnerId,
    status: "trialing",
    trial_ends_at: new Date(Date.now() + env.partnerTrialDays * DAY_MS).toISOString(),
  });
}

export async function getSubscription(partnerId: string): Promise<SubscriptionView> {
  const { data } = await supabaseAdmin.from("partner_subscriptions").select("*").eq("partner_id", partnerId).maybeSingle();
  const now = Date.now();
  let state: SubscriptionState = "none";
  let endsAt: number | null = null;

  if (data) {
    const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at).getTime() : 0;
    const periodEnd = data.current_period_end ? new Date(data.current_period_end).getTime() : 0;
    if (periodEnd > now && data.status !== "canceled") {
      state = "active";
      endsAt = periodEnd;
    } else if (trialEnd > now) {
      state = "trialing";
      endsAt = trialEnd;
    } else {
      state = "expired";
    }
  }

  return {
    state,
    trialEndsAt: data?.trial_ends_at ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    autopay: data?.autopay ?? false,
    paywallOn: env.partnerPaywall,
    priceInr: env.partnerPriceInr,
    hasAccess: !env.partnerPaywall || state === "trialing" || state === "active",
    daysLeft: endsAt ? Math.max(0, Math.ceil((endsAt - now) / DAY_MS)) : null,
  };
}
