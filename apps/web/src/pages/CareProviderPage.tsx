import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Home, MapPin, Navigation, Phone, Video } from "lucide-react";
import { api, ApiError, type CareProvider, type CareReview, type CareSlot } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Rating, formatSlot, rupees } from "@/components/care-bits";
import { RequestSheet, type RequestPreset } from "@/components/RequestSheet";
import { cn } from "@/lib/utils";

export function CareProviderPage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<{ provider: CareProvider; slots: CareSlot[]; reviews: CareReview[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<RequestPreset | null>(null);
  const [sent, setSent] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<CareSlot | null>(null);

  function load() {
    api
      .getProvider(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this provider."));
  }
  useEffect(load, [id]);

  const slotsByDay = useMemo(() => {
    const m = new Map<string, CareSlot[]>();
    for (const s of data?.slots ?? []) {
      const key = new Date(s.startsAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return [...m.entries()];
  }, [data]);

  if (error) {
    return (
      <AppShell>
        <Alert tone="error">{error}</Alert>
        <Link to="/care" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">Back to care</Link>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <div className="space-y-4" aria-hidden="true">
          <div className="skeleton h-10 w-2/3" />
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="skeleton h-40 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  const { provider: p, reviews } = data;
  const tests = p.services.filter((s) => s.category === "test");
  const consults = p.services.filter((s) => s.category !== "test");
  const consultation = p.services.find((s) => s.category === "consultation");
  const teleconsult = p.services.find((s) => s.category === "teleconsult");
  const directions =
    p.lat !== null && p.lng !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`;
  const card = "mt-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6";

  return (
    <AppShell>
      <Link to="/care" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All care
      </Link>

      <div className="mt-2 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{p.name}</h1>
          {p.isSample && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Sample listing</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700/80">
          <Rating avg={p.ratingAvg} count={p.ratingCount} />
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", p.available ? "bg-sage-100 text-sage-700" : "bg-neutral-200 text-neutral-700")}>
            {p.available ? "Available" : "Unavailable right now"}
          </span>
          {p.specialties.length > 0 && <span>{p.specialties.join(", ")}</span>}
        </div>
        {p.availabilityNote && <p className="mt-2 text-sm text-ink-700/75">{p.availabilityNote}</p>}

        <p className="mt-4 flex items-start gap-2 text-sm text-ink-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />{p.address}</p>
        {p.hours && <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-700/80"><Clock className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />{p.hours}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {p.phone && <a href={`tel:${p.phone}`}><Button size="sm" variant="outline"><Phone className="h-4 w-4" aria-hidden="true" /> Call</Button></a>}
          <a href={directions} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Navigation className="h-4 w-4" aria-hidden="true" /> Directions</Button></a>
          <Button size="sm" variant="soft" onClick={() => setPreset({ kind: "callback" })} disabled={!p.available}>Request a call-back</Button>
        </div>

        {sent && <Alert tone="success" className="mt-4">Request sent. Track it in <Link to="/care/requests" className="font-semibold underline">My requests</Link>.</Alert>}

        {(consults.length > 0 || tests.length > 0) && (
          <section className={card} aria-labelledby="svc-h">
            <h2 id="svc-h" className="font-display text-lg font-semibold text-ink-900">Services & prices</h2>
            <ul className="mt-3 divide-y divide-neutral-100">
              {p.services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                      {s.category === "teleconsult" && <Video className="h-4 w-4 text-violet-600" aria-hidden="true" />}
                      {s.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {s.turnaroundHours !== null ? `Results in about ${s.turnaroundHours >= 24 ? `${Math.round(s.turnaroundHours / 24)} day${s.turnaroundHours >= 48 ? "s" : ""}` : `${s.turnaroundHours} hours`}` : s.category === "teleconsult" ? "Video call" : "In person"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-sm font-semibold text-ink-900">{rupees(s.priceInr)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!p.available}
                      onClick={() => setPreset({ kind: s.category === "test" ? "test" : s.category === "teleconsult" ? "teleconsult" : "appointment", service: s, slot: s.category === "test" ? undefined : (pickedSlot ?? undefined) })}
                    >
                      {s.category === "test" ? "Request" : "Book"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {p.homeCollection && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sage-700"><Home className="h-3.5 w-3.5" aria-hidden="true" /> Home sample collection available</p>
            )}
          </section>
        )}

        {slotsByDay.length > 0 && (
          <section className={card} aria-labelledby="slot-h">
            <h2 id="slot-h" className="font-display text-lg font-semibold text-ink-900">Pick a time</h2>
            <div className="mt-3 space-y-4">
              {slotsByDay.map(([day, slots]) => (
                <div key={day}>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{day}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((s) => {
                      const on = pickedSlot?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPickedSlot(on ? null : s)}
                          className={cn("tabular min-h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors", on ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-200 bg-white text-ink-800 hover:border-brand-300")}
                        >
                          {new Date(s.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={!pickedSlot || !p.available} onClick={() => pickedSlot && setPreset({ kind: "appointment", service: consultation, slot: pickedSlot })}>
                {pickedSlot ? `Book ${formatSlot(pickedSlot.startsAt)}` : "Select a time"}
              </Button>
              {(p.offersTeleconsult || teleconsult) && (
                <Button variant="outline" disabled={!pickedSlot || !p.available} onClick={() => pickedSlot && setPreset({ kind: "teleconsult", service: teleconsult, slot: pickedSlot })}>
                  <Video className="h-4 w-4" aria-hidden="true" /> Video consult
                </Button>
              )}
            </div>
          </section>
        )}

        <section className={card} aria-labelledby="rev-h">
          <h2 id="rev-h" className="font-display text-lg font-semibold text-ink-900">Patient reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700/70">No reviews yet. Reviews come only from patients who completed a visit through Lunee.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reviews.map((r, i) => (
                <li key={i} className="rounded-2xl bg-neutral-50 p-3.5">
                  <Rating avg={r.rating} count={1} />
                  {r.comment && <p className="mt-1.5 text-sm text-ink-800">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {preset && (
        <RequestSheet
          provider={p}
          preset={preset}
          onClose={() => setPreset(null)}
          onSent={() => {
            setPreset(null);
            setPickedSlot(null);
            setSent(true);
            load();
          }}
        />
      )}
    </AppShell>
  );
}
