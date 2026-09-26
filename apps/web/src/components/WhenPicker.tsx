import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local `YYYY-MM-DDTHH:mm` for a datetime-local input. */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Choice = "now" | "morning" | "yesterday" | "custom";

/**
 * "When did this happen?" Quick choices for the common cases plus a custom date and time, so entries can be
 * added for a day you forgot. `value` is an ISO timestamp, or undefined for "now" (the server stamps it).
 */
export function WhenPicker({ value, onChange }: { value: string | undefined; onChange: (iso: string | undefined) => void }) {
  const [choice, setChoice] = useState<Choice>(value ? "custom" : "now");
  const [custom, setCustom] = useState(value ? toLocalInput(new Date(value)) : toLocalInput(new Date()));
  const max = toLocalInput(new Date());

  function pick(next: Choice) {
    setChoice(next);
    if (next === "now") onChange(undefined);
    if (next === "morning") {
      const d = new Date();
      d.setHours(8, 0, 0, 0);
      onChange(d.getTime() > Date.now() ? new Date(Date.now() - 3600 * 1000).toISOString() : d.toISOString());
    }
    if (next === "yesterday") {
      const d = new Date(Date.now() - DAY_MS);
      d.setHours(12, 0, 0, 0);
      onChange(d.toISOString());
    }
    if (next === "custom") onChange(new Date(custom).toISOString());
  }

  const options: { id: Choice; label: string }[] = [
    { id: "now", label: "Now" },
    { id: "morning", label: "This morning" },
    { id: "yesterday", label: "Yesterday" },
    { id: "custom", label: "Pick date & time" },
  ];

  return (
    <fieldset>
      <legend className="flex items-center gap-1.5 text-sm font-medium text-ink-800">
        <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden="true" />
        When did this happen?
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={choice === o.id}
            onClick={() => pick(o.id)}
            className={cn(
              "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
              choice === o.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {choice === "custom" && (
        <input
          type="datetime-local"
          value={custom}
          max={max}
          aria-label="Date and time"
          onChange={(e) => {
            setCustom(e.target.value);
            if (e.target.value) onChange(new Date(e.target.value).toISOString());
          }}
          className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink-900 shadow-soft focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none sm:w-72"
        />
      )}
    </fieldset>
  );
}
