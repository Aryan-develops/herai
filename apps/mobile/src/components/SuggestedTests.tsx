import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, type TestSuggestion } from "../lib/api";
import { Rating, rupees } from "./careBits";
import { colors, radius, shadow } from "../theme";

/** Follow-up tests worth asking about for a report's flagged values, with partners that offer them. */
export function SuggestedTests({ reportId, onOpenProvider }: { reportId: string; onOpenProvider: (id: string) => void }) {
  const [items, setItems] = useState<TestSuggestion[] | null>(null);

  useEffect(() => {
    api.suggestTests(reportId).then(({ suggestions }) => setItems(suggestions)).catch(() => setItems([]));
  }, [reportId]);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">Tests worth asking about</Text>
      <Text style={styles.sub}>Based on the values flagged in this report. Ask your doctor whether these make sense for you.</Text>
      {items.map((s) => (
        <View key={s.test} style={{ marginTop: 12 }}>
          <Text style={styles.test}>{s.test}</Text>
          <Text style={styles.muted}>Because of: {s.because.join(", ")}</Text>
          {s.providers.length === 0 ? (
            <Text style={styles.muted}>No partner lab offers this yet.</Text>
          ) : (
            s.providers.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onOpenProvider(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${rupees(p.matchedService.priceInr)}`}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pname}>{p.name}</Text>
                  <Text style={styles.muted}>{p.city}{p.distanceKm !== null ? ` · ${p.distanceKm} km` : ""}</Text>
                </View>
                <Rating avg={p.ratingAvg} count={p.ratingCount} />
                <Text style={styles.price}>{rupees(p.matchedService.priceInr)}</Text>
              </Pressable>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.violet50, borderRadius: radius.lg, padding: 16, ...shadow.soft },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  sub: { fontSize: 12, color: colors.ink700, marginTop: 4, lineHeight: 17 },
  test: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral200, padding: 12, marginTop: 8, minHeight: 56 },
  pname: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  price: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
});
