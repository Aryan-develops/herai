import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiError, type CycleInsights, type CycleLog, type SymptomLog } from "@/lib/api";
import { addDaysKey, dayKey, KIND_STYLE, makeClassifier, type DayKind } from "@/lib/cycleCalendar";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DaySheet } from "@/components/DaySheet";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const LEGEND: DayKind[] = ["period", "predicted-period", "fertile", "ovulation", "pms"];

/** Month and year calendar over every phase and period day. Tap a day to open its log window. */
export function CycleCalendar({ insights, onChanged }: { insights: CycleInsights; onChanged?: () => void }) {
  const now = new Date();
  const [view, setView] = useState<"month" | "year">("month");
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const toast = useToast();
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editing = draft !== null;
  const plen = Math.max(1, Math.min(insights.periodLengthDays || 5, 10));

  const load = useCallback(() => {
    api.listCycleLogs().then(({ logs }) => setCycleLogs(logs)).catch(() => {});
    api.listSymptomLogs().then(({ logs }) => setSymptomLogs(logs)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const cycleByDay = useMemo(() => group(cycleLogs), [cycleLogs]);
  const symByDay = useMemo(() => group(symptomLogs), [symptomLogs]);
  const classify = useMemo(() => makeClassifier(insights, draft ?? new Set(cycleByDay.keys())), [insights, cycleByDay, draft]);
  const todayKey = dayKey(now);

  function startEdit() {
    setView("month");
    setEditError(null);
    setDraft(new Set(cycleByDay.keys()));
  }

  /** Tap a day to add or remove it. A new period (not next to an existing one) fills your usual period length. */
  function toggleDraft(key: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        const adjacent = next.has(addDaysKey(key, -1)) || next.has(addDaysKey(key, 1));
        next.add(key);
        if (!adjacent) for (let i = 1; i < plen; i++) next.add(addDaysKey(key, i));
      }
      return next;
    });
  }

  async function saveEdit() {
    if (!draft) return;
    const before = new Set(cycleByDay.keys());
    const add = [...draft].filter((k) => !before.has(k)).map((date) => ({ date, flow: "medium" as const }));
    const remove = [...before].filter((k) => !draft.has(k));
    if (add.length === 0 && remove.length === 0) {
      setDraft(null);
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await api.createPeriodRange(add, remove);
      toast("Period days saved");
      setDraft(null);
      load();
      onChanged?.();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function shift(delta: number) {
    setCursor((c) => (view === "month" ? { y: c.y + Math.floor((c.m + delta) / 12), m: (c.m + delta + 120) % 12 } : { y: c.y + delta, m: c.m }));
  }

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: "long" });
  const sel = selected ? classify(selected) : null;

  return (
    <section className="mt-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-6" aria-labelledby="cal-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cal-h" className="sr-only">Calendar</h2>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit period dates
          </Button>
        )}
        <div role="tablist" aria-label="Calendar view" className={cn(editing && "hidden", "flex rounded-full bg-neutral-100 p-1 text-sm font-medium")}>
          {(["month", "year"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("min-h-9 cursor-pointer rounded-full px-4 capitalize", view === v ? "bg-white text-ink-900 shadow-soft" : "text-neutral-500")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" aria-label={view === "month" ? "Previous month" : "Previous year"} onClick={() => shift(-1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-display text-base font-semibold text-ink-900">{view === "month" ? `${monthName} ${cursor.y}` : cursor.y}</p>
        <button type="button" aria-label={view === "month" ? "Next month" : "Next year"} onClick={() => shift(1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {editing && (
        <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm text-ink-800" role="status">
          <p className="font-medium">Tap days to add or remove period days. Past and future both work.</p>
          <p className="mt-0.5 text-xs text-ink-700/75">
            Tap the first day of a new period and we fill your usual {plen} days. Then adjust any day.
          </p>
          {editError && <p role="alert" className="mt-1 text-xs text-red-700">{editError}</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save period days"}</Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}

      {view === "month" ? (
        <MonthGrid y={cursor.y} m={cursor.m} classify={classify} todayKey={todayKey} symDays={symByDay} onPick={editing ? toggleDraft : setSelected} />
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 12 }, (_, m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setCursor({ y: cursor.y, m });
                setView("month");
              }}
              className="cursor-pointer rounded-2xl border border-neutral-100 p-2 text-left hover:border-brand-300"
              aria-label={`Open ${new Date(cursor.y, m, 1).toLocaleDateString(undefined, { month: "long" })} ${cursor.y}`}
            >
              <p className="mb-1 text-xs font-semibold text-ink-800">{new Date(cursor.y, m, 1).toLocaleDateString(undefined, { month: "short" })}</p>
              <MonthGrid y={cursor.y} m={m} classify={classify} todayKey={todayKey} symDays={symByDay} mini />
            </button>
          ))}
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-700/75">
        {LEGEND.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-full", KIND_STYLE[k].dot)} aria-hidden="true" />
            {KIND_STYLE[k].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-900" aria-hidden="true" />
          Has symptoms
        </li>
      </ul>
      <p className="mt-2 text-xs text-neutral-500">Days after your last logged period are estimates.</p>

      {selected && sel && (
        <DaySheet
          day={selected}
          cycleDay={sel.cycleDay}
          phaseLabel={sel.kind === "none" ? "No cycle data yet" : `${KIND_STYLE[sel.kind].label}${sel.projected ? " (estimated)" : ""}`}
          cycleLogs={cycleByDay.get(selected) ?? []}
          symptomLogs={symByDay.get(selected) ?? []}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}

function group<T extends { loggedAt: string }>(logs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const l of logs) {
    const k = dayKey(new Date(l.loggedAt));
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  return map;
}

function MonthGrid({
  y, m, classify, todayKey, symDays, onPick, mini,
}: {
  y: number;
  m: number;
  classify: ReturnType<typeof makeClassifier>;
  todayKey: string;
  symDays: Map<string, unknown[]>;
  onPick?: (key: string) => void;
  mini?: boolean;
}) {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <div className={cn("mt-2 grid grid-cols-7", mini ? "gap-0.5" : "mx-auto max-w-md gap-1")}>
      {!mini && WEEKDAYS.map((w, i) => (
        <span key={i} className="pb-1 text-center text-xs font-medium text-neutral-400">{w}</span>
      ))}
      {cells.map((d, i) => {
        if (d === null) return <span key={`e${i}`} />;
        const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const { kind } = classify(key);
        const isToday = key === todayKey;
        const has = symDays.has(key);
        const cls = cn(
          "relative flex items-center justify-center rounded-full tabular",
          mini ? "h-5 text-[10px]" : "aspect-square min-h-10 text-sm font-medium",
          KIND_STYLE[kind].cell,
          isToday && "ring-2 ring-ink-900 ring-offset-1",
        );
        if (mini) return <span key={key} className={cls}>{d}</span>;
        return (
          <button key={key} type="button" onClick={() => onPick?.(key)} aria-label={`${key}${KIND_STYLE[kind].label ? `, ${KIND_STYLE[kind].label}` : ""}${isToday ? ", today" : ""}`} className={cn(cls, "cursor-pointer hover:brightness-95")}>
            {d}
            {has && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", kind === "period" || kind === "ovulation" ? "bg-white" : "bg-ink-900")} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
