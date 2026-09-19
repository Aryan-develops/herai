import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type CycleLog, type SymptomEntry } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { PillSelect } from "../components/PillSelect";
import { colors } from "../theme";
import type { AppStackParamList } from "../navigation/types";

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Extreme"];
const SEVERITY_OPTIONS = ["1", "2", "3", "4", "5"] as const;
const FLOW_OPTIONS = ["spotting", "light", "medium", "heavy"] as const;

type Props = NativeStackScreenProps<AppStackParamList, "LogEntry">;

/** Ported from apps/web/src/pages/LogEntry.tsx. */
export function LogEntryScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"symptom" | "cycle">("symptom");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Log an entry</Text>
      <Text style={styles.subtitle}>Keep your health timeline current.</Text>

      <View style={styles.tabs}>
        <TabButton active={tab === "symptom"} onPress={() => setTab("symptom")} label="Symptom" />
        <TabButton active={tab === "cycle"} onPress={() => setTab("cycle")} label="Cycle" />
      </View>

      {tab === "symptom" ? (
        <SymptomForm onDone={() => navigation.goBack()} />
      ) : (
        <CycleForm onDone={() => navigation.goBack()} />
      )}
    </ScrollView>
  );
}

function TabButton({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SymptomForm({ onDone }: { onDone: () => void }) {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>("3");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addEntry() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEntries((es) => [...es, { name: trimmed, severity: Number(severity) }]);
    setName("");
    setSeverity("3");
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
    <View style={styles.card}>
      <Field label="Symptom" placeholder="e.g. cramps, headache" value={name} onChangeText={setName} />
      <PillSelect label="Severity" value={severity} options={SEVERITY_OPTIONS} onChange={setSeverity} />
      <Button title="Add symptom" variant="outline" onPress={addEntry} />

      {entries.map((entry, i) => (
        <View key={`${entry.name}-${i}`} style={styles.entryRow}>
          <Text style={styles.entryName}>{entry.name}</Text>
          <View style={styles.entryRight}>
            <Text style={styles.entrySeverity}>{SEVERITY_LABEL[entry.severity]}</Text>
            <Pressable
              onPress={() => setEntries((es) => es.filter((_, idx) => idx !== i))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${entry.name}`}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Field label="Notes (optional)" placeholder="Anything else worth noting…" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Log symptoms"} onPress={submit} loading={submitting} />
    </View>
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
    <View style={styles.card}>
      <PillSelect label="Flow" value={flow} options={FLOW_OPTIONS} onChange={setFlow} />
      <Field label="Notes (optional)" placeholder="Anything else worth noting…" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button title={submitting ? "Saving…" : "Log cycle entry"} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink700, marginTop: 4, marginBottom: 16 },
  tabs: { flexDirection: "row", backgroundColor: colors.neutral200, borderRadius: 10, padding: 4, marginBottom: 16, alignSelf: "flex-start" },
  tabButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.white },
  tabButtonText: { fontSize: 13, color: colors.ink700, fontWeight: "500" },
  tabButtonTextActive: { color: colors.ink900 },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral200, padding: 16 },
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.neutral50, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  entryName: { fontWeight: "600", color: colors.ink900 },
  entryRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  entrySeverity: { fontSize: 13, color: colors.ink700 },
  remove: { color: colors.ink700, fontSize: 14 },
});
