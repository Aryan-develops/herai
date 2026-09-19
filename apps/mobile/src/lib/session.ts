import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Mirrors apps/web/src/lib/session.ts, backed by SecureStore instead of
 * localStorage — the concrete reason cookie auth had to go in Phase 1: a
 * phone has no cookie jar. SecureStore is Keychain (iOS) / Keystore
 * (Android) backed, not plain storage.
 *
 * `expo-secure-store` has no native module on web — there is no Keychain
 * equivalent in a browser, so it throws rather than pretending to be secure.
 * The web target here is a developer convenience (`expo start --web`) for
 * fast UI iteration without a device, not a shipped platform (App/Play
 * Store are the real targets), so localStorage is an acceptable fallback
 * for that one case.
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

const KEY = "herai.session";

export async function getSession(): Promise<Session | null> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, raw);
  } else {
    await SecureStore.setItemAsync(KEY, raw);
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
