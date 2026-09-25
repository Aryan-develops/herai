import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Droplet, Sparkles } from "lucide-react";
import { api, type CycleInsights } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PHASE_LABEL: Record<NonNullable<CycleInsights["phase"]>, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation window",
  luteal: "Luteal",
};

const PHASE_COLOR: Record<NonNullable<CycleInsights["phase"]>, string> = {
  menstrual: "bg-brand-100 text-brand-700",
  follicular: "bg-sage-100 text-sage-700",
  ovulation: "bg-violet-100 text-violet-700",
  luteal: "bg-amber-100 text-amber-700",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Cycle() {
  const [insights, setInsights] = useState<CycleInsights | null>(null);

  useEffect(() => {
    api.getCycleInsights().then(({ insights }) => setInsights(insights));
  }, []);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Cycle</h1>
          <p className="mt-1 text-ink-700/70">Predictions estimated from your logged periods — not a diagnosis.</p>
        </div>
        <Link to="/log">
          <Button>
            <CalendarPlus className="h-4 w-4" />
            Log entry
          </Button>
        </Link>
      </div>

      {insights === null && <p className="mt-8 text-sm text-ink-700/60">Loading…</p>}

      {insights && !insights.lastPeriodStart && (
        <div className="mt-8 max-w-xl rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
          <Droplet className="mx-auto h-6 w-6 text-brand-500" />
          <p className="mt-3 text-ink-700/70">
            Log a period entry (or set your last period date in your profile) to see cycle predictions.
          </p>
          <Link to="/log" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Log your first entry
            </Button>
          </Link>
        </div>
      )}

      {insights && insights.lastPeriodStart && (
        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-medium text-ink-700/50">Current phase</p>
              <div className="mt-2 flex items-center gap-2">
                {insights.phase && (
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PHASE_COLOR[insights.phase]}`}>
                    {PHASE_LABEL[insights.phase]}
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-display font-semibold text-ink-900">
                Day {insights.currentCycleDay}
                <span className="ml-1 text-base font-normal text-ink-700/50">of {insights.cycleLengthDays}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-medium text-ink-700/50">Predicted next period</p>
              <p className="mt-2 text-2xl font-display font-semibold text-ink-900">
                {insights.predictedNextPeriodStart ? formatDate(insights.predictedNextPeriodStart) : "—"}
              </p>
              {insights.fertileWindow && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-700/70">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Fertile window: {formatDate(insights.fertileWindow.start)} – {formatDate(insights.fertileWindow.end)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-ink-700/50">Cycle regularity</p>
                <span className="text-xs font-medium capitalize text-ink-700/60">
                  {insights.regularity.replace("_", " ")}
                </span>
              </div>
              {insights.cycleHistory.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {insights.cycleHistory
                    .slice(-6)
                    .reverse()
                    .map((c) => (
                      <div key={c.start} className="flex items-center justify-between text-sm">
                        <span className="text-ink-700/70">Started {formatDate(c.start)}</span>
                        <span className="font-medium text-ink-900">{c.lengthDays}-day cycle</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-700/60">
                  Log at least two periods to see your cycle-length history.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
