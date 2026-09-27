import { HeartHandshake, MessageCircleHeart, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PARTNER_PHASE_STYLE } from "@/lib/phases";
import { cn } from "@/lib/utils";

const PHASE_GUIDE: { key: keyof typeof PARTNER_PHASE_STYLE; title: string; say: string[]; avoid: string[] }[] = [
  {
    key: "menstrual",
    title: "During her period",
    say: ["\"Want a heating pad or some tea?\"", "\"Take it easy today, I've got this.\"", "\"Let me know if you need anything."],
    avoid: ["Making plans that assume she'll have full energy", "Commenting on mood changes as \"being dramatic\""],
  },
  {
    key: "pms",
    title: "In the PMS window",
    say: ["\"How are you feeling today?\"", "\"No pressure to be social if you're not up for it.\""],
    avoid: ["Dismissing symptoms as \"just PMS\"", "Starting arguments over small things"],
  },
  {
    key: "follicular",
    title: "Follicular phase",
    say: ["Good time to plan something active together"],
    avoid: [],
  },
  {
    key: "ovulation",
    title: "Fertile window",
    say: ["Energy and mood are often at their best — a good time for plans"],
    avoid: [],
  },
  {
    key: "luteal",
    title: "Luteal phase",
    say: ["\"Let's keep tonight low-key.\"", "Steady meals and sleep help — cooking together can be a small support"],
    avoid: ["Scheduling stressful conversations here if it can wait"],
  },
];

export function Guide() {
  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
          <HeartHandshake className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Guide</h1>
          <p className="text-sm text-ink-700/70">How to support her, phase by phase.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {PHASE_GUIDE.map((p) => {
          const style = PARTNER_PHASE_STYLE[p.key];
          return (
            <section key={p.key} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", style.chip)}>{style.short}</span>
                <h2 className="font-display text-lg font-semibold text-ink-900">{p.title}</h2>
              </div>
              {p.say.length > 0 && (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sage-700 uppercase">
                    <MessageCircleHeart className="h-3.5 w-3.5" aria-hidden="true" />
                    Try
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-700/90">
                    {p.say.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {p.avoid.length > 0 && (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand-700 uppercase">
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    Avoid
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-700/90">
                    {p.avoid.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-900">When to suggest a doctor</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-700/90">
          <li>Pain that stops her from normal activity, not relieved by usual pain relief</li>
          <li>Bleeding that soaks through protection every hour for several hours</li>
          <li>Symptoms that feel new, severe, or clearly different from her usual pattern</li>
          <li>She asks you to, or seems worried herself</li>
        </ul>
        <p className="mt-3 text-xs text-ink-700/60">
          This guide gives general suggestions based on an estimated cycle phase. It is not medical advice — always defer
          to what she tells you she needs, and to a clinician for anything concerning.
        </p>
      </section>
    </AppShell>
  );
}
