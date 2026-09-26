import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type CycleLog, type SymptomEntry } from "../lib/api";
import { Button, Chip, ErrorText, Field, ScreenTitle } from "../components/ui";
import { MoodLogForm } from "../components/MoodLogForm";
import { WhenPicker } from "../components/WhenPicker";
import { DateField } from "../components/DateField";
import { DurationPicker } from "../components/DurationPicker";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

const SEVERITY = ["Mild", "Noticeable", "Moderate", "Severe", "Extreme"];
const QUICK_SYMPTOMS = ["Cramps", "Headache", "Fatigue", "Bloating", "Mood swings", "Nausea", "Back pain", "Cravings"];
const FLOWS: { value: CycleLog["flow"]; label: string }[] = [
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

type Props = NativeStackScreenProps<AppStackParamList, "LogEntry">;

export function LogEntryScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<"symptom" | "cycle" | "mood">(route.params?.tab ?? "symptom");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Log an entry" subtitle="It takes a few seconds and makes your insights sharper." />

      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton active={tab === "symptom"} onPress={() => setTab("symptom")} label="Symptoms" />
        <TabButton active={tab === "cycle"} onPress={() => setTab("cycle")} label="Period" />
        <TabButton active={tab === "mood"} onPress={() => setTab("mood")} label="Mood" />
      </View>

      {tab === "symptom" && <SymptomForm onDone={() => navigation.goBack()} />}
      {tab === "cycle" && <CycleForm onDone={() => navigation.goBack()} />}
      {tab === "mood" && <MoodLogForm onDone={() => navigation.goBack()} />}
    </ScrollView>
  );
}

function TabButton({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
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
    <View style={styles.card}>
      <WhenPicker value={when} onChange={setWhen} />

      <Text style={[styles.label, { marginTop: 18 }]}>How strong is it?</Text>
      <View style={styles.severityRow}>
        {SEVERITY.map((label, i) => {
          const n = i + 1;
          const on = severity === n;
          return (
            <Pressable
              key={n}
              onPress={() => setSeverity(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n}, ${label}`}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.sev, on && styles.sevOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.sevNum, on && styles.sevNumOn]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{SEVERITY[severity - 1]}</Text>

      <Text style={[styles.label, { marginTop: 18 }]}>What are you feeling?</Text>
      <View style={styles.chips}>
        {QUICK_SYMPTOMS.map((s) => {
          const selected = entries.some((e) => e.name.toLowerCase() === s.toLowerCase());
          return (
            <Chip
              key={s}
              label={s}
              selected={selected}
              onPress={() => (selected ? setEntries((es) => es.filter((e) => e.name.toLowerCase() !== s.toLowerCase())) : addEntry(s))}
            />
          );
        })}
      </View>

      <View style={{ marginTop: 14 }}>
        <Field label="Something else?" placeholder="Type a symptom" value={name} onChangeText={setName} onSubmitEditing={() => addEntry()} returnKeyType="done" />
      </View>

      {entries.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {entries.map((entry, i) => (
            <View key={`${entry.name}-${i}`} style={styles.entryRow}>
              <Text style={styles.entryName}>{entry.name}</Text>
              <View style={styles.entryRight}>
                <Text style={styles.entrySeverity}>{SEVERITY[entry.severity - 1]}</Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => setEntries((es) => es.filter((_, idx) => idx !== i))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${entry.name}`}
                >
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginBottom: 14 }}>
        <DurationPicker value={duration} onChange={setDuration} />
      </View>

      <Field label="Notes (optional)" placeholder="Anything else worth noting…" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Save symptoms"} onPress={submit} loading={submitting} />
    </View>
  );
}

function localDay(d: Date) {
  return d.toLocaleDateString("sv");
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${start}T12:00:00`); t <= Date.parse(`${end}T12:00:00`) && out.length < 31; t += 86400000) out.push(localDay(new Date(t)));
  return out;
}

/** Logs a whole period in one go: pick the first and last day, set a flow for each day. */
function CycleForm({ onDone }: { onDone: () => void }) {
  const today = localDay(new Date());
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [flows, setFlows] = useState<Record<string, CycleLog["flow"]>>({});
  const [plen, setPlen] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCycleInsights().then(({ insights }) => setPlen(Math.max(1, Math.min(insights.periodLengthDays || 5, 10)))).catch(() => {});
  }, []);

  const days = start <= end ? daysBetween(start, end) : [];
  const flowFor = (d: string): CycleLog["flow"] => flows[d] ?? "medium";

  async function submit() {
    if (days.length === 0) {
      setError("The last day can't be before the first day.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createPeriodRange(days.map((date) => ({ date, flow: flowFor(date) })));
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <DateField label="First day" value={start} onChange={(d) => { setStart(d); setEnd(localDay(new Date(Date.parse(`${d}T12:00:00`) + (plen - 1) * 86400000))); setFlows({}); }} />
        <DateField label="Last day" value={end} min={start} onChange={setEnd} />
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>Flow each day ({days.length})</Text>
      {days.length > 1 && (
        <View style={[styles.chips, { marginBottom: 10 }]}>
          {FLOWS.map((f) => (
            <Chip key={f.value} label={`All ${f.label.toLowerCase()}`} onPress={() => setFlows(Object.fromEntries(days.map((d) => [d, f.value])))} />
          ))}
        </View>
      )}
      {days.map((d) => (
        <View key={d} style={{ marginBottom: 10 }}>
          <Text style={styles.dayLabel}>{new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</Text>
          <View style={styles.chips}>
            {FLOWS.map((f) => (
              <Chip key={f.value} label={f.label} selected={flowFor(d) === f.value} onPress={() => setFlows((p) => ({ ...p, [d]: f.value }))} />
            ))}
          </View>
        </View>
      ))}
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Save period"} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  tabs: { flexDirection: "row", backgroundColor: colors.neutral200, borderRadius: radius.md, padding: 4, alignSelf: "flex-start" },
  tabButton: { minHeight: 40, paddingHorizontal: 18, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: colors.white, ...shadow.soft },
  tabButtonText: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  tabButtonTextActive: { color: colors.brand700 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, ...shadow.soft },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink900, marginBottom: 10 },
  dayLabel: { fontSize: 13, fontWeight: "600", color: colors.ink700, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  severityRow: { flexDirection: "row", gap: 8 },
  sev: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  sevOn: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  sevNum: { fontSize: 18, fontWeight: "700", color: colors.muted },
  sevNumOn: { color: colors.brand700 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.brand50, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8 },
  entryName: { fontWeight: "600", color: colors.ink900 },
  entryRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  entrySeverity: { fontSize: 13, color: colors.ink700 },
  remove: { color: colors.ink700, fontSize: 16 },
});
