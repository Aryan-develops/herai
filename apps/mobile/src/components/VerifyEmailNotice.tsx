import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "../lib/api";
import { Button, ErrorText, Notice } from "./ui";
import { colors } from "../theme";

/** "Check your inbox" panel with a resend button. Used after sign-up and when a login is blocked until verification. */
export function VerifyEmailNotice({ email, intro }: { email: string; intro?: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await api.resendVerification(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that email. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.body}>
        {intro ?? "We sent a confirmation link to"} <Text style={styles.email}>{email}</Text>. Open it to activate your account, then log in. Check spam if you don't see it.
      </Text>
      {sent ? <Notice tone="info">Sent again. It can take a minute to arrive.</Notice> : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Send the email again" variant="outline" onPress={resend} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  body: { color: colors.ink700, fontSize: 15, lineHeight: 22 },
  email: { color: colors.ink900, fontWeight: "700" },
});
