import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bot, CalendarPlus, Droplet, Fingerprint, FileText, ListPlus, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, type CycleInsights, type HealthReportRecord, type TimelineEvent } from "@/lib/api";
import { getSession } from "@/lib/session";
import { hasPasskey, registerPasskey } from "@/lib/passkey";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const PHASE_STYLE: Record<NonNullable<CycleInsights["phase"]>, { label: string; blurb: string; grad: string; ring: string }> = {
  menstrual: { label: "Period", blurb: "Rest, warmth and gentleness today.", grad: "from-brand-500 to-brand-700", ring: "#ffffff" },
  follicular: { label: "Follicular", blurb: "Energy is building — a good time to start things.", grad: "from-sage-500 to-sage-700", ring: "#ffffff" },
  ovulation: { label: "Fertile window", blurb: "Peak energy and mood for many people.", grad: "from-violet-500 to-violet-700", ring: "#ffffff" },
  luteal: { label: "Luteal", blurb: "Slow down a little and listen to your body.", grad: "from-peach-400 to-peach-600", ring: "#ffffff" },
};

function CycleHero({ insights, loading }: { insights: CycleInsights | null; loading: boolean }) {
  if (loading) {
    return <div aria-hidden="true" className="skeleton mt-6 h-40 w-full rounded-3xl" />;
  }
  if (!insights || !insights.lastPeriodStart || !insights.phase || !insights.currentCycleDay) {
    return (
      <Link
        to="/log"
        className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-dashed border-brand-300 bg-brand-50/60 p-6 transition-colors hover:bg-brand-50"
      >
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">Start tracking your cycle</p>
          <p className="mt-1 text-sm text-ink-700/70">Log your period to see your phase and predictions here.</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
      </Link>
    );
  }

  const style = PHASE_STYLE[insights.phase];
  const pct = Math.min(1, insights.currentCycleDay / insights.cycleLengthDays);
  const r = 34;
  const c = 2 * Math.PI * r;
  const next = insights.predictedNextPeriodStart
    ? new Date(`${insights.predictedNextPeriodStart}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <Link
      to="/cycle"
      className={`mt-6 flex items-center gap-5 rounded-3xl bg-gradient-to-br ${style.grad} p-6 text-white shadow-lift transition-transform duration-200 hover:-translate-y-0.5`}
    >
      <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Day ${insights.currentCycleDay} of ${insights.cycleLengthDays}`}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={style.ring}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
          />
        </svg>
        <div className="tabular absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-display text-2xl font-semibold">{insights.currentCycleDay}</span>
          <span className="mt-0.5 text-[10px] tracking-wide text-white/80 uppercase">Day</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Right now</p>
        <p className="font-display text-2xl font-semibold">{style.label}</p>
        <p className="mt-1 text-sm text-white/90">{style.blurb}</p>
        {next && <p className="mt-2 text-xs text-white/80">Next period around {next}</p>}
      </div>
    </Link>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CycleInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [reports, setReports] = useState<HealthReportRecord[]>([]);
  // "checking" until we know; the prompt only shows for "idle"/"working"/"error".
  const [passkeyStatus, setPasskeyStatus] = useState<"checking" | "idle" | "working" | "done" | "error">("checking");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  useEffect(() => {
    api.getTimeline().then(({ events }) => setEvents(events.slice(0, 4)));
    api.listReports().then(({ reports }) => setReports(reports)).catch(() => {});
    api
      .getCycleInsights()
      .then(({ insights }) => setInsights(insights))
      .catch(() => {})
      .finally(() => setInsightsLoading(false));

    const session = getSession();
    if (!session) return;
    hasPasskey(session).then((has) => setPasskeyStatus(has === false ? "idle" : "done"));
  }, []);

  async function onSetUpPasskey() {
    const session = getSession();
    if (!session) return;
    setPasskeyStatus("working");
    setPasskeyError(null);
    try {
      await registerPasskey(session);
      setPasskeyStatus("done");
    } catch (err) {
      setPasskeyError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong");
      setPasskeyStatus("error");
    }
  }

  const urgentReport = reports.find((r) => r.emergency);
  const carePlanItems = reports
    .filter((r) => !r.emergency && (r.questionsToAsk?.length || r.carePlan?.discuss_with_clinician?.length))
    .slice(0, 2);

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-medium text-ink-900 sm:text-4xl">
        {greeting()}, {user?.name?.split(" ")[0]}
      </h1>
      <p className="mt-1.5 max-w-xl text-ink-700/70">How are you feeling today? Log it and HERAI keeps your timeline.</p>

      <CycleHero insights={insights} loading={insightsLoading} />

      {passkeyStatus !== "done" && passkeyStatus !== "checking" && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Fingerprint className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900">Set up a passkey</p>
              <p className="text-xs text-ink-700/60">
                {passkeyStatus === "error" ? passkeyError : "Sign in faster next time, no password needed."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onSetUpPasskey} disabled={passkeyStatus === "working"}>
            {passkeyStatus === "working" ? "Setting up…" : "Set up"}
          </Button>
        </div>
      )}

      {urgentReport && (
        <Link to={`/reports/${urgentReport._id}`} className="mt-6 flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 hover:bg-red-100">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-800">Urgent: {urgentReport.fileName}</p>
            <p className="text-xs text-red-700">The Safety Agent flagged this report — tap to review.</p>
          </div>
        </Link>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/chat">
          <Card className="group h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-ink-900">Ask HERAI</h3>
                <p className="text-sm text-ink-700/60">Agentic AI symptom guidance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports">
          <Card className="group h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-ink-900">Reports</h3>
                <p className="text-sm text-ink-700/60">Upload & analyze lab reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/log">
          <Card className="group h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <CalendarPlus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-ink-900">Log an entry</h3>
                <p className="text-sm text-ink-700/60">Symptom or cycle logging</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/timeline">
          <Card className="group h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <ListPlus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-ink-900">View timeline</h3>
                <p className="text-sm text-ink-700/60">Your full logged history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent activity</h2>
          <Link to="/timeline" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {events === null && <p className="mt-4 text-sm text-ink-700/60">Loading…</p>}

        {events?.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center">
            <p className="text-ink-700/70">Nothing logged yet — start your timeline.</p>
            <Link to="/log" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                Log your first entry
              </Button>
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="mt-4 space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    event.type === "cycle" ? "bg-brand-100 text-brand-600" : "bg-violet-100 text-violet-600"
                  }`}
                >
                  {event.type === "cycle" ? <Droplet className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {event.type === "cycle"
                      ? `${event.data.flow[0].toUpperCase()}${event.data.flow.slice(1)} flow`
                      : event.data.symptoms.map((s) => s.name).join(", ")}
                  </p>
                  <p className="text-xs text-ink-700/50">
                    {new Date(event.loggedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {carePlanItems.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Care plan updates</h2>
            <Link to="/reports" className="text-sm font-medium text-brand-600 hover:underline">
              View reports
            </Link>
          </div>
          <p className="mt-1 text-sm text-ink-700/60">From your uploaded reports — discuss these at your next visit.</p>
          <div className="mt-4 space-y-3">
            {carePlanItems.map((r) => {
              const items = (r.questionsToAsk?.length ? r.questionsToAsk : r.carePlan?.discuss_with_clinician) ?? [];
              return (
                <Link
                  key={r._id}
                  to={`/reports/${r._id}`}
                  className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-brand-300"
                >
                  <p className="text-sm font-medium text-ink-900">{r.fileName}</p>
                  <ul className="mt-1.5 space-y-1">
                    {items.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs text-ink-700/70">• {item}</li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
