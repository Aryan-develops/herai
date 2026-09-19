import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export interface SourceRef {
  title: string;
  source: string;
  url: string | null;
  topic: string;
}

/** Ported from apps/web/src/components/SourcesList.tsx — external links open
 * via Linking.openURL instead of an <a target="_blank">. */
export function SourcesList({ sources }: { sources: SourceRef[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <View style={styles.box}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`Sources (${sources.length})`}
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <Text style={styles.headerText}>📖 Sources ({sources.length})</Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={styles.list}>
          {sources.map((s, i) => (
            <View key={i} style={styles.item}>
              {s.url ? (
                <Pressable
                  onPress={() => Linking.openURL(s.url!)}
                  accessibilityRole="link"
                  accessibilityLabel={`${s.title}, opens in browser`}
                >
                  <Text style={styles.link}>{s.title} ↗</Text>
                </Pressable>
              ) : (
                <Text style={styles.title}>{s.title}</Text>
              )}
              <Text style={styles.source}>
                {" "}
                — {s.source === "synthetic-demo" ? "Demo knowledge base" : s.source}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, backgroundColor: colors.neutral50, borderWidth: 1, borderColor: colors.neutral200 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  headerText: { fontSize: 12, fontWeight: "700", color: colors.ink700 },
  chevron: { fontSize: 10, color: colors.ink700 },
  list: { borderTopWidth: 1, borderTopColor: colors.neutral200, padding: 12, gap: 6 },
  item: { flexDirection: "row", flexWrap: "wrap" },
  link: { fontSize: 12, fontWeight: "600", color: colors.brand600 },
  title: { fontSize: 12, fontWeight: "600", color: colors.ink900 },
  source: { fontSize: 12, color: colors.ink700 },
});
