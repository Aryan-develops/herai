import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gift, Globe, HeartHandshake, Plus, Sparkles, UserPlus } from "lucide-react";
import { api, ApiError, type Lang, type PartnerLink, type SubscriptionView, type SummaryResponse, type WomanCard } from "@/lib/api";
import { PARTNER_PHASE_STYLE } from "@/lib/phases";
import { AppShell } from "@/components/AppShell";
import { usePrefs } from "@/context/PrefsContext";
import { CircleCard } from "@/components/partner/CircleCard";
import { WomanView } from "@/components/partner/WomanView";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SubscriptionBanner({ sub }: { sub: SubscriptionView }) {
  if (!sub.paywallOn) {
    return (
      <Link to="/partner/upgrade" className="mt-5 flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700 transition-colors hover:bg-violet-100">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Following is free while we're in testing. See what's coming.</span>
      </Link>
    );
  }
  if (sub.state === "trialing") {
    return (
      <Link to="/partner/upgrade" className="mt-5 flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700 hover:bg-violet-100">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Free trial: {sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"} left. ₹{sub.priceInr}/month after.</span>
      </Link>
    );
  }
  return null;
}

function Empty() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-brand-300 bg-brand-50/60 p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
        <HeartHandshake className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">Your circle starts here</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-700/80">
        Invite someone you trust to support you, or enter a code to follow someone. Whoever shares decides exactly what is seen, and can stop any time.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/settings#partner">
          <Button>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite or enter a code
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function PartnerHome() {
  const [params, setParams] = useSearchParams();
  const [women, setWomen] = useState<WomanCard[] | null>(null);
  const [supporters, setSupporters] = useState<PartnerLink[] | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState<{ status: number; message: string } | null>(null);
  const { prefs, update } = usePrefs();
  const lang: Lang = prefs?.language ?? "en";
  const langReady = prefs !== null;

  const selected = params.get("w") ?? women?.[0]?.linkId ?? null;

  useEffect(() => {
    if (!langReady) return;
    api
      .listWomen(lang)
      .then(({ women, subscription }) => {
        setWomen(women);
        setSubscription(subscription);
      })
      .catch(() => setWomen([]));
  }, [lang, langReady]);

  useEffect(() => {
    api.listMyPartners().then(({ partners }) => setSupporters(partners)).catch(() => setSupporters([]));
  }, []);

  const loadSummary = useCallback(() => {
    if (!selected) return;
    setSummaryError(null);
    api
      .womanSummary(selected, lang)
      .then((s) => {
        setSummary(s);
      })
      .catch((err) => {
        setSummary(null);
        setSummaryError({ status: err instanceof ApiError ? err.status : 0, message: err instanceof ApiError ? err.message : "Couldn't load this." });
      });
  }, [selected, lang]);

  useEffect(() => {
    setSummary(null);
    loadSummary();
  }, [loadSummary]);

  // Keep what she shares fresh: refetch every minute while the tab is visible, and when it regains focus.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loadSummary();
      api.listWomen(lang).then(({ women, subscription }) => { setWomen(women); setSubscription(subscription); }).catch(() => {});
      api.listMyPartners().then(({ partners }) => setSupporters(partners)).catch(() => {});
    };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadSummary, lang]);

  function switchLang(next: Lang) {
    update({ language: next });
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink-900 sm:text-4xl">Partner home</h1>
          <p className="mt-1.5 max-w-xl text-ink-700/70">How she's doing today, and small ways to help.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-ink-700/60" aria-hidden="true" />
          <div role="radiogroup" aria-label="Language" className="flex gap-1">
            {(
              [
                ["en", "EN"],
                ["hi", "हिं"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={lang === id}
                onClick={() => switchLang(id)}
                className={cn(
                  "min-h-9 min-w-10 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                  lang === id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subscription && <SubscriptionBanner sub={subscription} />}

      {women === null && <div className="skeleton mt-6 h-40 rounded-3xl" aria-hidden="true" />}
      {women?.length === 0 && supporters?.filter((p) => p.status !== "revoked").length === 0 && <Empty />}

      <CircleCard supporters={supporters} following={women} selected={selected} onSelect={(id) => setParams({ w: id })} />

      {women && women.length > 0 && (
        <>
          {women.length > 1 && (
            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="People you follow">
              {women.map((w) => {
                const active = w.linkId === selected;
                const style = w.phaseKey ? PARTNER_PHASE_STYLE[w.phaseKey] : null;
                return (
                  <button
                    key={w.linkId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setParams({ w: w.linkId })}
                    className={cn(
                      "flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                      active ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", style?.dot ?? "bg-neutral-300")} />
                    {w.firstName}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            {summaryError && summaryError.status === 402 && (
              <Alert tone="warning">
                Your free trial has ended.{" "}
                <Link to="/partner/upgrade" className="font-semibold underline">
                  Subscribe to keep following
                </Link>
                .
              </Alert>
            )}
            {summaryError && summaryError.status !== 402 && <Alert tone="error">{summaryError.message}</Alert>}
            {!summary && !summaryError && <div className="skeleton h-44 rounded-3xl" aria-hidden="true" />}
            {summary && summary.available === false && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="font-display text-xl font-semibold text-ink-900">{summary.message}</p>
                  <p className="mt-1 text-sm text-ink-700/70">Check back later.</p>
                </CardContent>
              </Card>
            )}
            {summary && summary.available && <WomanView key={summary.link.id} summary={summary} lang={lang} onRefresh={loadSummary} />}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/settings#partner">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Follow someone else
          </Button>
        </Link>
        <Link to="/partner/upgrade">
          <Button variant="ghost" size="sm">
            <Gift className="h-4 w-4" aria-hidden="true" />
            Plan and gifts
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
