import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Activity, AlertTriangle, BadgeIndianRupee, HeartHandshake, LifeBuoy, RefreshCw, Search, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { adminApi, type AdminApplication, type AdminOverview, type AdminProvider, type AdminSupport, type AdminUser } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "users" | "services" | "support" | "system";
const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users & premium" },
  { id: "services", label: "Services" },
  { id: "support", label: "Support" },
  { id: "system", label: "System" },
];

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "—");

/** Admin-only console. The server returns 404 for anyone not in app_admins; this page also hides itself. */
export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-brand-600" aria-hidden="true" />
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Admin</h1>
      </div>
      <div role="tablist" aria-label="Admin sections" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium",
              tab === t.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "dashboard" && <Dashboard />}
        {tab === "users" && <UsersTab />}
        {tab === "services" && <Services />}
        {tab === "support" && <Support />}
        {tab === "system" && <System />}
      </div>
    </AppShell>
  );
}

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    fn().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);
  return { data, error, reload: load, setData };
}

function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
        {icon}
        {label}
      </p>
      <p className="tabular mt-1 font-display text-2xl font-semibold text-ink-900">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dashboard() {
  const { data: o, error, reload } = useLoad<AdminOverview>(adminApi.overview);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!o) return <div className="skeleton h-64 rounded-3xl" aria-hidden="true" />;
  const max = Math.max(1, ...o.signups.map((s) => s.count));
  const i = "h-3.5 w-3.5";
  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={reload}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      <Section title="People">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Users className={i} />} label="Registered" value={o.users.total} sub={`${o.users.onboarded} finished setup`} />
          <Stat label="New, 7 days" value={o.users.last7} />
          <Stat label="New, 30 days" value={o.users.last30} />
          <Stat icon={<HeartHandshake className={i} />} label="Active partner links" value={o.partner.linksActive} sub={`${o.partner.linksPaused} paused`} />
        </div>
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium text-neutral-500">Sign-ups, last 14 days</p>
          <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`Sign-ups per day: ${o.signups.map((s) => s.count).join(", ")}`}>
            {o.signups.map((s) => (
              <div key={s.day} className="flex flex-1 flex-col items-center gap-1" title={`${s.day}: ${s.count}`}>
                <div className="w-full rounded-t bg-brand-400" style={{ height: `${(s.count / max) * 80 + 2}px` }} />
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Premium (Partner plan)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<BadgeIndianRupee className={i} />} label="Paying" value={o.premium.active} sub={`≈ ₹${o.premium.mrrInr.toLocaleString("en-IN")}/month`} />
          <Stat label="On trial" value={o.premium.trialing} />
          <Stat label="Canceled / expired" value={o.premium.canceled + o.premium.expired} />
          <Stat label="Gift codes" value={`${o.premium.giftsRedeemed}/${o.premium.giftsIssued}`} sub="redeemed / issued" />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Paywall is <span className="font-semibold">{o.premium.paywallOn ? "ON" : "OFF (everyone has access)"}</span>. Price ₹{o.premium.priceInr}/month. Payments aren't connected yet, so "paying" means granted by an admin.
        </p>
      </Section>
      <Section title="Care network">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Stethoscope className={i} />} label="Providers" value={o.care.providers} sub={`${o.care.providersLive} live`} />
          <Stat label="New applications" value={o.care.applicationsNew} />
          <Stat label="Care requests" value={o.care.requestsTotal} sub={`${o.care.requestsNew} new`} />
          <Stat icon={<LifeBuoy className={i} />} label="Open support" value={o.ops.supportOpen} />
        </div>
      </Section>
      <Section title="Activity, 7 days">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Activity className={i} />} label="Period logs" value={o.activity.cycleLogs7} />
          <Stat label="Mood logs" value={o.activity.moodLogs7} />
          <Stat label="AI chats" value={o.activity.chats7} />
          <Stat icon={<AlertTriangle className={i} />} label="App errors, 24h" value={o.ops.errors24h} />
        </div>
      </Section>
    </>
  );
}

const SUB_TONE: Record<string, BadgeTone> = { active: "sage", trialing: "violet", canceled: "neutral", expired: "neutral", past_due: "amber" };

function UsersTab() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ users: AdminUser[]; hasMore: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setData(null);
    adminApi.users(q, page).then(setData).catch(() => setData({ users: [], hasMore: false }));
  }, [q, page]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function act(u: AdminUser, action: "grant" | "extend_trial" | "revoke") {
    const label = action === "grant" ? "Give 1 month of premium" : action === "extend_trial" ? "Give a 14-day trial" : "Remove premium";
    if (!window.confirm(`${label} for ${u.email}?`)) return;
    setBusy(u.id);
    try {
      await adminApi.premium(u.id, action === "grant" ? { action, months: 1 } : action === "extend_trial" ? { action, days: 14 } : { action });
      toast("Updated");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="max-w-sm">
        <label htmlFor="user-q" className="sr-only">Search by email</label>
        <Input id="user-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search this page by email" icon={<Search className="h-4 w-4" aria-hidden="true" />} />
      </div>
      {!data && <div className="skeleton mt-4 h-48 rounded-3xl" aria-hidden="true" />}
      {data && (
        <ul className="mt-4 space-y-2">
          {data.users.length === 0 && <li className="text-sm text-neutral-500">No accounts match.</li>}
          {data.users.map((u) => (
            <li key={u.id} className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{u.name ?? "—"} <span className="font-normal text-neutral-500">· {u.email}</span></p>
                  <p className="text-xs text-neutral-500">
                    Joined {fmtDate(u.createdAt)} · last in {fmtDate(u.lastSignIn)} · {u.provider}
                    {!u.onboarded && " · setup unfinished"}
                    {u.consent === "pending" && " · waiting for guardian"}
                  </p>
                  <p className="text-xs text-neutral-500">Shares with {u.sharesWith} · follows {u.follows}</p>
                </div>
                <Badge tone={u.subscription ? SUB_TONE[u.subscription.status] ?? "neutral" : "neutral"}>
                  {u.subscription ? u.subscription.status : "free"}
                  {u.subscription?.status === "active" && u.subscription.current_period_end ? ` · to ${fmtDate(u.subscription.current_period_end)}` : ""}
                  {u.subscription?.status === "trialing" && u.subscription.trial_ends_at ? ` · to ${fmtDate(u.subscription.trial_ends_at)}` : ""}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => act(u, "grant")}>+1 month premium</Button>
                <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => act(u, "extend_trial")}>14-day trial</Button>
                {u.subscription && u.subscription.status !== "canceled" && (
                  <Button size="sm" variant="ghost" disabled={busy === u.id} onClick={() => act(u, "revoke")}>Remove premium</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <Button size="sm" variant="outline" disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </>
  );
}

function Services() {
  const toast = useToast();
  const { data, reload } = useLoad<{ providers: AdminProvider[]; applications: AdminApplication[] }>(adminApi.providers);
  const [showSamples, setShowSamples] = useState(false);
  if (!data) return <div className="skeleton h-48 rounded-3xl" aria-hidden="true" />;

  async function toggle(p: AdminProvider, field: "verified" | "available") {
    try {
      await adminApi.updateProvider(p.id, { [field]: !p[field] });
      toast("Updated");
      reload();
    } catch {
      toast("Couldn't update", "error");
    }
  }

  async function setApp(a: AdminApplication, status: AdminApplication["status"]) {
    await adminApi.updateApplication(a.id, status).catch(() => toast("Couldn't update", "error"));
    reload();
  }

  const providers = data.providers.filter((p) => showSamples || !p.is_sample);
  return (
    <>
      <Section title={`Applications (${data.applications.filter((a) => a.status === "new").length} new)`}>
        {data.applications.length === 0 ? (
          <p className="text-sm text-neutral-500">No applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.applications.map((a) => (
              <li key={a.id} className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{a.org_name} <span className="font-normal text-neutral-500">· {a.type} · {a.city}</span></p>
                  <Badge tone={a.status === "approved" ? "sage" : a.status === "rejected" ? "neutral" : a.status === "new" ? "brand" : "amber"}>{a.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{a.contact_name} · {a.email}{a.phone ? ` · ${a.phone}` : ""} · {fmtDate(a.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["contacted", "approved", "rejected"] as const).map((s) => (
                    <Button key={s} size="sm" variant="outline" disabled={a.status === s} onClick={() => setApp(a, s)}>Mark {s}</Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-neutral-500">Marking approved only records the decision. Create the listing with <code>scripts/approve-provider.mjs</code> after the vetting checklist.</p>
      </Section>
      <Section
        title="Listings"
        action={
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" checked={showSamples} onChange={(e) => setShowSamples(e.target.checked)} /> Show sample listings
          </label>
        }
      >
        <ul className="space-y-2">
          {providers.length === 0 && <li className="text-sm text-neutral-500">No real providers yet.</li>}
          {providers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-soft">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{p.name} {p.is_sample && <Badge tone="neutral">sample</Badge>}</p>
                <p className="text-xs text-neutral-500">{p.type} · {p.city ?? "—"} · {p.rating_count ? `${p.rating_avg}★ (${p.rating_count})` : "no reviews"}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={p.verified ? "soft" : "outline"} onClick={() => toggle(p, "verified")}>{p.verified ? "Verified" : "Not verified"}</Button>
                <Button size="sm" variant={p.available ? "soft" : "outline"} onClick={() => toggle(p, "available")}>{p.available ? "Listed" : "Hidden"}</Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function Support() {
  const { data, reload } = useLoad<{ requests: AdminSupport[] }>(adminApi.support);
  const [filter, setFilter] = useState<AdminSupport["status"] | "all">("open");
  if (!data) return <div className="skeleton h-48 rounded-3xl" aria-hidden="true" />;
  const items = data.requests.filter((r) => filter === "all" || r.status === filter);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(["open", "answered", "closed", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "soft" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 && <li className="text-sm text-neutral-500">Nothing here.</li>}
        {items.map((r) => (
          <li key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-900">{r.topic.replace("_", " ")} <span className="font-normal text-neutral-500">· {r.email} · {fmtDate(r.created_at)}</span></p>
              <Badge tone={r.status === "open" ? "brand" : r.status === "answered" ? "sage" : "neutral"}>{r.status}</Badge>
            </div>
            <p className="mt-1.5 text-sm whitespace-pre-line text-ink-800">{r.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`mailto:${r.email}?subject=${encodeURIComponent("Re: your Lunee support request")}`}>
                <Button size="sm">Reply by email</Button>
              </a>
              {(["answered", "closed", "open"] as const).filter((s) => s !== r.status).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => adminApi.updateSupport(r.id, s).then(reload)}>Mark {s}</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function System() {
  const errors = useLoad(adminApi.errors);
  const audit = useLoad(adminApi.audit);
  return (
    <>
      <Section title="Recent app errors">
        {!errors.data ? (
          <div className="skeleton h-32 rounded-3xl" aria-hidden="true" />
        ) : errors.data.errors.length === 0 ? (
          <p className="text-sm text-neutral-500">No errors reported.</p>
        ) : (
          <ul className="space-y-1.5">
            {errors.data.errors.slice(0, 50).map((e) => (
              <li key={e.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs">
                <span className={cn("font-semibold", e.fatal ? "text-red-700" : "text-ink-900")}>{e.source}</span> · {fmtDate(e.created_at)} · {e.route ?? "—"}
                {e.http_status ? ` · ${e.http_status}` : ""}
                <p className="mt-0.5 break-words text-ink-700">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Admin actions">
        {!audit.data ? (
          <div className="skeleton h-24 rounded-3xl" aria-hidden="true" />
        ) : audit.data.entries.length === 0 ? (
          <p className="text-sm text-neutral-500">No admin actions yet.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {audit.data.entries.map((a) => (
              <li key={a.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                <span className="font-semibold text-ink-900">{a.action}</span> · {a.admin_email} · {fmtDate(a.created_at)} {a.target ? `· ${a.target.slice(0, 8)}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-neutral-500">Admins are managed in the database table <code>app_admins</code> only.</p>
      </Section>
    </>
  );
}
