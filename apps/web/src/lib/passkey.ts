import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Session } from "@/lib/session";

// Supabase's own passkey API is explicitly experimental (opt-in flag, "may
// change without notice" per their docs) and deliberately leaves the actual
// WebAuthn ceremony to the caller — @simplewebauthn/browser is the standard
// library for that half, and its optionsJSON shape matches what
// startRegistration/startAuthentication return.

export async function loginWithPasskey(): Promise<{ session: Session }> {
  const { data: options, error: startError } = await supabaseBrowser.auth.passkey.startAuthentication();
  if (startError || !options) throw new Error(startError?.message ?? "Could not start passkey sign-in");

  const credential = await startAuthentication({ optionsJSON: options.options });

  const { data, error } = await supabaseBrowser.auth.passkey.verifyAuthentication({
    challengeId: options.challenge_id,
    credential,
  });
  if (error || !data.session) throw new Error(error?.message ?? "Passkey sign-in failed");

  return {
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    },
  };
}

// Registering a passkey needs an authenticated Supabase session first (you're
// adding a credential to an existing account) — pass the session this app
// already holds (see lib/session.ts) right after login/register.
export async function registerPasskey(session: Session): Promise<void> {
  await supabaseBrowser.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  const { data: options, error: startError } = await supabaseBrowser.auth.passkey.startRegistration();
  if (startError || !options) throw new Error(startError?.message ?? "Could not start passkey registration");

  const credential = await startRegistration({ optionsJSON: options.options });

  const { error } = await supabaseBrowser.auth.passkey.verifyRegistration({
    challengeId: options.challenge_id,
    credential,
  });
  if (error) throw new Error(error.message ?? "Passkey registration failed");
}
