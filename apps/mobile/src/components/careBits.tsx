import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RequestStatus } from "../lib/api";
import { colors, radius } from "../theme";

export function Rating({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <Text style={styles.newText}>New</Text>;
  return (
    <View style={styles.rating} accessible accessibilityLabel={`Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`}>
      <Ionicons name="star" size={13} color="#f5a524" />
      <Text style={styles.ratingNum}>{avg.toFixed(1)}</Text>
      <Text style={styles.ratingCount}>({count})</Text>
    </View>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          hitSlop={4}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
          style={styles.starBtn}
        >
          <Ionicons name={n <= value ? "star" : "star-outline"} size={30} color={n <= value ? "#f5a524" : colors.neutral300} />
        </Pressable>
      ))}
    </View>
  );
}

const STATUS: Record<RequestStatus, { label: string; bg: string; fg: string }> = {
  new: { label: "Sent", bg: colors.violet50, fg: colors.violet700 },
  accepted: { label: "Accepted", bg: colors.sage100, fg: colors.sage700 },
  declined: { label: "Declined", bg: colors.neutral200, fg: colors.ink700 },
  completed: { label: "Completed", bg: colors.brand100, fg: colors.brand700 },
  cancelled: { label: "Cancelled", bg: colors.neutral200, fg: colors.ink700 },
};

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export const KIND_LABEL = { test: "Test", appointment: "Appointment", callback: "Call-back", teleconsult: "Video consult" } as const;

export function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function rupees(n: number | null): string {
  return n === null ? "Price on request" : `₹${n.toLocaleString("en-IN")}`;
}

const styles = StyleSheet.create({
  newText: { fontSize: 12, color: colors.muted },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontSize: 12, fontWeight: "700", color: colors.ink900 },
  ratingCount: { fontSize: 12, color: colors.muted },
  starBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700" },
});

export { radius };
