import type { CycleInsights } from "./api";

export type Phase = NonNullable<CycleInsights["phase"]>;

/** Mirrors apps/web/src/lib/phases.ts so both clients describe phases identically. */
export const PHASE_STYLE: Record<Phase, { label: string; blurb: string; tip: string; solid: string; soft: string; text: string }> = {
  menstrual: {
    label: "Period",
    blurb: "Rest, warmth and gentleness today.",
    tip: "Heat, hydration and iron-rich food can help. Go easy on yourself.",
    solid: "#c21f61",
    soft: "#ffe1ea",
    text: "#ac1a55",
  },
  follicular: {
    label: "Follicular",
    blurb: "Energy is building. A good time to start things.",
    tip: "Many people feel more motivated now. Great for new plans and harder workouts.",
    solid: "#3d8a68",
    soft: "#dcf0e5",
    text: "#2f7658",
  },
  ovulation: {
    label: "Fertile window",
    blurb: "Peak energy and mood for many people.",
    tip: "Social energy is often highest around now. This is also your most fertile time.",
    solid: "#7a57dc",
    soft: "#ece6ff",
    text: "#6641bf",
  },
  luteal: {
    label: "Luteal",
    blurb: "Slow down a little and listen to your body.",
    tip: "PMS can show up late in this phase. Steady meals, sleep and gentle movement help.",
    solid: "#d9622f",
    soft: "#ffe6d8",
    text: "#b04a1f",
  },
};

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
