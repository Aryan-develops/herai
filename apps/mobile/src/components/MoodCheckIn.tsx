import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type Mood, type MoodInsight, type Need } from "../lib/api";
import { NEEDS } from "../lib/phases";
import { Button, Chip, ErrorText } from "./ui";
import { INTENSITY_LABELS, MOOD_OPTIONS, moodOption } from "./moodOptions";
import { colors, radius, shadow } from "../theme";

/** One-tap daily check-in. The optional "I need…" signal is the most useful thing a partner can see. */
export function MoodCheckIn() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [need, setNeed] = useState<Need | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMood, setSavedMood] = useState<Mood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<MoodInsight | null>(null);

  useEffect(() => {
    api
      .listMoodLogs(1)
      .then(({ moods }) => {
        const latest = moods[0];
        if (latest && Date.now() - new Date(latest.loggedAt).getTime() < 12 * 3600 * 1000) setSavedMood(latest.mood);
      })
      .catch(() => {});
    api.moodInsights().then(setInsight).catch(() => {});
  }, []);

  async function save() {
    if (!mood) return;
    setSaving(true);
    setError(null);
    try {
      await api.createMoodLog({ mood, energy: energy ?? undefined, need: need ?? undefined });
      setSavedMood(mood);
      setMood(null);
      setEnergy(null);
      setNeed(null);
      api.moodInsights().then(setInsight).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const saved = savedMood ? moodOption(savedMood) : null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">How are you feeling?</Text>
          <Text style={styles.sub}>A quick check-in helps you spot patterns.</Text>
        </View>
        {saved && !mood && (
          <View style={[styles.savedPill, { backgroundColor: saved.bg }]}>
            <Ionicons name="checkmark" size={13} color={saved.fg} />
            <Text style={[styles.savedText, { color: saved.fg }]}>{saved.label}</Text>
          </View>
        )}
      </View>

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

      {mood && (
        <View style={{ gap: 14, marginTop: 14 }}>
          <View>
            <Text style={styles.label}>How much? (optional)</Text>
            <View style={styles.energyRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setEnergy(energy === n ? null : n)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: energy === n }}
                  accessibilityLabel={`${INTENSITY_LABELS[n - 1]}, ${n} of 5`}
                  style={[styles.energy, energy === n && styles.energyActive]}
                >
                  <Text style={[styles.energyText, energy === n && { color: colors.brand700 }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>{energy ? INTENSITY_LABELS[energy - 1] : "From a little to very much"}</Text>
          </View>
          <View>
            <Text style={styles.label}>Let your partner know (optional)</Text>
            <Text style={styles.hint}>Only people you share your mood with can see this.</Text>
            <View style={styles.needs}>
              {NEEDS.map((n) => (
                <Chip key={n.id} label={n.label} selected={need === n.id} onPress={() => setNeed(need === n.id ? null : n.id)} />
              ))}
            </View>
          </View>
          <ErrorText>{error}</ErrorText>
          <Button title={saving ? "Saving…" : "Save check-in"} onPress={save} loading={saving} />
        </View>
      )}

      {insight?.insight && (
        <View style={styles.insight}>
          <Ionicons name="sparkles" size={15} color={colors.violet700} />
          <Text style={styles.insightText}>{insight.insight.message}</Text>
        </View>
      )}
      {insight && !insight.ready && (insight.needed ?? 0) > 0 && (
        <Text style={styles.hint}>Log {insight.needed} more check-in{insight.needed === 1 ? "" : "s"} to unlock mood patterns.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  savedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  savedText: { fontSize: 12, fontWeight: "700" },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  mood: { width: "22.5%", minHeight: 68, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral200, backgroundColor: colors.white, paddingVertical: 8 },
  moodActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  moodIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  moodLabel: { fontSize: 11, fontWeight: "600", color: colors.ink700 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  energyRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  energy: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  energyActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  energyText: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
  needs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  insight: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, backgroundColor: colors.violet50, borderRadius: radius.md, padding: 12 },
  insightText: { flex: 1, fontSize: 13, color: colors.violet700, lineHeight: 19 },
});
