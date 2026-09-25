import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Copy, CreditCard, Gift, Landmark, QrCode, ShieldCheck, Smartphone, Sparkles, Wallet } from "lucide-react";
import { api, ApiError, type PaymentPlans } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ToggleRow } from "@/components/settings/SettingsCard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const METHOD_ICON: Record<string, typeof Smartphone> = {
  upi_intent: Smartphone,
  upi_id: Smartphone,
  upi_qr: QrCode,
  card: CreditCard,
  netbanking: Landmark,
  wallet: Wallet,
};

const VPA = /^[\w.-]{2,256}@[A-Za-z]{2,64}$/;

function niceDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";
}

export function PartnerUpgrade() {
  const [plans, setPlans] = useState<PaymentPlans | null>(null);
  const [method, setMethod] = useState("upi_intent");
  const [upiApp, setUpiApp] = useState("gpay");
  const [vpa, setVpa] = useState("");
  const [autopay, setAutopay] = useState(true);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [giftMonths, setGiftMonths] = useState(1);
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [giftCopied, setGiftCopied] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [redeem, setRedeem] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.paymentPlans().then(setPlans).catch(() => setError("Couldn't load plan details."));
  }, []);

  async function pay() {
    setPaying(true);
    setResult(null);
    try {
      const res = await api.checkout({ method, upiApp: method === "upi_intent" ? upiApp : undefined, vpa: method === "upi_id" ? vpa.trim() : undefined, autopay });
      if (res.redirectUrl) window.location.assign(res.redirectUrl);
      else setResult({ tone: res.status === "failed" ? "error" : "info", text: res.message ?? "Nothing was charged." });
    } catch (err) {
      setResult({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't start payment." });
    } finally {
      setPaying(false);
    }
  }

  async function makeGift() {
    setGiftBusy(true);
    setGiftError(null);
    setGiftCode(null);
    try {
      setGiftCode((await api.createGift(giftMonths)).code);
    } catch (err) {
      setGiftError(err instanceof ApiError ? err.message : "Couldn't create a gift.");
    } finally {
      setGiftBusy(false);
    }
  }

  async function redeemGift() {
    setRedeemBusy(true);
    setRedeemMessage(null);
    try {
      const res = await api.redeemGift(redeem.trim());
      setRedeemMessage({ tone: "success", text: `Gift added: ${res.months} month${res.months === 1 ? "" : "s"} of access.` });
      setRedeem("");
      setPlans(await api.paymentPlans());
    } catch (err) {
      setRedeemMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't redeem that code." });
    } finally {
      setRedeemBusy(false);
    }
  }

  const sub = plans?.subscription;
  const current = plans?.methods.find((m) => m.id === method);
  const canPay = method !== "upi_id" || VPA.test(vpa.trim());

  return (
    <AppShell>
      <Link to="/partner" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Partner home
      </Link>
      <h1 className="font-display text-3xl font-medium text-ink-900 sm:text-4xl">Plan and gifts</h1>
      <p className="mt-1.5 max-w-xl text-ink-700/70">Support the people you care about, for less than a coffee a month.</p>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}
      {!plans && !error && <div className="skeleton mt-6 h-48 rounded-3xl" aria-hidden="true" />}

      {plans && sub && (
        <div className="mt-6 space-y-5">
          <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 p-6 text-white shadow-lift">
            <p className="text-xs font-medium tracking-wide text-white/80 uppercase">HERAI Partner</p>
            <p className="mt-1 font-display text-4xl font-semibold">
              ₹{plans.plan.priceInr}
              <span className="text-lg font-normal text-white/80"> / month</span>
            </p>
            <p className="mt-2 text-sm text-white/90">Follow as many people as you like. {plans.plan.trialDays}-day free trial, cancel any time.</p>
            <ul className="mt-4 space-y-1.5 text-sm text-white/95">
              {["Daily phase and mood updates, with what to do, say and avoid", "Plans that flag tougher days ahead", "Hindi and English tips"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {plans.testingPhase && (
            <Alert tone="info">
              <strong>Free while we're testing.</strong> Nothing below will charge you. This is a preview of how paying will work.
            </Alert>
          )}

          <Card>
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Your plan</h2>
              <p className="mt-1 text-sm text-ink-700">
                {sub.state === "trialing" && `Free trial, ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left (ends ${niceDate(sub.trialEndsAt)}).`}
                {sub.state === "active" && `Active until ${niceDate(sub.currentPeriodEnd)}.`}
                {sub.state === "expired" && "Your trial has ended."}
                {sub.state === "none" && "Your free trial starts the first time you follow someone."}
              </p>
              {sub.state !== "none" && (
                <div className="mt-2 divide-y divide-neutral-200">
                  <ToggleRow
                    label="AutoPay"
                    hint="Charge ₹100 monthly through UPI AutoPay or your card. You get a reminder about a day before each charge and can stop any time."
                    checked={sub.autopay}
                    onChange={async (v) => {
                      await api.setAutopay(v).catch(() => {});
                      setPlans(await api.paymentPlans());
                    }}
                  />
                </div>
              )}
              {(sub.state === "active" || sub.state === "trialing") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    if (!window.confirm("Cancel your plan? You keep access until the current period ends.")) return;
                    await api.cancelSubscription().catch(() => {});
                    setPlans(await api.paymentPlans());
                  }}
                >
                  Cancel plan
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Pay</h2>
              <div role="tablist" aria-label="Payment method" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {plans.methods.map((m) => {
                  const Icon = METHOD_ICON[m.id] ?? CreditCard;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={method === m.id}
                      onClick={() => {
                        setMethod(m.id);
                        setResult(null);
                      }}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors",
                        method === m.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        {m.label}
                        {!m.available && <span className="block text-[11px] font-normal text-ink-700/60">Not connected yet</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {method === "upi_intent" && (
                  <div>
                    <p className="text-sm text-ink-700">Choose your UPI app. We'll open it to approve the payment.</p>
                    <div role="radiogroup" aria-label="UPI app" className="mt-2 flex flex-wrap gap-2">
                      {plans.upiApps.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={upiApp === a.id}
                          onClick={() => setUpiApp(a.id)}
                          className={cn(
                            "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors",
                            upiApp === a.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                          )}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {method === "upi_id" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="vpa">Your UPI ID</Label>
                    <Input id="vpa" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@bank" autoComplete="off" autoCapitalize="none" inputMode="email" aria-invalid={vpa.length > 0 && !VPA.test(vpa.trim())} />
                    {vpa.length > 3 && !VPA.test(vpa.trim()) && <p className="text-xs text-red-700">Enter a valid UPI ID, like name@bank.</p>}
                    <p className="text-xs text-ink-700/60">We'll send a payment request to your UPI app.</p>
                  </div>
                )}
                {method === "upi_qr" && (
                  <div className="flex items-center gap-4 rounded-2xl border border-dashed border-neutral-300 p-4">
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                      <QrCode className="h-10 w-10" aria-hidden="true" />
                    </span>
                    <p className="text-sm text-ink-700">A UPI QR code appears here. Scan it with any UPI app to pay.</p>
                  </div>
                )}
                {["card", "netbanking", "wallet"].includes(method) && (
                  <p className="text-sm text-ink-700">
                    {method === "card" && "You'll enter your card on your bank's secure page. We never see or store card details."}
                    {method === "netbanking" && "You'll pick your bank and sign in on its own page."}
                    {method === "wallet" && "Pay with Paytm or other wallets."}
                  </p>
                )}
              </div>

              <div className="mt-3 divide-y divide-neutral-200">
                <ToggleRow label="Set up AutoPay" hint="Renews monthly. Available with UPI apps, UPI ID and cards." checked={autopay} onChange={setAutopay} disabled={["upi_qr", "netbanking", "wallet"].includes(method)} />
              </div>

              {current && !current.available && (
                <p className="mt-2 text-xs text-ink-700/60">
                  {current.label} isn't connected yet. If one payment provider is down we automatically try another.
                </p>
              )}
              {result && <Alert tone={result.tone} className="mt-3">{result.text}</Alert>}
              <Button className="mt-4 w-full sm:w-auto" onClick={pay} disabled={paying || !canPay}>
                {paying ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                Pay ₹{plans.plan.priceInr}
              </Button>
              <p className="mt-2 text-xs text-ink-700/60">Secure payment. We never see your bank or card details.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
                <Gift className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Gift a plan
              </h2>
              <p className="mt-1 text-sm text-ink-700/70">Give someone months of Partner access. They redeem the code in their own account.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="space-y-1.5 sm:w-48">
                  <Label htmlFor="gift-months">Length</Label>
                  <Select id="gift-months" value={giftMonths} onChange={(e) => setGiftMonths(Number(e.target.value))}>
                    {[1, 3, 6, 12].map((m) => (
                      <option key={m} value={m}>
                        {m} month{m === 1 ? "" : "s"} · ₹{m * plans.plan.priceInr}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="outline" onClick={makeGift} disabled={giftBusy}>
                  {giftBusy && <Spinner />}
                  Create gift code
                </Button>
              </div>
              {giftError && <Alert tone="error" className="mt-3">{giftError}</Alert>}
              {giftCode && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 animate-fade-up">
                  <p className="tabular font-display text-xl font-semibold tracking-wider text-brand-700">{giftCode}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(giftCode).catch(() => {});
                      setGiftCopied(true);
                      setTimeout(() => setGiftCopied(false), 1800);
                    }}
                  >
                    {giftCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {giftCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}

              <div className="mt-6 border-t border-neutral-200 pt-4">
                <Label htmlFor="redeem">Got a gift code?</Label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <Input id="redeem" value={redeem} onChange={(e) => setRedeem(e.target.value)} placeholder="GIFT-XXXX-XXXX-XXXX" autoComplete="off" className="uppercase" />
                  <Button onClick={redeemGift} disabled={redeemBusy || redeem.trim().length < 8}>
                    {redeemBusy && <Spinner />}
                    Redeem
                  </Button>
                </div>
                {redeemMessage && <Alert tone={redeemMessage.tone} className="mt-3">{redeemMessage.text}</Alert>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Invoices</h2>
              <p className="mt-1 text-sm text-ink-700/70">No invoices yet.</p>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-700/60">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The person being followed always uses HERAI free. Only followers pay.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
