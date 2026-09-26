import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-brand-100 text-brand-700",
  sage: "bg-sage-100 text-sage-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  peach: "bg-peach-100 text-peach-600",
  neutral: "bg-neutral-100 text-neutral-600",
} as const;

export type BadgeTone = keyof typeof TONES;

/** Small status pill. Always pair colour with a text label. */
export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>{children}</span>;
}
