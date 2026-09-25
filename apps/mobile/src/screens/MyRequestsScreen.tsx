import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, type CareRequest } from "../lib/api";
import { Button, ErrorText, ScreenTitle } from "../components/ui";
import { KIND_LABEL, StarPicker, StatusPill, formatSlot } from "../components/careBits";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "MyRequests">;

export function MyRequestsScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<CareRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const load = useCallback(() => {
    api.listCareRequests().then(({ requests }) => setRequests(requests)).catch(() => setError("Couldn't load your requests."));
  }, []);
  useFocusEffect(load);

  function cancel(id: string) {
    Alert.alert("Cancel this request?", "The provider will lose access to anything you shared.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelCareRequest(id);
            load();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Couldn't cancel that request.");
          }
        },
      },
    ]);
  }

  async function review(id: string) {
    if (rating === 0) return;
    try {
      await api.reviewCareRequest(id, { rating, comment: comment || undefined });
      setReviewing(null);
      setRating(0);
      setComment("");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your review.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="My care requests" subtitle="Tests, appointments and call-backs you've requested." />
      <ErrorText>{error}</ErrorText>
      {requests === null && !error && <View style={styles.skeleton} />}
      {requests?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyBody}>Find a lab or doctor and request a test or appointment.</Text>
          <View style={{ marginTop: 12 }}><Button title="Find care" onPress={() => navigation.navigate("Care")} /></View>
        </View>
      )}

      {requests?.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kind}>{KIND_LABEL[r.kind].toUpperCase()}</Text>
              <Text style={styles.name}>{r.provider?.name ?? "Provider"}</Text>
              {r.serviceName ? <Text style={styles.body}>{r.serviceName}</Text> : null}
            </View>
            <StatusPill status={r.status} />
          </View>
          {r.slotStartsAt ? <Text style={styles.slot}>{formatSlot(r.slotStartsAt)}</Text> : null}
          {r.message ? <Text style={styles.body}>"{r.message}"</Text> : null}
          {r.providerNote ? <Text style={styles.note}>From the provider: {r.providerNote}</Text> : null}
          {(r.sharedProfile || r.sharedReportCount > 0) && r.status !== "cancelled" && r.status !== "declined" ? (
            <Text style={styles.muted}>Sharing {[r.sharedProfile && "your profile", r.sharedReportCount > 0 && `${r.sharedReportCount} report${r.sharedReportCount > 1 ? "s" : ""}`].filter(Boolean).join(" and ")}</Text>
          ) : null}

          <View style={styles.actions}>
            {r.meetingUrl && r.status === "accepted" && <Button title="Join video call" onPress={() => Linking.openURL(r.meetingUrl!)} />}
            {(r.status === "new" || r.status === "accepted") && <Button title="Cancel request" variant="outline" onPress={() => cancel(r.id)} />}
            {r.status === "completed" && !r.reviewed && reviewing !== r.id && <Button title="Leave a review" variant="outline" onPress={() => setReviewing(r.id)} />}
            {r.status === "completed" && r.reviewed && <Text style={styles.muted}>Thanks for your review</Text>}
            {r.provider?.phone && r.status !== "cancelled" && <Button title="Call" variant="ghost" onPress={() => Linking.openURL(`tel:${r.provider!.phone}`)} />}
          </View>

          {reviewing === r.id && (
            <View style={styles.reviewBox}>
              <Text style={styles.name}>How was it?</Text>
              <StarPicker value={rating} onChange={setRating} />
              <TextInput style={styles.input} value={comment} onChangeText={setComment} multiline placeholder="Optional: share what went well" placeholderTextColor={colors.muted} accessibilityLabel="Review comment" />
              <Button title="Submit review" disabled={rating === 0} onPress={() => review(r.id)} />
              <Button title="Not now" variant="ghost" onPress={() => setReviewing(null)} />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  skeleton: { height: 120, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  empty: { borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brand500, padding: 20, backgroundColor: colors.white },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  emptyBody: { fontSize: 13, color: colors.ink700, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 8, ...shadow.soft },
  top: { flexDirection: "row", gap: 8 },
  kind: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 },
  name: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  body: { fontSize: 14, color: colors.ink700 },
  slot: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  muted: { fontSize: 12, color: colors.muted },
  note: { fontSize: 13, color: colors.ink900, backgroundColor: colors.sage100, borderRadius: radius.md, padding: 10 },
  actions: { gap: 8, marginTop: 4 },
  reviewBox: { backgroundColor: colors.neutral50, borderRadius: radius.md, padding: 12, gap: 8 },
  input: { minHeight: 60, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white, textAlignVertical: "top" },
});
