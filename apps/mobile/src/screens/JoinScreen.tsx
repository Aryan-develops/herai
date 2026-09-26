import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type InviteDirection } from "../lib/api";
import { Button, ErrorText } from "../components/ui";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Join">;

/** Opened from an invite link. Shows who is asking before anything is shared. */
export function JoinScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const { refreshUser } = useAuth();
  const [preview, setPreview] = useState<{ inviterFirstName: string; direction: InviteDirection } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .previewInvite({ token })
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "That invite isn't valid."));
  }, [token]);

  async function accept() {
    setBusy(true);
    try {
      const { role } = await api.acceptInvite({ token });
      await refreshUser().catch(() => {});
      if (role === "partner") navigation.replace("Tabs", { screen: "Partner" } as never);
      else navigation.replace("PartnerSettings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't connect.");
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="heart-circle" size={32} color={colors.onBrand} />
        </View>
        <Text style={styles.title}>You've been invited to Lunee</Text>
        {!preview && !error ? <ActivityIndicator color={colors.brand600} /> : null}
        {preview ? (
          <>
            <Text style={styles.body}>
              {preview.direction === "woman_invites_partner"
                ? `${preview.inviterFirstName} invited you to follow her cycle so you can support her. She decides what you see and can stop at any time.`
                : `${preview.inviterFirstName} would like to follow your cycle updates. If you accept, they see only what you choose to share.`}
            </Text>
            <Button title="Accept and connect" onPress={accept} loading={busy} />
            <Button title="Not now" variant="ghost" onPress={() => navigation.goBack()} />
          </>
        ) : null}
        <ErrorText>{error}</ErrorText>
        {error ? <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50, justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 24, gap: 14, alignItems: "stretch", ...shadow.soft },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900, textAlign: "center" },
  body: { fontSize: 14, color: colors.ink700, lineHeight: 20, textAlign: "center" },
});
