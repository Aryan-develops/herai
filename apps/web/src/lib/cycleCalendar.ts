import type { CycleInsights } from "@/lib/api";

export type DayKind = "period" | "predicted-period" | "fertile" | "ovulation" | "follicular" | "luteal" | "pms" | "none";

const DAY = 86400000;

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function utcDay(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) / DAY;
}

/**
 * Classifies any calendar day. Days logged as flow are always "period". Every other day is projected by
 * repeating the average cycle forwards and backwards from the last period start, so months and years
 * both before and after today are filled in. Projections are estimates.
 */
export function makeClassifier(insights: CycleInsights | null, loggedPeriodDays: Set<string>) {
  const anchor = insights?.lastPeriodStart ? utcDay(insights.lastPeriodStart.slice(0, 10)) : null;
  const len = insights?.cycleLengthDays ?? 28;
  const plen = Math.min(insights?.periodLengthDays ?? 5, len);
  const today = utcDay(dayKey(new Date()));

  return function classify(key: string): { kind: DayKind; cycleDay: number | null; projected: boolean } {
    const logged = loggedPeriodDays.has(key);
    if (anchor === null) return { kind: logged ? "period" : "none", cycleDay: null, projected: false };
    const d = utcDay(key);
    const offset = d - anchor;
    const cycleDay = ((offset % len) + len) % len + 1;
    const projected = d > today || (offset < 0 && !logged);
    if (logged) return { kind: "period", cycleDay, projected: false };

    const ov = len - 14; // ovulation day-of-cycle
    let kind: DayKind;
    if (cycleDay <= plen) kind = d > today || offset < 0 ? "predicted-period" : "period";
    else if (cycleDay === ov) kind = "ovulation";
    else if (cycleDay >= ov - 5 && cycleDay <= ov + 1) kind = "fertile";
    else if (cycleDay > len - 5) kind = "pms";
    else if (cycleDay < ov) kind = "follicular";
    else kind = "luteal";
    // Days after the last logged period start that fall inside the period window but weren't logged
    // are still estimates for the current cycle.
    return { kind, cycleDay, projected };
  };
}

export const KIND_STYLE: Record<DayKind, { label: string; cell: string; dot: string }> = {
  period: { label: "Period", cell: "bg-brand-500 text-white", dot: "bg-brand-500" },
  "predicted-period": { label: "Predicted period", cell: "border-2 border-dashed border-brand-400 text-brand-700 bg-brand-50", dot: "border-2 border-dashed border-brand-400 bg-brand-50" },
  ovulation: { label: "Ovulation", cell: "bg-violet-500 text-white", dot: "bg-violet-500" },
  fertile: { label: "Fertile window", cell: "bg-violet-100 text-violet-700", dot: "bg-violet-200" },
  follicular: { label: "Follicular", cell: "text-ink-800", dot: "bg-sage-200" },
  luteal: { label: "Luteal", cell: "text-ink-800", dot: "bg-peach-200" },
  pms: { label: "PMS window", cell: "bg-peach-100 text-peach-600", dot: "bg-peach-200" },
  none: { label: "", cell: "text-ink-800", dot: "" },
};
