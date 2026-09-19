import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, type TimelineEvent } from "../lib/api";
import { Card } from "../components/ui";
import { colors } from "../theme";
import type { AppStackParamList, MainTabsParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabsParamList, "Dashboard">;

/** Ported from apps/web/src/pages/Dashboard.tsx — quick links + recent
 * activity summary; report cards land with the full Reports screen in
 * Phase 4. */
export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getTimeline().then(({ events }) => setEvents(events.slice(0, 4)));
    }, [])
  );

  function openLogEntry() {
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("LogEntry");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Welcome, {user?.name?.split(" ")[0]}</Text>
      <Text style={styles.subtitle}>
        Log how you're feeling and HERAI keeps the timeline. Ask a question and a pipeline of
        specialist agents reasons over it step by step.
      </Text>

      <View style={styles.quickLinks}>
        <QuickLink label="Ask HERAI" desc="Agentic AI symptom guidance" onPress={() => navigation.navigate("Chat")} />
        <QuickLink label="Reports" desc="Upload & analyze lab reports" onPress={() => navigation.navigate("Reports")} />
        <QuickLink label="Log an entry" desc="Symptom or cycle logging" onPress={openLogEntry} />
        <QuickLink label="Timeline" desc="Your full logged history" onPress={() => navigation.navigate("Timeline")} />
      </View>

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {events === null && <Text style={styles.muted}>Loading…</Text>}
      {events?.length === 0 && <Text style={styles.muted}>Nothing logged yet — start your timeline.</Text>}
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

function QuickLink({ label, desc, onPress }: { label: string; desc: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickLink}>
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Text style={styles.quickLinkDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink700, marginTop: 4, marginBottom: 8 },
  quickLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickLink: {
    width: "47%",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 14,
  },
  quickLinkLabel: { fontWeight: "700", color: colors.ink900, marginBottom: 2 },
  quickLinkDesc: { fontSize: 12, color: colors.ink700 },
  sectionTitle: { marginTop: 16, fontSize: 17, fontWeight: "700", color: colors.ink900 },
  muted: { color: colors.ink700, fontSize: 13 },
  eventTitle: { fontWeight: "600", color: colors.ink900 },
  eventTime: { fontSize: 12, color: colors.ink700, marginTop: 2 },
});
