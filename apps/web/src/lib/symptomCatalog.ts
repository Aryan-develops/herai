export type FlowKey = "spotting" | "light" | "medium" | "heavy";

export interface CatalogGroup {
  id: string;
  title: string;
  hint?: string;
  /** Single-choice groups replace each other (flow, test results). */
  single?: boolean;
  tone: string;
  items: string[];
}

/** Everything a person can tick for a day. Names are stored as-is on symptom logs. */
export const FLOW_OPTIONS: { key: FlowKey; label: string }[] = [
  { key: "spotting", label: "Spotting" },
  { key: "light", label: "Light" },
  { key: "medium", label: "Medium" },
  { key: "heavy", label: "Heavy" },
];

export const CATALOG: CatalogGroup[] = [
  {
    id: "symptoms",
    title: "Symptoms",
    tone: "bg-brand-50 text-brand-700 border-brand-200",
    items: [
      "Everything is fine", "Cramps", "Tender breasts", "Headache", "Acne", "Backache", "Fatigue", "Cravings",
      "Insomnia", "Abdominal pain", "Vaginal itching", "Vaginal dryness", "Hot flashes", "Night sweats", "Blood clots", "Dizziness",
    ],
  },
  {
    id: "discharge",
    title: "Vaginal discharge",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    items: ["No discharge", "Creamy", "Watery", "Sticky", "Egg white", "Spotting", "Unusual", "Clumpy white", "Gray"],
  },
  {
    id: "digestion",
    title: "Digestion and stool",
    tone: "bg-pink-50 text-pink-700 border-pink-200",
    items: ["Nausea", "Bloating", "Constipation", "Diarrhea"],
  },
  {
    id: "activity",
    title: "Other",
    tone: "bg-peach-100 text-peach-600 border-peach-200",
    items: ["Travel", "Stress", "Meditation", "Journaling", "Exercise", "Sex", "Alcohol", "Poor sleep"],
  },
  {
    id: "preg",
    title: "Pregnancy test",
    single: true,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    items: ["Didn't take tests", "Positive", "Negative", "Faint line"],
  },
  {
    id: "ovul",
    title: "Ovulation test",
    hint: "Know when you ovulate",
    single: true,
    tone: "bg-sage-100 text-sage-700 border-sage-200",
    items: ["Didn't take tests", "Positive ovulation test", "Negative ovulation test", "Ovulation: my method"],
  },
];

/** Stored names for the test groups are prefixed so the two "Didn't take tests" stay distinct. */
export function storedName(groupId: string, item: string): string {
  if (groupId === "preg") return `Pregnancy test: ${item}`;
  if (groupId === "ovul") return item.includes("ovulation") || item.startsWith("Ovulation") ? item : `Ovulation test: ${item}`;
  return item;
}
