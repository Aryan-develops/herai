import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { api, ApiError, type ProviderDashboardData, type ProviderInboxItem, type ServiceCategory, type SharedData } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { KIND_LABEL, StatusPill, formatSlot, rupees } from "@/components/care-bits";
import { cn } from "@/lib/utils";

type Tab = "requests" | "services" | "slots" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "services", label: "Services" },
  { id: "slots", label: "Slots" },
  { id: "settings", label: "Availability" },
];

export function ProviderDashboard() {
  const [tab, setTab] = useState<Tab>("requests");
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [inbox, setInbox] = useState<ProviderInboxItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notProvider, setNotProvider] = useState(false);

  const load = useCallback(() => {
    api.providerMe().then(setData).catch((err) => {
      if (err instanceof ApiError && err.status === 403) setNotProvider(true);
      else setError("Couldn't load your dashboard.");
    });
    api.providerRequests().then(({ requests }) => setInbox(requests)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (notProvider) {
    return (
      <AppShell>
        <div className="max-w-xl rounded-3xl border border-dashed border-brand-200 bg-white/70 p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">This account isn't a partner provider yet</p>
          <p className="mt-1 text-sm text-ink-700/75">Apply from the Care page. Once approved, your dashboard appears here.</p>
          <Link to="/care" className="mt-5 inline-block"><Button>Go to Care</Button></Link>
        </div>
      </AppShell>
    );
  }

  const newCount = data?.requestCounts.new ?? 0;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{data?.provider.name ?? "Provider dashboard"}</h1>
      <p className="mt-1.5 text-ink-700/75">Manage requests, services, slots and availability.</p>
      {data && !data.provider.verified && <Alert tone="warning" className="mt-4">Your listing is under review and isn't visible to patients yet.</Alert>}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}

      <div role="tablist" aria-label="Dashboard sections" className="mt-6 inline-flex flex-wrap rounded-2xl bg-neutral-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("relative min-h-10 cursor-pointer rounded-xl px-4 text-sm font-medium transition-all", tab === t.id ? "bg-white text-brand-700 shadow-soft" : "text-neutral-500 hover:text-ink-900")}
          >
            {t.label}
            {t.id === "requests" && newCount > 0 && <span className="tabular ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{newCount}</span>}
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-3xl">
        {!data && <div className="skeleton h-40 w-full rounded-3xl" aria-hidden="true" />}
        {data && tab === "requests" && <RequestsTab inbox={inbox} onChange={load} />}
        {data && tab === "services" && <ServicesTab data={data} onChange={load} />}
        {data && tab === "slots" && <SlotsTab data={data} onChange={load} />}
        {data && tab === "settings" && <SettingsTab data={data} onChange={load} />}
      </div>
    </AppShell>
  );
}

function RequestsTab({ inbox, onChange }: { inbox: ProviderInboxItem[] | null; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [shared, setShared] = useState<Record<string, SharedData | "withdrawn">>({});
  const [meet, setMeet] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, status: "accepted" | "declined" | "completed") {
    setError(null);
    try {
      await api.providerUpdateRequest(id, { status, note: note[id] || undefined, meetingUrl: meet[id] || undefined });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that request.");
    }
  }

  async function toggle(id: string) {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!shared[id]) {
      try {
        setShared((s) => ({ ...s, [id]: undefined as never }));
        const d = await api.providerShared(id);
        setShared((s) => ({ ...s, [id]: d }));
      } catch {
        setShared((s) => ({ ...s, [id]: "withdrawn" }));
      }
    }
  }

  if (inbox === null) return <div className="skeleton h-32 w-full rounded-3xl" aria-hidden="true" />;
  if (inbox.length === 0) return <p className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-8 text-center text-sm text-ink-700/70">No requests yet.</p>;

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <ul className="space-y-3">
        {inbox.map((r) => {
          const sh = shared[r.id];
          return (
            <li key={r.id} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{KIND_LABEL[r.kind]}</p>
                  <p className="font-display text-lg font-semibold text-ink-900">{r.patientFirstName}{r.serviceName ? ` · ${r.serviceName}` : ""}</p>
                  {r.slotStartsAt && <p className="text-sm font-medium text-ink-900">{formatSlot(r.slotStartsAt)}</p>}
                  {r.message && <p className="mt-1 text-sm text-ink-700/80">"{r.message}"</p>}
                </div>
                <StatusPill status={r.status} />
              </div>

              {(r.sharesProfile || r.sharedReportCount > 0) && r.status !== "cancelled" && r.status !== "declined" && (
                <button type="button" onClick={() => toggle(r.id)} className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline" aria-expanded={open === r.id}>
                  {open === r.id ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                  Shared: {[r.sharesProfile && "profile", r.sharedReportCount > 0 && `${r.sharedReportCount} report(s)`].filter(Boolean).join(", ")}
                </button>
              )}

              {open === r.id && (
                <div className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm">
                  {sh === "withdrawn" && <p className="text-ink-700/75">The patient withdrew access.</p>}
                  {sh && sh !== "withdrawn" && (
                    <div className="space-y-3">
                      {sh.profile && (
                        <div>
                          <p className="font-semibold text-ink-900">Profile</p>
                          <p className="text-ink-700/80">Age range: {sh.profile.ageRange ?? "-"} · Cycle: {sh.profile.cycleLengthDays ?? "-"} days</p>
                          <p className="text-ink-700/80">Conditions: {sh.profile.conditions?.join(", ") || "none"}</p>
                          <p className="text-ink-700/80">Medications: {sh.profile.medications?.join(", ") || "none"}</p>
                          <p className="text-ink-700/80">Allergies: {sh.profile.allergies?.join(", ") || "none"}</p>
                        </div>
                      )}
                      {sh.reports.map((rep) => (
                        <div key={rep.id}>
                          <p className="font-semibold text-ink-900">{rep.fileName}</p>
                          <ul className="mt-1 space-y-0.5">
                            {rep.values.map((v, i) => (
                              <li key={i} className="tabular text-ink-700/80">{v.parameter}: {v.value ?? "-"} {v.unit ?? ""} <span className="text-neutral-500">({v.status.replace("_", " ")})</span></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(r.status === "new" || r.status === "accepted") && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`n-${r.id}`}>Note to patient</Label>
                      <Input id={`n-${r.id}`} value={note[r.id] ?? ""} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} placeholder="e.g. Please come fasting" />
                    </div>
                    {r.kind === "teleconsult" && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`m-${r.id}`}>Video call link</Label>
                        <Input id={`m-${r.id}`} type="url" value={meet[r.id] ?? ""} onChange={(e) => setMeet({ ...meet, [r.id]: e.target.value })} placeholder="https://meet.google.com/..." />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "new" && <Button size="sm" onClick={() => act(r.id, "accepted")}>Accept</Button>}
                    {r.status === "accepted" && <Button size="sm" onClick={() => act(r.id, "completed")}>Mark completed</Button>}
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "declined")}>Decline</Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ServicesTab({ data, onChange }: { data: ProviderDashboardData; onChange: () => void }) {
  const [f, setF] = useState({ name: "", category: "test" as ServiceCategory, price: "", hours: "" });
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.providerAddService({ name: f.name, category: f.category, priceInr: f.price ? Number(f.price) : null, turnaroundHours: f.hours ? Number(f.hours) : null });
      setF({ name: "", category: "test", price: "", hours: "" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that service.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-900">Add a service</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sname">Name</Label><Input id="sname" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Thyroid panel" /></div>
          <div className="space-y-1.5"><Label htmlFor="scat">Type</Label>
            <Select id="scat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ServiceCategory })}>
              <option value="test">Test</option><option value="consultation">Consultation</option><option value="teleconsult">Video consult</option>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="sprice">Price (₹)</Label><Input id="sprice" type="number" min={0} inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="shrs">Turnaround (hours)</Label><Input id="shrs" type="number" min={0} inputMode="numeric" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
        </div>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4">Add service</Button>
      </form>

      <ul className="space-y-2.5">
        {data.services.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", s.active ? "text-ink-900" : "text-neutral-400 line-through")}>{s.name}</p>
              <p className="tabular text-xs text-neutral-500">{s.category} · {rupees(s.priceInr)}{s.turnaroundHours !== null ? ` · ${s.turnaroundHours}h` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={async () => { await api.providerUpdateService(s.id, { active: !s.active }); onChange(); }}>{s.active ? "Hide" : "Show"}</Button>
              <button type="button" aria-label={`Delete ${s.name}`} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600" onClick={async () => { if (window.confirm(`Delete ${s.name}?`)) { await api.providerDeleteService(s.id); onChange(); } }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SlotsTab({ data, onChange }: { data: ProviderDashboardData; onChange: () => void }) {
  const [date, setDate] = useState("");
  const [times, setTimes] = useState("10:00, 11:00, 12:00");
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const list = times.split(",").map((t) => t.trim()).filter(Boolean);
    const startsAt = list.map((t) => new Date(`${date}T${t}:00`)).filter((d) => !Number.isNaN(d.getTime())).map((d) => d.toISOString());
    if (startsAt.length === 0) return setError("Enter times like 10:00, 11:30.");
    try {
      await api.providerAddSlots({ startsAt, durationMin: Number(duration) || 30 });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add slots.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-900">Add appointment slots</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="sdate">Date</Label><Input id="sdate" type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="stimes">Times (24h, comma separated)</Label><Input id="stimes" required value={times} onChange={(e) => setTimes(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="sdur">Minutes each</Label><Input id="sdur" type="number" min={10} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        </div>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4">Add slots</Button>
      </form>

      {data.slots.length === 0 ? <p className="text-sm text-ink-700/70">No upcoming slots.</p> : (
        <ul className="flex flex-wrap gap-2">
          {data.slots.map((s) => (
            <li key={s.id} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", s.status === "booked" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-neutral-200 bg-white text-ink-800")}>
              <span className="tabular">{formatSlot(s.startsAt)}</span>
              {s.status === "booked" ? <span className="text-xs font-semibold">Booked</span> : (
                <button type="button" aria-label={`Remove slot ${formatSlot(s.startsAt)}`} className="cursor-pointer text-neutral-400 hover:text-red-600" onClick={async () => { await api.providerDeleteSlot(s.id); onChange(); }}>✕</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({ data, onChange }: { data: ProviderDashboardData; onChange: () => void }) {
  const p = data.provider;
  const [note, setNote] = useState(p.availability_note ?? "");
  const [hours, setHours] = useState(p.hours ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [saved, setSaved] = useState(false);

  async function patch(d: Parameters<typeof api.providerUpdateMe>[0]) {
    await api.providerUpdateMe(d);
    onChange();
  }

  const Toggle = ({ label, hint, on, onClick }: { label: string; hint: string; on: boolean; onClick: () => void }) => (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
      <div><p className="text-sm font-semibold text-ink-900">{label}</p><p className="text-xs text-neutral-500">{hint}</p></div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={cn("relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors", on ? "bg-sage-500" : "bg-neutral-300")}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <Toggle label="Accepting patients" hint="Turn off when you're away. Patients see you as unavailable." on={p.available} onClick={() => patch({ available: !p.available })} />
      <Toggle label="Home sample collection" hint="Show the home collection badge." on={p.home_collection} onClick={() => patch({ homeCollection: !p.home_collection })} />
      <Toggle label="Video consultations" hint="Let patients request a video consult." on={p.offers_teleconsult} onClick={() => patch({ offersTeleconsult: !p.offers_teleconsult })} />
      <form
        className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft"
        onSubmit={async (e) => { e.preventDefault(); await patch({ availabilityNote: note || null, hours: hours || null, phone: phone || null }); setSaved(true); }}
      >
        <div className="space-y-1.5"><Label htmlFor="anote">Status note (shown to patients)</Label><Input id="anote" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} placeholder="Back Monday" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="ahours">Opening hours</Label><Input id="ahours" value={hours} onChange={(e) => { setHours(e.target.value); setSaved(false); }} placeholder="Mon-Sat 9am-6pm" /></div>
          <div className="space-y-1.5"><Label htmlFor="aphone">Phone</Label><Input id="aphone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} /></div>
        </div>
        <div className="flex items-center gap-3"><Button type="submit">Save</Button>{saved && <span className="text-sm text-sage-700">Saved</span>}</div>
      </form>
    </div>
  );
}
