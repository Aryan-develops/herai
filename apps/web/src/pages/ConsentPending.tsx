import { useState } from "react";
import { MailCheck, XCircle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Shown to a minor whose guardian hasn't approved the account yet. */
export function ConsentPending() {
  const { user, logout, refreshUser } = useAuth();
  const declined = user?.consentStatus === "declined" || user?.consentStatus === "withdrawn";

  const [guardianEmail, setGuardianEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.resendConsentRequest({ guardianEmail });
      setSent(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={declined ? "Account not approved" : "Waiting for approval"}
      subtitle={
        declined
          ? "A parent or guardian needs to approve this account before you can use HERAI."
          : "We've sent a request to your parent or guardian."
      }
    >
      <div className="space-y-6">
        <div
          className={
            declined
              ? "flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-ink-700"
              : "flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-ink-800"
          }
        >
          {declined ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          )}
          <p>
            Because you're under 18, HERAI needs a parent or guardian's permission before it can
            record or analyse any health information. Nothing is processed until they approve.
          </p>
        </div>

        <form onSubmit={resend} className="space-y-3">
          <Label htmlFor="guardianEmail">Send to a different email</Label>
          <Input
            id="guardianEmail"
            type="email"
            required
            placeholder="parent@example.com"
            value={guardianEmail}
            onChange={(event) => setGuardianEmail(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </Button>
          {sent && <p className="text-sm text-sage-700">Request sent. They'll get a link to approve.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        <Button variant="ghost" className="w-full" onClick={() => logout()}>
          Log out
        </Button>
      </div>
    </AuthLayout>
  );
}
