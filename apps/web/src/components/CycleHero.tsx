import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CycleInsights } from "@/lib/api";
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
  const r = 34;
  const c = 2 * Math.PI * r;
  const cls = `mt-6 flex items-center gap-5 rounded-3xl bg-gradient-to-br ${style.grad} p-6 text-white shadow-lift`;

  const body = (
    <>
      <div
        className="relative h-24 w-24 shrink-0"
        role="img"
        aria-label={`Day ${insights.currentCycleDay} of ${insights.cycleLengthDays}`}
      >
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
        </svg>
        <div className="tabular absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-display text-2xl font-semibold">{insights.currentCycleDay}</span>
          <span className="mt-0.5 text-[10px] tracking-wide text-white/80 uppercase">Day</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Right now</p>
        <p className="font-display text-2xl font-semibold">{style.label}</p>
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
