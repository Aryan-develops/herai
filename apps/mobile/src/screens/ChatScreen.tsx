import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, type HealthProfile } from "../lib/api";
import { streamChat, type EmergencyEvent, type FinalResult, type PipelineEvent } from "../lib/aiChat";
import { SourcesList } from "../components/SourcesList";
import { GetHelpButton } from "../components/GetHelp";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { CHAT_LANGUAGES, loadChatLanguage, saveChatLanguage } from "../lib/chatLanguages";
import { colors } from "../theme";

/** Ported from apps/web/src/pages/Chat.tsx — same Turn/StepState model and
 * the same applyEvent reducer over the same SSE event stream; only the
 * rendering is native. */

interface StepState {
  agent: string;
  label: string;
  status: "running" | "done";
  duration_ms?: number;
}

interface Turn {
  id: string;
  userMessage: string;
  status: "streaming" | "done" | "error";
  steps: StepState[];
  emergency?: EmergencyEvent["data"];
  result?: FinalResult;
  error?: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "#059669",
  moderate: "#b45309",
  high: "#c2410c",
  urgent: "#dc2626",
};

const SUGGESTIONS = [
  "I've been really tired for the past two weeks",
  "My cycles have been irregular for a few months",
  "I've had a mild headache on and off for three days",
];

function applyEvent(turn: Turn, event: PipelineEvent): Turn {
  switch (event.type) {
    case "pipeline_start":
      return turn;
    case "agent_step":
      if (event.status === "start") {
        return { ...turn, steps: [...turn.steps, { agent: event.agent, label: event.label, status: "running" }] };
      }
      return {
        ...turn,
        steps: turn.steps.map((s) =>
          s.agent === event.agent ? { ...s, status: "done", duration_ms: event.duration_ms } : s
        ),
      };
    case "emergency":
      return { ...turn, emergency: event.data };
    case "final":
      return { ...turn, status: "done", result: event.data };
    case "error":
      return { ...turn, status: "error", error: event.message };
    default:
      return turn;
  }
}

function StepRow({ step }: { step: StepState }) {
  return (
    <View style={styles.stepRow}>
      {step.status === "running" ? (
        <ActivityIndicator size="small" color={colors.brand500} />
      ) : (
        <Text style={styles.stepDone}>✓</Text>
      )}
      <Text style={step.status === "running" ? styles.stepLabelActive : styles.stepLabel}>{step.label}</Text>
      {step.status === "done" && step.duration_ms !== undefined && (
        <Text style={styles.stepDuration}>{Math.round(step.duration_ms)}ms</Text>
      )}
    </View>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {items.map((item, i) => (
        <View key={i} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PlanColumn({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.planColumn}>
      <Text style={styles.planTitle}>{title}</Text>
      {items.map((item, i) => (
        <Text key={i} style={styles.planItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

function EmergencyBanner({ data }: { data: EmergencyEvent["data"] }) {
  return (
    <View style={styles.emergencyBox}>
      <Text style={styles.emergencyTitle}>⚠ Emergency care may be needed</Text>
      <Text style={styles.emergencyBody}>{data.message}</Text>
      <Text style={styles.emergencyAction}>{data.recommended_action}</Text>
    </View>
  );
}

function ReplyResult({ result, onFollowUp, onFindCare }: { result: FinalResult; onFollowUp: (q: string) => void; onFindCare: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.bodyText}>{result.reply}</Text>

      {result.suggest_help && (
        <View style={styles.helpNudge}>
          <Text style={[styles.bodyText, { flex: 1 }]}>This might be worth checking with a clinician.</Text>
          <GetHelpButton onFindCare={onFindCare} />
        </View>
      )}

      {result.follow_up_questions.length > 0 && (
        <View style={styles.chipRow}>
          {result.follow_up_questions.map((q, i) => (
            <Pressable key={i} onPress={() => onFollowUp(q)} accessibilityRole="button" style={({ pressed }) => [styles.followUpChip, pressed && { opacity: 0.7 }]}>
              <Text style={styles.followUpText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SourcesList sources={result.sources ?? []} />
    </View>
  );
}

function AssistantResult({ result, onFollowUp }: { result: FinalResult; onFollowUp: (q: string) => void }) {
  const riskLevel = result.risk_assessment?.risk_level ?? result.symptom_analysis?.risk_level;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.badgeRow}>
        {result.confidence !== null && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{Math.round(result.confidence * 100)}% confidence</Text>
          </View>
        )}
        {riskLevel && (
          <View style={[styles.riskBadge, { backgroundColor: (RISK_COLORS[riskLevel] ?? "#737373") + "22" }]}>
            <Text style={[styles.riskText, { color: RISK_COLORS[riskLevel] ?? colors.ink700 }]}>{riskLevel} risk</Text>
          </View>
        )}
      </View>

      {result.reply ? <Text style={styles.bodyText}>{result.reply}</Text> : null}

      {result.symptom_analysis && (
        <View>
          <Text style={styles.bodyText}>{result.symptom_analysis.summary}</Text>
          {result.symptom_analysis.possible_factors.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionLabel}>MAY BE ASSOCIATED WITH</Text>
              <ChipList items={result.symptom_analysis.possible_factors} />
            </View>
          )}
        </View>
      )}

      {result.womens_health?.relevant && (
        <View style={styles.womensHealthBox}>
          <Text style={styles.bodyText}>{result.womens_health.summary}</Text>
          {result.womens_health.indicators.map((ind, i) => (
            <Text key={i} style={styles.indicatorText}>
              <Text style={styles.indicatorPattern}>{ind.pattern}: </Text>
              {ind.note}
            </Text>
          ))}
        </View>
      )}

      {result.risk_assessment && result.risk_assessment.factors.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>WHY THIS RISK LEVEL</Text>
          {result.risk_assessment.factors.map((f, i) => (
            <Text key={i} style={styles.factorText}>
              • {f.factor}
            </Text>
          ))}
        </View>
      )}

      {result.care_plan && (
        <View style={{ gap: 8 }}>
          <PlanColumn title="TODAY" items={result.care_plan.today} />
          <PlanColumn title="THIS WEEK" items={result.care_plan.this_week} />
          <PlanColumn title="DISCUSS WITH CLINICIAN" items={result.care_plan.discuss_with_clinician} />
        </View>
      )}

      {result.follow_up_questions.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>FOLLOW-UP QUESTIONS</Text>
          <View style={styles.chipRow}>
            {result.follow_up_questions.map((q, i) => (
              <Pressable key={i} onPress={() => onFollowUp(q)} style={styles.followUpChip}>
                <Text style={styles.followUpText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <SourcesList sources={result.sources ?? []} />

      <Text style={styles.disclaimer}>{result.disclaimer}</Text>
    </View>
  );
}

export function ChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [cycle, setCycle] = useState<{ phase?: string; day?: number }>({});
  const [language, setLanguage] = useState(loadChatLanguage);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);

  useEffect(() => {
    api.getProfile().then(({ profile }) => setProfile(profile)).catch(() => setProfile(null));
    api
      .getCycleInsights()
      .then(({ insights }) => setCycle({ phase: insights.subPhase ?? insights.phase ?? undefined, day: insights.currentCycleDay ?? undefined }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (turns.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [turns]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    const id = `${Date.now()}-${Math.random()}`;
    setTurns((prev) => [...prev, { id, userMessage: trimmed, status: "streaming", steps: [] }]);
    setInput("");
    setBusy(true);

    try {
      const history = turns.slice(-6).flatMap((t) => {
        const text = t.result?.reply ?? t.result?.symptom_analysis?.summary;
        return text
          ? [
              { role: "user" as const, content: t.userMessage },
              { role: "assistant" as const, content: text },
            ]
          : [{ role: "user" as const, content: t.userMessage }];
      });
      const healthProfile = { ...(profile ?? {}), name: user?.name, cyclePhase: cycle.phase, cycleDay: cycle.day };
      await streamChat({ message: trimmed, healthProfile, history, language }, (event) => {
        setTurns((prev) => prev.map((t) => (t.id === id ? applyEvent(t, event) : t)));
        if (event.type === "final") {
          api
            .logAgentExecution({
              triggerType: "chat",
              agents: event.data.agent_trace,
              emergency: event.data.emergency,
              riskLevel: event.data.risk_assessment?.risk_level,
            })
            .catch(() => {});
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong reaching the AI service.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: message } : t)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList<Turn>
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={turns}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View style={styles.intro}>
            <LinearGradient colors={[colors.brand500, colors.brand600, "#7c4dd6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.orb}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle} accessibilityRole="header">Ask Lunee</Text>
                  <Text style={styles.heroSub}>
                    {user?.name ? `Hi ${user.name.split(" ")[0]}, ` : ""}ask about your cycle, symptoms or reports.
                  </Text>
                </View>
                <GetHelpButton onFindCare={(type) => navigation.navigate("Care", type ? { type } : undefined)} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langRow} accessibilityLabel="Reply language">
                {CHAT_LANGUAGES.map((l) => {
                  const on = language === l.code;
                  return (
                    <Pressable
                      key={l.code}
                      onPress={() => {
                        setLanguage(l.code);
                        saveChatLanguage(l.code);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.langChip, on && styles.langChipOn]}
                    >
                      <Text style={[styles.langText, on && styles.langTextOn]}>{l.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </LinearGradient>
            {turns.length === 0 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestHint}>Type in any language. Or tap one:</Text>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => send(s)} style={styles.suggestionChip}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item: turn }) => (
          <View style={styles.turn}>
            <View style={styles.userRow}>
              <LinearGradient colors={[colors.brand500, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.userBubble}>
                <Text style={styles.userText}>{turn.userMessage}</Text>
              </LinearGradient>
            </View>

            <View style={styles.assistantBubble}>
              {turn.emergency && <EmergencyBanner data={turn.emergency} />}

              {turn.status === "error" && <Text style={styles.errorText}>⚠ {turn.error}</Text>}

              {turn.result && !turn.result.emergency && turn.result.kind === "reply" && (
                <ReplyResult result={turn.result} onFollowUp={(q) => send(q)} onFindCare={() => navigation.navigate("Care")} />
              )}
              {turn.result && !turn.result.emergency && turn.result.kind !== "reply" && (
                <AssistantResult result={turn.result} onFollowUp={(q) => send(q)} />
              )}

              {turn.status === "streaming" && !turn.result && (
                <View style={styles.stepRow}>
                  <ActivityIndicator size="small" color={colors.ink700} />
                  <Text style={styles.stepLabel}>{turn.steps.length > 0 ? turn.steps[turn.steps.length - 1].label : "Lunee is typing"}…</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything…"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Message to Lunee"
          multiline
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: busy || !input.trim(), busy }}
          style={[styles.sendButton, (busy || !input.trim()) && styles.sendButtonDisabled]}
        >
          <LinearGradient colors={[colors.brand500, "#7c4dd6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendFill}>
            {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="send" size={18} color={colors.onBrand} />}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8 },
  intro: { marginBottom: 12 },
  hero: { borderRadius: 24, padding: 16, gap: 14, overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  orb: { width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2, lineHeight: 18 },
  langRow: { gap: 8, paddingRight: 8 },
  langChip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" },
  langChipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  langText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  langTextOn: { color: "#ac1a55" },
  suggestHint: { fontSize: 13, color: colors.ink700 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 13, color: colors.ink700, marginTop: 4, lineHeight: 18 },
  suggestions: { marginTop: 14, gap: 8 },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    alignSelf: "flex-start",
  },
  suggestionText: { fontSize: 12, color: colors.ink700 },
  turn: { marginBottom: 16, gap: 8 },
  userRow: { alignItems: "flex-end" },
  userBubble: { maxWidth: "82%", borderRadius: 18, borderTopRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { color: colors.onBrand, fontSize: 14 },
  assistantBubble: {
    maxWidth: "90%",
    backgroundColor: colors.brand50,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.brand100,
    padding: 14,
  },
  stepsBox: { gap: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral200, paddingBottom: 10, marginBottom: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepDone: { color: colors.sage700, fontWeight: "700" },
  stepLabel: { fontSize: 13, color: colors.ink700 },
  stepLabelActive: { fontSize: 13, color: colors.ink900, fontWeight: "600" },
  stepDuration: { fontSize: 11, color: colors.muted, marginLeft: "auto" },
  errorText: { color: colors.red600, fontSize: 13 },
  badgeRow: { flexDirection: "row", gap: 8 },
  confidenceBadge: { backgroundColor: colors.brand50, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 11, fontWeight: "700", color: colors.brand600 },
  riskBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  riskText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  bodyText: { fontSize: 14, color: colors.ink900, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.ink700, marginBottom: 6, letterSpacing: 0.3 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: colors.violet50, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, color: colors.violet700, fontWeight: "600" },
  womensHealthBox: { backgroundColor: colors.brand50, borderRadius: 12, padding: 10, gap: 4 },
  indicatorText: { fontSize: 12, color: colors.ink700 },
  indicatorPattern: { fontWeight: "700", color: colors.brand600 },
  factorText: { fontSize: 13, color: colors.ink700, marginBottom: 2 },
  planColumn: { backgroundColor: colors.neutral50, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral200, padding: 10 },
  planTitle: { fontSize: 10, fontWeight: "700", color: colors.ink700, marginBottom: 6, letterSpacing: 0.3 },
  planItem: { fontSize: 13, color: colors.ink900, marginBottom: 2 },
  followUpChip: { borderWidth: 1, borderColor: colors.brand100, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  followUpText: { fontSize: 12, color: colors.brand600, fontWeight: "600" },
  helpNudge: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.brand50, borderRadius: 14, padding: 12 },
  disclaimer: { fontSize: 11, color: colors.muted, fontStyle: "italic" },
  emergencyBox: { backgroundColor: colors.red50, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", padding: 12, gap: 4 },
  emergencyTitle: { fontWeight: "700", color: "#991b1b" },
  emergencyBody: { fontSize: 13, color: "#b91c1c" },
  emergencyAction: { fontSize: 13, fontWeight: "600", color: "#991b1b" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink900,
  },
  sendButton: { height: 44, width: 44, borderRadius: 14, overflow: "hidden" },
  sendFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: colors.onBrand, fontSize: 16 },
});
