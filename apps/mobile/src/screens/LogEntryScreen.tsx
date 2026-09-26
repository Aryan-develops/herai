import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type CycleLog, type SymptomEntry } from "../lib/api";
import { Button, Chip, ErrorText, Field, ScreenTitle } from "../components/ui";
import { MoodLogForm } from "../components/MoodLogForm";
import { WhenPicker } from "../components/WhenPicker";
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

export function LogEntryScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"symptom" | "cycle" | "mood">("symptom");

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
      await api.createSymptomLog({ symptoms: pending, notes: notes || undefined, loggedAt: when });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>How strong is it?</Text>
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
        <WhenPicker value={when} onChange={setWhen} />
      </View>

      <Field label="Notes (optional)" placeholder="Anything else worth noting…" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Save symptoms"} onPress={submit} loading={submitting} />
    </View>
  );
}

function CycleForm({ onDone }: { onDone: () => void }) {
  const [flow, setFlow] = useState<CycleLog["flow"]>("medium");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.createCycleLog({ flow, notes: notes || undefined, loggedAt: when });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>How's your flow?</Text>
      <View style={styles.chips}>
        {FLOWS.map((f) => (
          <Chip key={f.value} label={f.label} selected={flow === f.value} onPress={() => setFlow(f.value)} />
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <WhenPicker value={when} onChange={setWhen} />
      </View>
      <View style={{ marginTop: 16 }}>
        <Field label="Notes (optional)" placeholder="Cramps, mood, anything worth noting…" value={notes} onChangeText={setNotes} multiline />
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Save period entry"} onPress={submit} loading={submitting} />
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
