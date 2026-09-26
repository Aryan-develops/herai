import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { InsightCard, InsightTone } from "../lib/api";
import { colors, radius } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TONES: Record<InsightTone, { icon: IconName; bg: string; fg: string }> = {
  body: { icon: "heart-outline", bg: colors.brand50, fg: colors.brand700 },
  food: { icon: "nutrition-outline", bg: colors.emerald50, fg: colors.emerald700 },
  move: { icon: "walk-outline", bg: colors.violet50, fg: colors.violet700 },
  mind: { icon: "leaf-outline", bg: colors.peach50, fg: colors.peach600 },
  care: { icon: "medkit-outline", bg: colors.amber50, fg: colors.amber900 },
  talk: { icon: "chatbubble-ellipses-outline", bg: colors.brand50, fg: colors.brand700 },
  plan: { icon: "calendar-outline", bg: colors.violet50, fg: colors.violet700 },
};

/** Swipeable daily-insight cards. */
export function InsightCards({ title, cards }: { title: string; cards: InsightCard[] }) {
  const { width } = useWindowDimensions();
  if (cards.length === 0) return null;
  const cardWidth = Math.min(width - 72, 280);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <ScrollView horizontal snapToInterval={cardWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
        {cards.map((c) => {
          const t = TONES[c.tone];
          return (
            <View key={c.id} style={[styles.card, { width: cardWidth, backgroundColor: t.bg }]}>
              <View style={[styles.icon, { backgroundColor: colors.white }]}>
                <Ionicons name={t.icon} size={18} color={t.fg} />
              </View>
              <Text style={[styles.cardTitle, { color: t.fg }]}>{c.title}</Text>
              <Text style={styles.body}>{c.body}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "700", color: colors.ink900 },
  card: { borderRadius: radius.lg, padding: 16, gap: 8, minHeight: 150 },
  icon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 14, color: colors.ink700, lineHeight: 20 },
});
