import crypto from "node:crypto";
import { NotConnectedError, type PaymentMethodId, type PaymentProvider } from "./PaymentProvider.js";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Razorpay via hosted Payment Links: one page that offers UPI, cards, net banking and wallets, so the
 * method the user picked in our UI doesn't need to map to a Razorpay-specific flow. One payment buys one
 * period (month or year, carried in the link notes); AutoPay needs Razorpay Subscriptions and is not wired yet (supportsAutopay stays false).
 * Needs RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.
 */
const razorpay: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay",
  get connected() {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
  },
  methods: ["upi_intent", "upi_id", "upi_qr", "card", "netbanking", "wallet"],
  supportsAutopay: false,
  async createCheckout(input) {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const appBase = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
    const res = await fetch(`${RAZORPAY_API}/payment_links`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(input.amountInr * 100),
        currency: "INR",
        reference_id: input.idempotencyKey,
        description: input.period === "year" ? "Lunee partner plan (1 year)" : "Lunee partner plan (1 month)",
        notes: { user_id: input.userId, period: input.period },
        ...(appBase ? { callback_url: `${appBase}/partner/upgrade?paid=1`, callback_method: "get" } : {}),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; short_url?: string; error?: { description?: string } };
    if (!res.ok || !json.short_url) throw new Error(`Razorpay payment link failed (${res.status}): ${json.error?.description ?? "no detail"}`);
    return { provider: "razorpay", status: "requires_action", redirectUrl: json.short_url, providerRef: json.id };
  },
  async verifyWebhook(headers, rawBody) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const sig = headers["x-razorpay-signature"];
    if (!secret || typeof sig !== "string") return null;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!safeEqual(expected, sig)) return null;

    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment_link?: { entity?: { notes?: { user_id?: string; period?: string }; amount_paid?: number } };
        payment?: { entity?: { id?: string } };
      };
    };
    const eventId = typeof headers["x-razorpay-event-id"] === "string" ? (headers["x-razorpay-event-id"] as string) : "";
    const link = body.payload?.payment_link?.entity;
    return {
      eventId,
      type: body.event ?? "unknown",
      userId: link?.notes?.user_id,
      paymentRef: body.payload?.payment?.entity?.id,
      paidInr: typeof link?.amount_paid === "number" ? link.amount_paid / 100 : undefined,
      period: link?.notes?.period === "year" ? "year" : "month",
    };
  },
  async cancelSubscription() {
    // One-off payments: nothing recurring to cancel at the provider.
  },
  async refund(providerRef, amountInr) {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(providerRef)}/refund`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(amountInr * 100) }),
    });
    if (!res.ok) throw new Error(`Razorpay refund failed (${res.status})`);
  },
};

function stub(id: string, label: string, methods: PaymentMethodId[], supportsAutopay: boolean): PaymentProvider {
  const fail = () => {
    throw new NotConnectedError(label);
  };
  return {
    id,
    label,
    connected: false,
    methods,
    supportsAutopay,
    createCheckout: async () => fail(),
    verifyWebhook: async () => null,
    cancelSubscription: async () => fail(),
    refund: async () => fail(),
  };
}

/** Priority order = fallback order. Razorpay first; Stripe last because it doesn't do India UPI AutoPay. */
export const PROVIDERS: PaymentProvider[] = [
  razorpay,
  stub("cashfree", "Cashfree", ["upi_intent", "upi_id", "upi_qr", "card", "netbanking", "wallet"], true),
  stub("payu", "PayU", ["upi_intent", "upi_id", "card", "netbanking"], true),
  stub("stripe", "Stripe (international cards)", ["card"], false),
];

export const METHOD_LABELS: Record<PaymentMethodId, string> = {
  upi_intent: "UPI apps",
  upi_id: "Enter UPI ID",
  upi_qr: "Scan UPI QR",
  card: "Credit / debit card",
  netbanking: "Net banking",
  wallet: "Wallets",
};

export const UPI_APPS = [
  { id: "gpay", label: "Google Pay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
  { id: "supermoney", label: "super.money" },
  { id: "bhim", label: "BHIM" },
];
