import { useState } from "react";
import { api, type HealthProfile } from "@/lib/api";
import { streamChat, type EmergencyEvent, type FinalResult, type PipelineEvent } from "@/lib/aiChat";
import { useAuth } from "@/context/AuthContext";

export interface StepState {
  agent: string;
  label: string;
  status: "running" | "done";
  duration_ms?: number;
}

export interface Turn {
  id: string;
  userMessage: string;
  status: "streaming" | "done" | "error";
  steps: StepState[];
  emergency?: EmergencyEvent["data"];
  result?: FinalResult;
  error?: string;
}

export function applyEvent(turn: Turn, event: PipelineEvent): Turn {
  switch (event.type) {
    case "pipeline_start":
      return turn;
    case "agent_step": {
      if (event.status === "start") {
        return { ...turn, steps: [...turn.steps, { agent: event.agent, label: event.label, status: "running" }] };
      }
      return {
        ...turn,
        steps: turn.steps.map((s) => (s.agent === event.agent ? { ...s, status: "done", duration_ms: event.duration_ms } : s)),
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

/** Shared streaming-chat engine behind both the full Ask page and the floating chat bubble, so history and behaviour stay identical. */
export function useChatSession(language: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [cycle, setCycle] = useState<{ phase?: string; day?: number }>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadedContext, setLoadedContext] = useState(false);

  function loadContext() {
    if (loadedContext) return;
    setLoadedContext(true);
    api.getProfile().then(({ profile }) => setProfile(profile)).catch(() => {});
    api
      .getCycleInsights()
      .then(({ insights }) => setCycle({ phase: insights.subPhase ?? insights.phase ?? undefined, day: insights.currentCycleDay ?? undefined }))
      .catch(() => {});
  }

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, { id, userMessage: trimmed, status: "streaming", steps: [] }]);
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
      const healthProfile = { ...(profile ?? {}), name: user?.name, cyclePhase: cycle.phase, cycleDay: cycle.day };
      await streamChat({ message: trimmed, healthProfile, history, language }, (event) => {
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

  return { turns, busy, send, loadContext };
}
