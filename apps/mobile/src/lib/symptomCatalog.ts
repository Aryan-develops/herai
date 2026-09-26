export type FlowKey = "spotting" | "light" | "medium" | "heavy";

export interface CatalogGroup {
  id: string;
  title: string;
  hint?: string;
  /** Single-choice groups replace each other (flow, test results). */
  single?: boolean;
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
    
    items: [
      "Everything is fine", "Cramps", "Tender breasts", "Headache", "Acne", "Backache", "Fatigue", "Cravings",
      "Insomnia", "Abdominal pain", "Vaginal itching", "Vaginal dryness", "Hot flashes", "Night sweats", "Blood clots", "Dizziness",
    ],
  },
  {
    id: "discharge",
    title: "Vaginal discharge",
    
    items: ["No discharge", "Creamy", "Watery", "Sticky", "Egg white", "Spotting", "Unusual", "Clumpy white", "Gray"],
  },
  {
    id: "digestion",
    title: "Digestion and stool",
    
    items: ["Nausea", "Bloating", "Constipation", "Diarrhea"],
  },
  {
    id: "activity",
    title: "Other",
    
    items: ["Travel", "Stress", "Meditation", "Journaling", "Exercise", "Sex", "Alcohol", "Poor sleep"],
  },
  {
    id: "preg",
    title: "Pregnancy test",
    single: true,
    
    items: ["Didn't take tests", "Positive", "Negative", "Faint line"],
  },
  {
    id: "ovul",
    title: "Ovulation test",
    hint: "Know when you ovulate",
    single: true,
    
    items: ["Didn't take tests", "Positive ovulation test", "Negative ovulation test", "Ovulation: my method"],
  },
];

/** Stored names for the test groups are prefixed so the two "Didn't take tests" stay distinct. */
export function storedName(groupId: string, item: string): string {
  if (groupId === "preg") return `Pregnancy test: ${item}`;
  if (groupId === "ovul") return item.includes("ovulation") || item.startsWith("Ovulation") ? item : `Ovulation test: ${item}`;
  return item;
}
