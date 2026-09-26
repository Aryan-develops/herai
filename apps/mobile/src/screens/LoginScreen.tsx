import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // No navigation call needed — RootNavigator re-renders on auth state
      // change and swaps the whole stack, same as web's ProtectedRoute.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("../../assets/icon.png")} style={styles.brandMark} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={styles.title} accessibilityRole="header">
          Welcome back
        </Text>
        <Text style={styles.subtitle}>Log in to pick up where you left off.</Text>

        <View style={styles.form}>
          <Field
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
          />
          <ErrorText>{error}</ErrorText>
          <Button title={submitting ? "Logging in…" : "Log in"} onPress={onSubmit} loading={submitting} />
        </View>

        <Text style={styles.footer}>
          New to Lunee?{" "}
          <Text style={styles.link} accessibilityRole="link" onPress={() => navigation.navigate("Register")}>
            Create an account
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral50 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandMark: { width: 56, height: 56, borderRadius: radius.lg, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 6, fontSize: 15, color: colors.muted },
  form: { marginTop: 28 },
  footer: { marginTop: 24, textAlign: "center", color: colors.ink700 },
  link: { color: colors.brand600, fontWeight: "600" },
});
