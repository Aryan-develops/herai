import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CycleInsights } from "../lib/api";
import { PHASE_STYLE, shortDate } from "../lib/phases";
import { colors, radius, shadow } from "../theme";

/** Phase-coloured hero card: current phase, day-progress bar, next period. */
export function CycleHero({
  insights,
  loading,
  onPress,
}: {
  insights: CycleInsights | null;
  loading: boolean;
  onPress?: () => void;
}) {
  if (loading) return <View style={[styles.hero, { backgroundColor: colors.neutral200, minHeight: 150 }]} />;

  if (!insights || !insights.lastPeriodStart || !insights.phase || !insights.currentCycleDay) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.empty, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.emptyTitle}>Start tracking your cycle</Text>
        <Text style={styles.emptyBody}>Log your period to see your phase and predictions here.</Text>
      </Pressable>
    );
  }

  const style = PHASE_STYLE[insights.phase];
  const pct = Math.min(1, insights.currentCycleDay / insights.cycleLengthDays);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "summary"}
      accessibilityLabel={`${style.label}, day ${insights.currentCycleDay} of ${insights.cycleLengthDays}`}
      style={({ pressed }) => [styles.hero, { backgroundColor: style.solid }, pressed && { opacity: 0.92 }]}
    >
      <Text style={styles.eyebrow}>RIGHT NOW</Text>
      <Text style={styles.phase}>{style.label}</Text>
      <Text style={styles.blurb}>{style.blurb}</Text>

      <View style={styles.trackRow}>
        <Text style={styles.dayText}>Day {insights.currentCycleDay}</Text>
        <Text style={styles.dayOf}>of {insights.cycleLengthDays}</Text>
      </View>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      {insights.predictedNextPeriodStart ? (
        <Text style={styles.next}>Next period around {shortDate(insights.predictedNextPeriodStart)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, ...shadow.soft },
  eyebrow: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  phase: { color: colors.onBrand, fontSize: 28, fontWeight: "700", marginTop: 2 },
  blurb: { color: "rgba(255,255,255,0.92)", fontSize: 14, marginTop: 4, lineHeight: 20 },
  trackRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 16 },
  dayText: { color: colors.onBrand, fontSize: 18, fontWeight: "700" },
  dayOf: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.28)", marginTop: 8, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.white },
  next: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 10 },
  empty: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand500,
    backgroundColor: colors.brand50,
    padding: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  emptyBody: { fontSize: 13, color: colors.ink700, marginTop: 4 },
});
