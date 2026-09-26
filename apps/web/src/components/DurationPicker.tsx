import { Timer } from "lucide-react";
import { DURATIONS } from "@/lib/duration";
import { cn } from "@/lib/utils";

/** Optional "How long did it last?" chips; tap again to clear. */
export function DurationPicker({ value, onChange, label = "How long did it last?" }: { value: number | undefined; onChange: (m: number | undefined) => void; label?: string }) {
  return (
    <fieldset>
      <legend className="flex items-center gap-1.5 text-sm font-medium text-ink-800">
        <Timer className="h-4 w-4 text-brand-600" aria-hidden="true" />
        {label} <span className="font-normal text-ink-700/60">(optional)</span>
      </legend>
      <div role="group" className="mt-2 flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d.minutes}
            type="button"
            aria-pressed={value === d.minutes}
            onClick={() => onChange(value === d.minutes ? undefined : d.minutes)}
            className={cn(
              "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
              value === d.minutes ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
