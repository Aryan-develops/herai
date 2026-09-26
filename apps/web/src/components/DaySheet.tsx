import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { api, ApiError, type CycleLog, type SymptomLog } from "@/lib/api";
import { CATALOG, FLOW_OPTIONS, storedName, type FlowKey } from "@/lib/symptomCatalog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Props {
  day: string; // YYYY-MM-DD (local)
  cycleDay: number | null;
  phaseLabel: string;
  cycleLogs: CycleLog[];
  symptomLogs: SymptomLog[];
  onClose: () => void;
  onChanged: () => void;
}

/** Separate window for one day: flow, every symptom group, tests, search, and what's already logged. */
export function DaySheet({ day, cycleDay, phaseLabel, cycleLogs, symptomLogs, onClose, onChanged }: Props) {
  const [flow, setFlow] = useState<FlowKey | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const title = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const future = day > new Date().toLocaleDateString("sv");
  const q = query.trim().toLowerCase();

  const groups = useMemo(
    () => CATALOG.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.toLowerCase().includes(q)) })).filter((g) => g.items.length),
    [q],
  );

  function toggle(groupId: string, item: string, single?: boolean) {
    const name = storedName(groupId, item);
    setPicked((prev) => {
      const next = new Set(prev);
      if (single) {
        const g = CATALOG.find((c) => c.id === groupId)!;
        g.items.forEach((i) => next.delete(storedName(groupId, i)));
      }
      if (prev.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function save() {
    if (!flow && picked.size === 0) {
      setError("Pick a flow or at least one item.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const loggedAt = `${day}T12:00:00.000Z`;
      if (flow) await api.createCycleLog({ flow, loggedAt });
      if (picked.size > 0) await api.createSymptomLog({ symptoms: [...picked].map((name) => ({ name, severity: 2 })), loggedAt });
      setFlow(null);
      setPicked(new Set());
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: "cycle" | "symptom", id: string) {
    try {
      if (kind === "cycle") await api.deleteCycleLog(id);
      else await api.deleteSymptomLog(id);
      onChanged();
    } catch {
      setError("Couldn't remove that entry.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Log for ${title}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-ink-900/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 pb-3 pt-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
            <p className="text-xs text-neutral-500">
              {cycleDay ? `Cycle day ${cycleDay} · ` : ""}
              {phaseLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 pt-3">
          <label className="relative block">
            <span className="sr-only">Search symptoms</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>

          {future && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">This day hasn't happened yet. You can still note plans, but flow and symptoms are usually logged after.</p>}

          {(cycleLogs.length > 0 || symptomLogs.length > 0) && (
            <section className="mt-4 rounded-2xl border border-neutral-200 p-3">
              <h3 className="text-sm font-semibold text-ink-900">Logged this day</h3>
              <ul className="mt-2 space-y-1.5">
                {cycleLogs.map((l) => (
                  <li key={l._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-medium capitalize text-brand-700">{l.flow} flow</span>
                    <button type="button" aria-label="Remove flow entry" onClick={() => remove("cycle", l._id)} className="cursor-pointer rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {symptomLogs.map((l) => (
                  <li key={l._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink-800">{l.symptoms.map((s) => s.name).join(", ")}</span>
                    <button type="button" aria-label="Remove symptom entry" onClick={() => remove("symptom", l._id)} className="cursor-pointer rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!q && (
            <section className="mt-4 rounded-2xl border border-neutral-200 p-4">
              <h3 className="font-display text-base font-semibold text-ink-900">Menstrual flow</h3>
              <p className="text-xs text-neutral-500">Estimate your average daily flow</p>
              <div role="group" className="mt-3 flex flex-wrap gap-2">
                {FLOW_OPTIONS.map((f) => (
                  <Chip key={f.key} on={flow === f.key} tone="bg-brand-50 text-brand-700 border-brand-200" onClick={() => setFlow(flow === f.key ? null : f.key)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          {groups.map((g) => (
            <section key={g.id} className="mt-3 rounded-2xl border border-neutral-200 p-4">
              <h3 className="font-display text-base font-semibold text-ink-900">{g.title}</h3>
              {g.hint && <p className="text-xs text-neutral-500">{g.hint}</p>}
              <div role="group" className="mt-3 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <Chip key={item} on={picked.has(storedName(g.id, item))} tone={g.tone} onClick={() => toggle(g.id, item, g.single)}>
                    {item}
                  </Chip>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && q && <p className="mt-6 text-center text-sm text-neutral-500">Nothing matches "{query}".</p>}
        </div>

        <div className="border-t border-neutral-100 px-5 py-3">
          {error && <Alert tone="error" className="mb-2">{error}</Alert>}
          <Button className="w-full" size="lg" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : `Save${flow || picked.size ? ` (${picked.size + (flow ? 1 : 0)})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, tone, onClick, children }: { on: boolean; tone: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95",
        on ? "border-transparent bg-brand-600 text-white shadow-soft" : tone,
      )}
    >
      {children}
    </button>
  );
}
