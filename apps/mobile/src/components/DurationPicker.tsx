import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DURATIONS } from "../lib/duration";
import { Chip } from "./ui";
import { colors } from "../theme";

/** Optional "How long did it last?" chips; tap again to clear. */
export function DurationPicker({ value, onChange, label = "How long did it last?" }: { value: number | undefined; onChange: (m: number | undefined) => void; label?: string }) {
  return (
    <View>
      <View style={styles.head}>
        <Ionicons name="timer-outline" size={16} color={colors.brand600} />
        <Text style={styles.label}>
          {label} <Text style={styles.opt}>(optional)</Text>
        </Text>
      </View>
      <View style={styles.chips}>
        {DURATIONS.map((d) => (
          <Chip key={d.minutes} label={d.label} selected={value === d.minutes} onPress={() => onChange(value === d.minutes ? undefined : d.minutes)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700, flexShrink: 1 },
  opt: { fontWeight: "400", color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
