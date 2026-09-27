import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type PartnerMessage } from "../lib/api";
import { Chip } from "./ui";
import { colors, radius, shadow } from "../theme";

export interface Thread {
  linkId: string;
  name: string;
}

const STARTERS = ["Hey, thinking of you 💗", "How are you feeling today?", "Sending love", "Let me know if you need anything"];

/** Private text thread between the two people on a link. Refreshes every 15 seconds while the screen is open. */
export function MessagesPane({ threads }: { threads: Thread[] }) {
  const [active, setActive] = useState<string | null>(threads[0]?.linkId ?? null);
  const [messages, setMessages] = useState<PartnerMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !threads.some((t) => t.linkId === active)) setActive(threads[0]?.linkId ?? null);
  }, [threads, active]);

  const load = useCallback(() => {
    if (!active) return;
    api.listMessages(active).then(({ messages }) => setMessages(messages)).catch(() => {});
  }, [active]);

  useEffect(() => {
    setMessages(null);
  }, [active]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 15_000);
      return () => clearInterval(t);
    }, [load]),
  );

  async function sendText(body: string) {
    if (!body.trim() || !active) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await api.sendMessage(active, body.trim());
      setMessages((m) => [...(m ?? []), message]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  }

  function send() {
    sendText(text);
  }

  if (threads.length === 0) return null;

  return (
    <View style={s.card}>
      <Text style={s.title} accessibilityRole="header">Messages</Text>
      {threads.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
          {threads.map((t) => (
            <Chip key={t.linkId} label={t.name} selected={t.linkId === active} onPress={() => setActive(t.linkId)} />
          ))}
        </ScrollView>
      )}
      <View style={s.thread}>
        {messages === null ? (
          <ActivityIndicator color={colors.brand600} />
        ) : messages.length === 0 ? (
          <View>
            <Text style={s.empty}>No messages yet. Try:</Text>
            <View style={s.starters}>
              {STARTERS.map((starter) => (
                <Pressable
                  key={starter}
                  onPress={() => sendText(starter)}
                  disabled={sending}
                  style={({ pressed }) => [s.starterChip, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.starterText}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.slice(-30).map((m) => (
            <View key={m.id} style={[s.row, { justifyContent: m.mine ? "flex-end" : "flex-start" }]}>
              <View style={[s.bubble, m.mine ? s.mine : s.theirs]}>
                <Text style={{ color: m.mine ? colors.onBrand : colors.ink900, fontSize: 14 }}>{m.body}</Text>
                <Text style={[s.time, { color: m.mine ? "rgba(255,255,255,0.75)" : colors.muted }]}>
                  {new Date(m.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={s.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={1000}
          accessibilityLabel="Message"
          style={s.input}
        />
        <Pressable onPress={send} disabled={sending || !text.trim()} accessibilityRole="button" accessibilityLabel="Send message" style={[s.send, (sending || !text.trim()) && { opacity: 0.4 }]}>
          {sending ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="send" size={18} color={colors.onBrand} />}
        </Pressable>
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 14, ...shadow.soft },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  thread: { marginTop: 10, backgroundColor: colors.neutral50, borderRadius: radius.md, padding: 10, gap: 8, minHeight: 100 },
  empty: { textAlign: "center", color: colors.muted, fontSize: 13, paddingTop: 12 },
  starters: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 8 },
  starterChip: { borderWidth: 1, borderColor: colors.brand100, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  starterText: { fontSize: 12, fontWeight: "600", color: colors.brand700 },
  row: { flexDirection: "row" },
  bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { backgroundColor: colors.brand600, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral200, borderBottomLeftRadius: 4 },
  time: { fontSize: 10, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink900 },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center" },
  error: { color: colors.red600, fontSize: 12, marginTop: 6 },
});
