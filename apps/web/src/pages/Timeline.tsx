import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarPlus, Droplet, Trash2 } from "lucide-react";
import { api, type TimelineEvent } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Extreme"];

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  function load() {
    api.getTimeline().then(({ events }) => setEvents(events));
  }

  useEffect(load, []);

  async function remove(event: TimelineEvent) {
    if (event.type === "symptom") {
      await api.deleteSymptomLog(event.id);
    } else {
      await api.deleteCycleLog(event.id);
    }
    load();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Health timeline</h1>
          <p className="mt-1 text-ink-700/70">Every symptom and cycle entry you've logged.</p>
        </div>
        <Link to="/log">
          <Button>
            <CalendarPlus className="h-4 w-4" />
            Log entry
          </Button>
        </Link>
      </div>

      <div className="mt-8 max-w-2xl">
        {events === null && <p className="text-sm text-ink-700/60">Loading…</p>}

        {events?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
            <p className="text-ink-700/70">Nothing logged yet.</p>
            <Link to="/log" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                Log your first entry
              </Button>
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <ol className="relative space-y-4 border-l border-neutral-200 pl-6">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  className={`absolute top-1.5 -left-[29px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-neutral-50 ${
                    event.type === "cycle" ? "bg-brand-500" : "bg-violet-500"
                  }`}
                />
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-ink-700/50">
                      {event.type === "cycle" ? (
                        <Droplet className="h-3.5 w-3.5" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                      {new Date(event.loggedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(event)}
                      className="text-neutral-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {event.type === "symptom" ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.data.symptoms.map((s, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                        >
                          {s.name} · {SEVERITY_LABEL[s.severity]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 capitalize">
                        {event.data.flow} flow
                      </span>
                    </div>
                  )}

                  {event.data.notes && (
                    <p className="mt-2 text-sm text-ink-700/70">{event.data.notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
