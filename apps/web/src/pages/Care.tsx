import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, FlaskConical, Home, LocateFixed, MapPin, Navigation, Phone, Search, Stethoscope, Building2 } from "lucide-react";
import { api, ApiError, type CareProvider, type ProviderType } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const TABS: { value: ProviderType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lab", label: "Labs" },
  { value: "doctor", label: "Doctors" },
  { value: "clinic", label: "Clinics" },
];

const TYPE_STYLE: Record<ProviderType, { icon: typeof FlaskConical; tone: string; label: string }> = {
  lab: { icon: FlaskConical, tone: "bg-violet-100 text-violet-700", label: "Lab" },
  doctor: { icon: Stethoscope, tone: "bg-brand-100 text-brand-700", label: "Doctor" },
  clinic: { icon: Building2, tone: "bg-sage-100 text-sage-700", label: "Clinic" },
};

type Coords = { lat: number; lng: number };

export function Care() {
  const [params, setParams] = useSearchParams();
  const initialType = (params.get("type") as ProviderType | null) ?? "all";
  const [type, setType] = useState<ProviderType | "all">(TABS.some((t) => t.value === initialType) ? initialType : "all");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [city, setCity] = useState("");
  const [homeOnly, setHomeOnly] = useState(false);
  const [providers, setProviders] = useState<CareProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const load = useCallback(() => {
    setProviders(null);
    setError(null);
    api
      .listProviders({
        type: type === "all" ? undefined : type,
        ...(coords ?? {}),
        radiusKm: 50,
        city: coords ? undefined : city.trim() || undefined,
        homeCollection: homeOnly,
      })
      .then(({ providers }) => setProviders(providers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load providers."));
  }, [type, coords, city, homeOnly]);

  useEffect(load, [load]);

  function useMyLocation() {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Your browser can't share location. Search by city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location. Search by city instead.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function pickType(t: ProviderType | "all") {
    setType(t);
    setParams(t === "all" ? {} : { type: t }, { replace: true });
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Find care near you</h1>
      <p className="mt-1.5 max-w-xl text-ink-700/75">Labs and doctors in the HERAI partner network.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button type="button" variant={coords ? "soft" : "default"} onClick={useMyLocation} disabled={locating}>
          {locating ? <Spinner /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
          {coords ? "Using your location" : "Use my location"}
        </Button>
        <form
          className="flex min-w-0 flex-1 gap-2 sm:max-w-xs"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setCoords(null);
          }}
        >
          <label htmlFor="city" className="sr-only">
            City
          </label>
          <Input
            id="city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCoords(null);
            }}
            placeholder="Or search by city"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
        </form>
      </div>
      {locError && <Alert tone="warning" className="mt-3">{locError}</Alert>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Provider type" className="inline-flex rounded-2xl bg-neutral-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={type === t.value}
              onClick={() => pickType(t.value)}
              className={cn(
                "min-h-10 cursor-pointer rounded-xl px-4 text-sm font-medium transition-all",
                type === t.value ? "bg-white text-brand-700 shadow-soft" : "text-neutral-500 hover:text-ink-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={homeOnly}
          onClick={() => setHomeOnly((v) => !v)}
          className={cn(
            "flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
            homeOnly ? "border-brand-500 bg-brand-500 text-white" : "border-neutral-200 bg-white text-ink-800 hover:border-brand-300"
          )}
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Home sample collection
        </button>
      </div>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}

      <div className="mt-6 max-w-2xl">
        {providers === null && !error && (
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-32 w-full rounded-3xl" />
            <div className="skeleton h-32 w-full rounded-3xl" />
          </div>
        )}

        {providers?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white/70 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-ink-900">No partners here yet</p>
            <p className="mt-1 text-sm text-ink-700/75">
              We're growing the network. Try another city, or ask your usual lab or doctor to join.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {providers?.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </ul>

        <ProviderApplication />
      </div>
    </AppShell>
  );
}

function ProviderCard({ p }: { p: CareProvider }) {
  const t = TYPE_STYLE[p.type];
  const Icon = t.icon;
  const directions =
    p.lat !== null && p.lng !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`;

  return (
    <li className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", t.tone)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-ink-900">{p.name}</h2>
            {p.isSample && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Sample listing</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-700/75">
            {t.label}
            {p.specialties.length > 0 && ` · ${p.specialties.join(", ")}`}
          </p>
        </div>
        {p.distanceKm !== null && (
          <span className="tabular shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-ink-800">
            {p.distanceKm} km
          </span>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-ink-800">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
        {p.address}
      </p>
      {p.hours && (
        <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-700/75">
          <Clock className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
          {p.hours}
        </p>
      )}

      {(p.services.length > 0 || p.homeCollection) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.homeCollection && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700">
              <Home className="h-3 w-3" aria-hidden="true" /> Home collection
            </span>
          )}
          {p.services.map((s) => (
            <span key={s} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-ink-800">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {p.phone && (
          <a href={`tel:${p.phone}`}>
            <Button size="sm">
              <Phone className="h-4 w-4" aria-hidden="true" /> Call
            </Button>
          </a>
        )}
        <a href={directions} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
          </Button>
        </a>
      </div>
    </li>
  );
}

function ProviderApplication() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ orgName: "", type: "lab" as ProviderType, contactName: "", email: "", phone: "", city: "", notes: "" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      await api.applyAsProvider({ ...f, phone: f.phone || undefined, notes: f.notes || undefined });
      setState("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/70 p-6 shadow-soft" aria-labelledby="prov-h">
      <h2 id="prov-h" className="font-display text-lg font-semibold text-ink-900">Are you a lab or doctor?</h2>
      <p className="mt-1 text-sm text-ink-700/75">Join the HERAI partner network and receive referrals from patients in your area.</p>

      {state === "done" ? (
        <Alert tone="success" className="mt-4">Thanks! We'll be in touch soon.</Alert>
      ) : !open ? (
        <Button className="mt-4" variant="outline" onClick={() => setOpen(true)}>Apply to partner</Button>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Lab / practice name</Label>
              <Input id="orgName" required value={f.orgName} onChange={(e) => setF({ ...f, orgName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ptype">Type</Label>
              <Select id="ptype" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ProviderType })}>
                <option value="lab">Lab</option>
                <option value="doctor">Doctor</option>
                <option value="clinic">Clinic</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact name</Label>
              <Input id="contact" required value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pemail">Email</Label>
              <Input id="pemail" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pphone">Phone (optional)</Label>
              <Input id="pphone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcity">City</Label>
              <Input id="pcity" required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pnotes">Anything we should know? (optional)</Label>
            <Textarea id="pnotes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" disabled={state === "sending"}>
            {state === "sending" && <Spinner />}
            {state === "sending" ? "Sending…" : "Send application"}
          </Button>
        </form>
      )}
    </section>
  );
}
