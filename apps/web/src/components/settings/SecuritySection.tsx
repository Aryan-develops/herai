import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import {
  deletePasskey,
  deviceSupportsBiometricPasskey,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  type PasskeyInfo,
} from "@/lib/passkey";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { SettingsCard } from "@/components/settings/SettingsCard";

function niceDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "never";
}

export function SecuritySection() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[] | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [biometric, setBiometric] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [security, setSecurity] = useState<{ providers: string[]; hasPassword: boolean } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) return;
    try {
      setPasskeys(await listPasskeys(session));
      setPasskeyError(null);
    } catch (err) {
      setPasskeys([]);
      setPasskeyError(err instanceof Error ? err.message : "Couldn't load your passkeys.");
    }
  }, []);

  useEffect(() => {
    load();
    deviceSupportsBiometricPasskey().then(setBiometric);
    api.getSecurity().then(setSecurity).catch(() => {});
  }, [load]);

  async function add() {
    const session = getSession();
    if (!session) return;
    setBusy(true);
    setPasskeyError(null);
    try {
      await registerPasskey(session);
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong";
      // The browser throws "NotAllowedError" when the person cancels the Face ID / fingerprint prompt.
      setPasskeyError(/NotAllowed|cancel/i.test(text) ? "Passkey setup was cancelled. Try again when you're ready." : text);
    } finally {
      setBusy(false);
    }
  }

  async function saveName(id: string) {
    const session = getSession();
    if (!session || !draftName.trim()) return;
    try {
      await renamePasskey(session, id, draftName.trim());
      setEditing(null);
      await load();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Couldn't rename that passkey.");
    }
  }

  async function remove(p: PasskeyInfo) {
    const session = getSession();
    if (!session) return;
    if (!window.confirm(`Remove "${p.name}"? You won't be able to sign in with it any more.`)) return;
    try {
      await deletePasskey(session, p.id);
      await load();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Couldn't remove that passkey.");
    }
  }

  async function changePassword() {
    setPwBusy(true);
    setPwMessage(null);
    try {
      await api.changePassword({ currentPassword: security?.hasPassword ? currentPw : undefined, newPassword: newPw });
      setCurrentPw("");
      setNewPw("");
      setPwMessage({ tone: "success", text: security?.hasPassword ? "Password changed." : "Password set. You can now sign in with it." });
      api.getSecurity().then(setSecurity).catch(() => {});
    } catch (err) {
      setPwMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't change your password." });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <SettingsCard id="security" icon={ShieldCheck} title="Sign-in and security" description="Passkeys let you sign in with Face ID, Touch ID or your fingerprint. No password to remember.">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Passkeys</h3>
            <Button size="sm" onClick={add} disabled={busy}>
              {busy ? <Spinner /> : <Fingerprint className="h-4 w-4" aria-hidden="true" />}
              Add a passkey
            </Button>
          </div>
          {biometric === false && (
            <p className="mt-2 text-xs text-ink-700/60">
              This device doesn't report Face ID, Touch ID or Windows Hello. You may only see the QR code and security key options.
            </p>
          )}
          {passkeyError && <Alert tone="error" className="mt-3">{passkeyError}</Alert>}

          <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {passkeys === null && (
              <li className="p-4">
                <div className="skeleton h-5 w-40" aria-hidden="true" />
              </li>
            )}
            {passkeys?.length === 0 && <li className="p-4 text-sm text-ink-700/70">No passkeys yet. Add one to sign in faster.</li>}
            {passkeys?.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  {editing === p.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveName(p.id);
                      }}
                      className="flex gap-2"
                    >
                      <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={120} aria-label="Passkey name" autoFocus />
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                    </form>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-700/60">
                        Added {niceDate(p.createdAt)} · Last used {niceDate(p.lastUsedAt)}
                      </p>
                    </>
                  )}
                </div>
                {editing !== p.id && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Rename ${p.name}`}
                      onClick={() => {
                        setEditing(p.id);
                        setDraftName(p.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${p.name}`} onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-900">Sign-in methods</h3>
          <p className="mt-1 text-sm text-ink-700/70">
            {security
              ? [security.hasPassword && "Password", security.providers.includes("google") && "Google", (passkeys?.length ?? 0) > 0 && "Passkey"]
                  .filter(Boolean)
                  .join(" · ") || "Loading…"
              : "Loading…"}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            changePassword();
          }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-ink-900">{security?.hasPassword === false ? "Set a password" : "Change password"}</h3>
          {security?.hasPassword !== false && (
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current password</Label>
              <PasswordInput id="pw-current" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New password</Label>
            <PasswordInput id="pw-new" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" />
          </div>
          {pwMessage && <Alert tone={pwMessage.tone}>{pwMessage.text}</Alert>}
          <Button type="submit" variant="outline" disabled={pwBusy || newPw.length < 8 || (security?.hasPassword !== false && !currentPw)}>
            {pwBusy && <Spinner />}
            {security?.hasPassword === false ? "Set password" : "Update password"}
          </Button>
        </form>
      </div>
    </SettingsCard>
  );
}
