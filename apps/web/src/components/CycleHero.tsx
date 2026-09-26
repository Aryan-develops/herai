import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CycleInsights } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PHASE_STYLE, shortDate } from "@/lib/phases";

/** Phase-coloured hero with a day-progress ring. Links to /cycle unless `static`. */
export function CycleHero({
  insights,
  loading,
  static: isStatic = false,
}: {
  insights: CycleInsights | null;
  loading: boolean;
  static?: boolean;
}) {
  if (loading) {
    return <div aria-hidden="true" className="skeleton mt-6 h-40 w-full rounded-3xl" />;
  }
  if (!insights || !insights.lastPeriodStart || !insights.phase || !insights.currentCycleDay) {
    return (
      <Link
        to="/log"
        className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-dashed border-brand-300 bg-brand-50/60 p-6 transition-colors hover:bg-brand-50"
      >
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">Start tracking your cycle</p>
          <p className="mt-1 text-sm text-ink-700/70">Log your period to see your phase and predictions here.</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
      </Link>
    );
  }

  const style = PHASE_STYLE[insights.phase];
  const pct = Math.min(1, insights.currentCycleDay / insights.cycleLengthDays);
  const cls = `mt-6 flex items-center gap-5 rounded-3xl bg-gradient-to-br ${style.grad} p-6 text-white shadow-lift`;

  const body = (
    <>
      <ProgressRing value={pct} onDark label={`Day ${insights.currentCycleDay} of ${insights.cycleLengthDays}`}>
        <span className="font-display text-2xl font-semibold">{insights.currentCycleDay}</span>
        <span className="mt-0.5 text-[10px] tracking-wide text-white/80 uppercase">Day</span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Right now</p>
        <p className="font-display text-2xl font-semibold">
          {style.label}
          {insights.subPhase === "pms" && <span className="ml-2 text-base font-normal text-white/85">· PMS window</span>}
          {insights.subPhase === "cramps" && <span className="ml-2 text-base font-normal text-white/85">· cramp-prone days</span>}
        </p>
        <p className="mt-1 text-sm text-white/90">{style.blurb}</p>
        {insights.predictedNextPeriodStart && (
          <p className="mt-2 text-xs text-white/80">Next period around {shortDate(insights.predictedNextPeriodStart)}</p>
        )}
      </div>
    </>
  );

  return isStatic ? (
    <div className={cls}>{body}</div>
  ) : (
    <Link to="/cycle" className={`${cls} transition-transform duration-200 hover:-translate-y-0.5`}>
      {body}
    </Link>
  );
}
