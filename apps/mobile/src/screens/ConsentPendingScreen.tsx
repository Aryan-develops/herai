import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { Button, ErrorText, Field } from "../components/ui";
import { colors } from "../theme";

/** Shown to a minor whose guardian hasn't approved yet — ported from
 * apps/web/src/pages/ConsentPending.tsx. */
export function ConsentPendingScreen() {
  const { user, logout, refreshUser } = useAuth();
  const declined = user?.consentStatus === "declined" || user?.consentStatus === "withdrawn";

  const [guardianEmail, setGuardianEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await api.resendConsentRequest({ guardianEmail });
      setSent(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{declined ? "Account not approved" : "Waiting for approval"}</Text>
      <Text style={styles.subtitle}>
        {declined
          ? "A parent or guardian needs to approve this account before you can use HERAI."
          : "We've sent a request to your parent or guardian."}
      </Text>

      <View style={styles.box}>
        <Text style={styles.boxText}>
          Because you're under 18, HERAI needs a parent or guardian's permission before it can record
          or analyse any health information. Nothing is processed until they approve.
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Send to a different email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="parent@example.com"
          value={guardianEmail}
          onChangeText={setGuardianEmail}
        />
        <Button title={busy ? "Sending…" : "Send request"} onPress={resend} loading={busy} />
        {sent && <Text style={styles.success}>Request sent. They'll get a link to approve.</Text>}
        <ErrorText>{error}</ErrorText>
      </View>

      <Button title="Log out" variant="ghost" onPress={() => logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.neutral50 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink900 },
  subtitle: { marginTop: 6, fontSize: 14, color: colors.ink700 },
  box: { backgroundColor: colors.brand50, borderRadius: 12, padding: 14, marginTop: 20 },
  boxText: { fontSize: 13, color: colors.ink900, lineHeight: 19 },
  form: { marginTop: 20, marginBottom: 12 },
  success: { color: colors.emerald700, fontSize: 13, marginTop: 8 },
});
