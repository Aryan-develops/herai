import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

/** RN has no <select> — a row of pills is the native-idiomatic equivalent
 * for a short fixed option list (used in place of web's <Select> here). */
export function PillSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt || "None"}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700, marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral300,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.ink900, borderColor: colors.ink900 },
  pillText: { fontSize: 13, color: colors.ink700, fontWeight: "500" },
  pillTextActive: { color: colors.white },
});
