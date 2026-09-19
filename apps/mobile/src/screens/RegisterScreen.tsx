import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { colors } from "../theme";
import { isMinor, isValidDateString } from "../lib/age";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minor = isValidDateString(dateOfBirth) && isMinor(dateOfBirth);

  async function onSubmit() {
    setError(null);
    if (!isValidDateString(dateOfBirth)) {
      setError("Enter date of birth as YYYY-MM-DD");
      return;
    }
    setSubmitting(true);
    try {
      // Consent status decides where RootNavigator sends them next — no
      // explicit navigation call needed here, same pattern as web's Register.
      await register({
        name,
        email,
        password,
        dateOfBirth,
        guardianEmail: minor ? guardianEmail : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Set up HERAI in under a minute.</Text>

        <View style={styles.form}>
          <Field label="Name" placeholder="Jane Doe" value={name} onChangeText={setName} />
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <Field label="Password" secureTextEntry placeholder="At least 8 characters" value={password} onChangeText={setPassword} />
          <Field
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
          />

          {minor && (
            <View style={styles.consentBox}>
              <Text style={styles.consentTitle}>Parental consent needed</Text>
              <Text style={styles.consentBody}>
                Since you're under 18, a parent or guardian has to approve your account before HERAI
                can record any health information. We'll email them a link.
              </Text>
              <Field
                label="Parent or guardian's email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="parent@example.com"
                value={guardianEmail}
                onChangeText={setGuardianEmail}
              />
            </View>
          )}

          <ErrorText>{error}</ErrorText>
          <Button title={submitting ? "Creating account…" : "Sign up"} onPress={onSubmit} loading={submitting} />
        </View>

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
            Log in
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral50 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 48 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 6, fontSize: 14, color: colors.ink700 },
  form: { marginTop: 28 },
  consentBox: {
    backgroundColor: colors.brand50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand100,
    padding: 14,
    marginBottom: 16,
  },
  consentTitle: { fontWeight: "700", color: colors.ink900, marginBottom: 4 },
  consentBody: { fontSize: 13, color: colors.ink700, marginBottom: 10, lineHeight: 18 },
  footer: { marginTop: 24, textAlign: "center", color: colors.ink700 },
  link: { color: colors.brand600, fontWeight: "600" },
});
