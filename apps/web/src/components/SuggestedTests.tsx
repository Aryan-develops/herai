import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, LocateFixed } from "lucide-react";
import { api, type TestSuggestion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Rating, rupees } from "@/components/care-bits";

/** Follow-up tests worth asking about for a report's flagged values, with partners that offer them. */
export function SuggestedTests({ reportId }: { reportId: string }) {
  const [items, setItems] = useState<TestSuggestion[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => {
    api.suggestTests(reportId, coords).then(({ suggestions }) => setItems(suggestions)).catch(() => setItems([]));
  }, [reportId, coords]);

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-5 shadow-soft sm:p-6" aria-labelledby="sug-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sug-h" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <FlaskConical className="h-5 w-5 text-violet-600" aria-hidden="true" />
          Tests worth asking about
        </h2>
        {!coords && (
          <Button size="sm" variant="outline" onClick={locate}>
            <LocateFixed className="h-4 w-4" aria-hidden="true" /> Sort by nearest
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-700/75">Based on the values flagged in this report. Ask your doctor whether these make sense for you.</p>

      <ul className="mt-4 space-y-4">
        {items.map((s) => (
          <li key={s.test}>
            <p className="font-medium text-ink-900">{s.test}</p>
            <p className="text-xs text-neutral-500">Because of: {s.because.join(", ")}</p>
            {s.providers.length === 0 ? (
              <p className="mt-1.5 text-sm text-ink-700/70">No partner lab offers this yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {s.providers.map((p) => (
                  <li key={p.id}>
                    <Link to={`/care/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-300">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">{p.name}</span>
                        <span className="block text-xs text-neutral-500">{p.city}{p.distanceKm !== null ? ` · ${p.distanceKm} km` : ""}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Rating avg={p.ratingAvg} count={p.ratingCount} />
                        <span className="tabular text-sm font-semibold text-ink-900">{rupees(p.matchedService.priceInr)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
