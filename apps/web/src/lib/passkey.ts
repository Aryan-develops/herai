import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Session } from "@/lib/session";

// Supabase's own passkey API is explicitly experimental (opt-in flag, "may
// change without notice" per their docs) and deliberately leaves the actual
// WebAuthn ceremony to the caller — @simplewebauthn/browser is the standard
// library for that half, and its optionsJSON shape matches what
// startRegistration/startAuthentication return.

// True only if the account definitely has a passkey. Any failure resolves to
// null (unknown) so callers can avoid nagging on a check that didn't complete.
export async function hasPasskey(session: Session): Promise<boolean | null> {
  try {
    await supabaseBrowser.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    const { data, error } = await supabaseBrowser.auth.passkey.list();
    if (error || !data) return null;
    return data.length > 0;
  } catch {
    return null;
  }
}

export async function loginWithPasskey(): Promise<{ session: Session }> {
  const { data: options, error: startError } = await supabaseBrowser.auth.passkey.startAuthentication();
  if (startError || !options) throw new Error(startError?.message ?? "Could not start passkey sign-in");

  // @simplewebauthn/browser and @supabase/auth-js each define their own
  // WebAuthn JSON types — structurally near-identical (both implement the
  // same WebAuthn spec JSON serialization) but not nominally assignable, so
  // TS rejects passing one library's type into the other's function. The
  // runtime values are the actual WebAuthn-spec JSON either way.
  const credential = await startAuthentication({ optionsJSON: options.options as never });

  const { data, error } = await supabaseBrowser.auth.passkey.verifyAuthentication({
    challengeId: options.challenge_id,
    credential: credential as never,
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

  // Supabase's default options leave the authenticator open, so some browsers offer only "scan QR
  // code" / "security key". Asking for the built-in authenticator makes the device show Face ID,
  // Touch ID or Windows Hello instead; the cross-device QR option stays reachable as a fallback.
  const registrationOptions = options.options as unknown as {
    authenticatorSelection?: Record<string, unknown>;
  };
  registrationOptions.authenticatorSelection = {
    ...registrationOptions.authenticatorSelection,
    authenticatorAttachment: "platform",
    residentKey: "required",
    requireResidentKey: true,
    userVerification: "preferred",
  };

  const credential = await startRegistration({ optionsJSON: options.options as never });

  const { error } = await supabaseBrowser.auth.passkey.verifyRegistration({
    challengeId: options.challenge_id,
    credential: credential as never,
  });
  if (error) throw new Error(error.message ?? "Passkey registration failed");
}

export interface PasskeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

async function withSession(session: Session) {
  await supabaseBrowser.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken });
}

export async function listPasskeys(session: Session): Promise<PasskeyInfo[]> {
  await withSession(session);
  const { data, error } = await supabaseBrowser.auth.passkey.list();
  if (error || !data) throw new Error(error?.message ?? "Couldn't load your passkeys");
  return data.map((p) => ({
    id: p.id,
    name: p.friendly_name || "Passkey",
    createdAt: p.created_at,
    lastUsedAt: p.last_used_at ?? null,
  }));
}

export async function renamePasskey(session: Session, id: string, name: string): Promise<void> {
  await withSession(session);
  const { error } = await supabaseBrowser.auth.passkey.update({ passkeyId: id, friendlyName: name.slice(0, 120) });
  if (error) throw new Error(error.message);
}

export async function deletePasskey(session: Session, id: string): Promise<void> {
  await withSession(session);
  const { error } = await supabaseBrowser.auth.passkey.delete({ passkeyId: id });
  if (error) throw new Error(error.message);
}

/** True when this device has a built-in authenticator (Face ID, Touch ID, Windows Hello, Android biometrics). */
export async function deviceSupportsBiometricPasskey(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}
