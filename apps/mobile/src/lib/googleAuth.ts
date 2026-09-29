import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL } from "../config";
import { api, ApiError } from "./api";
import type { Session } from "./session";

// Only works in a custom dev client or a real build (EAS/APK) — never in
// vanilla Expo Go. Expo Go apps share the "exp://" scheme and get a
// different, IP-dependent redirect URL every session, so there's no fixed
// URL to register with Google as an authorized redirect; this app's own
// "lunee://" scheme (registered in Supabase's redirect allowlist) is what
// makes a stable round trip possible at all.
const REDIRECT_URI = Linking.createURL("oauth/callback");

/**
 * Opens Google's consent screen in an in-app browser tab, then reads the
 * session Supabase hands back in the redirect URL's fragment — same protocol
 * as apps/web/src/pages/OAuthCallback.tsx, just delivered via a native
 * browser session instead of a page navigation.
 */
export async function signInWithGoogle(): Promise<void> {
  const startUrl = `${API_URL}/auth/oauth/google?redirectTo=mobile`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, REDIRECT_URI);

  if (result.type !== "success" || !result.url) {
    if (result.type === "cancel" || result.type === "dismiss") return;
    throw new ApiError(0, "Sign-in did not complete — please try again");
  }

  const hashIndex = result.url.indexOf("#");
  const params = new URLSearchParams(hashIndex >= 0 ? result.url.slice(hashIndex + 1) : "");
  const providerError = params.get("error_description");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (providerError || !accessToken || !refreshToken) {
    throw new ApiError(0, providerError ?? "Sign-in did not complete — please try again");
  }

  const session: Session = {
    accessToken,
    refreshToken,
    expiresAt: Number(params.get("expires_at")) || null,
  };
  await api.adoptSession(session);
}
