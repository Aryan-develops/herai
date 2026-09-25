import type { CycleInsights } from "@/lib/api";

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
