import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet, Plus, Activity, Smile, X } from "lucide-react";
import { api, ApiError, type CycleLog, type SymptomEntry } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { MoodLogForm } from "@/components/MoodLogForm";
import { WhenPicker } from "@/components/WhenPicker";
import { DurationPicker } from "@/components/DurationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const SEVERITY = [
  { n: 1, label: "Mild" },
  { n: 2, label: "Noticeable" },
  { n: 3, label: "Moderate" },
  { n: 4, label: "Severe" },
  { n: 5, label: "Extreme" },
];

const QUICK_SYMPTOMS = ["Cramps", "Headache", "Fatigue", "Bloating", "Mood swings", "Nausea", "Back pain", "Cravings"];

const FLOWS: { value: CycleLog["flow"]; label: string; drops: number }[] = [
  { value: "spotting", label: "Spotting", drops: 1 },
  { value: "light", label: "Light", drops: 1 },
  { value: "medium", label: "Medium", drops: 2 },
  { value: "heavy", label: "Heavy", drops: 3 },
];

export function LogEntry() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"symptom" | "cycle" | "mood">("symptom");

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Log an entry</h1>
      <p className="mt-1.5 text-ink-700/75">It takes a few seconds and makes your insights sharper.</p>

      <div role="tablist" aria-label="Entry type" className="mt-6 inline-flex rounded-2xl bg-neutral-100 p-1">
        <TabButton id="symptom" active={tab === "symptom"} onClick={() => setTab("symptom")} icon={<Activity className="h-4 w-4" />}>
          Symptoms
        </TabButton>
        <TabButton id="cycle" active={tab === "cycle"} onClick={() => setTab("cycle")} icon={<Droplet className="h-4 w-4" />}>
          Period
        </TabButton>
        <TabButton id="mood" active={tab === "mood"} onClick={() => setTab("mood")} icon={<Smile className="h-4 w-4" />}>
          Mood
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-4 max-w-xl rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-7"
      >
        {tab === "symptom" && <SymptomForm onDone={() => navigate("/timeline")} />}
        {tab === "cycle" && <CycleForm onDone={() => navigate("/timeline")} />}
        {tab === "mood" && <MoodLogForm onDone={() => navigate("/dashboard")} />}
      </div>
    </AppShell>
  );
}

function TabButton({
  id,
  active,
  onClick,
  icon,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-200",
        active ? "bg-white text-brand-700 shadow-soft" : "text-neutral-500 hover:text-ink-900"
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {children}
    </button>
  );
}

function SymptomForm({ onDone }: { onDone: () => void }) {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addEntry(symptom: string = name) {
    const trimmed = symptom.trim();
    if (!trimmed) return;
    setEntries((es) => [...es.filter((e) => e.name.toLowerCase() !== trimmed.toLowerCase()), { name: trimmed, severity }]);
    setName("");
  }

  async function submit() {
    // Include a symptom typed but not yet added.
    const pending = name.trim() ? [...entries, { name: name.trim(), severity }] : entries;
    if (pending.length === 0) {
      setError("Pick or type at least one symptom.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createSymptomLog({ symptoms: pending, notes: notes || undefined, loggedAt: when, durationMinutes: duration });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <WhenPicker value={when} onChange={setWhen} />
      <fieldset>
        <legend className="text-sm font-medium text-ink-800">How strong is it?</legend>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {SEVERITY.map(({ n, label }) => (
            <button
              key={n}
              type="button"
              aria-pressed={severity === n}
              onClick={() => setSeverity(n)}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border text-xs font-medium transition-all duration-200 active:scale-95",
                severity === n
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-300"
              )}
            >
              <span className="tabular font-display text-lg font-semibold">{n}</span>
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-neutral-500 sm:hidden">{SEVERITY[severity - 1].label}</p>
      </fieldset>

      <div>
        <p className="text-sm font-medium text-ink-800">What are you feeling?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_SYMPTOMS.map((s) => {
            const selected = entries.some((e) => e.name.toLowerCase() === s.toLowerCase());
            return (
              <button
                key={s}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  selected ? setEntries((es) => es.filter((e) => e.name.toLowerCase() !== s.toLowerCase())) : addEntry(s)
                }
                className={cn(
                  "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-all duration-200 active:scale-95",
                  selected
                    ? "border-brand-500 bg-brand-500 text-white shadow-soft"
                    : "border-neutral-200 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <Label htmlFor="symptom-name" className="sr-only">
              Other symptom
            </Label>
            <Input
              id="symptom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Something else? Type it here"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEntry())}
            />
          </div>
          <Button type="button" variant="outline" onClick={() => addEntry()} aria-label="Add symptom" className="w-11 px-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="space-y-2" aria-label="Symptoms to log">
          {entries.map((entry, i) => (
            <li key={`${entry.name}-${i}`} className="flex items-center justify-between rounded-2xl bg-brand-50/70 px-3.5 py-2.5 text-sm">
              <span className="font-medium text-ink-900">{entry.name}</span>
              <span className="flex items-center gap-2 text-ink-700/70">
                {SEVERITY[entry.severity - 1].label}
                <button
                  type="button"
                  aria-label={`Remove ${entry.name}`}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-brand-100"
                  onClick={() => setEntries((es) => es.filter((_, idx) => idx !== i))}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <DurationPicker value={duration} onChange={setDuration} />

      <div className="space-y-1.5">
        <Label htmlFor="symptom-notes">Notes (optional)</Label>
        <Textarea id="symptom-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else worth noting…" />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="sticky bottom-[4.75rem] z-10 -mx-5 -mb-5 rounded-b-3xl border-t border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7 xl:static xl:m-0 xl:border-0 xl:bg-transparent xl:p-0">
        <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Saving…" : "Save symptoms"}
        </Button>
      </div>
    </div>
  );
}

function CycleForm({ onDone }: { onDone: () => void }) {
  const [flow, setFlow] = useState<CycleLog["flow"]>("medium");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.createCycleLog({ flow, notes: notes || undefined, loggedAt: when, durationMinutes: duration });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <WhenPicker value={when} onChange={setWhen} />
      <fieldset>
        <legend className="text-sm font-medium text-ink-800">How's your flow?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FLOWS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={flow === f.value}
              onClick={() => setFlow(f.value)}
              className={cn(
                "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-all duration-200 active:scale-95",
                flow === f.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-brand-300"
              )}
            >
              <span className="flex" aria-hidden="true">
                {Array.from({ length: f.drops }).map((_, i) => (
                  <Droplet key={i} className={cn("h-4 w-4", flow === f.value ? "fill-brand-500 text-brand-500" : "text-neutral-400")} />
                ))}
              </span>
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <DurationPicker value={duration} onChange={setDuration} label={flow === "spotting" ? "How long did the spotting last?" : `How long did the ${flow} flow last?`} />

      <div className="space-y-1.5">
        <Label htmlFor="cycle-notes">Notes (optional)</Label>
        <Textarea id="cycle-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cramps, mood, anything worth noting…" />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="sticky bottom-[4.75rem] z-10 -mx-5 -mb-5 rounded-b-3xl border-t border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7 xl:static xl:m-0 xl:border-0 xl:bg-transparent xl:p-0">
        <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Saving…" : "Save period entry"}
        </Button>
      </div>
    </div>
  );
}
