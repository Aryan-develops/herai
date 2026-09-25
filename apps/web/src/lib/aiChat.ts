import type { HealthProfile } from "@/lib/api";
import { streamSSE } from "@/lib/sse";

export interface AgentStepEvent {
  type: "agent_step";
  agent: string;
  label: string;
  status: "start" | "complete";
  data?: unknown;
  duration_ms?: number;
}

export interface EmergencyEvent {
  type: "emergency";
  data: {
    emergency: true;
    matched_signals: string[];
    category: string | null;
    message: string;
    recommended_action: string;
  };
}

export interface SymptomAnalysis {
  summary: string;
  possible_factors: string[];
  risk_level: "low" | "moderate" | "high" | "urgent";
  follow_up_questions: string[];
  recommended_next_steps: string[];
  needs_clinician: boolean;
}

export interface WomensHealthIndicator {
  pattern: string;
  note: string;
}

export interface WomensHealthAnalysis {
  relevant: boolean;
  summary: string;
  indicators: WomensHealthIndicator[];
  possible_factors: string[];
  follow_up_questions: string[];
  needs_clinician: boolean;
}

export interface RiskFactor {
  factor: string;
  impact: "increases" | "decreases" | "neutral";
  weight?: "low" | "medium" | "high";
}

export interface RiskAssessment {
  risk_level: "low" | "moderate" | "high" | "urgent";
  factors: RiskFactor[];
  rationale: string;
}

export interface CarePlan {
  today: string[];
  this_week: string[];
  discuss_with_clinician: string[];
}

export interface IntakeResult {
  extracted: {
    symptoms: string[];
    duration: string | null;
    severity: string | null;
    context: string | null;
  };
  missing_info: string[];
  request_classification: string;
  invoke_agents: { symptom_analysis: boolean; womens_health: boolean };
  confidence: number;
}

export interface AgentTraceEntry {
  agent: string;
  duration_ms: number;
}

export interface Source {
  title: string;
  source: string;
  url: string | null;
  topic: string;
}

export interface FinalResult {
  /** "reply" = conversational answer; "assessment" = full symptom pipeline. */
  kind?: "reply" | "assessment";
  reply?: string | null;
  suggest_help?: boolean;
  emergency: boolean;
  message?: string;
  recommended_action?: string;
  matched_signals?: string[];
  intake?: IntakeResult;
  symptom_analysis?: SymptomAnalysis;
  womens_health?: WomensHealthAnalysis;
  risk_assessment?: RiskAssessment;
  care_plan?: CarePlan;
  confidence: number | null;
  confidence_reasons?: string[];
  follow_up_questions: string[];
  sources?: Source[];
  disclaimer: string;
  agent_trace: AgentTraceEntry[];
}

export interface FinalEvent {
  type: "final";
  data: FinalResult;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type PipelineEvent =
  | { type: "pipeline_start" }
  | AgentStepEvent
  | EmergencyEvent
  | FinalEvent
  | ErrorEvent;

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(
  payload: { message: string; healthProfile?: HealthProfile; history?: ChatMessagePayload[] },
  onEvent: (event: PipelineEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  await streamSSE(
    "/ai/chat/stream",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    (data) => onEvent(data as PipelineEvent),
    { signal, idleTimeoutMs: 45000 }
  );
}
