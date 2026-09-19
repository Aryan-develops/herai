import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { colors } from "../theme";
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to pick up your health insights where you left off.</Text>

        <View style={styles.form}>
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            secureTextEntry
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          <ErrorText>{error}</ErrorText>
          <Button title={submitting ? "Logging in…" : "Log in"} onPress={onSubmit} loading={submitting} />
        </View>

        <Text style={styles.footer}>
          No account?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
            Sign up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral50 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 6, fontSize: 14, color: colors.ink700 },
  form: { marginTop: 28 },
  footer: { marginTop: 24, textAlign: "center", color: colors.ink700 },
  link: { color: colors.brand600, fontWeight: "600" },
});
