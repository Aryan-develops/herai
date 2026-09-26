import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarHeart,
  Check,
  Copy,
  Flame,
  HandHeart,
  Info,
  MessageCircleHeart,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { api, ApiError, type Lang, type WomanSummary } from "@/lib/api";
import { DAY_PHASE_DOT, PARTNER_PHASE_STYLE, shortDate } from "@/lib/phases";
import { InsightCards } from "@/components/InsightCards";
import { moodOption } from "@/components/partner/moodIcons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CONFETTI_COLOURS = ["bg-brand-400", "bg-violet-400", "bg-sage-500", "bg-peach-400", "bg-amber-100"];

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 overflow-hidden">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className={cn("confetti-piece", CONFETTI_COLOURS[i % CONFETTI_COLOURS.length])}
          style={{ left: `${(i * 6.2 + 3) % 96}%`, animationDelay: `${(i % 5) * 60}ms` }}
        />
      ))}
    </div>
  );
}

function daysLabel(n: number | null, lang: Lang): string | null {
  if (n === null) return null;
  if (n <= 0) return lang === "hi" ? "पीरियड आज या जल्द अपेक्षित है" : "Period expected any day now";
  if (n === 1) return lang === "hi" ? "पीरियड कल अपेक्षित है" : "Period expected tomorrow";
  return lang === "hi" ? `पीरियड लगभग ${n} दिन में अपेक्षित है` : `Period expected in about ${n} days`;
}

function Hero({ s, lang }: { s: WomanSummary; lang: Lang }) {
  const key = s.phase.key;
  if (!key || !s.guidance) return null;
  const style = PARTNER_PHASE_STYLE[key];
  const day = s.phase.cycleDay ?? 1;
  const pct = Math.min(1, day / s.phase.cycleLengthDays);
  const r = 34;
  const c = 2 * Math.PI * r;
  const countdown = daysLabel(s.phase.daysUntilNextPeriod, lang);

  return (
    <div className={cn("flex items-center gap-5 rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift", style.grad)}>
      <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Day ${day} of ${s.phase.cycleLengthDays}`}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
        </svg>
        <div className="tabular absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-display text-2xl font-semibold">{day}</span>
          <span className="mt-0.5 text-[10px] tracking-wide text-white/80 uppercase">{lang === "hi" ? "दिन" : "Day"}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-white/80 uppercase">
          {s.link.firstName} · {lang === "hi" ? "अभी" : "right now"}
        </p>
        <p className="font-display text-2xl font-semibold">{s.guidance.title}</p>
        <p className="mt-1 text-sm text-white/90">{s.guidance.blurb}</p>
        {countdown && <p className="mt-2 text-xs text-white/85">{countdown}</p>}
        {s.phase.estimated && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium">
            <Info className="h-3 w-3" aria-hidden="true" />
            {lang === "hi" ? "अनुमान" : "Estimate"}
          </span>
        )}
      </div>
    </div>
  );
}

function MoodPanel({ s, lang }: { s: WomanSummary; lang: Lang }) {
  if (!s.mood) return null;
  const m = moodOption(s.mood.mood);
  const Icon = m.icon;
  const hours = Math.max(1, Math.round((Date.now() - new Date(s.mood.at).getTime()) / 3600000));
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", m.tone)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink-900">
              {s.link.firstName} {lang === "hi" ? "का मूड" : "checked in"}: {m.label}
              {s.mood.energy ? ` · ${lang === "hi" ? "कितना" : "how much"} ${s.mood.energy}/5` : ""}
            </p>
            <p className="text-xs text-ink-700/60">{hours}h ago</p>
          </div>
        </div>
        {s.guidance?.moodNote && <p className="mt-3 text-sm text-ink-700">{s.guidance.moodNote}</p>}
        {s.guidance?.need && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
            <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-brand-700">{s.guidance.need.title}</p>
              <p className="text-sm text-ink-700">{s.guidance.need.text}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyButton({ text, lang }: { text: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text.replace(/^["“”]+|["“”]+$/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked: the text is on screen to copy by hand.
        }
      }}
      className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
      aria-label={lang === "hi" ? "संदेश कॉपी करें" : "Copy message"}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? (lang === "hi" ? "कॉपी हुआ" : "Copied") : lang === "hi" ? "कॉपी" : "Copy"}
    </button>
  );
}

function GuidanceCards({ s, lang }: { s: WomanSummary; lang: Lang }) {
  const g = s.guidance;
  if (!g) return null;
  const cards = [
    { id: "do", title: lang === "hi" ? "क्या करें" : "Do", items: g.do, tone: "border-sage-100 bg-sage-50", head: "text-sage-700", copy: false },
    { id: "say", title: lang === "hi" ? "क्या कहें" : "Say", items: g.say, tone: "border-violet-100 bg-violet-50", head: "text-violet-700", copy: true },
    { id: "avoid", title: lang === "hi" ? "क्या न करें" : "Avoid", items: g.avoid, tone: "border-peach-100 bg-peach-50", head: "text-peach-600", copy: false },
  ];
  return (
    <section aria-label={lang === "hi" ? "सुझाव" : "Suggestions"}>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {cards.map((c) => (
          <div key={c.id} className={cn("w-[82%] shrink-0 snap-center rounded-2xl border p-4 sm:w-auto", c.tone)}>
            <h3 className={cn("font-display text-lg font-semibold", c.head)}>{c.title}</h3>
            <ul className="mt-2 space-y-2.5">
              {c.items.map((item) => (
                <li key={item} className="flex items-start justify-between gap-2 text-sm text-ink-800">
                  <span>{item}</span>
                  {c.copy && <CopyButton text={item} lang={lang} />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tasks({ s, linkId, lang, onProgress }: { s: WomanSummary; linkId: string; lang: Lang; onProgress: (p: WomanSummary["progress"]) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tasks = s.guidance?.tasks ?? [];
  const done = s.progress.doneToday.filter((id) => tasks.some((t) => t.id === id));
  const allDone = tasks.length > 0 && done.length === tasks.length;

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    setError(null);
    try {
      const res = await api.partnerTask(linkId, { taskId: id, done: next });
      onProgress({ doneToday: res.doneToday, streak: res.streak });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      {allDone && <Confetti />}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">{lang === "hi" ? "आज की 3 छोटी बातें" : "Today's 3 small things"}</h3>
            <p className="text-sm text-ink-700/70">{allDone ? (lang === "hi" ? "शानदार! आज सब हो गया." : "Lovely. All done for today.") : lang === "hi" ? "छोटे कदम ही मायने रखते हैं." : "Small gestures matter most."}</p>
          </div>
          <span
            className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", s.progress.streak > 0 ? "bg-peach-100 text-peach-600" : "bg-neutral-100 text-ink-700/60")}
            aria-label={`${s.progress.streak} day streak`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular">{s.progress.streak}</span> {lang === "hi" ? "दिन" : s.progress.streak === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done.length} aria-label="Tasks done today">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-500" style={{ width: `${tasks.length ? (done.length / tasks.length) * 100 : 0}%` }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {tasks.map((t) => {
            const checked = done.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id, !checked)}
                  disabled={busy === t.id}
                  aria-pressed={checked}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors",
                    checked ? "border-sage-100 bg-sage-50 text-sage-700" : "border-neutral-200 bg-white text-ink-800 hover:border-brand-300",
                  )}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors", checked ? "border-sage-500 bg-sage-500 text-white" : "border-neutral-300")}>
                    {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <span className={checked ? "line-through decoration-sage-500/50" : ""}>{t.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </CardContent>
    </Card>
  );
}

function Outlook({ s, lang }: { s: WomanSummary; lang: Lang }) {
  if (!s.calendar) return null;
  const eventDates = new Set(s.events.map((e) => e.date));
  const phases: [keyof typeof DAY_PHASE_DOT, string, string][] = [
    ["menstrual", "Period", "पीरियड"],
    ["pms", "PMS", "PMS"],
    ["ovulation", "Fertile", "फर्टाइल"],
    ["follicular", "Fresh", "ताज़ा"],
    ["luteal", "Slow", "धीमा"],
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <CalendarHeart className="h-5 w-5 text-brand-600" aria-hidden="true" />
          {lang === "hi" ? "अगले 14 दिन" : "Next 14 days"}
        </h3>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {s.calendar.map((d) => {
            const date = new Date(`${d.date}T00:00:00`);
            const today = d.date === s.calendar![0]?.date;
            return (
              <div
                key={d.date}
                className={cn("flex flex-col items-center gap-1 rounded-xl py-1.5", today && "bg-brand-50 ring-1 ring-brand-200")}
                aria-label={`${shortDate(d.date)}: ${d.phase ?? "unknown"}${eventDates.has(d.date) ? ", plan" : ""}`}
              >
                <span className="text-[10px] text-ink-700/60">{date.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                <span className="tabular text-xs font-medium text-ink-800">{date.getDate()}</span>
                <span className={cn("h-2.5 w-2.5 rounded-full", d.phase ? DAY_PHASE_DOT[d.phase] : "bg-neutral-300")} />
                <span className={cn("h-1.5 w-1.5 rounded-full", eventDates.has(d.date) ? "bg-ink-900" : "bg-transparent")} />
              </div>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-700/70" aria-label="Legend">
          {phases.map(([id, en, hi]) => (
            <li key={id} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", DAY_PHASE_DOT[id])} />
              {lang === "hi" ? hi : en}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-900" />
            {lang === "hi" ? "आपका प्लान" : "Your plan"}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function Plans({ s, linkId, lang, onChanged }: { s: WomanSummary; linkId: string; lang: Lang; onChanged: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await api.partnerAddEvent(linkId, { title: title.trim(), date });
      setTitle("");
      setDate("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that.");
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold text-ink-900">{lang === "hi" ? "आपके प्लान" : "Your plans"}</h3>
        <p className="text-sm text-ink-700/70">{lang === "hi" ? "बड़े दिनों से पहले हम आपको सचेत करेंगे." : "Add anniversaries or trips and we'll flag any that fall on a tougher day."}</p>
        <ul className="mt-3 space-y-2">
          {s.events.length === 0 && <li className="text-sm text-ink-700/60">{lang === "hi" ? "अभी कोई प्लान नहीं." : "No plans yet."}</li>}
          {s.events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-700/60">{shortDate(e.date)}</p>
                {e.headsUp && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {e.headsUp === "menstrual"
                      ? lang === "hi" ? "यह दिन उसके पीरियड के आसपास पड़ सकता है. योजना हल्की रखें." : "Likely around her period. Keep the plan light and flexible."
                      : lang === "hi" ? "यह पीरियड से पहले के दिनों में पड़ सकता है. धैर्य रखें." : "Likely in her pre-period days. Extra patience helps."}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${e.title}`}
                onClick={async () => {
                  await api.partnerDeleteEvent(linkId, e.id).catch(() => {});
                  onChanged();
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lang === "hi" ? "जैसे: सालगिरह डिनर" : "e.g. Anniversary dinner"} maxLength={80} aria-label="Plan title" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} aria-label="Plan date" className="sm:w-44" />
          <Button type="submit" variant="outline" disabled={!title.trim() || !date}>
            {lang === "hi" ? "जोड़ें" : "Add"}
          </Button>
        </form>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </CardContent>
    </Card>
  );
}

function Feedback({ s, linkId, lang }: { s: WomanSummary; linkId: string; lang: Lang }) {
  const [given, setGiven] = useState<boolean | null>(null);
  const key = s.guidance?.key;
  if (!key) return null;
  async function send(helpful: boolean) {
    setGiven(helpful);
    await api.partnerFeedback(linkId, { guidanceKey: key!, helpful }).catch(() => {});
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-sm text-ink-800">{given === null ? (lang === "hi" ? "क्या ये सुझाव काम आए?" : "Were these suggestions helpful?") : lang === "hi" ? "धन्यवाद, इससे सुझाव बेहतर होंगे." : "Thanks, that helps us improve."}</p>
      {given === null && (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" aria-label="Helpful" onClick={() => send(true)}>
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="outline" aria-label="Not helpful" onClick={() => send(false)}>
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function WomanView({ summary, lang, onRefresh }: { summary: WomanSummary; lang: Lang; onRefresh: () => void }) {
  const [progress, setProgress] = useState(summary.progress);
  // Refreshes arrive as a new `summary`; take the server's task progress without remounting the form inputs.
  useEffect(() => setProgress(summary.progress), [summary.progress]);
  const s = { ...summary, progress };
  const linkId = summary.link.id;

  return (
    <div className="space-y-4">
      <Hero s={s} lang={lang} />
      <MoodPanel s={s} lang={lang} />
      <GuidanceCards s={s} lang={lang} />
      <InsightCards title={lang === "hi" ? "आज की जानकारी" : "Today's insights"} cards={s.insights} />
      <Tasks s={s} linkId={linkId} lang={lang} onProgress={setProgress} />
      <Outlook s={s} lang={lang} />

      {s.comfort && s.comfort.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <MessageCircleHeart className="h-5 w-5 text-brand-600" aria-hidden="true" />
              {lang === "hi" ? "क्या उसे अच्छा लगता है" : "What helps her"}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {s.comfort.map((c) => (
                <li key={c} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-700">
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {s.symptoms && s.symptoms.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-display text-lg font-semibold text-ink-900">{lang === "hi" ? "हाल के लक्षण" : "Recently mentioned"}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {s.symptoms.map((x) => (
                <li key={x} className="rounded-full bg-violet-50 px-3 py-1.5 text-sm text-violet-700">
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-700/60">{lang === "hi" ? "केवल नाम, कोई विवरण नहीं." : "Names only, no details."}</p>
          </CardContent>
        </Card>
      )}

      {s.fertility && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-display text-lg font-semibold text-ink-900">{lang === "hi" ? "फर्टाइल विंडो" : "Fertile window"}</h3>
            <p className="mt-1 text-sm text-ink-700">
              {shortDate(s.fertility.window.start)} – {shortDate(s.fertility.window.end)}
              {s.fertility.ovulationDate ? ` · ${lang === "hi" ? "ओव्यूलेशन" : "ovulation"} ~${shortDate(s.fertility.ovulationDate)}` : ""}
            </p>
            <p className="mt-1 text-xs text-ink-700/60">{lang === "hi" ? "अनुमान है, गारंटी नहीं. उसने इसे साझा करना चुना है, कृपया सम्मान से लें." : "An estimate, not a guarantee. She chose to share this, so treat it with care."}</p>
          </CardContent>
        </Card>
      )}

      <Plans s={s} linkId={linkId} lang={lang} onChanged={onRefresh} />
      <Feedback s={s} linkId={linkId} lang={lang} />

      {s.guidance && (
        <Card>
          <CardContent className="p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <BookOpen className="h-5 w-5 text-violet-600" aria-hidden="true" />
              {lang === "hi" ? "एक छोटी सीख" : "Quick lesson"}
            </h3>
            <p className="mt-2 text-sm text-ink-700">{s.guidance.lesson}</p>
          </CardContent>
        </Card>
      )}

      {s.guidance && (
        <div className="space-y-2 pb-2 text-xs text-ink-700/60">
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {s.guidance.disclaimer}
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {s.guidance.clinicianNote}
          </p>
        </div>
      )}
    </div>
  );
}
