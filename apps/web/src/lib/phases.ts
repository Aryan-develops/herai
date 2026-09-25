import type { CycleInsights, DayPhase, Need, PhaseKey } from "@/lib/api";

export type Phase = NonNullable<CycleInsights["phase"]>;

/** One place for how each cycle phase looks and reads — reused by Dashboard, Cycle and (later) partner cards. */
export const PHASE_STYLE: Record<
  Phase,
  { label: string; blurb: string; tip: string; grad: string; chip: string; bar: string }
> = {
  menstrual: {
    label: "Period",
    blurb: "Rest, warmth and gentleness today.",
    tip: "Heat, hydration and iron-rich food can help. Go easy on yourself.",
    grad: "from-brand-500 to-brand-700",
    chip: "bg-brand-100 text-brand-700",
    bar: "bg-brand-500",
  },
  follicular: {
    label: "Follicular",
    blurb: "Energy is building. A good time to start things.",
    tip: "Many people feel more motivated now. Great for new plans and harder workouts.",
    grad: "from-sage-500 to-sage-700",
    chip: "bg-sage-100 text-sage-700",
    bar: "bg-sage-500",
  },
  ovulation: {
    label: "Fertile window",
    blurb: "Peak energy and mood for many people.",
    tip: "Social energy is often highest around now. This is also your most fertile time.",
    grad: "from-violet-500 to-violet-700",
    chip: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },
  luteal: {
    label: "Luteal",
    blurb: "Slow down a little and listen to your body.",
    tip: "PMS can show up late in this phase. Steady meals, sleep and gentle movement help.",
    grad: "from-peach-400 to-peach-600",
    chip: "bg-peach-100 text-peach-600",
    bar: "bg-peach-400",
  },
};

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}


/** Partner-facing phase look, including the finer PMS and cramp overlays. */
export const PARTNER_PHASE_STYLE: Record<PhaseKey, { grad: string; chip: string; dot: string; short: string }> = {
  menstrual: { grad: "from-brand-500 to-brand-700", chip: "bg-brand-100 text-brand-700", dot: "bg-brand-500", short: "Period" },
  cramps: { grad: "from-brand-600 to-violet-600", chip: "bg-brand-100 text-brand-700", dot: "bg-brand-600", short: "Cramps" },
  follicular: { grad: "from-sage-500 to-sage-700", chip: "bg-sage-100 text-sage-700", dot: "bg-sage-500", short: "Fresh" },
  ovulation: { grad: "from-violet-500 to-violet-700", chip: "bg-violet-100 text-violet-700", dot: "bg-violet-500", short: "Peak" },
  luteal: { grad: "from-peach-400 to-peach-600", chip: "bg-peach-100 text-peach-600", dot: "bg-peach-400", short: "Slow" },
  pms: { grad: "from-peach-600 to-brand-600", chip: "bg-peach-100 text-peach-600", dot: "bg-peach-600", short: "PMS" },
};

export const DAY_PHASE_DOT: Record<DayPhase, string> = {
  menstrual: "bg-brand-500",
  follicular: "bg-sage-500",
  ovulation: "bg-violet-500",
  luteal: "bg-peach-400",
  pms: "bg-peach-600",
};

export const NEEDS: { id: Need; label: string }[] = [
  { id: "space", label: "I need space" },
  { id: "hug", label: "I need a hug" },
  { id: "food", label: "I need food" },
  { id: "talk", label: "I want to talk" },
  { id: "rest", label: "I need rest" },
];
