import { useCallback, useEffect, useState } from "react";
import { Droplet, Lightbulb, Sparkles } from "lucide-react";
import { api, type CycleInsights } from "@/lib/api";
import { PHASE_STYLE, shortDate } from "@/lib/phases";
import { AppShell } from "@/components/AppShell";
import { CycleCalendar } from "@/components/CycleCalendar";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const REGULARITY: Record<CycleInsights["regularity"], { label: string; tone: "sage" | "amber" | "neutral" }> = {
  regular: { label: "Regular", tone: "sage" },
  irregular: { label: "Irregular", tone: "amber" },
  insufficient_data: { label: "Still learning", tone: "neutral" },
};

export function Cycle() {
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api
      .getCycleInsights()
      .then(({ insights }) => setInsights(insights))
      .catch(() => setError("Couldn't load your cycle. Please refresh."));
  }, []);
  useEffect(reload, [reload]);

  const ready = insights && insights.lastPeriodStart && insights.phase && insights.currentCycleDay;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Calendar</h1>
      <p className="mt-1 text-sm text-ink-700/70">Tap a day to log. Predictions are estimates.</p>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}

      {!insights && !error && (
        <div className="mt-6 space-y-4" aria-hidden="true">
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="skeleton h-28 w-full rounded-3xl" />
        </div>
      )}

      {insights && <CycleCalendar insights={insights} onChanged={reload} />}

      {insights && !ready && (
        <p className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-ink-800">
          Tap <span className="font-semibold">Edit period dates</span> above and pick the days of your last period to start predictions.
        </p>
      )}

      {insights && ready && insights.phase && insights.currentCycleDay && (
        <div className="max-w-3xl">
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm text-ink-800">{PHASE_STYLE[insights.phase].tip}</p>
          </div>

          <PhaseTimeline insights={insights} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DateCard
              icon={<Droplet className="h-4 w-4" />}
              iconTone="bg-brand-100 text-brand-600"
              label="Next period"
              value={insights.predictedNextPeriodStart ? shortDate(insights.predictedNextPeriodStart) : "—"}
            />
            <DateCard
              icon={<Sparkles className="h-4 w-4" />}
              iconTone="bg-violet-100 text-violet-600"
              label="Fertile window"
              value={
                insights.fertileWindow
                  ? `${shortDate(insights.fertileWindow.start)} – ${shortDate(insights.fertileWindow.end)}`
                  : "—"
              }
            />
            <DateCard
              icon={<Sparkles className="h-4 w-4" />}
              iconTone="bg-peach-100 text-peach-600"
              label="Est. ovulation"
              value={insights.ovulationDate ? shortDate(insights.ovulationDate) : "—"}
            />
          </div>

          <details className="group mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-ink-900">Cycle history</h2>
              <Badge tone={REGULARITY[insights.regularity].tone}>{REGULARITY[insights.regularity].label}</Badge>
            </summary>

            {insights.cycleHistory.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {insights.cycleHistory.slice(-6).reverse().map((c) => (
                  <li key={c.start}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink-700/75">Started {shortDate(c.start)}</span>
                      <span className="tabular font-semibold text-ink-900">{c.lengthDays} days</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-500"
                        style={{ width: `${Math.min(100, (c.lengthDays / 45) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-700/70">Log at least two periods to see how your cycle length varies.</p>
            )}
          </details>
        </div>
      )}
    </AppShell>
  );
}

function DateCard({ icon, iconTone, label, value }: { icon: React.ReactNode; iconTone: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconTone)} aria-hidden="true">
        {icon}
      </span>
      <p className="mt-3 text-xs font-medium text-neutral-500">{label}</p>
      <p className="tabular mt-0.5 font-display text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}

/** A cycle-length bar split into phases, with a marker at today. */
function PhaseTimeline({ insights }: { insights: CycleInsights }) {
  const len = insights.cycleLengthDays;
  const period = Math.min(insights.periodLengthDays, len);
  const ovDay = insights.ovulationDate && insights.lastPeriodStart
    ? Math.round((new Date(insights.ovulationDate).getTime() - new Date(insights.lastPeriodStart).getTime()) / 86400000) + 1
    : Math.round(len / 2);
  const fertileStart = Math.max(period, ovDay - 5);
  const fertileEnd = Math.min(len, ovDay + 1);

  const segments = [
    { key: "menstrual", days: period, cls: PHASE_STYLE.menstrual.bar, label: "Period" },
    { key: "follicular", days: Math.max(0, fertileStart - period), cls: PHASE_STYLE.follicular.bar, label: "Follicular" },
    { key: "ovulation", days: Math.max(0, fertileEnd - fertileStart), cls: PHASE_STYLE.ovulation.bar, label: "Fertile" },
    { key: "luteal", days: Math.max(0, len - fertileEnd), cls: PHASE_STYLE.luteal.bar, label: "Luteal" },
  ].filter((s) => s.days > 0);

  const marker = Math.min(100, Math.max(0, ((insights.currentCycleDay ?? 1) - 0.5) / len * 100));

  return (
    <section className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6" aria-labelledby="pt-h">
      <h2 id="pt-h" className="font-display text-lg font-semibold text-ink-900">This cycle</h2>
      <div className="relative mt-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {segments.map((s) => (
            <div key={s.key} className={s.cls} style={{ width: `${(s.days / len) * 100}%` }} title={`${s.label}: ${s.days} days`} />
          ))}
        </div>
        <div className="absolute -top-1.5" style={{ left: `calc(${marker}% - 8px)` }} aria-hidden="true">
          <div className="h-6 w-4 rounded-full border-2 border-white bg-ink-900 shadow-soft" />
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-700/75">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", s.cls)} aria-hidden="true" />
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-900" aria-hidden="true" />
          Today (day {insights.currentCycleDay})
        </li>
      </ul>
    </section>
  );
}
