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
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
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
    <div className="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
      <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold text-red-800">Emergency care may be needed</p>
        <p className="mt-1 text-sm text-red-700">{data.message}</p>
        <p className="mt-1 text-sm font-medium text-red-800">{data.recommended_action}</p>
      </div>
    </div>
  );
}

function AssistantResult({ result, onFollowUp }: { result: FinalResult; onFollowUp: (q: string) => void }) {
  const riskLevel = result.risk_assessment?.risk_level ?? result.symptom_analysis?.risk_level;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge confidence={result.confidence} />
        {riskLevel && <RiskBadge level={riskLevel} />}
      </div>

      {result.symptom_analysis && (
        <div>
          <p className="text-sm text-ink-900">{result.symptom_analysis.summary}</p>
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
          <PlanColumn title="Discuss with clinician" items={result.care_plan.discuss_with_clinician} />
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
      await streamChat({ message: trimmed, healthProfile: profile ?? undefined }, (event) => {
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
      <h1 className="font-display text-2xl font-semibold text-ink-900">Ask HERAI</h1>
      <p className="mt-1 max-w-xl text-ink-700/70">
        Describe how you're feeling. A pipeline of specialist agents — intake, symptom analysis,
        women's health intelligence, risk assessment, safety triage, and care planning — reasons
        over it step by step.
      </p>

      <div className="mt-6 space-y-4">
        {turns.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-6">
            <p className="text-sm text-ink-700/70">Try one of these, or write your own:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="flex max-w-[80%] items-start gap-2">
                <div className="rounded-2xl rounded-tr-sm bg-ink-900 px-4 py-2.5 text-sm text-white">
                  {turn.userMessage}
                </div>
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                  <User2 className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div className="w-full max-w-[85%] rounded-2xl rounded-tl-sm border border-neutral-200 bg-white p-4 shadow-sm">
                {turn.steps.length > 0 && (
                  <div className="mb-3 space-y-1.5 border-b border-neutral-100 pb-3">
                    {turn.steps.map((step) => (
                      <StepRow key={step.agent} step={step} />
                    ))}
                  </div>
                )}

                {turn.emergency && <EmergencyBanner data={turn.emergency} />}

                {turn.status === "error" && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {turn.error}
                  </div>
                )}

                {turn.result && !turn.result.emergency && (
                  <AssistantResult result={turn.result} onFollowUp={(q) => setInput(q)} />
                )}

                {turn.status === "streaming" && turn.steps.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-ink-700/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Starting pipeline…
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-4 mt-6 flex items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
        <Textarea
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
        <Button type="submit" disabled={busy || !input.trim()} size="sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </AppShell>
  );
}
