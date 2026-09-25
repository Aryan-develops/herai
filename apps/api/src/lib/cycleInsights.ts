const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_PHASE_LENGTH = 14; // ovulation-to-next-period is the stable half of the cycle

export interface CycleLogInput {
  loggedAt: string;
}

export interface CycleInsights {
  cycleLengthDays: number;
  periodLengthDays: number;
  lastPeriodStart: string | null;
  currentCycleDay: number | null;
  predictedNextPeriodStart: string | null;
  ovulationDate: string | null;
  fertileWindow: { start: string; end: string } | null;
  phase: "menstrual" | "follicular" | "ovulation" | "luteal" | null;
  /** Finer-grained overlay on `phase`: PMS window before a period, or cramp-prone days. */
  subPhase: "pms" | "cramps" | null;
  daysUntilNextPeriod: number | null;
  /** How much history backs the prediction; drives the "estimated" label in the UI. */
  confidence: "high" | "medium" | "low";
  cycleHistory: { start: string; lengthDays: number }[];
  regularity: "regular" | "irregular" | "insufficient_data";
}

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Groups per-day flow logs into periods (runs of consecutive days), then
// derives cycle length as the gap between consecutive period starts.
function derivePeriodsFromLogs(logs: CycleLogInput[]): { start: Date; end: Date }[] {
  const days = [...new Set(logs.map((l) => isoDate(toDateOnly(l.loggedAt))))]
    .map((s) => new Date(`${s}T00:00:00.000Z`))
    .sort((a, b) => a.getTime() - b.getTime());

  const periods: { start: Date; end: Date }[] = [];
  for (const day of days) {
    const last = periods[periods.length - 1];
    if (last && day.getTime() - last.end.getTime() === DAY_MS) {
      last.end = day;
    } else {
      periods.push({ start: day, end: day });
    }
  }
  return periods;
}

export interface CycleInsightsOptions {
  /** Injected for tests; defaults to now. */
  today?: Date;
  /** True when a cramp-like symptom was logged in the last two days. */
  crampsRecent?: boolean;
}

const PMS_WINDOW_DAYS = 6;

export function computeCycleInsights(
  logs: CycleLogInput[],
  profile: { cycleLengthDays?: number | null; lastPeriodStart?: string | null } | null,
  options: CycleInsightsOptions = {},
): CycleInsights {
  const periods = derivePeriodsFromLogs(logs);
  const cycleHistory = periods.slice(1).map((period, i) => ({
    start: isoDate(period.start),
    lengthDays: Math.round((period.start.getTime() - periods[i].start.getTime()) / DAY_MS),
  }));

  const observedLengths = cycleHistory.map((c) => c.lengthDays).filter((n) => n >= 15 && n <= 45);
  const avgObserved = observedLengths.length
    ? Math.round(observedLengths.reduce((a, b) => a + b, 0) / observedLengths.length)
    : null;

  const cycleLengthDays = avgObserved ?? profile?.cycleLengthDays ?? DEFAULT_CYCLE_LENGTH;

  const periodLengths = periods.map((p) => Math.round((p.end.getTime() - p.start.getTime()) / DAY_MS) + 1);
  const periodLengthDays = periodLengths.length
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
    : DEFAULT_PERIOD_LENGTH;

  const lastObservedStart = periods.length ? periods[periods.length - 1].start : null;
  const profileStart = profile?.lastPeriodStart ? toDateOnly(profile.lastPeriodStart) : null;
  const lastPeriodStartDate =
    lastObservedStart && profileStart
      ? lastObservedStart.getTime() >= profileStart.getTime()
        ? lastObservedStart
        : profileStart
      : lastObservedStart ?? profileStart;

  if (!lastPeriodStartDate) {
    return {
      cycleLengthDays,
      periodLengthDays,
      lastPeriodStart: null,
      currentCycleDay: null,
      predictedNextPeriodStart: null,
      ovulationDate: null,
      fertileWindow: null,
      phase: null,
      subPhase: null,
      daysUntilNextPeriod: null,
      confidence: "low",
      cycleHistory,
      regularity: "insufficient_data",
    };
  }

  const today = toDateOnly((options.today ?? new Date()).toISOString());
  const daysSinceStart = Math.round((today.getTime() - lastPeriodStartDate.getTime()) / DAY_MS);
  const currentCycleDay = ((daysSinceStart % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;

  const predictedNextPeriodStart = addDays(lastPeriodStartDate, cycleLengthDays);
  const ovulationDate = addDays(predictedNextPeriodStart, -LUTEAL_PHASE_LENGTH);
  const fertileWindowStart = addDays(ovulationDate, -5);
  const fertileWindowEnd = addDays(ovulationDate, 1);

  let phase: CycleInsights["phase"];
  if (currentCycleDay < periodLengthDays) phase = "menstrual";
  else if (
    today.getTime() >= fertileWindowStart.getTime() &&
    today.getTime() <= fertileWindowEnd.getTime()
  )
    phase = "ovulation";
  else if (today.getTime() < ovulationDate.getTime()) phase = "follicular";
  else phase = "luteal";

  const daysUntilNextPeriod = Math.round((predictedNextPeriodStart.getTime() - today.getTime()) / DAY_MS);
  let subPhase: CycleInsights["subPhase"] = null;
  if (phase === "menstrual" && (currentCycleDay < 2 || options.crampsRecent)) subPhase = "cramps";
  else if (phase === "luteal" && daysUntilNextPeriod > 0 && daysUntilNextPeriod <= PMS_WINDOW_DAYS) subPhase = "pms";
  else if (options.crampsRecent && daysUntilNextPeriod <= 1) subPhase = "cramps";

  let regularity: CycleInsights["regularity"] = "insufficient_data";
  if (observedLengths.length >= 2) {
    const spread = Math.max(...observedLengths) - Math.min(...observedLengths);
    regularity = spread <= 7 ? "regular" : "irregular";
  }

  const confidence: CycleInsights["confidence"] =
    observedLengths.length >= 3 && regularity === "regular" ? "high" : observedLengths.length >= 1 ? "medium" : "low";

  return {
    cycleLengthDays,
    periodLengthDays,
    lastPeriodStart: isoDate(lastPeriodStartDate),
    currentCycleDay: currentCycleDay + 1,
    predictedNextPeriodStart: isoDate(predictedNextPeriodStart),
    ovulationDate: isoDate(ovulationDate),
    fertileWindow: { start: isoDate(fertileWindowStart), end: isoDate(fertileWindowEnd) },
    phase,
    subPhase,
    daysUntilNextPeriod,
    confidence,
    cycleHistory,
    regularity,
  };
}

export type DayPhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "pms";

/** Predicted phase for any date, projected from the last period start. Used for calendar strips and plan clashes. */
export function phaseForDate(insights: CycleInsights, date: Date): DayPhase | null {
  if (!insights.lastPeriodStart) return null;
  const L = insights.cycleLengthDays;
  const start = toDateOnly(insights.lastPeriodStart);
  const day = toDateOnly(date.toISOString());
  const diff = Math.round((day.getTime() - start.getTime()) / DAY_MS);
  const idx = ((diff % L) + L) % L; // 0-based day in cycle
  const ovulationIdx = L - LUTEAL_PHASE_LENGTH;
  if (idx < insights.periodLengthDays) return "menstrual";
  if (idx >= ovulationIdx - 5 && idx <= ovulationIdx + 1) return "ovulation";
  if (idx >= L - PMS_WINDOW_DAYS) return "pms";
  return idx < ovulationIdx ? "follicular" : "luteal";
}
