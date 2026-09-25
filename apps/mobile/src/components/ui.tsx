import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, shadow } from "../theme";

/** A handful of shared primitives — not a design system, just enough that
 * every screen doesn't re-declare the same button/input styles. */

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "outline" && styles.buttonOutline,
        variant === "ghost" && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onBrand : colors.ink900} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "primary" && styles.buttonTextPrimary,
            variant !== "primary" && styles.buttonTextOutline,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel={label} {...props} />
    </View>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const ALERT_TONES = {
  info: { bg: colors.violet50, fg: colors.violet700 },
  success: { bg: colors.emerald50, fg: colors.emerald700 },
  warning: { bg: colors.amber50, fg: colors.amber900 },
};

/** Tinted notice; always text, never colour alone. */
export function Notice({ tone = "info", children }: { tone?: keyof typeof ALERT_TONES; children: React.ReactNode }) {
  const t = ALERT_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole="text">
      <Text style={[styles.noticeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/** Selectable pill; 44pt min height, announces selected state. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.screenTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: colors.brand600 },
  buttonOutline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral300 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 15, fontWeight: "600" },
  buttonTextPrimary: { color: colors.onBrand },
  buttonTextOutline: { color: colors.ink900 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink700, marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.ink900,
    backgroundColor: colors.white,
  },
  errorBox: { backgroundColor: colors.red50, borderRadius: 12, padding: 10, marginBottom: 12 },
  errorText: { color: colors.red600, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 16,
    ...shadow.soft,
  },
  notice: { borderRadius: radius.md, padding: 12 },
  noticeText: { fontSize: 13, lineHeight: 19 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral300,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  chipTextSelected: { color: colors.onBrand },
  screenTitle: { fontSize: 26, fontWeight: "700", color: colors.ink900 },
  screenSubtitle: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
});
