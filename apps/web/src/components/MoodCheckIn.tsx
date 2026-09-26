import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { api, ApiError, type Mood, type MoodInsight, type Need } from "@/lib/api";
import { NEEDS } from "@/lib/phases";
import { INTENSITY_LABELS, MOOD_OPTIONS, moodOption } from "@/components/partner/moodIcons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** One-tap daily check-in. The optional "I need…" signal is the most useful thing a partner can see. */
export function MoodCheckIn({ onSaved }: { onSaved?: () => void } = {}) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [need, setNeed] = useState<Need | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMood, setSavedMood] = useState<Mood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<MoodInsight | null>(null);

  useEffect(() => {
    api
      .listMoodLogs(1)
      .then(({ moods }) => {
        const today = moods[0];
        if (today && Date.now() - new Date(today.loggedAt).getTime() < 12 * 3600 * 1000) setSavedMood(today.mood);
      })
      .catch(() => {});
    api.moodInsights().then(setInsight).catch(() => {});
  }, []);

  async function save() {
    if (!mood) return;
    setSaving(true);
    setError(null);
    try {
      await api.createMoodLog({ mood, energy: energy ?? undefined, need: need ?? undefined });
      setSavedMood(mood);
      onSaved?.();
      setMood(null);
      setEnergy(null);
      setNeed(null);
      api.moodInsights().then(setInsight).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const Saved = savedMood ? moodOption(savedMood) : null;

  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">How are you feeling?</h2>
            <p className="mt-0.5 text-sm text-ink-700/70">A quick check-in helps you spot patterns.</p>
          </div>
          {Saved && !mood && (
            <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", Saved.tone)}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Logged: {Saved.label}
            </span>
          )}
        </div>

        <div role="group" aria-label="Mood" className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {MOOD_OPTIONS.map(({ id, label, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMood(id === mood ? null : id)}
              aria-pressed={mood === id}
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

        {mood && (
          <div className="mt-4 space-y-4 animate-fade-up">
            <div>
              <p className="text-sm font-medium text-ink-800">How much? (optional)</p>
              <div role="group" aria-label="How much" className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergy(energy === n ? null : n)}
                    aria-pressed={energy === n}
                    aria-label={`${INTENSITY_LABELS[n - 1]}, ${n} of 5`}
                    className={cn(
                      "tabular h-11 min-w-11 flex-1 cursor-pointer rounded-xl border text-sm font-medium transition-colors",
                      energy === n ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-700/60">{energy ? INTENSITY_LABELS[energy - 1] : "From a little to very much"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-800">Let your partner know (optional)</p>
              <p className="text-xs text-ink-700/60">Only people you share your mood with can see this.</p>
              <div role="group" aria-label="What I need" className="mt-2 flex flex-wrap gap-2">
                {NEEDS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNeed(need === n.id ? null : n.id)}
                    aria-pressed={need === n.id}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors",
                      need === n.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                    )}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : "Save check-in"}
            </Button>
          </div>
        )}

        {insight?.insight && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-sm text-violet-700">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {insight.insight.message}
          </p>
        )}
        {insight && !insight.ready && (insight.needed ?? 0) > 0 && (
          <p className="mt-3 text-xs text-ink-700/60">Log {insight.needed} more check-in{insight.needed === 1 ? "" : "s"} to unlock mood patterns.</p>
        )}
      </CardContent>
    </Card>
  );
}
