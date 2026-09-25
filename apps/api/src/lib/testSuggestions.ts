// Maps flagged lab parameters to follow-up tests worth discussing. This is
// guidance for "what to ask a lab or doctor about", not a diagnosis or an order.
const RULES: { match: RegExp; tests: { name: string; keywords: string[] }[] }[] = [
  {
    match: /hemoglobin|haemoglobin|hgb|ferritin|iron|rbc|mcv|hematocrit/i,
    tests: [
      { name: "Complete blood count (CBC)", keywords: ["cbc", "complete blood"] },
      { name: "Ferritin", keywords: ["ferritin"] },
      { name: "Iron studies", keywords: ["iron"] },
    ],
  },
  { match: /tsh|thyroid|\bt3\b|\bt4\b/i, tests: [{ name: "Thyroid panel", keywords: ["thyroid", "tsh"] }] },
  {
    match: /glucose|hba1c|sugar|insulin/i,
    tests: [
      { name: "HbA1c", keywords: ["hba1c"] },
      { name: "Fasting glucose", keywords: ["glucose"] },
    ],
  },
  { match: /vitamin ?d|25-?oh/i, tests: [{ name: "Vitamin D", keywords: ["vitamin d"] }] },
  { match: /b12|cobalamin/i, tests: [{ name: "Vitamin B12", keywords: ["b12"] }] },
  {
    match: /prolactin|\blh\b|\bfsh\b|testosterone|estradiol|amh|dhea/i,
    tests: [{ name: "Hormone panel", keywords: ["hormone", "prolactin", "fsh", "lh", "amh"] }],
  },
];

export interface FlaggedValue {
  parameter: string;
  status: string;
}

export interface TestSuggestion {
  test: string;
  keywords: string[];
  because: string[];
}

export function suggestTests(values: FlaggedValue[]): TestSuggestion[] {
  const flagged = values.filter((v) => v.status !== "in_range" && v.status !== "unparseable");
  const out = new Map<string, TestSuggestion>();
  for (const v of flagged) {
    for (const rule of RULES) {
      if (!rule.match.test(v.parameter)) continue;
      for (const t of rule.tests) {
        const existing = out.get(t.name);
        if (existing) {
          if (!existing.because.includes(v.parameter)) existing.because.push(v.parameter);
        } else {
          out.set(t.name, { test: t.name, keywords: t.keywords, because: [v.parameter] });
        }
      }
    }
  }
  return [...out.values()];
}
