import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, ShieldCheck } from "lucide-react";
import { api, ApiError, type CareProvider, type CareSlot, type HealthReportRecord, type ProviderService, type RequestKind } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { KIND_LABEL, formatSlot, rupees } from "@/components/care-bits";
import { cn } from "@/lib/utils";

export interface RequestPreset {
  kind: RequestKind;
  service?: ProviderService;
  slot?: CareSlot;
}

/**
 * Sending a request is where health data leaves the patient's account, so the
 * consent step is explicit: it lists exactly what will be shared, and nothing
 * is shared unless the patient ticks it. Cancelling the request withdraws access.
 */
export function RequestSheet({
  provider,
  preset,
  onClose,
  onSent,
}: {
  provider: CareProvider;
  preset: RequestPreset;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [shareProfile, setShareProfile] = useState(false);
  const [reports, setReports] = useState<HealthReportRecord[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    api.listReports().then(({ reports }) => setReports(reports)).catch(() => setReports([]));
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createCareRequest({
        providerId: provider.id,
        kind: preset.kind,
        serviceId: preset.service?.id,
        slotId: preset.slot?.id,
        message: message || undefined,
        shareProfile,
        shareReportIds: selected,
        consent: true,
      });
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const sharing = shareProfile || selected.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="req-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="req-title" className="font-display text-xl font-semibold text-ink-900">
              {KIND_LABEL[preset.kind]} with {provider.name}
            </h2>
            <p className="mt-1 text-sm text-ink-700/75">
              {preset.service ? `${preset.service.name} · ${rupees(preset.service.priceInr)}` : null}
              {preset.slot ? `${preset.service ? " · " : ""}${formatSlot(preset.slot.startsAt)}` : null}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="req-msg">Message (optional)</Label>
          <Textarea id="req-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything they should know?" />
        </div>

        <fieldset className="mt-5 rounded-2xl border border-neutral-200 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-ink-900">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
            What to share (nothing by default)
          </legend>
          <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm text-ink-900">
            <input type="checkbox" checked={shareProfile} onChange={(e) => setShareProfile(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600" />
            <span>
              My health profile
              <span className="block text-xs text-neutral-500">Age range, conditions, medications, allergies, cycle length</span>
            </span>
          </label>

          {reports === null && <div className="skeleton mt-3 h-10 w-full" aria-hidden="true" />}
          {reports && reports.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-neutral-500">Lab reports</p>
              {reports.slice(0, 8).map((r) => {
                const on = selected.includes(r._id);
                return (
                  <label key={r._id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm", on ? "border-brand-400 bg-brand-50" : "border-neutral-200")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setSelected((s) => (on ? s.filter((x) => x !== r._id) : [...s, r._id]))}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
                    />
                    <span className="min-w-0 flex-1 truncate">{r.fileName}</span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-violet-50/70 p-4 text-sm text-ink-900">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600" />
          <span>
            {sharing
              ? `I agree to share the selected information with ${provider.name}. I can cancel this request any time to withdraw their access.`
              : `I agree to send this request to ${provider.name} with my name and message. No health information is shared.`}
          </span>
        </label>

        {error && <Alert tone="error" className="mt-4">{error}</Alert>}

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || !consent}>
          {busy && <Spinner />}
          {busy ? "Sending…" : "Send request"}
        </Button>
      </form>
    </div>
  );
}
