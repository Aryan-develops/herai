import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PARTNER_PHASE_LOOK } from "../lib/phases";
import { colors, radius, shadow } from "../theme";
import type { PhaseKey } from "../lib/api";

const PHASE_GUIDE: { key: PhaseKey; title: string; say: string[]; avoid: string[] }[] = [
  {
    key: "menstrual",
    title: "During her period",
    say: ["\"Want a heating pad or some tea?\"", "\"Take it easy today, I've got this.\"", "\"Let me know if you need anything.\""],
    avoid: ["Making plans that assume she'll have full energy", "Commenting on mood changes as \"being dramatic\""],
  },
  {
    key: "pms",
    title: "In the PMS window",
    say: ["\"How are you feeling today?\"", "\"No pressure to be social if you're not up for it.\""],
    avoid: ["Dismissing symptoms as \"just PMS\"", "Starting arguments over small things"],
  },
  { key: "follicular", title: "Follicular phase", say: ["Good time to plan something active together"], avoid: [] },
  { key: "ovulation", title: "Fertile window", say: ["Energy and mood are often at their best — a good time for plans"], avoid: [] },
  {
    key: "luteal",
    title: "Luteal phase",
    say: ["\"Let's keep tonight low-key.\"", "Steady meals and sleep help — cooking together can be a small support"],
    avoid: ["Scheduling stressful conversations here if it can wait"],
  },
];

export function GuideScreen() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Guide</Text>
      <Text style={s.subtitle}>How to support her, phase by phase.</Text>

      {PHASE_GUIDE.map((p) => {
        const look = PARTNER_PHASE_LOOK[p.key];
        return (
          <View key={p.key} style={s.card}>
            <View style={s.headRow}>
              <View style={[s.chip, { backgroundColor: look.soft }]}>
                <Text style={[s.chipText, { color: look.text }]}>{p.title}</Text>
              </View>
            </View>
            {p.say.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.sage700} />
                  <Text style={s.sectionLabel}>Try</Text>
                </View>
                {p.say.map((line, i) => (
                  <Text key={i} style={s.bodyText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
            {p.avoid.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.brand600} />
                  <Text style={s.sectionLabel}>Avoid</Text>
                </View>
                {p.avoid.map((line, i) => (
                  <Text key={i} style={s.bodyText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={s.card}>
        <Text style={s.cardTitle}>When to suggest a doctor</Text>
        <Text style={s.bodyText}>• Pain that stops her from normal activity, not relieved by usual pain relief</Text>
        <Text style={s.bodyText}>• Bleeding that soaks through protection every hour for several hours</Text>
        <Text style={s.bodyText}>• Symptoms that feel new, severe, or clearly different from her usual pattern</Text>
        <Text style={s.bodyText}>• She asks you to, or seems worried herself</Text>
        <Text style={s.disclaimer}>
          This guide gives general suggestions based on an estimated cycle phase. It is not medical advice — always defer
          to what she tells you she needs, and to a clinician for anything concerning.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.ink700, marginBottom: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow.soft },
  headRow: { flexDirection: "row" },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "700" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900, marginBottom: 8 },
  section: { marginTop: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.ink700, textTransform: "uppercase", letterSpacing: 0.4 },
  bodyText: { fontSize: 14, color: colors.ink700, lineHeight: 20, marginBottom: 2 },
  disclaimer: { marginTop: 10, fontSize: 11, color: colors.muted, lineHeight: 16 },
});
