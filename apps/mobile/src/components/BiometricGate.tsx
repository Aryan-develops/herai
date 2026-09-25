import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { authenticate, biometricLabel, biometricLockEnabled } from "../lib/biometric";
import { Button } from "./ui";
import { colors } from "../theme";

const RELOCK_AFTER_MS = 60_000;

/**
 * Optional app lock. When turned on in Settings the app asks for Face ID / fingerprint on launch and again
 * after it has been in the background for a minute. Nothing is rendered behind the lock screen.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [locked, setLocked] = useState(biometricLockEnabled());
  const [label, setLabel] = useState("Face ID");
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setFailed(false);
    const ok = await authenticate("Unlock HERAI");
    prompting.current = false;
    if (ok) setLocked(false);
    else setFailed(true);
  }, []);

  useEffect(() => {
    biometricLabel().then(setLabel);
  }, []);

  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
      } else if (state === "active") {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (away !== null && Date.now() - away > RELOCK_AFTER_MS && biometricLockEnabled()) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  if (!locked) return <>{children}</>;

  return (
    <View style={styles.screen}>
      <View style={styles.icon}>
        <Ionicons name="lock-closed" size={30} color={colors.onBrand} />
      </View>
      <Text style={styles.title}>HERAI is locked</Text>
      <Text style={styles.body}>{failed ? `That didn't work. Try ${label} again.` : `Use ${label} to open your private health data.`}</Text>
      <View style={styles.actions}>
        <Button title={`Unlock with ${label}`} onPress={unlock} />
        <Button title="Log out instead" variant="ghost" onPress={() => logout()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral50, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand600, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink900 },
  body: { fontSize: 14, color: colors.ink700, textAlign: "center", lineHeight: 20 },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 12 },
});
