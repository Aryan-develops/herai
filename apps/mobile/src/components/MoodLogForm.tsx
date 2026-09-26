import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type Mood, type Need } from "../lib/api";
import { NEEDS } from "../lib/phases";
import { Button, Chip, ErrorText } from "./ui";
import { INTENSITY_LABELS, MOOD_OPTIONS } from "./moodOptions";
import { WhenPicker } from "./WhenPicker";
import { colors, radius, shadow } from "../theme";

/** Full mood entry for the Log screen: mood, how much, an optional "I need…" signal and when it happened. */
export function MoodLogForm({ onDone }: { onDone: () => void }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [need, setNeed] = useState<Need | null>(null);
  const [when, setWhen] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!mood) {
      setError("Pick how you're feeling.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createMoodLog({ mood, energy: amount ?? undefined, need: need ?? undefined, loggedAt: when });
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

      <Text style={[styles.label, { marginTop: 18 }]}>How are you feeling?</Text>
      <View style={styles.moods} accessibilityRole="radiogroup">
        {MOOD_OPTIONS.map((m) => {
          const active = mood === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(active ? null : m.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={m.label}
              style={({ pressed }) => [styles.mood, active && styles.moodActive, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={[styles.moodIcon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={20} color={m.fg} />
              </View>
              <Text style={[styles.moodLabel, active && { color: colors.brand700 }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>How much? (optional)</Text>
      <View style={styles.scale}>
        {INTENSITY_LABELS.map((label, i) => {
          const n = i + 1;
          const on = amount === n;
          return (
            <Pressable
              key={label}
              onPress={() => setAmount(on ? null : n)}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${n} of 5`}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.step, on && styles.stepOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.stepNum, on && { color: colors.brand700 }]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{amount ? INTENSITY_LABELS[amount - 1] : "From a little to very much"}</Text>

      <Text style={[styles.label, { marginTop: 18 }]}>Let your partner know (optional)</Text>
      <Text style={styles.hint}>Only people you share your mood with can see this.</Text>
      <View style={styles.chips}>
        {NEEDS.map((n) => (
          <Chip key={n.id} label={n.label} selected={need === n.id} onPress={() => setNeed(need === n.id ? null : n.id)} />
        ))}
      </View>


      <ErrorText>{error}</ErrorText>
      <View style={{ marginTop: 14 }}>
        <Button title={submitting ? "Saving…" : "Save mood"} onPress={submit} loading={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, ...shadow.soft },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mood: { width: "22.5%", minHeight: 68, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral200, backgroundColor: colors.white, paddingVertical: 8 },
  moodActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  moodIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  moodLabel: { fontSize: 11, fontWeight: "600", color: colors.ink700 },
  scale: { flexDirection: "row", gap: 8 },
  step: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  stepOn: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  stepNum: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
});
