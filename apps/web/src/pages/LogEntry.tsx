import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { api, ApiError, type CycleLog, type SymptomEntry } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Extreme"];

export function LogEntry() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"symptom" | "cycle">("symptom");

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Log an entry</h1>
      <p className="mt-1 text-ink-700/70">Keep your health timeline current.</p>

      <div className="mt-6 inline-flex rounded-xl bg-neutral-100 p-1">
        <TabButton active={tab === "symptom"} onClick={() => setTab("symptom")}>
          Symptom
        </TabButton>
        <TabButton active={tab === "cycle"} onClick={() => setTab("cycle")}>
          Cycle
        </TabButton>
      </div>

      <Card className="mt-4 max-w-xl">
        <CardContent className="p-6">
          {tab === "symptom" ? (
            <SymptomForm onDone={() => navigate("/timeline")} />
          ) : (
            <CycleForm onDone={() => navigate("/timeline")} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-ink-900 shadow-sm" : "text-ink-700/60 hover:text-ink-900"
      }`}
    >
      {children}
    </button>
  );
}

function SymptomForm({ onDone }: { onDone: () => void }) {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addEntry() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEntries((es) => [...es, { name: trimmed, severity }]);
    setName("");
    setSeverity(3);
  }

  async function submit() {
    if (entries.length === 0) {
      setError("Add at least one symptom");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createSymptomLog({ symptoms: entries, notes: notes || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Symptom</Label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. cramps, headache"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEntry())}
          />
          <Select
            className="w-36"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} — {SEVERITY_LABEL[n]}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={addEntry}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li
              key={`${entry.name}-${i}`}
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-ink-900">{entry.name}</span>
              <span className="flex items-center gap-3 text-ink-700/60">
                {SEVERITY_LABEL[entry.severity]}
                <button
                  type="button"
                  onClick={() => setEntries((es) => es.filter((_, idx) => idx !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else worth noting…" />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Button className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? "Saving…" : "Log symptoms"}
      </Button>
    </div>
  );
}

function CycleForm({ onDone }: { onDone: () => void }) {
  const [flow, setFlow] = useState<CycleLog["flow"]>("medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.createCycleLog({ flow, notes: notes || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Flow</Label>
        <Select value={flow} onChange={(e) => setFlow(e.target.value as CycleLog["flow"])}>
          <option value="spotting">Spotting</option>
          <option value="light">Light</option>
          <option value="medium">Medium</option>
          <option value="heavy">Heavy</option>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else worth noting…" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? "Saving…" : "Log cycle entry"}
      </Button>
    </div>
  );
}
