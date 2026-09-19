import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type CycleInsights } from "../lib/api";
import { colors } from "../theme";

const PHASE_LABEL: Record<NonNullable<CycleInsights["phase"]>, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation window",
  luteal: "Luteal",
};

const PHASE_COLORS: Record<NonNullable<CycleInsights["phase"]>, { bg: string; text: string }> = {
  menstrual: { bg: colors.brand100, text: colors.brand600 },
  follicular: { bg: colors.emerald50, text: colors.emerald700 },
  ovulation: { bg: colors.violet50, text: colors.violet700 },
  luteal: { bg: colors.amber50, text: colors.amber900 },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Ported from apps/web/src/pages/Cycle.tsx. */
export function CycleScreen() {
  const [insights, setInsights] = useState<CycleInsights | null>(null);

  const load = useCallback(() => {
    api.getCycleInsights().then(({ insights }) => setInsights(insights));
  }, []);

  useFocusEffect(load);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cycle</Text>
      <Text style={styles.subtitle}>Predictions estimated from your logged periods — not a diagnosis.</Text>

      {insights === null && <Text style={styles.muted}>Loading…</Text>}

      {insights && !insights.lastPeriodStart && (
        <View style={styles.emptyCard}>
          <Text style={styles.muted}>
            Log a period entry (or set your last period date in your profile) to see cycle predictions.
          </Text>
        </View>
      )}

      {insights && insights.lastPeriodStart && (
        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current phase</Text>
            {insights.phase && (
              <View style={[styles.badge, { backgroundColor: PHASE_COLORS[insights.phase].bg }]}>
                <Text style={[styles.badgeText, { color: PHASE_COLORS[insights.phase].text }]}>
                  {PHASE_LABEL[insights.phase]}
                </Text>
              </View>
            )}
            <Text style={styles.bigNumber}>
              Day {insights.currentCycleDay}
              <Text style={styles.bigNumberSuffix}> of {insights.cycleLengthDays}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Predicted next period</Text>
            <Text style={styles.bigDate}>
              {insights.predictedNextPeriodStart ? formatDate(insights.predictedNextPeriodStart) : "—"}
            </Text>
            {insights.fertileWindow && (
              <Text style={styles.fertile}>
                Fertile window: {formatDate(insights.fertileWindow.start)} – {formatDate(insights.fertileWindow.end)}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Cycle regularity</Text>
              <Text style={styles.regularity}>{insights.regularity.replace("_", " ")}</Text>
            </View>
            {insights.cycleHistory.length > 0 ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                {insights.cycleHistory
                  .slice(-6)
                  .reverse()
                  .map((c) => (
                    <View key={c.start} style={styles.historyRow}>
                      <Text style={styles.historyText}>Started {formatDate(c.start)}</Text>
                      <Text style={styles.historyLength}>{c.lengthDays}-day cycle</Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text style={styles.muted}>Log at least two periods to see your cycle-length history.</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink700, marginTop: 4 },
  muted: { color: colors.ink700, fontSize: 13, marginTop: 12 },
  emptyCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.neutral300,
    padding: 24,
  },
  cards: { marginTop: 16, gap: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 16,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: colors.ink700 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  badgeText: { fontSize: 13, fontWeight: "700" },
  bigNumber: { fontSize: 26, fontWeight: "700", color: colors.ink900, marginTop: 10 },
  bigNumberSuffix: { fontSize: 15, fontWeight: "400", color: colors.ink700 },
  bigDate: { fontSize: 22, fontWeight: "700", color: colors.ink900, marginTop: 8 },
  fertile: { marginTop: 8, fontSize: 13, color: colors.ink700 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  regularity: { fontSize: 12, fontWeight: "600", color: colors.ink700, textTransform: "capitalize" },
  historyRow: { flexDirection: "row", justifyContent: "space-between" },
  historyText: { fontSize: 13, color: colors.ink700 },
  historyLength: { fontSize: 13, fontWeight: "600", color: colors.ink900 },
});
