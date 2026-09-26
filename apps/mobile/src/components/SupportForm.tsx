import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type SupportTopic } from "../lib/api";
import { Button, Chip, ErrorText } from "./ui";
import { colors, radius } from "../theme";

const TOPICS: { id: SupportTopic; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "cycle_tracking", label: "Cycle tracking" },
  { id: "partner", label: "Partner mode" },
  { id: "payments", label: "Payments" },
  { id: "bug", label: "Something's broken" },
  { id: "other", label: "Other" },
];

/** Customer support: send us a message from inside the app. Not for emergencies. */
export function SupportForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [topic, setTopic] = useState<SupportTopic>("other");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.supportInfo().then(({ email }) => setEmail(email)).catch(() => {});
  }, []);

  async function send() {
    setError(null);
    setSending(true);
    try {
      await api.sendSupport({ topic, message });
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={s.box}>
      <View style={s.head}>
        <View style={s.icon}>
          <Ionicons name="headset" size={18} color={colors.violet700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Customer support</Text>
          <Text style={s.sub}>Questions, problems or feedback. We reply by email.</Text>
        </View>
        {!open && !sent && (
          <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={s.btn}>
            <Text style={s.btnText}>Message us</Text>
          </Pressable>
        )}
      </View>

      {sent ? (
        <View style={s.done}>
          <Ionicons name="checkmark-circle" size={16} color={colors.sage700} />
          <Text style={s.doneText}>Thanks, we've got it and will reply by email.</Text>
        </View>
      ) : (
        open && (
          <View style={{ marginTop: 12 }}>
            <View style={s.chips}>
              {TOPICS.map((t) => (
                <Chip key={t.id} label={t.label} selected={topic === t.id} onPress={() => setTopic(t.id)} />
              ))}
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              placeholder="How can we help?"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Your message"
              style={s.input}
            />
            <Text style={s.hint}>Please don't include detailed health information. We can ask if we need it.</Text>
            <ErrorText>{error}</ErrorText>
            <View style={{ marginTop: 10 }}>
              <Button title={sending ? "Sending…" : "Send message"} onPress={send} loading={sending} disabled={message.trim().length < 10} />
            </View>
          </View>
        )
      )}

      {email && (
        <Pressable onPress={() => Linking.openURL(`mailto:${email}`)} accessibilityRole="link" style={s.mail}>
          <Ionicons name="mail" size={16} color={colors.brand700} />
          <Text style={s.mailText}>{email}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, padding: 14, marginTop: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.violet50, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  btn: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 13, fontWeight: "700", color: colors.ink900 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { minHeight: 96, marginTop: 10, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink900, textAlignVertical: "top" },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  done: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: colors.sage100, borderRadius: radius.md, padding: 10 },
  doneText: { flex: 1, fontSize: 13, color: colors.sage700 },
  mail: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginTop: 8 },
  mailText: { fontSize: 14, fontWeight: "600", color: colors.brand700 },
});
