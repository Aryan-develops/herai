import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "../theme";

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
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.ink900} />
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
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    height: 48,
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
  buttonTextPrimary: { color: colors.white },
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 16,
  },
});
