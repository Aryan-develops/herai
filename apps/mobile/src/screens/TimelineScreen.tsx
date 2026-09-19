import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type TimelineEvent } from "../lib/api";
import { colors } from "../theme";

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Extreme"];

/** Ported from apps/web/src/pages/Timeline.tsx. */
export function TimelineScreen() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  const load = useCallback(() => {
    api.getTimeline().then(({ events }) => setEvents(events));
  }, []);

  useFocusEffect(load);

  async function remove(event: TimelineEvent) {
    if (event.type === "symptom") {
      await api.deleteSymptomLog(event.id);
    } else {
      await api.deleteCycleLog(event.id);
    }
    load();
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={events ?? []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Health timeline</Text>
          <Text style={styles.subtitle}>Every symptom and cycle entry you've logged.</Text>
        </View>
      }
      ListEmptyComponent={
        events === null ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : (
          <Text style={styles.muted}>Nothing logged yet.</Text>
        )
      }
      renderItem={({ item: event }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.time}>
              {new Date(event.loggedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </Text>
            <Pressable
              onPress={() => remove(event)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${event.type} entry from ${new Date(event.loggedAt).toLocaleDateString()}`}
            >
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>

          {event.type === "symptom" ? (
            <View style={styles.chipRow}>
              {event.data.symptoms.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {s.name} · {SEVERITY_LABEL[s.severity]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.chip, styles.chipBrand]}>
              <Text style={styles.chipText}>{event.data.flow} flow</Text>
            </View>
          )}

          {event.data.notes ? <Text style={styles.notes}>{event.data.notes}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink700, marginTop: 4 },
  muted: { color: colors.ink700, fontSize: 13, marginTop: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 12, color: colors.ink700 },
  delete: { fontSize: 12, color: colors.red600 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { backgroundColor: colors.brand50, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginTop: 8 },
  chipBrand: { backgroundColor: colors.brand100 },
  chipText: { fontSize: 12, color: colors.brand600, fontWeight: "600" },
  notes: { marginTop: 8, fontSize: 13, color: colors.ink700 },
});
