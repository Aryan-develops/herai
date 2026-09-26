import { useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local `YYYY-MM-DDTHH:mm` for a datetime-local input. */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nice(d: Date): string {
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, today)) return `Today, ${time}`;
  if (sameDay(d, new Date(Date.now() - DAY_MS))) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

type Choice = "now" | "morning" | "yesterday" | "custom";

/**
 * Sits at the top of every log form. Collapsed, it is one line ("Logging for: Now"); tap to change it to this
 * morning, yesterday or any past date and time. `value` is an ISO timestamp, or undefined for "now".
 */
export function WhenPicker({ value, onChange }: { value: string | undefined; onChange: (iso: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
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
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
          <CalendarClock className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-ink-700/70">Logging for</span>
          <span className="block truncate text-sm font-semibold text-ink-900">{value ? nice(new Date(value)) : "Now"}</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-brand-700">
          {open ? "Done" : "Change"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="border-t border-brand-100 px-4 pt-3 pb-4 animate-fade-up">
          <div role="group" aria-label="When" className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={choice === o.id}
                onClick={() => pick(o.id)}
                className={cn(
                  "min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
                  choice === o.id ? "border-brand-400 bg-white text-brand-700 shadow-soft" : "border-neutral-200 bg-white/70 text-ink-700 hover:border-brand-300",
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
              className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink-900 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none sm:w-72"
            />
          )}
        </div>
      )}
    </div>
  );
}
