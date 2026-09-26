import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { usePrefs } from "../context/PrefsContext";
import { authenticate, biometricAvailable, biometricLabel, biometricLockEnabled, setBiometricLockEnabled } from "../lib/biometric";
import { registerForPush } from "../lib/push";
import { readThemePreference, writeThemePreference, type ThemePreference } from "../themePref";
import { Button, ErrorText, Field, Notice, ScreenTitle } from "../components/ui";
import { SettingsCard, ToggleRow } from "../components/settingsBits";
import { GetHelpButton } from "../components/GetHelp";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Settings">;

function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === o.id }}
          style={[styles.segmentItem, value === o.id && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, value === o.id && { color: colors.brand700 }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { user, refreshUser, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState("Face ID");
  const [bioOn, setBioOn] = useState(biometricLockEnabled());
  const [security, setSecurity] = useState<{ hasPassword: boolean; providers: string[] } | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const { prefs, update: updatePrefs, error: prefsError } = usePrefs();
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference());
  const [themeChanged, setThemeChanged] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setBioAvailable);
    biometricLabel().then(setBioLabel);
    api.getSecurity().then(setSecurity).catch(() => {});
  }, []);

  async function saveName() {
    try {
      await api.updateName(name.trim());
      await refreshUser();
      setNameMsg({ tone: "success", text: "Name updated." });
    } catch (err) {
      setNameMsg({ tone: "warning", text: err instanceof ApiError ? err.message : "Couldn't save that." });
    }
  }

  async function toggleBiometric(next: boolean) {
    if (next) {
      const ok = await authenticate(`Confirm to turn on ${bioLabel} lock`);
      if (!ok) return;
    }
    setBiometricLockEnabled(next);
    setBioOn(next);
  }

  async function changePassword() {
    setPwBusy(true);
    setPwMsg(null);
    setPwError(null);
    try {
      await api.changePassword({ currentPassword: security?.hasPassword ? currentPw : undefined, newPassword: newPw });
      setCurrentPw("");
      setNewPw("");
      setPwMsg({ tone: "success", text: security?.hasPassword ? "Password changed." : "Password set." });
      api.getSecurity().then(setSecurity).catch(() => {});
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Couldn't change your password.");
    } finally {
      setPwBusy(false);
    }
  }

  function changeTheme(next: ThemePreference) {
    setTheme(next);
    writeThemePreference(next);
    setThemeChanged(true);
  }

  async function exportData() {
    setExporting(true);
    setPrivacyError(null);
    try {
      const data = await api.exportData();
      await Share.share({ title: "My Lunee data", message: JSON.stringify(data, null, 2) });
    } catch (err) {
      setPrivacyError(err instanceof ApiError ? err.message : "Couldn't export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setPrivacyError(null);
    try {
      await api.deleteAccount();
      await logout().catch(() => {});
    } catch (err) {
      setPrivacyError(err instanceof ApiError ? err.message : "Couldn't delete your account. Nothing was removed.");
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Settings" subtitle="Your account, sign-in, sharing and privacy in one place." />

      <SettingsCard icon="person-outline" title="Profile" description="How you appear in Lunee.">
        <Field label="Name" value={name} onChangeText={setName} maxLength={120} autoComplete="name" />
        <Field label="Email" value={user?.email ?? ""} editable={false} />
        {nameMsg ? <Notice tone={nameMsg.tone}>{nameMsg.text}</Notice> : null}
        <Button title="Save name" onPress={saveName} disabled={!name.trim() || name.trim() === user?.name} />
        <Button title="Edit health profile" variant="outline" onPress={() => navigation.navigate("Onboarding")} />
      </SettingsCard>

      <SettingsCard icon="shield-checkmark-outline" title="Sign-in and security" description="Keep your health data private on this phone.">
        {bioAvailable ? (
          <ToggleRow label={`Unlock with ${bioLabel}`} hint="Ask for it each time the app opens or returns from the background." value={bioOn} onChange={toggleBiometric} />
        ) : (
          <Notice tone="info">
            {Platform.OS === "web" ? "Biometric unlock is available in the phone app." : "Set up Face ID or a fingerprint in your phone's settings to unlock Lunee with it."}
          </Notice>
        )}
        <Text style={styles.small}>
          Sign-in methods: {security ? [security.hasPassword && "Password", security.providers.includes("google") && "Google"].filter(Boolean).join(" · ") || "…" : "…"}. Passkeys can be added on the web app.
        </Text>
        <Text style={styles.subhead}>{security?.hasPassword === false ? "Set a password" : "Change password"}</Text>
        {security?.hasPassword !== false ? <Field label="Current password" secureTextEntry value={currentPw} onChangeText={setCurrentPw} autoComplete="current-password" /> : null}
        <Field label="New password" secureTextEntry value={newPw} onChangeText={setNewPw} placeholder="At least 8 characters" autoComplete="new-password" />
        <ErrorText>{pwError}</ErrorText>
        {pwMsg ? <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice> : null}
        <Button title={security?.hasPassword === false ? "Set password" : "Update password"} variant="outline" onPress={changePassword} loading={pwBusy} disabled={newPw.length < 8 || (security?.hasPassword !== false && !currentPw)} />
      </SettingsCard>

      <SettingsCard icon="heart-circle-outline" title="Partner and support circle" description="Let someone you trust support you better. You decide exactly what they see.">
        <Button title="Manage sharing and invites" onPress={() => navigation.navigate("PartnerSettings")} />
        {user?.isPartner ? <Button title="Open Partner home" variant="outline" onPress={() => navigation.navigate("Tabs", { screen: "Partner" } as never)} /> : null}
      </SettingsCard>

      <SettingsCard icon="notifications-outline" title="Notifications and language" description="For the daily support note when you follow someone.">
        {prefs ? (
          <>
            <ToggleRow label="Daily support note" hint="A short morning note when someone you follow is in a tougher phase." value={prefs.partnerDailyNudge} onChange={(v) => updatePrefs({ partnerDailyNudge: v })} />
            <ToggleRow label="By email" value={prefs.emailEnabled} onChange={(v) => updatePrefs({ emailEnabled: v })} />
            <ToggleRow label="On this phone" hint="Push notifications." value={prefs.pushEnabled} onChange={(v) => updatePrefs({ pushEnabled: v })} />
            <Text style={styles.subhead}>Language for tips</Text>
            <Segmented label="Language" value={prefs.language} onChange={(v) => updatePrefs({ language: v })} options={[{ id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }]} />
          </>
        ) : (
          <View style={styles.skeleton} />
        )}
        <ErrorText>{prefsError}</ErrorText>
      </SettingsCard>

      <SettingsCard icon="contrast-outline" title="Appearance" description="Pick the look that's easiest on your eyes.">
        <Segmented
          label="Theme"
          value={theme}
          onChange={changeTheme}
          options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "Match phone" }]}
        />
        {themeChanged ? <Notice tone="info">Close and reopen Lunee to apply the new look.</Notice> : null}
      </SettingsCard>

      <SettingsCard icon="lock-closed-outline" title="Privacy and your data" description="It's your data. Download it or delete it whenever you like.">
        <Button title="Download my data" variant="outline" onPress={exportData} loading={exporting} />
        <Button title="Manage what labs and doctors can see" variant="ghost" onPress={() => navigation.navigate("MyRequests")} />
        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>Delete my account</Text>
          <Text style={styles.dangerBody}>Permanently erases your account, logs, reports and everything shared with partners. This can't be undone.</Text>
          {!showDelete ? (
            <Button title="Delete my account" variant="outline" onPress={() => setShowDelete(true)} />
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={styles.small}>Type DELETE to confirm</Text>
              <TextInput style={styles.input} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Type DELETE to confirm" placeholderTextColor={colors.muted} />
              <Button
                title="Permanently delete"
                onPress={() =>
                  Alert.alert("Delete your account?", "This can't be undone.", [
                    { text: "Keep my account", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: deleteAccount },
                  ])
                }
                disabled={confirmText !== "DELETE"}
                loading={deleting}
              />
              <Button title="Keep my account" variant="ghost" onPress={() => { setShowDelete(false); setConfirmText(""); }} />
            </View>
          )}
        </View>
        <ErrorText>{privacyError}</ErrorText>
      </SettingsCard>

      <SettingsCard icon="help-buoy-outline" title="Help" description="Emergency numbers and care near you.">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <GetHelpButton onFindCare={(type) => navigation.navigate("Care", type ? { type } : undefined)} />
          <Pressable onPress={() => navigation.navigate("Care")} accessibilityRole="button">
            <Text style={styles.link}>Find labs and doctors</Text>
          </Pressable>
        </View>
        <Text style={styles.small}>Lunee gives general information, not medical advice. If you're in danger or feel very unwell, call your local emergency number.</Text>
      </SettingsCard>

      <Button title="Log out" variant="outline" onPress={() => logout()} />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: 20, gap: 16 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  subhead: { fontSize: 14, fontWeight: "700", color: colors.ink900 },
  link: { fontSize: 14, fontWeight: "700", color: colors.brand600 },
  skeleton: { height: 90, borderRadius: radius.md, backgroundColor: colors.neutral200 },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segmentActive: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.ink700 },
  danger: { backgroundColor: colors.red50, borderRadius: radius.md, padding: 14, gap: 8 },
  dangerTitle: { fontSize: 15, fontWeight: "700", color: colors.red600 },
  dangerBody: { fontSize: 13, color: colors.ink700, lineHeight: 18 },
  input: { height: 46, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: colors.ink900, backgroundColor: colors.white },
});
