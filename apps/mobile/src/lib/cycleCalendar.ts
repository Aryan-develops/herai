import type { CycleInsights } from "./api";

export type DayKind = "period" | "predicted-period" | "fertile" | "ovulation" | "follicular" | "luteal" | "pms" | "none";

const DAY = 86400000;

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function utcDay(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) / DAY;
}

function latestRunStart(days: Set<string>): number | null {
  const sorted = [...days].sort();
  if (sorted.length === 0) return null;
  let start = utcDay(sorted[sorted.length - 1]);
  for (let i = sorted.length - 2; i >= 0 && utcDay(sorted[i]) === start - 1; i--) start -= 1;
  return start;
}

export function addDaysKey(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/**
 * Classifies any calendar day. Days logged as flow are always "period". Every other day is projected by
 * repeating the average cycle forwards and backwards from the last period start, so months and years
 * both before and after today are filled in. Projections are estimates.
 */
export function makeClassifier(insights: CycleInsights | null, loggedPeriodDays: Set<string>) {
  const insightAnchor = insights?.lastPeriodStart ? utcDay(insights.lastPeriodStart.slice(0, 10)) : null;
  const runStart = latestRunStart(loggedPeriodDays);
  // A period the person logged (even a planned one in the future) is the newest fact, so projections follow it.
  const anchor = runStart !== null && (insightAnchor === null || runStart > insightAnchor) ? runStart : insightAnchor;
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

    const ov = len - 13; // ovulation day-of-cycle (1-based), 14 days before next period
    let kind: DayKind;
    if (cycleDay <= plen) kind = d > today || offset < 0 ? "predicted-period" : "period";
    else if (cycleDay === ov) kind = "ovulation";
    else if (cycleDay >= ov - 4 && cycleDay <= ov + 3) kind = "fertile";
    else if (cycleDay > len - 5) kind = "pms";
    else if (cycleDay < ov) kind = "follicular";
    else kind = "luteal";
    // Days after the last logged period start that fall inside the period window but weren't logged
    // are still estimates for the current cycle.
    return { kind, cycleDay, projected };
  };
}

