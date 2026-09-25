import { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { api, ApiError, type CareProvider, type CareReview, type CareSlot, type HealthReportRecord, type ProviderService, type RequestKind } from "../lib/api";
import { Button, Chip, ErrorText, Notice } from "../components/ui";
import { KIND_LABEL, Rating, formatSlot, rupees } from "../components/careBits";
import { colors, radius, shadow } from "../theme";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "CareProvider">;
interface Preset {
  kind: RequestKind;
  service?: ProviderService;
  slot?: CareSlot;
}

export function CareProviderScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [data, setData] = useState<{ provider: CareProvider; slots: CareSlot[]; reviews: CareReview[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [sent, setSent] = useState(false);
  const [picked, setPicked] = useState<CareSlot | null>(null);

  const load = useCallback(() => {
    api.getProvider(id).then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load this provider."));
  }, [id]);
  useEffect(load, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, CareSlot[]>();
    for (const s of data?.slots ?? []) {
      const k = new Date(s.startsAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [data]);

  if (error) return <View style={styles.screen}><View style={{ padding: 20 }}><ErrorText>{error}</ErrorText></View></View>;
  if (!data) return <View style={styles.screen}><View style={[styles.skeleton, { margin: 20 }]} /></View>;

  const p = data.provider;
  const consultation = p.services.find((s) => s.category === "consultation");
  const tele = p.services.find((s) => s.category === "teleconsult");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">{p.name}</Text>
      <View style={styles.metaRow}>
        <Rating avg={p.ratingAvg} count={p.ratingCount} />
        <View style={[styles.pill, { backgroundColor: p.available ? colors.sage100 : colors.neutral200 }]}>
          <Text style={[styles.pillText, { color: p.available ? colors.sage700 : colors.ink700 }]}>{p.available ? "Available" : "Unavailable right now"}</Text>
        </View>
      </View>
      {p.isSample && <Text style={styles.sample}>Sample listing</Text>}
      {p.availabilityNote ? <Text style={styles.body}>{p.availabilityNote}</Text> : null}
      <Text style={styles.body}>{p.address}</Text>
      {p.hours ? <Text style={styles.muted}>{p.hours}</Text> : null}

      <View style={styles.row}>
        {p.phone && <View style={{ flex: 1 }}><Button title="Call" variant="outline" onPress={() => Linking.openURL(`tel:${p.phone}`)} /></View>}
        <View style={{ flex: 1 }}><Button title="Request call-back" variant="outline" disabled={!p.available} onPress={() => setPreset({ kind: "callback" })} /></View>
      </View>
      {sent && (
        <Notice tone="success">
          Request sent. Track it in My requests.
        </Notice>
      )}
      {sent && <Button title="Open My requests" variant="outline" onPress={() => navigation.navigate("MyRequests")} />}

      {p.services.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.h2} accessibilityRole="header">Services & prices</Text>
          {p.services.map((s) => (
            <View key={s.id} style={styles.svc}>
              <View style={{ flex: 1 }}>
                <Text style={styles.svcName}>{s.name}</Text>
                <Text style={styles.muted}>
                  {s.turnaroundHours !== null ? `Results in about ${s.turnaroundHours >= 24 ? `${Math.round(s.turnaroundHours / 24)} day${s.turnaroundHours >= 48 ? "s" : ""}` : `${s.turnaroundHours} hours`}` : s.category === "teleconsult" ? "Video call" : "In person"}
                </Text>
              </View>
              <Text style={styles.price}>{rupees(s.priceInr)}</Text>
              <Pressable
                disabled={!p.available}
                onPress={() => setPreset({ kind: s.category === "test" ? "test" : s.category === "teleconsult" ? "teleconsult" : "appointment", service: s, slot: s.category === "test" ? undefined : (picked ?? undefined) })}
                style={[styles.smallBtn, !p.available && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel={`${s.category === "test" ? "Request" : "Book"} ${s.name}`}
              >
                <Text style={styles.smallBtnText}>{s.category === "test" ? "Request" : "Book"}</Text>
              </Pressable>
            </View>
          ))}
          {p.homeCollection && <Text style={[styles.muted, { color: colors.sage700, fontWeight: "600" }]}>Home sample collection available</Text>}
        </View>
      )}

      {byDay.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.h2} accessibilityRole="header">Pick a time</Text>
          {byDay.map(([day, slots]) => (
            <View key={day} style={{ marginTop: 10 }}>
              <Text style={styles.day}>{day.toUpperCase()}</Text>
              <View style={styles.chips}>
                {slots.map((s) => (
                  <Chip
                    key={s.id}
                    label={new Date(s.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    selected={picked?.id === s.id}
                    onPress={() => setPicked(picked?.id === s.id ? null : s)}
                  />
                ))}
              </View>
            </View>
          ))}
          <View style={{ marginTop: 14, gap: 8 }}>
            <Button title={picked ? `Book ${formatSlot(picked.startsAt)}` : "Select a time"} disabled={!picked || !p.available} onPress={() => picked && setPreset({ kind: "appointment", service: consultation, slot: picked })} />
            {(p.offersTeleconsult || tele) && <Button title="Video consult" variant="outline" disabled={!picked || !p.available} onPress={() => picked && setPreset({ kind: "teleconsult", service: tele, slot: picked })} />}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.h2} accessibilityRole="header">Patient reviews</Text>
        {data.reviews.length === 0 ? (
          <Text style={styles.muted}>No reviews yet. Reviews come only from patients who completed a visit through HERAI.</Text>
        ) : (
          data.reviews.map((r, i) => (
            <View key={i} style={styles.review}>
              <Rating avg={r.rating} count={1} />
              {r.comment ? <Text style={styles.body}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </View>

      {preset && (
        <RequestModal
          provider={p}
          preset={preset}
          onClose={() => setPreset(null)}
          onSent={() => {
            setPreset(null);
            setPicked(null);
            setSent(true);
            load();
          }}
        />
      )}
    </ScrollView>
  );
}

/** Consent-first: nothing is shared unless the patient ticks it, and the copy says exactly what will be. */
function RequestModal({ provider, preset, onClose, onSent }: { provider: CareProvider; preset: Preset; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [shareProfile, setShareProfile] = useState(false);
  const [reports, setReports] = useState<HealthReportRecord[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listReports().then(({ reports }) => setReports(reports)).catch(() => setReports([]));
  }, []);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await api.createCareRequest({
        providerId: provider.id,
        kind: preset.kind,
        serviceId: preset.service?.id,
        slotId: preset.slot?.id,
        message: message || undefined,
        shareProfile,
        shareReportIds: selected,
        consent: true,
      });
      onSent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const sharing = shareProfile || selected.length > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.h2} accessibilityRole="header">{KIND_LABEL[preset.kind]} with {provider.name}</Text>
          <Text style={styles.muted}>
            {[preset.service ? `${preset.service.name} · ${rupees(preset.service.priceInr)}` : null, preset.slot ? formatSlot(preset.slot.startsAt) : null].filter(Boolean).join(" · ")}
          </Text>

          <Text style={styles.label}>Message (optional)</Text>
          <TextInput style={styles.input} value={message} onChangeText={setMessage} multiline placeholder="Anything they should know?" placeholderTextColor={colors.muted} accessibilityLabel="Message" />

          <Text style={styles.label}>What to share (nothing by default)</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.svcName}>My health profile</Text>
              <Text style={styles.muted}>Age range, conditions, medications, allergies, cycle length</Text>
            </View>
            <Switch value={shareProfile} onValueChange={setShareProfile} trackColor={{ true: colors.brand500 }} accessibilityLabel="Share my health profile" />
          </View>
          {reports?.slice(0, 8).map((r) => {
            const on = selected.includes(r._id);
            return (
              <View key={r._id} style={styles.switchRow}>
                <Text style={[styles.svcName, { flex: 1 }]} numberOfLines={1}>{r.fileName}</Text>
                <Switch value={on} onValueChange={() => setSelected((s) => (on ? s.filter((x) => x !== r._id) : [...s, r._id]))} trackColor={{ true: colors.brand500 }} accessibilityLabel={`Share ${r.fileName}`} />
              </View>
            );
          })}

          <View style={[styles.switchRow, { backgroundColor: colors.violet50, borderColor: colors.violet50 }]}>
            <Text style={[styles.body, { flex: 1 }]}>
              {sharing
                ? `I agree to share the selected information with ${provider.name}. I can cancel this request any time to withdraw their access.`
                : `I agree to send this request to ${provider.name} with my name and message. No health information is shared.`}
            </Text>
            <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.brand500 }} accessibilityLabel="I agree" />
          </View>

          <ErrorText>{error}</ErrorText>
          <Button title={busy ? "Sending…" : "Send request"} onPress={submit} loading={busy} disabled={!consent} />
          <Button title="Cancel" variant="ghost" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, paddingBottom: 48, gap: 10 },
  skeleton: { height: 160, borderRadius: radius.lg, backgroundColor: colors.neutral200 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  sample: { fontSize: 11, fontWeight: "700", color: colors.amber900 },
  body: { fontSize: 14, color: colors.ink900, lineHeight: 20 },
  muted: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral200, padding: 16, gap: 8, ...shadow.soft },
  h2: { fontSize: 18, fontWeight: "700", color: colors.ink900 },
  svc: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.neutral200 },
  svcName: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  price: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  smallBtn: { minHeight: 44, minWidth: 68, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  smallBtnText: { fontSize: 13, fontWeight: "700", color: colors.ink900 },
  day: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  review: { backgroundColor: colors.neutral50, borderRadius: radius.md, padding: 12, gap: 6 },
  scrim: { flex: 1, backgroundColor: "rgba(42,31,45,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "92%" },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink900, marginTop: 4 },
  input: { minHeight: 70, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink900, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, padding: 12 },
});
