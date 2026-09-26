import { useEffect, useState } from "react";
import { CheckCircle2, Headset, Mail } from "lucide-react";
import { api, ApiError, type SupportTopic } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TOPICS: { id: SupportTopic; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "cycle_tracking", label: "Cycle tracking" },
  { id: "partner", label: "Partner mode" },
  { id: "payments", label: "Payments" },
  { id: "bug", label: "Something's broken" },
  { id: "other", label: "Other" },
];

/** Customer support: send us a message from inside the app. Not for emergencies. */
export function SupportForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [topic, setTopic] = useState<SupportTopic>("other");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.supportInfo().then(({ email }) => setEmail(email)).catch(() => {});
  }, []);

  async function send() {
    setError(null);
    setSending(true);
    try {
      await api.sendSupport({ topic, message });
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700" aria-hidden="true">
          <Headset className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Customer support</p>
          <p className="text-xs text-neutral-500">Questions, problems or feedback. We reply by email.</p>
        </div>
        {!open && !sent && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Message us
          </Button>
        )}
      </div>

      {sent ? (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-sage-100 px-3 py-2 text-sm text-sage-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Thanks, we've got it and will reply by email.
        </p>
      ) : (
        open && (
          <div className="mt-3 space-y-3">
            <div role="group" aria-label="Topic" className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={topic === t.id}
                  onClick={() => setTopic(t.id)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors",
                    topic === t.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 text-ink-700 hover:border-brand-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label htmlFor="support-msg" className="sr-only">
              Your message
            </label>
            <Textarea id="support-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="How can we help?" rows={4} />
            <p className="text-xs text-neutral-500">Please don't include detailed health information. We can ask if we need it.</p>
            {error && <Alert tone="error">{error}</Alert>}
            <Button className="w-full" onClick={send} disabled={sending || message.trim().length < 10}>
              {sending && <Spinner />}
              {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        )
      )}

      {email && (
        <a href={`mailto:${email}`} className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {email}
        </a>
      )}
    </div>
  );
}
