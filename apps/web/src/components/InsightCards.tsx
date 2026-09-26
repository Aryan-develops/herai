import { Activity, Apple, Brain, CalendarHeart, HeartHandshake, MessageCircleHeart, Stethoscope, type LucideIcon } from "lucide-react";
import type { InsightCard, InsightTone } from "@/lib/api";
import { cn } from "@/lib/utils";

const TONES: Record<InsightTone, { icon: LucideIcon; box: string; chip: string }> = {
  body: { icon: HeartHandshake, box: "border-brand-100 bg-brand-50", chip: "bg-brand-100 text-brand-700" },
  food: { icon: Apple, box: "border-sage-100 bg-sage-50", chip: "bg-sage-100 text-sage-700" },
  move: { icon: Activity, box: "border-violet-100 bg-violet-50", chip: "bg-violet-100 text-violet-700" },
  mind: { icon: Brain, box: "border-peach-100 bg-peach-50", chip: "bg-peach-100 text-peach-600" },
  care: { icon: Stethoscope, box: "border-amber-100 bg-amber-50", chip: "bg-amber-100 text-amber-700" },
  talk: { icon: MessageCircleHeart, box: "border-brand-100 bg-brand-50", chip: "bg-brand-100 text-brand-700" },
  plan: { icon: CalendarHeart, box: "border-violet-100 bg-violet-50", chip: "bg-violet-100 text-violet-700" },
};

/** Swipeable row of small daily-insight cards; a plain grid on wider screens. */
export function InsightCards({ title, cards }: { title: string; cards: InsightCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {cards.map((c) => {
          const t = TONES[c.tone];
          const Icon = t.icon;
          return (
            <article key={c.id} className={cn("w-[78%] shrink-0 snap-center rounded-2xl border p-4 sm:w-auto", t.box)}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.chip)}>
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-ink-900">{c.title}</h3>
              <p className="mt-1 text-sm text-ink-700">{c.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
