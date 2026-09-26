import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type CycleInsights } from "../lib/api";
import { PHASE_STYLE, shortDate } from "../lib/phases";
import { Card, Notice, ScreenTitle } from "../components/ui";
import { CycleCalendar } from "../components/CycleCalendar";
import { CycleHero } from "../components/CycleHero";
import { colors, radius } from "../theme";

const REGULARITY: Record<CycleInsights["regularity"], { label: string; bg: string; fg: string }> = {
  regular: { label: "Regular", bg: colors.sage100, fg: colors.sage700 },
  irregular: { label: "Irregular", bg: colors.amber50, fg: colors.amber900 },
  insufficient_data: { label: "Still learning", bg: colors.neutral200, fg: colors.ink700 },
};

export function CycleScreen() {
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .getCycleInsights()
      .then(({ insights }) => setInsights(insights))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const ready = insights && insights.lastPeriodStart && insights.phase && insights.currentCycleDay;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenTitle title="Your cycle" subtitle="Estimates from your logged periods. Not a diagnosis." />

      {insights && <CycleCalendar insights={insights} onChanged={load} />}

      <CycleHero insights={insights} loading={loading} />

      {ready && insights.phase && (
        <>
          <Notice tone="warning">{PHASE_STYLE[insights.phase].tip}</Notice>

          <View style={styles.dates}>
            <DateCard label="Next period" value={insights.predictedNextPeriodStart ? shortDate(insights.predictedNextPeriodStart) : "—"} />
            <DateCard
              label="Fertile window"
              value={insights.fertileWindow ? `${shortDate(insights.fertileWindow.start)} – ${shortDate(insights.fertileWindow.end)}` : "—"}
            />
            <DateCard label="Est. ovulation" value={insights.ovulationDate ? shortDate(insights.ovulationDate) : "—"} />
          </View>

          <Card>
            <View style={styles.histHeader}>
              <Text style={styles.cardTitle} accessibilityRole="header">
                Cycle history
              </Text>
              <View style={[styles.pill, { backgroundColor: REGULARITY[insights.regularity].bg }]}>
                <Text style={[styles.pillText, { color: REGULARITY[insights.regularity].fg }]}>{REGULARITY[insights.regularity].label}</Text>
              </View>
            </View>
            {insights.cycleHistory.length > 0 ? (
              <View style={{ marginTop: 12, gap: 12 }}>
                {insights.cycleHistory
                  .slice(-6)
                  .reverse()
                  .map((c) => (
                    <View key={c.start}>
                      <View style={styles.histRow}>
                        <Text style={styles.histText}>Started {shortDate(c.start)}</Text>
                        <Text style={styles.histLength}>{c.lengthDays} days</Text>
                      </View>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${Math.min(100, (c.lengthDays / 45) * 100)}%` }]} />
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <Text style={styles.muted}>Log at least two periods to see how your cycle length varies.</Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function DateCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateCard}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  muted: { color: colors.muted, fontSize: 13, marginTop: 10 },
  dates: { flexDirection: "row", gap: 10 },
  dateCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 12,
  },
  dateLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  dateValue: { fontSize: 15, fontWeight: "700", color: colors.ink900, marginTop: 4 },
  histHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  histRow: { flexDirection: "row", justifyContent: "space-between" },
  histText: { fontSize: 13, color: colors.ink700 },
  histLength: { fontSize: 13, fontWeight: "700", color: colors.ink900 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.neutral200, marginTop: 6, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.brand500 },
});
