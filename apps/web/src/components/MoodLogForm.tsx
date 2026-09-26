import { useState } from "react";
import { api, ApiError, type Mood, type Need } from "@/lib/api";
import { NEEDS } from "@/lib/phases";
import { INTENSITY_LABELS, MOOD_OPTIONS } from "@/components/partner/moodIcons";
import { WhenPicker } from "@/components/WhenPicker";
import { DurationPicker } from "@/components/DurationPicker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Full mood entry for the Log page: mood, how much, an optional "I need…" signal and when it happened. */
export function MoodLogForm({ onDone }: { onDone: () => void }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [need, setNeed] = useState<Need | null>(null);
  const [when, setWhen] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!mood) {
      setError("Pick how you're feeling.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createMoodLog({ mood, energy: amount ?? undefined, need: need ?? undefined, loggedAt: when, durationMinutes: duration });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <WhenPicker value={when} onChange={setWhen} />

      <fieldset>
        <legend className="text-sm font-medium text-ink-800">How are you feeling?</legend>
        <div role="group" className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {MOOD_OPTIONS.map(({ id, label, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mood === id}
              onClick={() => setMood(mood === id ? null : id)}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-all active:scale-95",
                mood === id ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
              )}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tone)}>
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-ink-800">How much? (optional)</legend>
        <div role="group" className="mt-2 grid grid-cols-5 gap-1.5">
          {INTENSITY_LABELS.map((label, i) => {
            const n = i + 1;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={amount === n}
                onClick={() => setAmount(amount === n ? null : n)}
                className={cn(
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border text-xs font-medium transition-all active:scale-95",
                  amount === n ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft" : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-300",
                )}
              >
                <span className="tabular font-display text-lg font-semibold">{n}</span>
                <span className="hidden sm:block">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-neutral-500 sm:hidden">{amount ? INTENSITY_LABELS[amount - 1] : "From a little to very much"}</p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-ink-800">Let your partner know (optional)</legend>
        <p className="text-xs text-ink-700/60">Only people you share your mood with can see this.</p>
        <div role="group" className="mt-2 flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-pressed={need === n.id}
              onClick={() => setNeed(need === n.id ? null : n.id)}
              className={cn(
                "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
                need === n.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
              )}
            >
              {n.label}
            </button>
          ))}
        </div>
      </fieldset>

      <DurationPicker value={duration} onChange={setDuration} label="How long has it lasted?" />

      {error && <Alert tone="error">{error}</Alert>}
      <div className="sticky bottom-[4.75rem] z-10 -mx-5 -mb-5 rounded-b-3xl border-t border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7 xl:static xl:m-0 xl:border-0 xl:bg-transparent xl:p-0">
        <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Saving…" : "Save mood"}
        </Button>
      </div>
    </div>
  );
}
