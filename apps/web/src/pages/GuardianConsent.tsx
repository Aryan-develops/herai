import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { api, ApiError, type ConsentRequest } from "@/lib/api";

/**
 * Guardian-facing, reached from an emailed link. The guardian has no account,
 * so this page is deliberately outside the authenticated app.
 */
export function GuardianConsent() {
  const { token = "" } = useParams();
  const [request, setRequest] = useState<ConsentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getConsentRequest(token)
      .then(({ request }) => setRequest(request))
      .catch((err) => setError(err instanceof ApiError ? err.message : "This consent link is not valid"))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(decision: "grant" | "decline") {
    setSubmitting(true);
    setError(null);
    try {
      const { status } = await api.respondToConsent(token, decision);
      setRequest((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function withdraw() {
    setSubmitting(true);
    setError(null);
    try {
      const { status } = await api.withdrawConsent(token);
      setRequest((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthLayout title="Parental consent" subtitle="Checking this link…">
        <p className="text-sm text-ink-700/70">Loading…</p>
      </AuthLayout>
    );
  }

  if (error && !request) {
    return (
      <AuthLayout title="Link not valid" subtitle="We couldn't open this consent request.">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      </AuthLayout>
    );
  }

  if (!request) return null;

  if (request.status === "granted") {
    return (
      <AuthLayout title="Consent given" subtitle={`${request.minorName} can now use HERAI.`}>
        <div className="flex items-start gap-3 rounded-xl border border-sage-100 bg-sage-50 p-4 text-sm text-sage-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You approved this account. You can withdraw your consent at any time using this same link.</p>
        </div>
        <Button variant="outline" className="mt-6 w-full" onClick={withdraw} disabled={submitting}>
          {submitting ? "Withdrawing…" : "Withdraw consent"}
        </Button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </AuthLayout>
    );
  }

  if (request.status === "declined" || request.status === "withdrawn") {
    return (
      <AuthLayout
        title={request.status === "withdrawn" ? "Consent withdrawn" : "Consent declined"}
        subtitle={`${request.minorName} cannot use HERAI's health features.`}
      >
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-ink-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            No health data is being processed for this account. If this was a mistake, ask them to
            send a new consent request from the app.
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (request.expired) {
    return (
      <AuthLayout title="Link expired" subtitle="This consent request is no longer valid.">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Ask {request.minorName} to send a new request from the app.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Approve this account?"
      subtitle={`${request.minorName} is under 18 and needs your permission to use HERAI.`}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-ink-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div>
            <p className="font-medium">What you're agreeing to</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-ink-700">
              <li>They can record symptoms, cycle details and a health profile.</li>
              <li>They can upload lab reports for an automated explanation.</li>
              <li>This information is analysed to give health information — never a diagnosis.</li>
            </ul>
          </div>
        </div>

        <p className="text-sm text-ink-700/80">
          HERAI does not diagnose conditions and is not a substitute for a clinician. You can
          withdraw consent at any time using this link, which deletes nothing on its own but stops
          any further processing.
        </p>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => respond("grant")} disabled={submitting}>
            {submitting ? "Saving…" : "I give consent"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => respond("decline")} disabled={submitting}>
            Decline
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-ink-700/60">
          Sent to {request.guardianEmail}. If you weren't expecting this, you can ignore it — nothing
          is processed without your approval.
        </p>
      </div>
    </AuthLayout>
  );
}
