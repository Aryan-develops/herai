import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type HealthReportRecord } from "../lib/api";
import { SourcesList } from "../components/SourcesList";
import { SuggestedTests } from "../components/SuggestedTests";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme";
import type { ReportsStackParamList } from "../navigation/types";

const STATUS_LABEL: Record<string, string> = {
  in_range: "Normal",
  below_range: "Below range",
  above_range: "Above range",
  critical_low: "Critically low",
  critical_high: "Critically high",
  unparseable: "Could not parse",
};

const STATUS_COLOR: Record<string, string> = {
  in_range: "#059669",
  below_range: "#b45309",
  above_range: "#b45309",
  critical_low: "#dc2626",
  critical_high: "#dc2626",
  unparseable: "#737373",
};

type Props = NativeStackScreenProps<ReportsStackParamList, "ReportDetail">;

/** Ported from apps/web/src/pages/ReportDetail.tsx. The web version's SVG
 * trend chart is summarized as first→last text here rather than pulling in
 * an SVG dependency for a scaffold-stage screen — same underlying data. */
export function ReportDetailScreen({ route, navigation }: Props) {
  const rootNav = useNavigation();
  const { id } = route.params;
  const [report, setReport] = useState<HealthReportRecord | null>(null);
  const [allReports, setAllReports] = useState<HealthReportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getReport(id).then(({ report }) => setReport(report)).catch(() => setError("Couldn't load this report."));
      api.listReports().then(({ reports }) => setAllReports(reports)).catch(() => {});
    }, [id])
  );

  const trends = useMemo(() => {
    if (!report) return [];
    const currentParams = new Set(report.extractedValues.filter((v) => v.value !== null).map((v) => v.parameter));
    const byParam = new Map<string, { date: string; value: number }[]>();

    for (const r of allReports) {
      for (const v of r.extractedValues) {
        if (v.value === null || !currentParams.has(v.parameter)) continue;
        const list = byParam.get(v.parameter) ?? [];
        list.push({ date: r.uploadedAt, value: v.value });
        byParam.set(v.parameter, list);
      }
    }

    return Array.from(byParam.entries())
      .filter(([, points]) => points.length >= 2)
      .map(([parameter, points]) => ({
        parameter,
        points: points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        unit: report.extractedValues.find((v) => v.parameter === parameter)?.unit ?? "",
      }));
  }, [report, allReports]);

  function confirmDelete() {
    if (!report) return;
    Alert.alert("Delete report", `Delete "${report.fileName}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.deleteReport(report._id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  const risk = report.riskAssessment;
  const care = report.carePlan;
  const hasFlagged = report.extractedValues.some((v) => v.status !== "in_range" && v.status !== "unparseable");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.fileName}>{report.fileName}</Text>
        <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel={`Delete report ${report.fileName}`}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      </View>
      <Text style={styles.uploadedAt}>
        Uploaded {new Date(report.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </Text>

      {report.emergency && (
        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>⚠ The Safety Agent flagged this report as urgent</Text>
          <Text style={styles.emergencyBody}>
            One or more values are significantly outside typical ranges. Please seek prompt medical
            attention rather than waiting.
          </Text>
        </View>
      )}

      {report.extractedValues.length > 0 && (
        <View style={styles.card}>
          {report.extractedValues.map((v, i) => (
            <View key={i} style={[styles.valueRow, i > 0 && styles.valueRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.valueParam}>{v.parameter}</Text>
                <Text style={styles.valueRange}>{v.reference_range ?? "—"}</Text>
              </View>
              <Text style={styles.valueNumber}>{v.value !== null ? `${v.value} ${v.unit ?? ""}` : "—"}</Text>
              <Text style={[styles.statusPill, { color: STATUS_COLOR[v.status] ?? colors.ink700 }]}>
                {STATUS_LABEL[v.status] ?? v.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {report.documentIntelligence && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>AI explanation</Text>
            <Text style={styles.confidenceTag}>{report.documentIntelligence.confidence} confidence</Text>
          </View>
          <Text style={styles.bodyText}>{report.documentIntelligence.explanation}</Text>
          {report.documentIntelligence.caveats.map((c, i) => (
            <Text key={i} style={styles.caveat}>
              ⚠ {c}
            </Text>
          ))}
        </View>
      )}

      {trends.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Trends</Text>
          {trends.map(({ parameter, points, unit }) => (
            <View key={parameter} style={styles.trendRow}>
              <Text style={styles.trendLabel}>
                {parameter} {unit && `(${unit})`}
              </Text>
              <Text style={styles.trendValue}>
                {points[0].value} → {points[points.length - 1].value} across {points.length} reports
              </Text>
            </View>
          ))}
        </View>
      )}

      {risk && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Risk assessment</Text>
            <Text style={styles.riskTag}>{risk.risk_level} risk</Text>
          </View>
          {risk.factors.map((f, i) => (
            <Text key={i} style={styles.factorText}>
              • {f.factor}
            </Text>
          ))}
        </View>
      )}

      {hasFlagged && !report.emergency && (
        <SuggestedTests
          reportId={report._id}
          onOpenProvider={(id) => {
            // Reports live in a tab's nested stack; the care screens live on the app stack above the tabs.
            const app = rootNav.getParent()?.getParent() as { navigate: (n: string, p: object) => void } | undefined;
            app?.navigate("CareProvider", { id });
          }}
        />
      )}

      {care && (
        <View style={{ gap: 10 }}>
          <PlanCard title="Today" items={care.today} />
          <PlanCard title="This week" items={care.this_week} />
          <PlanCard title="Discuss with clinician" items={care.discuss_with_clinician} />
        </View>
      )}

      {report.questionsToAsk.length > 0 && (
        <View style={[styles.card, styles.questionsCard]}>
          <Text style={styles.cardHeading}>Questions to ask your doctor</Text>
          {report.questionsToAsk.map((q, i) => (
            <Text key={i} style={styles.bodyText}>
              • {q}
            </Text>
          ))}
        </View>
      )}

      <SourcesList sources={report.sources ?? []} />
    </ScrollView>
  );
}

function PlanCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.planTitle}>{title.toUpperCase()}</Text>
      {items.map((item, i) => (
        <Text key={i} style={styles.bodyText}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral50 },
  error: { color: colors.red600 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fileName: { fontSize: 20, fontWeight: "700", color: colors.ink900, flex: 1 },
  delete: { color: colors.red600, fontSize: 13, fontWeight: "600" },
  uploadedAt: { fontSize: 12, color: colors.ink700 },
  emergencyBox: { backgroundColor: colors.red50, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", padding: 12, gap: 4 },
  emergencyTitle: { fontWeight: "700", color: "#991b1b" },
  emergencyBody: { fontSize: 13, color: "#b91c1c" },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral200, padding: 14, gap: 6 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeading: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  confidenceTag: { fontSize: 11, color: "#6d28d9", fontWeight: "600" },
  riskTag: { fontSize: 12, fontWeight: "700", color: colors.brand600, textTransform: "capitalize" },
  bodyText: { fontSize: 13, color: colors.ink900, lineHeight: 19 },
  caveat: { fontSize: 11, color: colors.ink700 },
  valueRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  valueRowBorder: { borderTopWidth: 1, borderTopColor: colors.neutral200 },
  valueParam: { fontWeight: "600", color: colors.ink900, fontSize: 13 },
  valueRange: { fontSize: 11, color: colors.ink700, marginTop: 1 },
  valueNumber: { fontSize: 13, color: colors.ink700, minWidth: 70, textAlign: "right" },
  statusPill: { fontSize: 11, fontWeight: "700", minWidth: 90, textAlign: "right" },
  trendRow: { paddingVertical: 4 },
  trendLabel: { fontSize: 12, fontWeight: "600", color: colors.ink700 },
  trendValue: { fontSize: 12, color: colors.ink900 },
  factorText: { fontSize: 13, color: colors.ink700 },
  questionsCard: { backgroundColor: colors.brand50, borderColor: colors.brand100 },
  planTitle: { fontSize: 11, fontWeight: "700", color: colors.ink700, letterSpacing: 0.3 },
});
