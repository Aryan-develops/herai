import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { api, ApiError, type ProviderDashboardData, type ProviderInboxItem, type SharedData } from "../lib/api";
import { Button, ErrorText, Notice, ScreenTitle } from "../components/ui";
import { KIND_LABEL, StatusPill, formatSlot, rupees } from "../components/careBits";
import { colors, radius, shadow } from "../theme";

/** Inbox and availability on the go. Services and slot editing live on the web dashboard. */
export function ProviderScreen() {
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [inbox, setInbox] = useState<ProviderInboxItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notProvider, setNotProvider] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [shared, setShared] = useState<Record<string, SharedData | "withdrawn">>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [meet, setMeet] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.providerMe().then(setData).catch((e) => {
      if (e instanceof ApiError && e.status === 403) setNotProvider(true);
      else setError("Couldn't load your dashboard.");
    });
    api.providerRequests().then(({ requests }) => setInbox(requests)).catch(() => {});
  }, []);
  useFocusEffect(load);

  async function act(id: string, status: "accepted" | "declined" | "completed") {
    setError(null);
    try {
      await api.providerUpdateRequest(id, { status, note: note[id] || undefined, meetingUrl: meet[id] || undefined });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update that request.");
    }
  }

  async function toggleShared(id: string) {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!shared[id]) {
      try {
        setShared((s) => ({ ...s, [id]: undefined as never }));
        setShared((s) => ({ ...s, [id]: undefined as never }));
        const d = await api.providerShared(id);
        setShared((s) => ({ ...s, [id]: d }));
      } catch {
        setShared((s) => ({ ...s, [id]: "withdrawn" }));
      }
    }
  }

  if (notProvider) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 20 }}>
          <Notice tone="info">This account isn't a partner provider yet. Apply from the web app; once approved your dashboard appears here.</Notice>
        </View>
      </View>
    );
  }

  const p = data?.provider;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title={p?.name ?? "Provider dashboard"} subtitle="Requests and availability." />
      {p && !p.verified ? <Notice tone="warning">Your listing is under review and isn't visible to patients yet.</Notice> : null}
      <ErrorText>{error}</ErrorText>

      {p && (
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Accepting patients</Text>
              <Text style={styles.muted}>Turn off when you're away.</Text>
            </View>
            <Switch
              value={p.available}
              onValueChange={async (v) => {
                await api.providerUpdateMe({ available: v });
                load();
              }}
              trackColor={{ true: colors.sage700 }}
              accessibilityLabel="Accepting patients"
            />
          </View>
          <Text style={styles.muted}>{data?.services.length ?? 0} services · {data?.slots.filter((s) => s.status === "open").length ?? 0} open slots. Edit these on the web dashboard.</Text>
        </View>
      )}

      <Text style={styles.h2} accessibilityRole="header">Requests</Text>
      {inbox === null && <View style={styles.skeleton} />}
      {inbox?.length === 0 && <Text style={styles.muted}>No requests yet.</Text>}

      {inbox?.map((r) => {
        const sh = shared[r.id];
        return (
          <View key={r.id} style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kind}>{KIND_LABEL[r.kind].toUpperCase()}</Text>
                <Text style={styles.name}>{r.patientFirstName}{r.serviceName ? ` · ${r.serviceName}` : ""}</Text>
                {r.slotStartsAt ? <Text style={styles.slot}>{formatSlot(r.slotStartsAt)}</Text> : null}
                {r.message ? <Text style={styles.body}>"{r.message}"</Text> : null}
              </View>
              <StatusPill status={r.status} />
            </View>

            {(r.sharesProfile || r.sharedReportCount > 0) && r.status !== "cancelled" && r.status !== "declined" && (
              <Text style={styles.link} onPress={() => toggleShared(r.id)} accessibilityRole="button">
                {open === r.id ? "Hide" : "View"} shared: {[r.sharesProfile && "profile", r.sharedReportCount > 0 && `${r.sharedReportCount} report(s)`].filter(Boolean).join(", ")}
              </Text>
            )}
            {open === r.id && (
              <View style={styles.sharedBox}>
                {sh === "withdrawn" && <Text style={styles.muted}>The patient withdrew access.</Text>}
                {sh && sh !== "withdrawn" && (
                  <>
                    {sh.profile && (
                      <View>
                        <Text style={styles.name}>Profile</Text>
                        <Text style={styles.body}>Age range: {sh.profile.ageRange ?? "-"} · Cycle: {sh.profile.cycleLengthDays ?? "-"} days</Text>
                        <Text style={styles.body}>Conditions: {sh.profile.conditions?.join(", ") || "none"}</Text>
                        <Text style={styles.body}>Medications: {sh.profile.medications?.join(", ") || "none"}</Text>
                        <Text style={styles.body}>Allergies: {sh.profile.allergies?.join(", ") || "none"}</Text>
                      </View>
                    )}
                    {sh.reports.map((rep) => (
                      <View key={rep.id} style={{ marginTop: 8 }}>
                        <Text style={styles.name}>{rep.fileName}</Text>
                        {rep.values.map((v, i) => (
                          <Text key={i} style={styles.body}>{v.parameter}: {v.value ?? "-"} {v.unit ?? ""} ({v.status.replace("_", " ")})</Text>
                        ))}
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {(r.status === "new" || r.status === "accepted") && (
              <View style={{ gap: 8 }}>
                <TextInput style={styles.input} value={note[r.id] ?? ""} onChangeText={(t) => setNote({ ...note, [r.id]: t })} placeholder="Note to patient" placeholderTextColor={colors.muted} accessibilityLabel="Note to patient" />
                {r.kind === "teleconsult" && (
                  <TextInput style={styles.input} value={meet[r.id] ?? ""} onChangeText={(t) => setMeet({ ...meet, [r.id]: t })} placeholder="Video call link" autoCapitalize="none" keyboardType="url" placeholderTextColor={colors.muted} accessibilityLabel="Video call link" />
                )}
                {r.status === "new" && <Button title="Accept" onPress={() => act(r.id, "accepted")} />}
                {r.status === "accepted" && <Button title="Mark completed" onPress={() => act(r.id, "completed")} />}
                <Button title="Decline" variant="outline" onPress={() => act(r.id, "declined")} />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  skeleton: { height: 100, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  h2: { fontSize: 18, fontWeight: "700", color: colors.ink900, marginTop: 6 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 8, ...shadow.soft },
  top: { flexDirection: "row", gap: 8 },
  kind: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink900 },
  slot: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  body: { fontSize: 13, color: colors.ink700 },
  muted: { fontSize: 12, color: colors.muted },
  link: { fontSize: 14, fontWeight: "700", color: colors.brand600 },
  sharedBox: { backgroundColor: colors.neutral50, borderRadius: radius.md, padding: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white },
});

export { rupees };
