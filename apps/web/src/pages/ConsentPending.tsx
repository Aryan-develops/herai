import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
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
        <Alert tone={declined ? "warning" : "info"}>
          Because you're under 18, HERAI needs a parent or guardian's permission before it can record or analyse
          any health information. Nothing is processed until they approve.
        </Alert>

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
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            {busy ? "Sending…" : "Send request"}
          </Button>
          {sent && <Alert tone="success">Request sent. They'll get a link to approve.</Alert>}
          {error && <Alert tone="error">{error}</Alert>}
        </form>

        <Button variant="ghost" className="w-full" onClick={() => logout()}>
          Log out
        </Button>
      </div>
    </AuthLayout>
  );
}
