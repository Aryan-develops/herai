import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Titled block used across Settings and the partner screens. */
export function SettingsCard({ icon, title, description, children }: { icon: IconName; title: string; description?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={colors.brand600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text style={styles.desc}>{description}</Text> : null}
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 12 }}>{children}</View>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.brand500, false: colors.neutral300 }}
        thumbColor={colors.onBrand}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  desc: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
  toggleHint: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
});
