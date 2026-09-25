import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  User2,
} from "lucide-react";
import { api, type HealthProfile } from "@/lib/api";
import {
  streamChat,
  type EmergencyEvent,
  type FinalResult,
  type PipelineEvent,
} from "@/lib/aiChat";
import { AppShell } from "@/components/AppShell";
import { SourcesList } from "@/components/SourcesList";
import { GetHelpButton } from "@/components/GetHelp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface StepState {
  agent: string;
  label: string;
  status: "running" | "done";
  duration_ms?: number;
}

interface Turn {
  id: string;
  userMessage: string;
  status: "streaming" | "done" | "error";
  steps: StepState[];
  emergency?: EmergencyEvent["data"];
  result?: FinalResult;
  error?: string;
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-sage-100 text-sage-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const SUGGESTIONS = [
  "I've been really tired for the past two weeks",
  "My cycles have been irregular for a few months",
  "I've had a mild headache on and off for three days",
];

function applyEvent(turn: Turn, event: PipelineEvent): Turn {
  switch (event.type) {
    case "pipeline_start":
      return turn;
    case "agent_step": {
      if (event.status === "start") {
        return { ...turn, steps: [...turn.steps, { agent: event.agent, label: event.label, status: "running" }] };
      }
      return {
        ...turn,
        steps: turn.steps.map((s) =>
          s.agent === event.agent ? { ...s, status: "done", duration_ms: event.duration_ms } : s
        ),
      };
    }
    case "emergency":
      return { ...turn, emergency: event.data };
    case "final":
      return { ...turn, status: "done", result: event.data };
    case "error":
      return { ...turn, status: "error", error: event.message };
    default:
      return turn;
  }
}

function StepRow({ step }: { step: StepState }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {step.status === "running" ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-500" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sage-500" />
      )}
      <span className={cn(step.status === "running" ? "text-ink-900" : "text-ink-700/70")}>{step.label}</span>
      {step.status === "done" && step.duration_ms !== undefined && (
        <span className="text-xs text-ink-700/40">{step.duration_ms}ms</span>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 75 ? "text-sage-700 bg-sage-100" : pct >= 55 ? "text-amber-700 bg-amber-100" : "text-orange-700 bg-orange-100";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      <Sparkles className="h-3 w-3" />
      {pct}% confidence
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        RISK_STYLES[level] ?? "bg-neutral-100 text-neutral-700"
      )}
    >
      {level} risk
    </span>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function PlanColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
      <h4 className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-ink-900">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmergencyBanner({ data }: { data: EmergencyEvent["data"] }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
      <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
      <div>
        <p className="font-semibold text-red-800">Emergency care may be needed</p>
        <p className="mt-1 text-sm text-red-700">{data.message}</p>
        <p className="mt-1 text-sm font-medium text-red-800">{data.recommended_action}</p>
      </div>
    </div>
  );
}

function ReplyResult({ result, onFollowUp }: { result: FinalResult; onFollowUp: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="leading-relaxed whitespace-pre-line text-ink-900">{result.reply}</p>

      {result.suggest_help && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-50/80 p-3.5">
          <p className="flex-1 text-sm text-ink-800">This might be worth checking with a clinician.</p>
          <GetHelpButton variant="outline" />
        </div>
      )}

      {result.follow_up_questions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.follow_up_questions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onFollowUp(q)}
              className="min-h-9 cursor-pointer rounded-full border border-brand-200 bg-white px-3.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <SourcesList sources={result.sources ?? []} />
    </div>
  );
}

function AssistantResult({ result, onFollowUp }: { result: FinalResult; onFollowUp: (q: string) => void }) {
  const riskLevel = result.risk_assessment?.risk_level ?? result.symptom_analysis?.risk_level;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {result.confidence !== null && <ConfidenceBadge confidence={result.confidence} />}
        {riskLevel && <RiskBadge level={riskLevel} />}
      </div>

      {result.symptom_analysis && (
        <div>
          <p className="leading-relaxed text-ink-900">{result.reply ?? result.symptom_analysis.summary}</p>
          {result.symptom_analysis.possible_factors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">May be associated with</p>
              <div className="mt-1.5">
                <ChipList items={result.symptom_analysis.possible_factors} />
              </div>
            </div>
          )}
        </div>
      )}

      {result.womens_health?.relevant && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
          <p className="text-sm text-ink-900">{result.womens_health.summary}</p>
          {result.womens_health.indicators.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.womens_health.indicators.map((ind, i) => (
                <li key={i} className="text-xs text-ink-700/70">
                  <span className="font-medium text-brand-700">{ind.pattern}:</span> {ind.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.risk_assessment && result.risk_assessment.factors.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">Why this risk level</p>
          <ul className="mt-1.5 space-y-1">
            {result.risk_assessment.factors.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-ink-700/70">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    f.impact === "increases" ? "bg-orange-500" : f.impact === "decreases" ? "bg-sage-500" : "bg-neutral-300"
                  )}
                />
                {f.factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.care_plan && (
        <div className="grid gap-2 sm:grid-cols-3">
          <PlanColumn title="Today" items={result.care_plan.today} />
          <PlanColumn title="This week" items={result.care_plan.this_week} />
          <PlanColumn title="Ask your clinician" items={result.care_plan.discuss_with_clinician} />
        </div>
      )}

      {result.follow_up_questions.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">Follow-up questions</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.follow_up_questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFollowUp(q)}
                className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <SourcesList sources={result.sources ?? []} />

      <p className="text-xs text-ink-700/50 italic">{result.disclaimer}</p>
    </div>
  );
}

export function Chat() {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(({ profile }) => setProfile(profile))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, { id, userMessage: trimmed, status: "streaming", steps: [] }]);
    setInput("");
    setBusy(true);

    try {
      const history = turns.slice(-6).flatMap((t) => {
        const text = t.result?.reply ?? t.result?.symptom_analysis?.summary;
        return text
          ? [
              { role: "user" as const, content: t.userMessage },
              { role: "assistant" as const, content: text },
            ]
          : [{ role: "user" as const, content: t.userMessage }];
      });
      await streamChat({ message: trimmed, healthProfile: profile ?? undefined, history }, (event) => {
        setTurns((prev) => prev.map((t) => (t.id === id ? applyEvent(t, event) : t)));
        if (event.type === "final") {
          api
            .logAgentExecution({
              triggerType: "chat",
              agents: event.data.agent_trace,
              emergency: event.data.emergency,
              riskLevel: event.data.risk_assessment?.risk_level,
            })
            .catch(() => {});
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong reaching the AI service.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: message } : t)));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Ask HERAI</h1>
          <p className="text-sm text-ink-700/70">Ask about your cycle, symptoms or lab reports.</p>
        </div>
      </div>

      <div className="mt-6 space-y-5" aria-live="polite">
        {turns.length === 0 && (
          <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/60 p-6 shadow-soft">
            <p className="font-display text-lg font-semibold text-ink-900">How are you feeling?</p>
            <p className="mt-1 text-sm text-ink-700/75">
              Describe a symptom or a worry in your own words. Try one of these, or write your own:
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
                >
                  {s}
                  <Send className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="flex max-w-[88%] items-start gap-2 sm:max-w-[80%]">
                <div className="rounded-3xl rounded-tr-md bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2.5 text-sm text-white shadow-soft">
                  {turn.userMessage}
                </div>
                <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 sm:flex">
                  <User2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white sm:flex">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="w-full max-w-full rounded-3xl rounded-tl-md border border-neutral-200 bg-white p-4 shadow-soft sm:max-w-[90%] sm:p-5">
                {turn.steps.length > 0 && turn.status === "streaming" && (
                  <div className="space-y-1.5" aria-live="polite">
                    {turn.steps.map((step) => (
                      <StepRow key={step.agent} step={step} />
                    ))}
                  </div>
                )}
                {turn.steps.length > 0 && turn.status !== "streaming" && turn.result?.kind !== "reply" && (
                  <details className="group mb-4 border-b border-neutral-100 pb-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-ink-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sage-500" aria-hidden="true" />
                      How HERAI worked this out ({turn.steps.length} steps)
                    </summary>
                    <div className="mt-3 space-y-1.5">
                      {turn.steps.map((step) => (
                        <StepRow key={step.agent} step={step} />
                      ))}
                    </div>
                  </details>
                )}

                {turn.emergency && <EmergencyBanner data={turn.emergency} />}

                {turn.status === "error" && (
                  <div role="alert" className="flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {turn.error}
                  </div>
                )}

                {turn.result && !turn.result.emergency && turn.result.kind === "reply" && (
                  <ReplyResult result={turn.result} onFollowUp={(q) => send(q)} />
                )}
                {turn.result && !turn.result.emergency && turn.result.kind !== "reply" && (
                  <AssistantResult result={turn.result} onFollowUp={(q) => send(q)} />
                )}

                {turn.status === "streaming" && turn.steps.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-ink-700/60">
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-300 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" />
                    </span>
                    HERAI is typing…
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="h-28" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-16 z-20 bg-gradient-to-t from-neutral-50 from-70% to-transparent px-4 pt-6 pb-2 lg:bottom-0 lg:pb-4">
        <div className="mx-auto max-w-5xl sm:px-2">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-3xl border border-neutral-200 bg-white/95 p-2 shadow-lift backdrop-blur"
        >
          <label htmlFor="chat-input" className="sr-only">
            Describe how you're feeling
          </label>
          <Textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="e.g. I've been tired for two weeks"
            className="min-h-11 flex-1 resize-none border-none shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="h-11 w-11 rounded-2xl px-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-neutral-500">
          HERAI shares health information, not diagnoses. In an emergency, tap <span className="font-semibold">Get help</span>.
        </p>
        </div>
      </div>
    </AppShell>
  );
}
