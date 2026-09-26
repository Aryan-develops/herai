import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type InviteCreated, type InviteDirection, type OpenInvite, type PartnerLink, type Relationship, type SharedScopes } from "../lib/api";
import { Button, Chip, ErrorText, Field, Notice, ScreenTitle } from "../components/ui";
import { SettingsCard, ToggleRow } from "../components/settingsBits";
import { colors, radius } from "../theme";

const RELATIONSHIPS: { id: Relationship; label: string }[] = [
  { id: "partner", label: "Partner" },
  { id: "family", label: "Family" },
  { id: "friend", label: "Friend" },
];

const SCOPE_ROWS: { key: keyof SharedScopes; label: string; hint: string }[] = [
  { key: "phase", label: "Cycle phase", hint: "Which phase you're in and the day count. Turning this off hides everything." },
  { key: "predictions", label: "Predictions and calendar", hint: "Estimated next period and the 14-day outlook." },
  { key: "mood", label: "Mood and what you need", hint: "Your latest check-in and one-tap signals like \"I need space\"." },
  { key: "comfort", label: "Comfort list", hint: "Snacks and things that help you feel better." },
  { key: "symptoms", label: "Symptom names (last 2 days)", hint: "Names only, never notes or severity. Off by default." },
  { key: "fertility", label: "Fertile window", hint: "Sensitive. Off by default." },
];

function niceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function InviteBox({ created, onDone }: { created: InviteCreated; onDone: () => void }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  async function copy(kind: "code" | "link") {
    await Clipboard.setStringAsync(kind === "code" ? created.code : created.link);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }
  return (
    <View style={styles.inviteBox}>
      <Text style={styles.inviteNote}>Invite ready. It works once and expires in 7 days.</Text>
      <Text style={styles.code} accessibilityLabel={`Invite code ${created.code}`} selectable>
        {created.code}
      </Text>
      <View style={styles.row}>
        <Button title={copied === "code" ? "Copied" : "Copy code"} variant="outline" onPress={() => copy("code")} />
        <Button title={copied === "link" ? "Copied" : "Copy link"} variant="outline" onPress={() => copy("link")} />
      </View>
      <Button
        title="Share"
        onPress={() => Share.share({ message: `Join me on Lunee. Use code ${created.code} or open this link: ${created.link}` })}
      />
      <Text style={styles.small}>{created.emailSent ? "We also emailed it to them." : "Send it to them yourself, the way you normally would."}</Text>
      <Button title="Done" variant="ghost" onPress={onDone} />
    </View>
  );
}

function PartnerCard({ p, onChanged }: { p: PartnerLink; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ action: string; at: string }[] | null>(null);
  const [nickname, setNickname] = useState(p.nickname ?? "");
  const paused = p.status === "paused";

  async function patch(data: Parameters<typeof api.updatePartnerLink>[1]) {
    setBusy(true);
    setError(null);
    try {
      await api.updatePartnerLink(p.id, data);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove() {
    Alert.alert(`Stop sharing with ${p.firstName}?`, "They'll lose access straight away.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop sharing",
        style: "destructive",
        onPress: async () => {
          try {
            await api.revokePartnerLink(p.id);
            onChanged();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't remove them.");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.partner}>
      <View style={styles.partnerHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{p.firstName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.partnerName}>{p.nickname || p.firstName}</Text>
          <Text style={styles.small}>
            {RELATIONSHIPS.find((r) => r.id === p.relationship)?.label} · since {niceDate(p.createdAt)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: paused ? colors.amber50 : colors.sage100 }]}>
          <Text style={[styles.pillText, { color: paused ? colors.amber900 : colors.sage700 }]}>{paused ? "Paused" : "Sharing"}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button title={open ? "Hide what they see" : "What they see"} variant="outline" onPress={() => setOpen((v) => !v)} />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title={paused ? "Resume" : "Pause"} variant="outline" onPress={() => patch({ status: paused ? "active" : "paused" })} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Remove" variant="ghost" onPress={confirmRemove} />
        </View>
      </View>
      {paused ? <Text style={styles.small}>While paused they see "Nothing to show right now". They aren't told you paused.</Text> : null}
      <ErrorText>{error}</ErrorText>

      {open && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Field label="What they're called (only you see this)" value={nickname} onChangeText={setNickname} maxLength={40} placeholder={p.firstName} />
          <Button title="Save name" variant="outline" onPress={() => patch({ nickname: nickname.trim() || null })} disabled={busy || nickname === (p.nickname ?? "")} />
          {SCOPE_ROWS.map((row) => (
            <ToggleRow key={row.key} label={row.label} hint={row.hint} value={p.scopes[row.key]} disabled={busy} onChange={(next) => patch({ scopes: { [row.key]: next } })} />
          ))}
          <Notice tone="info">They never see your notes, health conditions, medications, reports or exact logs.</Notice>
          {log === null ? (
            <Button title="When did they look?" variant="ghost" onPress={async () => setLog((await api.partnerAccessLog(p.id).catch(() => ({ entries: [] }))).entries)} />
          ) : log.length === 0 ? (
            <Text style={styles.small}>They haven't opened your summary yet.</Text>
          ) : (
            log.slice(0, 8).map((e, i) => (
              <Text key={i} style={styles.small}>
                Viewed your summary · {new Date(e.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export function PartnerSettingsScreen() {
  const [partners, setPartners] = useState<PartnerLink[] | null>(null);
  const [invites, setInvites] = useState<OpenInvite[]>([]);
  const [created, setCreated] = useState<InviteCreated | null>(null);
  const [relationship, setRelationship] = useState<Relationship>("partner");
  const [direction, setDirection] = useState<InviteDirection>("woman_invites_partner");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ inviterFirstName: string; direction: InviteDirection } | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const [comfort, setComfort] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const load = useCallback(() => {
    api.listMyPartners().then(({ partners }) => setPartners(partners)).catch(() => setPartners([]));
    api.listInvites().then(({ invites }) => setInvites(invites)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.getComfort().then(({ items }) => setComfort(items)).catch(() => {});
  }, [load]);

  async function createInvite() {
    setBusy(true);
    setError(null);
    try {
      setCreated(await api.createInvite({ direction, relationship, email: email.trim() || undefined }));
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setJoinBusy(true);
    setJoinMessage(null);
    setPreview(null);
    try {
      setPreview(await api.previewInvite({ code: code.trim() }));
    } catch (err) {
      setJoinMessage({ tone: "warning", text: err instanceof ApiError ? err.message : "That code isn't valid." });
    } finally {
      setJoinBusy(false);
    }
  }

  async function accept() {
    setJoinBusy(true);
    try {
      const { role } = await api.acceptInvite({ code: code.trim() });
      setJoinMessage({ tone: "success", text: role === "partner" ? "You're connected. Open Partner home to see how she's doing." : "You're connected. They'll see only what you choose to share." });
      setCode("");
      setPreview(null);
      load();
    } catch (err) {
      setJoinMessage({ tone: "warning", text: err instanceof ApiError ? err.message : "Couldn't connect." });
    } finally {
      setJoinBusy(false);
    }
  }

  async function saveComfort(items: string[]) {
    setComfort(items);
    await api.putComfort(items).catch(() => {});
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Partner and support circle" subtitle="Let someone you trust support you better. You can stop at any time." />

      <SettingsCard icon="people-outline" title="People you share with">
        {partners === null ? <View style={styles.skeleton} /> : null}
        {partners?.length === 0 ? <Text style={styles.small}>You're not sharing with anyone yet.</Text> : null}
        {partners?.map((p) => <PartnerCard key={p.id} p={p} onChanged={load} />)}
      </SettingsCard>

      <SettingsCard icon="person-add-outline" title="Invite someone">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Chip label="I share my cycle" selected={direction === "woman_invites_partner"} onPress={() => { setDirection("woman_invites_partner"); setCreated(null); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Chip label="I follow someone" selected={direction === "partner_requests_woman"} onPress={() => { setDirection("partner_requests_woman"); setCreated(null); }} />
          </View>
        </View>
        {direction === "partner_requests_woman" ? <Text style={styles.small}>She has to accept before you can see anything.</Text> : null}
        <Text style={styles.subhead}>They are my</Text>
        <View style={styles.wrap}>
          {RELATIONSHIPS.map((r) => (
            <Chip key={r.id} label={r.label} selected={relationship === r.id} onPress={() => setRelationship(r.id)} />
          ))}
        </View>
        <Field label="Email them (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" />
        <ErrorText>{error}</ErrorText>
        <Button title={email.trim() ? "Create and email invite" : "Create invite"} onPress={createInvite} loading={busy} />
        <Text style={styles.small}>People need to be 18 or over and have a Lunee account.</Text>
        {created ? <InviteBox created={created} onDone={() => setCreated(null)} /> : null}
        {invites.map((i) => (
          <View key={i.id} style={styles.openInvite}>
            <Text style={[styles.small, { flex: 1 }]}>
              Open invite · expires {niceDate(i.expiresAt)} ({i.direction === "woman_invites_partner" ? "you share" : "you follow"})
            </Text>
            <Pressable
              onPress={async () => {
                await api.cancelInvite(i.id).catch(() => {});
                load();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel invite"
              hitSlop={8}
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>
        ))}
      </SettingsCard>

      <SettingsCard icon="key-outline" title="Got a code or link from someone?">
        <Field
          label="Invite code"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setPreview(null);
            setJoinMessage(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABCD-EFGH"
        />
        <Button title="Check code" variant="outline" onPress={checkCode} loading={joinBusy && !preview} disabled={code.trim().length < 6} />
        {preview ? (
          <View style={styles.inviteBox}>
            <Text style={styles.previewText}>
              {preview.direction === "woman_invites_partner"
                ? `${preview.inviterFirstName} invited you to follow her cycle so you can support her. She controls what you see.`
                : `${preview.inviterFirstName} would like to follow your cycle updates. Accepting lets them see only what you choose to share.`}
            </Text>
            <Button title="Accept and connect" onPress={accept} loading={joinBusy} />
          </View>
        ) : null}
        {joinMessage ? <Notice tone={joinMessage.tone}>{joinMessage.text}</Notice> : null}
      </SettingsCard>

      <SettingsCard icon="cafe-outline" title="Your comfort list" description="Snacks, drinks and things that help. Shown to partners you allow, so they know what to bring.">
        <View style={styles.wrap}>
          {comfort.map((c) => (
            <Pressable key={c} onPress={() => saveComfort(comfort.filter((x) => x !== c))} accessibilityRole="button" accessibilityLabel={`Remove ${c}`} style={styles.tag}>
              <Text style={styles.tagText}>{c}</Text>
              <Ionicons name="close" size={14} color={colors.brand700} />
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. dark chocolate"
            placeholderTextColor={colors.muted}
            maxLength={40}
            accessibilityLabel="Add a comfort item"
            onSubmitEditing={() => {
              const v = draft.trim();
              if (v && !comfort.includes(v) && comfort.length < 12) saveComfort([...comfort, v]);
              setDraft("");
            }}
            returnKeyType="done"
          />
        </View>
      </SettingsCard>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, gap: 16 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  subhead: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  link: { fontSize: 13, fontWeight: "700", color: colors.brand600 },
  skeleton: { height: 80, borderRadius: radius.md, backgroundColor: colors.neutral200 },
  inviteBox: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: 14, gap: 10 },
  inviteNote: { fontSize: 13, fontWeight: "600", color: colors.ink900 },
  previewText: { fontSize: 14, color: colors.ink900, lineHeight: 20 },
  code: { fontSize: 30, fontWeight: "700", letterSpacing: 4, textAlign: "center", color: colors.brand700, marginVertical: 4 },
  openInvite: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  partner: { borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.md, padding: 12, gap: 10, backgroundColor: colors.white },
  partnerHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand100, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: colors.brand700 },
  partnerName: { fontSize: 15, fontWeight: "700", color: colors.ink900 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brand50, borderRadius: 999, paddingHorizontal: 12, minHeight: 36 },
  tagText: { fontSize: 13, color: colors.brand700, fontWeight: "600" },
  input: { height: 46, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white },
});
