import { Star } from "lucide-react";
import type { RequestStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Rating({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (count === 0) return <span className={cn("text-xs text-neutral-500", className)}>New</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-ink-900", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
      <span className="tabular">{avg.toFixed(1)}</span>
      <span className="font-normal text-neutral-500">({count})</span>
      <span className="sr-only">rating out of 5 from {count} reviews</span>
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-transform active:scale-90"
        >
          <Star className={cn("h-7 w-7", n <= value ? "fill-amber-400 text-amber-400" : "text-neutral-300")} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

const STATUS: Record<RequestStatus, { label: string; tone: string }> = {
  new: { label: "Sent", tone: "bg-violet-100 text-violet-700" },
  accepted: { label: "Accepted", tone: "bg-sage-100 text-sage-700" },
  declined: { label: "Declined", tone: "bg-neutral-200 text-neutral-700" },
  completed: { label: "Completed", tone: "bg-brand-100 text-brand-700" },
  cancelled: { label: "Cancelled", tone: "bg-neutral-200 text-neutral-700" },
};

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS[status];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.tone)}>{s.label}</span>;
}

export const KIND_LABEL = { test: "Test", appointment: "Appointment", callback: "Call-back", teleconsult: "Video consult" } as const;

export function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function rupees(n: number | null): string {
  return n === null ? "Price on request" : `₹${n.toLocaleString("en-IN")}`;
}
