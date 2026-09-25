import crypto from "node:crypto";
import type { Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { ensureTrial, getSubscription } from "../lib/partnerAccess.js";
import { hitRateLimit } from "../lib/rateLimit.js";
import { METHOD_LABELS, PROVIDERS, UPI_APPS } from "../payments/providers.js";
import type { PaymentMethodId } from "../payments/PaymentProvider.js";
import { createCheckoutWithFallback } from "../payments/router.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const GIFT_TTL_DAYS = 180;
const GIFT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function giftCode(): string {
  const bytes = crypto.randomBytes(12);
  const raw = Array.from(bytes, (b) => GIFT_ALPHABET[b % GIFT_ALPHABET.length]).join("");
  return `GIFT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function hashGift(code: string): string {
  return crypto.createHash("sha256").update(`gift:${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`).digest("hex");
}

/** Everything the checkout UI needs, driven by which providers are actually connected. */
export async function getPlans(req: AuthedRequest, res: Response) {
  const subscription = await getSubscription(req.userId!);
  const methods = (Object.keys(METHOD_LABELS) as PaymentMethodId[]).map((id) => {
    const providers = PROVIDERS.filter((p) => p.methods.includes(id));
    return {
      id,
      label: METHOD_LABELS[id],
      providers: providers.map((p) => p.id),
      available: providers.some((p) => p.connected),
    };
  });
  res.json({
    plan: { id: "monthly_100_inr", priceInr: env.partnerPriceInr, period: "month", trialDays: env.partnerTrialDays },
    // While the paywall is off, everything is free and checkout is only a preview of the final flow.
    testingPhase: !env.partnerPaywall,
    paymentsConnected: PROVIDERS.some((p) => p.connected),
    methods,
    upiApps: UPI_APPS,
    providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, connected: p.connected, autopay: p.supportsAutopay })),
    subscription,
  });
}

const checkoutSchema = z
  .object({
    method: z.enum(["upi_intent", "upi_id", "upi_qr", "card", "netbanking", "wallet"]),
    upiApp: z.string().max(20).optional(),
    vpa: z
      .string()
      .regex(/^[\w.\-]{2,256}@[A-Za-z]{2,64}$/, "Enter a valid UPI ID, like name@bank")
      .optional(),
    autopay: z.boolean().default(false),
  })
  .refine((v) => v.method !== "upi_id" || !!v.vpa, { message: "Enter your UPI ID", path: ["vpa"] });

export async function checkout(req: AuthedRequest, res: Response) {
  if (hitRateLimit(`checkout:${req.userId}`, 10, 10 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Try again shortly.");
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  await ensureTrial(req.userId!);

  const { result, tried, connected } = await createCheckoutWithFallback({
    userId: req.userId!,
    amountInr: env.partnerPriceInr,
    method: parsed.data.method,
    upiApp: parsed.data.upiApp,
    vpa: parsed.data.vpa,
    autopay: parsed.data.autopay,
    idempotencyKey: crypto.randomUUID(),
  });

  if (result) return res.json({ status: result.status, redirectUrl: result.redirectUrl ?? null, provider: result.provider });

  res.status(connected ? 502 : 200).json({
    status: connected ? "failed" : "not_connected",
    tried,
    message: connected
      ? "Payment couldn't be started. Please try another method."
      : env.partnerPaywall
        ? "Payments aren't switched on yet. Please check back soon."
        : "Payments aren't connected yet. Following is free while we're in testing.",
  });
}

const autopaySchema = z.object({ enabled: z.boolean() });

export async function setAutopay(req: AuthedRequest, res: Response) {
  const parsed = autopaySchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid input");
  await ensureTrial(req.userId!);
  await supabaseAdmin
    .from("partner_subscriptions")
    .update({ autopay: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq("partner_id", req.userId);
  res.json({ autopay: parsed.data.enabled, note: "Saved as a preference. AutoPay starts once payments are connected." });
}

export async function cancelSubscription(req: AuthedRequest, res: Response) {
  await supabaseAdmin
    .from("partner_subscriptions")
    .update({ autopay: false, status: "canceled", updated_at: new Date().toISOString() })
    .eq("partner_id", req.userId);
  res.json({ subscription: await getSubscription(req.userId!) });
}

export async function listInvoices(_req: AuthedRequest, res: Response) {
  res.json({ invoices: [] });
}

const giftCreateSchema = z.object({ months: z.number().int().min(1).max(12).default(1) });

/** Anyone can gift. Free during the testing phase; once payments are on, creating a gift requires a checkout. */
export async function createGift(req: AuthedRequest, res: Response) {
  if (hitRateLimit(`gift:${req.userId}`, 10, 60 * 60 * 1000)) throw new HttpError(429, "Too many gifts created. Try again later.");
  const parsed = giftCreateSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  if (env.partnerPaywall) throw new HttpError(503, "Gifting opens once payments are connected.");

  const code = giftCode();
  const { error } = await supabaseAdmin.from("gift_codes").insert({
    code_hash: hashGift(code),
    buyer_id: req.userId,
    months: parsed.data.months,
    expires_at: new Date(Date.now() + GIFT_TTL_DAYS * DAY_MS).toISOString(),
  });
  if (error) throw new HttpError(500, "Failed to create gift");
  res.status(201).json({ code, months: parsed.data.months, priceInr: env.partnerPriceInr * parsed.data.months, free: true });
}

const giftRedeemSchema = z.object({ code: z.string().min(8).max(40) });

export async function redeemGift(req: AuthedRequest, res: Response) {
  if (hitRateLimit(`redeem:${req.userId}`, 8, 15 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  const parsed = giftRedeemSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Enter your gift code");

  const { data: gift } = await supabaseAdmin.from("gift_codes").select("*").eq("code_hash", hashGift(parsed.data.code)).maybeSingle();
  if (!gift || gift.redeemed_at || new Date(gift.expires_at).getTime() < Date.now()) {
    throw new HttpError(404, "That gift code isn't valid or has already been used.");
  }
  if (gift.buyer_id === req.userId) throw new HttpError(400, "You can't redeem a gift you bought. Share the code with someone.");

  // Claim first; the redeemed_at IS NULL filter makes a double redeem lose the race.
  const { data: claimed } = await supabaseAdmin
    .from("gift_codes")
    .update({ redeemed_by: req.userId, redeemed_at: new Date().toISOString() })
    .eq("id", gift.id)
    .is("redeemed_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) throw new HttpError(409, "That gift code has just been used.");

  await ensureTrial(req.userId!);
  const { data: sub } = await supabaseAdmin.from("partner_subscriptions").select("current_period_end").eq("partner_id", req.userId).single();
  const base = Math.max(Date.now(), sub?.current_period_end ? new Date(sub.current_period_end).getTime() : 0);
  await supabaseAdmin
    .from("partner_subscriptions")
    .update({
      status: "active",
      provider: "gift",
      current_period_end: new Date(base + gift.months * 30 * DAY_MS).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("partner_id", req.userId);

  res.json({ months: gift.months, subscription: await getSubscription(req.userId!) });
}

/** Providers post here once connected. Until then there is nothing to verify, so it says so. */
export async function webhook(_req: AuthedRequest, res: Response) {
  res.status(501).json({ error: "Payments are not connected yet" });
}
