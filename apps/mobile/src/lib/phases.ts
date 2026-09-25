import type { CycleInsights, DayPhase, Need, PhaseKey } from "./api";
import { isDark } from "../theme";

export type Phase = NonNullable<CycleInsights["phase"]>;

type Look = { solid: string; soft: string; text: string };

// Light tints for light mode; deep tints with lighter text for dark mode, so pairs keep their contrast.
const LOOK: Record<PhaseKey, { light: Look; dark: Look }> = {
  menstrual: {
    light: { solid: "#c21f61", soft: "#ffe1ea", text: "#ac1a55" },
    dark: { solid: "#c21f61", soft: "#4d1c31", text: "#ffa3c0" },
  },
  cramps: {
    light: { solid: "#a3247f", soft: "#fbe1f2", text: "#8a1c6b" },
    dark: { solid: "#a3247f", soft: "#4a1c40", text: "#ffabe0" },
  },
  follicular: {
    light: { solid: "#3d8a68", soft: "#dcf0e5", text: "#2f7658" },
    dark: { solid: "#3d8a68", soft: "#1c3a2c", text: "#7fd3a9" },
  },
  ovulation: {
    light: { solid: "#7a57dc", soft: "#ece6ff", text: "#6641bf" },
    dark: { solid: "#7a57dc", soft: "#2e2350", text: "#bcaaff" },
  },
  luteal: {
    light: { solid: "#d9622f", soft: "#ffe6d8", text: "#b04a1f" },
    dark: { solid: "#d9622f", soft: "#452a20", text: "#ffa27a" },
  },
  pms: {
    light: { solid: "#cf4a44", soft: "#ffe3dd", text: "#a8342f" },
    dark: { solid: "#cf4a44", soft: "#48231f", text: "#ff9b93" },
  },
};

const pick = (k: PhaseKey): Look => (isDark ? LOOK[k].dark : LOOK[k].light);

/** Mirrors apps/web/src/lib/phases.ts so both clients describe phases identically. */
export const PHASE_STYLE: Record<Phase, { label: string; blurb: string; tip: string; solid: string; soft: string; text: string }> = {
  menstrual: {
    label: "Period",
    blurb: "Rest, warmth and gentleness today.",
    tip: "Heat, hydration and iron-rich food can help. Go easy on yourself.",
    ...pick("menstrual"),
  },
  follicular: {
    label: "Follicular",
    blurb: "Energy is building. A good time to start things.",
    tip: "Many people feel more motivated now. Great for new plans and harder workouts.",
    ...pick("follicular"),
  },
  ovulation: {
    label: "Fertile window",
    blurb: "Peak energy and mood for many people.",
    tip: "Social energy is often highest around now. This is also your most fertile time.",
    ...pick("ovulation"),
  },
  luteal: {
    label: "Luteal",
    blurb: "Slow down a little and listen to your body.",
    tip: "PMS can show up late in this phase. Steady meals, sleep and gentle movement help.",
    ...pick("luteal"),
  },
};

/** Partner-facing look, including the finer PMS and cramp overlays. */
export const PARTNER_PHASE_LOOK: Record<PhaseKey, Look> = {
  menstrual: pick("menstrual"),
  cramps: pick("cramps"),
  follicular: pick("follicular"),
  ovulation: pick("ovulation"),
  luteal: pick("luteal"),
  pms: pick("pms"),
};

export const DAY_PHASE_COLOR: Record<DayPhase, string> = {
  menstrual: "#c21f61",
  follicular: "#3d8a68",
  ovulation: "#7a57dc",
  luteal: "#d9622f",
  pms: "#cf4a44",
};

export const NEEDS: { id: Need; label: string }[] = [
  { id: "space", label: "I need space" },
  { id: "hug", label: "I need a hug" },
  { id: "food", label: "I need food" },
  { id: "talk", label: "I want to talk" },
  { id: "rest", label: "I need rest" },
];

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
