import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type CycleInsights, type CycleLog, type SymptomLog } from "../lib/api";
import { addDaysKey, dayKey, makeClassifier, type DayKind } from "../lib/cycleCalendar";
import { CATALOG, FLOW_OPTIONS, storedName, type FlowKey } from "../lib/symptomCatalog";
import { Button, Card, Chip, ErrorText } from "./ui";
import { colors, radius } from "../theme";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const KIND: Record<DayKind, { label: string; bg?: string; fg: string; dashed?: boolean }> = {
  period: { label: "Period", bg: colors.brand500, fg: "#fff" },
  "predicted-period": { label: "Predicted period", bg: colors.brand50, fg: colors.brand500, dashed: true },
  ovulation: { label: "Ovulation", bg: colors.violet700, fg: "#fff" },
  fertile: { label: "Fertile window", bg: colors.violet50, fg: colors.violet700 },
  follicular: { label: "Follicular", fg: colors.ink900 },
  luteal: { label: "Luteal", fg: colors.ink900 },
  pms: { label: "PMS window", bg: colors.peach100, fg: colors.peach600 },
  none: { label: "", fg: colors.ink900 },
};
const LEGEND: DayKind[] = ["period", "predicted-period", "fertile", "ovulation", "pms"];

function group<T extends { loggedAt: string }>(logs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const l of logs) {
    const k = dayKey(new Date(l.loggedAt));
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  return map;
}

/** Month and year calendar over every phase and period day. Tap a day to open its log window. */
export function CycleCalendar({ insights, onChanged }: { insights: CycleInsights; onChanged?: () => void }) {
  const now = new Date();
  const [view, setView] = useState<"month" | "year">("month");
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
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
  const sel = selected ? classify(selected) : null;

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

  return (
    <Card>
      <View style={s.head}>
        <Text style={s.title} accessibilityRole="header">Calendar</Text>
        {!editing && (
          <Pressable onPress={startEdit} accessibilityRole="button" accessibilityLabel="Edit period dates" style={s.editBtn}>
            <Ionicons name="pencil" size={14} color={colors.brand700} />
            <Text style={s.editText}>Edit</Text>
          </Pressable>
        )}
        <View style={[s.toggle, editing && { display: "none" }]}>
          {(["month", "year"] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }} style={[s.toggleBtn, view === v && s.toggleOn]}>
              <Text style={[s.toggleText, view === v && { color: colors.ink900 }]}>{v === "month" ? "Month" : "Year"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.nav}>
        <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Previous" style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.ink900} />
        </Pressable>
        <Text style={s.navTitle}>{view === "month" ? `${monthName} ${cursor.y}` : cursor.y}</Text>
        <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="Next" style={s.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink900} />
        </Pressable>
      </View>

      {editing && (
        <View style={s.editBox}>
          <Text style={s.editTitle}>Tap days to add or remove period days. Past and future both work.</Text>
          <Text style={s.editSub}>Tap the first day of a new period and we fill your usual {plen} days. Then adjust any day.</Text>
          <ErrorText>{editError}</ErrorText>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={saving ? "Saving…" : "Save period days"} onPress={saveEdit} loading={saving} />
            </View>
            <Pressable onPress={() => setDraft(null)} disabled={saving} accessibilityRole="button" style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {view === "month" ? (
        <MonthGrid y={cursor.y} m={cursor.m} classify={classify} todayKey={todayKey} symDays={symByDay} onPick={editing ? toggleDraft : setSelected} />
      ) : (
        <View style={s.year}>
          {Array.from({ length: 12 }, (_, m) => (
            <Pressable
              key={m}
              style={s.miniWrap}
              accessibilityRole="button"
              accessibilityLabel={`Open ${new Date(cursor.y, m, 1).toLocaleDateString(undefined, { month: "long" })}`}
              onPress={() => {
                setCursor({ y: cursor.y, m });
                setView("month");
              }}
            >
              <Text style={s.miniTitle}>{new Date(cursor.y, m, 1).toLocaleDateString(undefined, { month: "short" })}</Text>
              <MonthGrid y={cursor.y} m={m} classify={classify} todayKey={todayKey} symDays={symByDay} mini />
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.legend}>
        {LEGEND.map((k) => (
          <View key={k} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: KIND[k].bg ?? "transparent", borderStyle: KIND[k].dashed ? "dashed" : "solid", borderWidth: KIND[k].dashed ? 1.5 : 0, borderColor: colors.brand500 }]} />
            <Text style={s.legendText}>{KIND[k].label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.note}>Dot = symptoms logged. Days after your last logged period are estimates.</Text>

      {selected && sel && (
        <DaySheet
          day={selected}
          cycleDay={sel.cycleDay}
          phaseLabel={sel.kind === "none" ? "No cycle data yet" : `${KIND[sel.kind].label}${sel.projected ? " (estimated)" : ""}`}
          cycleLogs={cycleByDay.get(selected) ?? []}
          symptomLogs={symByDay.get(selected) ?? []}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
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
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <View style={{ marginTop: 8 }}>
      {!mini && (
        <View style={s.row}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={s.weekday}>{w}</Text>
          ))}
        </View>
      )}
      <View style={s.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={s.cell} />;
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const { kind } = classify(key);
          const k = KIND[kind];
          const isToday = key === todayKey;
          const inner = (
            <View
              style={[
                mini ? s.dayMini : s.day,
                { backgroundColor: k.bg },
                k.dashed && { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand500 },
                isToday && { borderWidth: 2, borderColor: colors.ink900, borderStyle: "solid" },
              ]}
            >
              <Text style={{ fontSize: mini ? 9 : 14, fontWeight: "600", color: k.fg }}>{d}</Text>
              {!mini && symDays.has(key) && <View style={[s.dot, { backgroundColor: k.bg && kind !== "fertile" && kind !== "pms" && kind !== "predicted-period" ? "#fff" : colors.ink900 }]} />}
            </View>
          );
          return mini ? (
            <View key={key} style={s.cellMini}>{inner}</View>
          ) : (
            <Pressable key={key} style={s.cell} onPress={() => onPick?.(key)} accessibilityRole="button" accessibilityLabel={`${key}${k.label ? `, ${k.label}` : ""}${isToday ? ", today" : ""}`}>
              {inner}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DaySheet({
  day, cycleDay, phaseLabel, cycleLogs, symptomLogs, onClose, onChanged,
}: {
  day: string;
  cycleDay: number | null;
  phaseLabel: string;
  cycleLogs: CycleLog[];
  symptomLogs: SymptomLog[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [flow, setFlow] = useState<FlowKey | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const q = query.trim().toLowerCase();
  const groups = CATALOG.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.toLowerCase().includes(q)) })).filter((g) => g.items.length);

  function toggle(groupId: string, item: string, single?: boolean) {
    const name = storedName(groupId, item);
    setPicked((prev) => {
      const next = new Set(prev);
      if (single) CATALOG.find((c) => c.id === groupId)!.items.forEach((i) => next.delete(storedName(groupId, i)));
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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Text style={s.sheetSub}>{cycleDay ? `Cycle day ${cycleDay} · ` : ""}{phaseLabel}</Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={s.navBtn}>
            <Ionicons name="close" size={22} color={colors.ink900} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={s.search}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.muted} style={s.searchInput} accessibilityLabel="Search symptoms" />
          </View>

          {(cycleLogs.length > 0 || symptomLogs.length > 0) && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Logged this day</Text>
              {cycleLogs.map((l) => (
                <View key={l._id} style={s.logRow}>
                  <Text style={s.logText}>{l.flow} flow</Text>
                  <Pressable onPress={() => remove("cycle", l._id)} accessibilityRole="button" accessibilityLabel="Remove flow entry" style={s.navBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
              {symptomLogs.map((l) => (
                <View key={l._id} style={s.logRow}>
                  <Text style={[s.logText, { flex: 1 }]}>{l.symptoms.map((x) => x.name).join(", ")}</Text>
                  <Pressable onPress={() => remove("symptom", l._id)} accessibilityRole="button" accessibilityLabel="Remove symptom entry" style={s.navBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {!q && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Menstrual flow</Text>
              <Text style={s.blockHint}>Estimate your average daily flow</Text>
              <View style={s.chips}>
                {FLOW_OPTIONS.map((f) => (
                  <Chip key={f.key} label={f.label} selected={flow === f.key} onPress={() => setFlow(flow === f.key ? null : f.key)} />
                ))}
              </View>
            </View>
          )}

          {groups.map((g) => (
            <View key={g.id} style={s.block}>
              <Text style={s.blockTitle}>{g.title}</Text>
              {g.hint ? <Text style={s.blockHint}>{g.hint}</Text> : null}
              <View style={s.chips}>
                {g.items.map((item) => (
                  <Chip key={item} label={item} selected={picked.has(storedName(g.id, item))} onPress={() => toggle(g.id, item, g.single)} />
                ))}
              </View>
            </View>
          ))}
          {groups.length === 0 && <Text style={[s.blockHint, { textAlign: "center" }]}>Nothing matches "{query}".</Text>}
        </ScrollView>

        <View style={s.saveBar}>
          <ErrorText>{error}</ErrorText>
          <Button title={saving ? "Saving…" : `Save${flow || picked.size ? ` (${picked.size + (flow ? 1 : 0)})` : ""}`} onPress={save} loading={saving} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.brand50 },
  editText: { fontSize: 13, fontWeight: "700", color: colors.brand700 },
  editBox: { backgroundColor: colors.brand50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brand100, padding: 12, marginTop: 10 },
  editTitle: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  editSub: { fontSize: 12, color: colors.ink700, marginTop: 2 },
  cancelBtn: { minHeight: 48, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  cancelText: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  toggle: { flexDirection: "row", backgroundColor: colors.neutral200, borderRadius: 999, padding: 3 },
  toggleBtn: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  toggleOn: { backgroundColor: colors.white },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  navBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  row: { flexDirection: "row" },
  weekday: { width: "14.2857%", textAlign: "center", fontSize: 12, color: colors.muted, fontWeight: "600", paddingBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", aspectRatio: 1, padding: 2, alignItems: "center", justifyContent: "center" },
  cellMini: { width: "14.2857%", height: 18, alignItems: "center", justifyContent: "center" },
  day: { width: "100%", height: "100%", borderRadius: 999, alignItems: "center", justifyContent: "center" },
  dayMini: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2 },
  year: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  miniWrap: { width: "31%", borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, padding: 6 },
  miniTitle: { fontSize: 12, fontWeight: "700", color: colors.ink900 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: colors.ink700 },
  note: { fontSize: 12, color: colors.muted, marginTop: 8 },
  sheet: { flex: 1, backgroundColor: colors.neutral50 },
  sheetHead: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  sheetSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 999, backgroundColor: colors.neutral200, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink900 },
  block: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 14 },
  blockTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  blockHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  logRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  logText: { fontSize: 14, color: colors.ink900, textTransform: "capitalize" },
  saveBar: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.neutral200, backgroundColor: colors.white },
});
