import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarPlus, Droplet, Trash2 } from "lucide-react";
import { api, type TimelineEvent } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Extreme"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .getTimeline()
      .then(({ events }) => setEvents(events))
      .catch(() => setError("Couldn't load your timeline. Please refresh."));
  }

  useEffect(load, []);

  async function remove(event: TimelineEvent) {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    try {
      if (event.type === "symptom") await api.deleteSymptomLog(event.id);
      else await api.deleteCycleLog(event.id);
      load();
    } catch {
      setError("Couldn't delete that entry. Please try again.");
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events ?? []) {
      const key = dayLabel(e.loggedAt);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Health timeline</h1>
          <p className="mt-1.5 text-ink-700/75">Every symptom and period entry you've logged.</p>
        </div>
        <Link to="/log">
          <Button>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Log entry
          </Button>
        </Link>
      </div>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}

      <div className="mt-8 max-w-2xl">
        {events === null && !error && (
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-20 w-full rounded-2xl" />
            <div className="skeleton h-20 w-full rounded-2xl" />
            <div className="skeleton h-20 w-full rounded-2xl" />
          </div>
        )}

        {events?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/70 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <CalendarPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-ink-900">Nothing logged yet</p>
            <p className="mt-1 text-sm text-ink-700/70">Your first entry starts your timeline.</p>
            <Link to="/log" className="mt-5 inline-block">
              <Button>Log your first entry</Button>
            </Link>
          </div>
        )}

        {groups.map(([label, items]) => (
          <section key={label} className="mb-8" aria-label={label}>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{label}</h2>
            <ol className="space-y-2.5">
              {items.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      event.type === "cycle" ? "bg-brand-100 text-brand-600" : "bg-violet-100 text-violet-600"
                    )}
                  >
                    {event.type === "cycle" ? (
                      <Droplet className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Activity className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        {event.type === "cycle" ? `${event.data.flow[0].toUpperCase()}${event.data.flow.slice(1)} flow` : "Symptoms"}
                      </p>
                      <p className="tabular text-xs text-neutral-500">
                        {new Date(event.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>

                    {event.type === "symptom" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.data.symptoms.map((s, i) => (
                          <span key={i} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {s.name} · {SEVERITY_LABEL[s.severity]}
                          </span>
                        ))}
                      </div>
                    )}

                    {event.type === "cycle" && event.data.symptoms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.data.symptoms.map((s, i) => (
                          <span key={i} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {event.data.notes && <p className="mt-2 text-sm text-ink-700/80">{event.data.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(event)}
                    aria-label={`Delete ${event.type === "cycle" ? "period" : "symptom"} entry from ${dayLabel(event.loggedAt)}`}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
