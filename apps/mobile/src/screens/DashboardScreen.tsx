import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api, type CycleInsights, type TimelineEvent } from "../lib/api";
import { Card } from "../components/ui";
import { CycleHero } from "../components/CycleHero";
import { GetHelpButton } from "../components/GetHelp";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList, MainTabsParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabsParamList, "Dashboard">;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api.getTimeline().then(({ events }) => setEvents(events.slice(0, 4)));
      api
        .getCycleInsights()
        .then(({ insights }) => setInsights(insights))
        .catch(() => {})
        .finally(() => setInsightsLoading(false));
    }, [])
  );

  function openCare(type?: "doctor") {
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("Care", type ? { type } : undefined);
  }

  function openLogEntry() {
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("LogEntry");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} accessibilityRole="header">
            {greeting()}, {user?.name?.split(" ")[0]}
          </Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>
        <GetHelpButton onFindCare={openCare} />
      </View>

      <CycleHero insights={insights} loading={insightsLoading} onPress={() => navigation.navigate("Cycle")} />

      <View style={styles.quickLinks}>
        <QuickLink icon="chatbubble-ellipses" tint={colors.brand100} fg={colors.brand600} label="Ask HERAI" onPress={() => navigation.navigate("Chat")} />
        <QuickLink icon="add-circle" tint={colors.violet50} fg={colors.violet700} label="Log entry" onPress={openLogEntry} />
        <QuickLink icon="document-text" tint={colors.sage100} fg={colors.sage700} label="Reports" onPress={() => navigation.navigate("Reports")} />
        <QuickLink icon="time" tint={colors.peach100} fg={colors.peach600} label="Timeline" onPress={() => navigation.navigate("Timeline")} />
      </View>

      <Pressable
        onPress={() => openCare()}
        accessibilityRole="button"
        accessibilityLabel="Find care: labs and doctors near you"
        style={({ pressed }) => [styles.careCard, pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.quickIcon, { backgroundColor: colors.peach100 }]}>
          <Ionicons name="location" size={22} color={colors.peach600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.careTitle}>Find care</Text>
          <Text style={styles.careSub}>Labs and doctors near you</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      {user?.isProvider && (
        <Pressable
          onPress={() => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("Provider")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.careCard, pressed && { opacity: 0.9 }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: colors.brand100 }]}>
            <Ionicons name="storefront" size={22} color={colors.brand600} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.careTitle}>Provider dashboard</Text>
            <Text style={styles.careSub}>Requests and availability</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      )}

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Recent activity
      </Text>
      {events === null && <View style={styles.skeleton} />}
      {events?.length === 0 && <Text style={styles.muted}>Nothing logged yet. Your first entry starts your timeline.</Text>}
      {events?.map((event) => (
        <Card key={event.id}>
          <Text style={styles.eventTitle}>
            {event.type === "cycle"
              ? `${event.data.flow[0].toUpperCase()}${event.data.flow.slice(1)} flow`
              : event.data.symptoms.map((s) => s.name).join(", ")}
          </Text>
          <Text style={styles.eventTime}>
            {new Date(event.loggedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function QuickLink({
  icon,
  tint,
  fg,
  label,
  onPress,
}: {
  icon: IconName;
  tint: string;
  fg: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickLink, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  careCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 14, ...shadow.soft },
  careTitle: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  careSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  greeting: { fontSize: 28, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 2 },
  quickLinks: { flexDirection: "row", gap: 10 },
  quickLink: {
    flex: 1,
    minHeight: 92,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    ...shadow.soft,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLinkLabel: { fontSize: 12, fontWeight: "600", color: colors.ink900 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink900, marginTop: 4 },
  muted: { color: colors.muted, fontSize: 13 },
  skeleton: { height: 64, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
  eventTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
