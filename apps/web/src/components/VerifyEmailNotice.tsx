import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

/** "Check your inbox" panel with a resend button. Used after sign-up and when a login is blocked until verification. */
export function VerifyEmailNotice({ email, intro }: { email: string; intro?: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await api.resendVerification(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that email. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-center" role="status">
      <MailCheck className="mx-auto h-10 w-10 text-brand-600" aria-hidden="true" />
      <p className="text-ink-700">
        {intro ?? "We sent a confirmation link to"} <strong className="break-all text-ink-900">{email}</strong>. Open it to activate your account, then log in. Check spam if you don't see it.
      </p>
      {sent && <Alert tone="info">Sent again. It can take a minute to arrive.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={busy}>
        {busy && <Spinner />}
        Send the email again
      </Button>
    </div>
  );
}
