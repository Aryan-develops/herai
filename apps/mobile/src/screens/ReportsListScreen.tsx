import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, type HealthProfile, type HealthReportRecord, type RNFile } from "../lib/api";
import { streamDocumentAnalysis, type DocPipelineEvent } from "../lib/aiDocument";
import { colors } from "../theme";
import type { ReportsStackParamList } from "../navigation/types";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

interface StepState {
  agent: string;
  label: string;
  status: "running" | "done";
}

type Props = NativeStackScreenProps<ReportsStackParamList, "ReportsList">;

/** Ported from apps/web/src/pages/ReportUpload.tsx — file picking replaces
 * drag-and-drop, everything downstream (stream the doc pipeline, then save
 * via api.uploadReport) is the same flow against the same ai-service. */
export function ReportsListScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [reports, setReports] = useState<HealthReportRecord[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "saving">("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.getProfile().then(({ profile }) => setProfile(profile)).catch(() => setProfile(null));
    api.listReports().then(({ reports }) => setReports(reports)).catch(() => setReports([]));
  }, []);

  useFocusEffect(refresh);

  function validate(name: string, mimeType: string | undefined, size: number | undefined): string | null {
    if (!mimeType || !ALLOWED_MIME.includes(mimeType)) {
      return "Unsupported file type — please choose a PDF, JPG, or PNG.";
    }
    if (size && size > MAX_BYTES) {
      return "File is too large — the limit is 10MB.";
    }
    return null;
  }

  async function processFile(file: RNFile, size: number | undefined) {
    const validationError = validate(file.name, file.type, size);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSteps([]);
    setPhase("uploading");

    let finalData: any = null;

    function onEvent(event: DocPipelineEvent) {
      if (event.type === "pipeline_start") {
        setPhase("analyzing");
      } else if (event.type === "agent_step") {
        setSteps((prev) => {
          if (event.status === "start") {
            return [...prev, { agent: event.agent, label: event.label, status: "running" }];
          }
          return prev.map((s) => (s.agent === event.agent ? { ...s, status: "done" } : s));
        });
      } else if (event.type === "final") {
        finalData = event.data;
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    try {
      await streamDocumentAnalysis(file, profile ?? undefined, onEvent);

      if (!finalData) {
        throw new Error("The analysis pipeline didn't return a result.");
      }

      setPhase("saving");
      const { report } = await api.uploadReport(file, finalData);

      api
        .logAgentExecution({
          triggerType: "document",
          triggerRef: report._id,
          agents: finalData.agent_trace ?? [],
          emergency: Boolean(finalData.emergency),
          riskLevel: finalData.risk_assessment?.risk_level,
        })
        .catch(() => {});

      setPhase("idle");
      navigation.navigate("ReportDetail", { id: report._id });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing this report.");
      setPhase("idle");
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await processFile(
      { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" },
      asset.size
    );
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission is needed to attach a lab report photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `report-${Date.now()}.jpg`;
    await processFile({ uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" }, asset.fileSize);
  }

  function chooseSource() {
    Alert.alert("Add a lab report", "Choose a source", [
      { text: "Choose file (PDF/image)", onPress: pickDocument },
      { text: "Choose photo", onPress: pickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const busy = phase !== "idle";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Lab reports</Text>
        <Text style={styles.subtitle}>
          Upload a PDF or photo and the same agent pipeline that powers chat reasons over your
          actual values.
        </Text>

        <Pressable onPress={chooseSource} disabled={busy} style={[styles.uploadBox, busy && styles.disabled]}>
          {busy ? (
            <ActivityIndicator color={colors.brand600} />
          ) : (
            <Text style={styles.uploadText}>＋ Add a report</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {busy && (
          <View style={styles.progressBox}>
            {phase === "uploading" && <Text style={styles.progressText}>Uploading…</Text>}
            {steps.map((s) => (
              <View key={s.agent} style={styles.stepRow}>
                {s.status === "running" ? (
                  <ActivityIndicator size="small" color={colors.brand500} />
                ) : (
                  <Text style={styles.stepDone}>✓</Text>
                )}
                <Text style={styles.stepLabel}>{s.label}</Text>
              </View>
            ))}
            {phase === "saving" && <Text style={styles.progressText}>Saving to your reports…</Text>}
          </View>
        )}

        <Text style={styles.sectionTitle}>Your reports</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={reports ?? []}
        keyExtractor={(r) => r._id}
        ListEmptyComponent={
          reports === null ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : (
            <Text style={styles.muted}>No reports uploaded yet.</Text>
          )
        }
        renderItem={({ item: r }) => (
          <Pressable style={styles.reportCard} onPress={() => navigation.navigate("ReportDetail", { id: r._id })}>
            <View style={styles.reportRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportName} numberOfLines={1}>
                  {r.fileName}
                </Text>
                <Text style={styles.reportDate}>
                  {new Date(r.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              </View>
              {r.emergency ? (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>Urgent</Text>
                </View>
              ) : r.riskAssessment?.risk_level ? (
                <Text style={styles.riskText}>{r.riskAssessment.risk_level} risk</Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 13, color: colors.ink700, marginTop: 4, lineHeight: 18 },
  uploadBox: {
    marginTop: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.neutral300,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  disabled: { opacity: 0.6 },
  uploadText: { color: colors.brand600, fontWeight: "700", fontSize: 15 },
  error: { color: colors.red600, fontSize: 13, marginTop: 10 },
  progressBox: { marginTop: 12, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral200, padding: 12, gap: 6 },
  progressText: { fontSize: 13, color: colors.ink700 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepDone: { color: colors.sage700, fontWeight: "700" },
  stepLabel: { fontSize: 13, color: colors.ink700 },
  sectionTitle: { marginTop: 20, fontSize: 16, fontWeight: "700", color: colors.ink900 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  muted: { color: colors.ink700, fontSize: 13, marginTop: 8 },
  reportCard: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral200, padding: 14 },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reportName: { fontWeight: "600", color: colors.ink900 },
  reportDate: { fontSize: 12, color: colors.ink700, marginTop: 2 },
  urgentBadge: { backgroundColor: colors.red50, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  urgentText: { fontSize: 11, fontWeight: "700", color: colors.red600 },
  riskText: { fontSize: 12, color: colors.ink700, textTransform: "capitalize" },
});
