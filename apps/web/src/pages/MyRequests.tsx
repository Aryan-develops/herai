import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { api, ApiError, type CareRequest } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { KIND_LABEL, StarPicker, StatusPill, formatSlot } from "@/components/care-bits";

export function MyRequests() {
  const [requests, setRequests] = useState<CareRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function load() {
    api
      .listCareRequests()
      .then(({ requests }) => setRequests(requests))
      .catch(() => setError("Couldn't load your requests."));
  }
  useEffect(load, []);

  async function cancel(id: string) {
    if (!window.confirm("Cancel this request? The provider will lose access to anything you shared.")) return;
    try {
      await api.cancelCareRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel that request.");
    }
  }

  async function submitReview(id: string) {
    if (rating === 0) return;
    try {
      await api.reviewCareRequest(id, { rating, comment: comment || undefined });
      setReviewing(null);
      setRating(0);
      setComment("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your review.");
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">My care requests</h1>
      <p className="mt-1.5 text-ink-700/75">Tests, appointments and call-backs you've requested.</p>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}

      <div className="mt-6 max-w-2xl">
        {requests === null && !error && <div className="space-y-3" aria-hidden="true"><div className="skeleton h-28 w-full rounded-3xl" /><div className="skeleton h-28 w-full rounded-3xl" /></div>}

        {requests?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/70 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600"><CalendarCheck className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-4 font-display text-lg font-semibold text-ink-900">No requests yet</p>
            <p className="mt-1 text-sm text-ink-700/70">Find a lab or doctor and request a test or appointment.</p>
            <Link to="/care" className="mt-5 inline-block"><Button>Find care</Button></Link>
          </div>
        )}

        <ul className="space-y-3">
          {requests?.map((r) => (
            <li key={r.id} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{KIND_LABEL[r.kind]}</p>
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    {r.provider ? <Link to={`/care/${r.provider.id}`} className="hover:underline">{r.provider.name}</Link> : "Provider"}
                  </h2>
                  {r.serviceName && <p className="text-sm text-ink-700/80">{r.serviceName}</p>}
                </div>
                <StatusPill status={r.status} />
              </div>

              {r.slotStartsAt && <p className="mt-2 text-sm font-medium text-ink-900">{formatSlot(r.slotStartsAt)}</p>}
              {r.message && <p className="mt-1.5 text-sm text-ink-700/80">"{r.message}"</p>}
              {r.providerNote && <p className="mt-2 rounded-2xl bg-sage-50 p-3 text-sm text-ink-900"><span className="font-semibold">From the provider:</span> {r.providerNote}</p>}
              {r.meetingUrl && r.status === "accepted" && (
                <a href={r.meetingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                  <Button size="sm"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Join video call</Button>
                </a>
              )}

              {(r.sharedProfile || r.sharedReportCount > 0) && r.status !== "cancelled" && r.status !== "declined" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  Sharing {[r.sharedProfile && "your profile", r.sharedReportCount > 0 && `${r.sharedReportCount} report${r.sharedReportCount > 1 ? "s" : ""}`].filter(Boolean).join(" and ")}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(r.status === "new" || r.status === "accepted") && <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel request</Button>}
                {r.status === "completed" && !r.reviewed && reviewing !== r.id && <Button size="sm" variant="soft" onClick={() => setReviewing(r.id)}>Leave a review</Button>}
                {r.status === "completed" && r.reviewed && <span className="text-xs text-neutral-500">Thanks for your review</span>}
                {r.provider?.phone && r.status !== "cancelled" && <a href={`tel:${r.provider.phone}`}><Button size="sm" variant="ghost">Call</Button></a>}
              </div>

              {reviewing === r.id && (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-ink-900">How was it?</p>
                  <StarPicker value={rating} onChange={setRating} />
                  <label htmlFor={`c-${r.id}`} className="sr-only">Comment</label>
                  <Textarea id={`c-${r.id}`} className="mt-2" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional: share what went well" />
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={rating === 0} onClick={() => submitReview(r.id)}>Submit review</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReviewing(null)}>Not now</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
