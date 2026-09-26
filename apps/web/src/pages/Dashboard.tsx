import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Droplet, ShieldAlert, Smile, Sparkles, Sprout } from "lucide-react";
import { api, ApiError, type CycleInsights, type HealthReportRecord, type InsightCard } from "@/lib/api";
import { PHASE_STYLE, shortDate } from "@/lib/phases";
import { dayKey, addDaysKey } from "@/lib/cycleCalendar";
import { usePrefs } from "@/context/PrefsContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Today: one status, one action, three dates, one check-in. Everything else lives in its own tab. */
export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { prefs } = usePrefs();
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<InsightCard | null>(null);
  const [urgent, setUrgent] = useState<HealthReportRecord | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    api
      .getCycleInsights()
      .then(({ insights }) => setInsights(insights))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.listReports().then(({ reports }) => setUrgent(reports.find((r) => r.emergency) ?? null)).catch(() => {});
  }, [load]);

  useEffect(() => {
    api.dailyInsights(prefs?.language).then(({ cards }) => setCard(cards[0] ?? null)).catch(() => {});
  }, [prefs?.language]);

  const tracking = !!insights?.lastPeriodStart && !!insights.phase && !!insights.currentCycleDay;
  const onPeriod = tracking && insights!.phase === "menstrual";

  async function periodStarted() {
    const plen = Math.max(1, Math.min(insights?.periodLengthDays || 5, 10));
    const today = dayKey(new Date());
    setStarting(true);
    try {
      await api.createPeriodRange(Array.from({ length: plen }, (_, i) => ({ date: addDaysKey(today, i), flow: "medium" as const })));
      toast(`Period logged for ${plen} days. Adjust it on the calendar.`);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save. Please try again.", "error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <AppShell>
      <section className="-mx-4 -mt-6 rounded-b-[2.5rem] bg-gradient-to-b from-brand-100 via-violet-50 to-transparent px-4 pt-10 pb-6 text-center sm:-mx-6 sm:-mt-10 sm:px-6 sm:pt-14">
        {loading ? (
          <div className="mx-auto h-36 max-w-xs skeleton rounded-3xl" aria-hidden="true" />
        ) : tracking ? (
          <Status insights={insights!} />
        ) : (
          <div>
            <p className="font-display text-lg text-ink-700">Welcome to Lunee</p>
            <p className="mt-1 font-display text-4xl font-semibold text-ink-900 sm:text-5xl">Let's start</p>
            <p className="mt-2 text-ink-700/80">Log your last period to see your cycle.</p>
          </div>
        )}

        <div className="mt-6">
          {onPeriod ? (
            <Button size="lg" className="min-w-56 rounded-full shadow-lift" onClick={() => navigate("/log?tab=cycle")}>
              <Droplet className="h-4 w-4" aria-hidden="true" />
              Log today's flow
            </Button>
          ) : (
            <Button size="lg" className="min-w-56 rounded-full shadow-lift" onClick={periodStarted} disabled={starting || loading}>
              {starting ? <Spinner /> : <Droplet className="h-4 w-4" aria-hidden="true" />}
              {starting ? "Saving…" : tracking ? "Period started" : "My period started today"}
            </Button>
          )}
          {!tracking && !loading && (
            <Link to="/cycle" className="mt-3 block text-sm font-medium text-brand-700 hover:underline">
              It started earlier? Pick dates on the calendar
            </Link>
          )}
        </div>
      </section>

      {urgent && (
        <Link to={`/reports/${urgent._id}`} className="mt-4 flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 hover:bg-red-100">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-red-800">A report needs your attention</p>
          <ChevronRight className="h-4 w-4 text-red-700" aria-hidden="true" />
        </Link>
      )}

      {tracking && <DateTiles insights={insights!} />}

      <Link
        to="/log?tab=mood"
        className="mt-4 flex items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-ink-900">How are you feeling today?</p>
          <p className="mt-0.5 text-sm text-ink-700/70">Log mood or symptoms in a few taps.</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700" aria-hidden="true">
          <Smile className="h-6 w-6" />
        </span>
      </Link>

      {card && (
        <div className="mt-4 rounded-3xl border border-violet-100 bg-violet-50 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-700 uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Today's tip
          </p>
          <p className="mt-2 font-display text-base font-semibold text-ink-900">{card.title}</p>
          <p className="mt-1 text-sm text-ink-700/80">{card.body}</p>
        </div>
      )}
    </AppShell>
  );
}

function Status({ insights }: { insights: CycleInsights }) {
  const phase = insights.phase!;
  const onPeriod = phase === "menstrual";
  const until = insights.daysUntilNextPeriod;
  const label = insights.subPhase === "pms" ? "PMS window" : PHASE_STYLE[phase].label;

  let big: string;
  let small: string | null = null;
  if (onPeriod) big = `Day ${insights.currentCycleDay}`;
  else if (until !== null && until > 0) {
    big = `${until} ${until === 1 ? "day" : "days"}`;
    small = "until your period";
  } else if (until === 0) big = "Due today";
  else big = "Period may be late";

  return (
    <div>
      <p className="font-display text-lg font-medium text-ink-700">{label}</p>
      <p className="tabular mt-1 font-display text-5xl font-semibold text-ink-900 sm:text-6xl">{big}</p>
      {small && <p className="mt-1 text-ink-700/80">{small}</p>}
      {insights.predictedNextPeriodStart && (
        <p className="mt-2 text-sm font-medium text-ink-700/80">
          {shortDate(insights.predictedNextPeriodStart)} · Next period{insights.confidence === "low" ? " (estimate)" : ""}
        </p>
      )}
    </div>
  );
}

function DateTiles({ insights }: { insights: CycleInsights }) {
  const today = dayKey(new Date());
  const fw = insights.fertileWindow;
  const fertileNow = !!fw && fw.start <= today && today <= fw.end;
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      <Link to="/cycle" className="flex flex-col items-center justify-center rounded-3xl bg-violet-50 p-3 text-center transition-transform hover:-translate-y-0.5">
        <p className="text-[11px] font-semibold tracking-wide text-violet-700 uppercase">Cycle day</p>
        <ProgressRing value={(insights.currentCycleDay ?? 0) / insights.cycleLengthDays} size={64} label={`Cycle day ${insights.currentCycleDay}`} className="mt-1.5">
          <span className="font-display text-xl font-semibold text-ink-900">{insights.currentCycleDay}</span>
        </ProgressRing>
      </Link>
      <Tile
        tone="bg-amber-50 text-amber-700"
        icon={<Sprout className="h-4 w-4" aria-hidden="true" />}
        value={fertileNow ? "Now" : fw ? shortDate(fw.start) : "—"}
        label={fertileNow ? "Fertile window" : "Next fertile"}
      />
      <Tile
        tone="bg-peach-100 text-peach-600"
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        value={insights.ovulationDate ? shortDate(insights.ovulationDate) : "—"}
        label="Ovulation"
      />
    </div>
  );
}

function Tile({ tone, icon, value, label }: { tone: string; icon: React.ReactNode; value: string; label: string }) {
  return (
    <Link to="/cycle" className={cn("flex min-h-28 flex-col justify-between rounded-3xl p-3.5 transition-transform hover:-translate-y-0.5", tone)}>
      {icon}
      <div>
        <p className="tabular font-display text-lg leading-tight font-semibold text-ink-900">{value}</p>
        <p className="text-xs font-medium">{label}</p>
      </div>
    </Link>
  );
}
