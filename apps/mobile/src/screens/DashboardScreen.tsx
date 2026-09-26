import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type CycleInsights, type InsightCard } from "../lib/api";
import { PHASE_STYLE, shortDate } from "../lib/phases";
import { addDaysKey, dayKey } from "../lib/cycleCalendar";
import { usePrefs } from "../context/PrefsContext";
import { GetHelpButton } from "../components/GetHelp";
import { ErrorText } from "../components/ui";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList, MainTabsParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabsParamList, "Dashboard">;

/** Today: one status, one action, three dates, one check-in. Everything else lives in its own tab. */
export function DashboardScreen({ navigation }: Props) {
  const stack = () => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const { prefs } = usePrefs();
  const language = prefs?.language;
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<InsightCard | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getCycleInsights()
      .then(({ insights }) => setInsights(insights))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      api.dailyInsights(language).then(({ cards }) => setCard(cards[0] ?? null)).catch(() => {});
    }, [load, language]),
  );

  const tracking = !!insights?.lastPeriodStart && !!insights.phase && !!insights.currentCycleDay;
  const onPeriod = tracking && insights!.phase === "menstrual";

  async function periodStarted() {
    const plen = Math.max(1, Math.min(insights?.periodLengthDays || 5, 10));
    const today = dayKey(new Date());
    setStarting(true);
    setError(null);
    try {
      await api.createPeriodRange(Array.from({ length: plen }, (_, i) => ({ date: addDaysKey(today, i), flow: "medium" as const })));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[colors.brand100, colors.violet50, colors.neutral50]} style={s.hero}>
        <View style={s.topBar}>
          <Pressable onPress={() => stack()?.navigate("Settings")} accessibilityRole="button" accessibilityLabel="Settings" style={s.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={colors.ink900} />
          </Pressable>
          <GetHelpButton onFindCare={(type) => stack()?.navigate("Care", type ? { type } : undefined)} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand600} style={{ marginVertical: 48 }} />
        ) : tracking ? (
          <Status insights={insights!} />
        ) : (
          <View style={s.status}>
            <Text style={s.phase}>Welcome to Lunee</Text>
            <Text style={s.big}>Let's start</Text>
            <Text style={s.small}>Log your last period to see your cycle.</Text>
          </View>
        )}

        <Pressable
          onPress={onPeriod ? () => stack()?.navigate("LogEntry", { tab: "cycle" }) : periodStarted}
          disabled={starting || loading}
          accessibilityRole="button"
          style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          {starting ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="water" size={18} color={colors.onBrand} />}
          <Text style={s.ctaText}>{onPeriod ? "Log today's flow" : starting ? "Saving…" : tracking ? "Period started" : "My period started today"}</Text>
        </Pressable>
        {!tracking && !loading && (
          <Pressable onPress={() => navigation.navigate("Cycle")} accessibilityRole="link" style={{ marginTop: 12 }}>
            <Text style={s.link}>It started earlier? Pick dates on the calendar</Text>
          </Pressable>
        )}
        <ErrorText>{error}</ErrorText>
      </LinearGradient>

      <View style={s.body}>
        {tracking && <DateTiles insights={insights!} onPress={() => navigation.navigate("Cycle")} />}

        <Pressable onPress={() => stack()?.navigate("LogEntry", { tab: "mood" })} accessibilityRole="button" style={({ pressed }) => [s.feel, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.feelTitle}>How are you feeling today?</Text>
            <Text style={s.feelSub}>Log mood or symptoms in a few taps.</Text>
          </View>
          <View style={s.feelIcon}>
            <Ionicons name="happy-outline" size={26} color={colors.amber900} />
          </View>
        </Pressable>

        {card && (
          <View style={s.tip}>
            <Text style={s.tipLabel}>TODAY'S TIP</Text>
            <Text style={s.tipTitle}>{card.title}</Text>
            <Text style={s.tipBody}>{card.body}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Status({ insights }: { insights: CycleInsights }) {
  const phase = insights.phase!;
  const until = insights.daysUntilNextPeriod;
  const label = insights.subPhase === "pms" ? "PMS window" : PHASE_STYLE[phase].label;
  let big: string;
  let small: string | null = null;
  if (phase === "menstrual") big = `Day ${insights.currentCycleDay}`;
  else if (until !== null && until > 0) {
    big = `${until} ${until === 1 ? "day" : "days"}`;
    small = "until your period";
  } else if (until === 0) big = "Due today";
  else big = "May be late";

  return (
    <View style={s.status}>
      <Text style={s.phase}>{label}</Text>
      <Text style={s.big}>{big}</Text>
      {small && <Text style={s.small}>{small}</Text>}
      {insights.predictedNextPeriodStart && (
        <Text style={s.next}>
          {shortDate(insights.predictedNextPeriodStart)} · Next period{insights.confidence === "low" ? " (estimate)" : ""}
        </Text>
      )}
    </View>
  );
}

function DateTiles({ insights, onPress }: { insights: CycleInsights; onPress: () => void }) {
  const today = dayKey(new Date());
  const fw = insights.fertileWindow;
  const fertileNow = !!fw && fw.start <= today && today <= fw.end;
  const pct = Math.min(1, (insights.currentCycleDay ?? 0) / insights.cycleLengthDays);
  return (
    <View style={s.tiles}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Cycle day ${insights.currentCycleDay}`} style={[s.tile, { backgroundColor: colors.violet50 }]}>
        <Text style={[s.tileLabel, { color: colors.violet700 }]}>CYCLE DAY</Text>
        <Text style={s.tileBig}>{insights.currentCycleDay}</Text>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${pct * 100}%` }]} />
        </View>
      </Pressable>
      <Pressable onPress={onPress} accessibilityRole="button" style={[s.tile, { backgroundColor: colors.amber50 }]}>
        <Ionicons name="leaf-outline" size={18} color={colors.amber900} />
        <View>
          <Text style={s.tileValue}>{fertileNow ? "Now" : fw ? shortDate(fw.start) : "—"}</Text>
          <Text style={[s.tileSub, { color: colors.amber900 }]}>{fertileNow ? "Fertile window" : "Next fertile"}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onPress} accessibilityRole="button" style={[s.tile, { backgroundColor: colors.peach100 }]}>
        <Ionicons name="sparkles-outline" size={18} color={colors.peach600} />
        <View>
          <Text style={s.tileValue}>{insights.ovulationDate ? shortDate(insights.ovulationDate) : "—"}</Text>
          <Text style={[s.tileSub, { color: colors.peach600 }]}>Ovulation</Text>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  hero: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  topBar: { position: "absolute", top: 44, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  status: { alignItems: "center", marginTop: 48 },
  phase: { fontSize: 18, fontWeight: "600", color: colors.ink700 },
  big: { fontSize: 48, fontWeight: "800", color: colors.ink900, marginTop: 2 },
  small: { fontSize: 15, color: colors.ink700 },
  next: { fontSize: 14, fontWeight: "600", color: colors.ink700, marginTop: 8 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 54, minWidth: 230, paddingHorizontal: 28, borderRadius: 999, backgroundColor: colors.brand600, marginTop: 24, ...shadow.soft },
  ctaText: { fontSize: 17, fontWeight: "700", color: colors.onBrand },
  link: { fontSize: 14, fontWeight: "600", color: colors.brand700 },
  body: { paddingHorizontal: 16, gap: 12, marginTop: 4 },
  tiles: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, minHeight: 116, borderRadius: radius.lg, padding: 12, justifyContent: "space-between" },
  tileLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  tileBig: { fontSize: 32, fontWeight: "800", color: colors.ink900 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.white, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.brand500 },
  tileValue: { fontSize: 18, fontWeight: "800", color: colors.ink900 },
  tileSub: { fontSize: 12, fontWeight: "600" },
  feel: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 18, ...shadow.soft },
  feelTitle: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  feelSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  feelIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.amber50, alignItems: "center", justifyContent: "center" },
  tip: { backgroundColor: colors.violet50, borderRadius: radius.lg, padding: 16 },
  tipLabel: { fontSize: 11, fontWeight: "800", color: colors.violet700, letterSpacing: 0.5 },
  tipTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900, marginTop: 6 },
  tipBody: { fontSize: 14, color: colors.ink700, marginTop: 4, lineHeight: 20 },
});
