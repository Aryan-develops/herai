import type { HealthProfile } from "@/lib/api";
import type { CarePlan, RiskAssessment } from "@/lib/aiChat";
import { streamSSE } from "@/lib/sse";

export interface ExtractedValue {
  parameter: string;
  value: number | null;
  unit: string | null;
  referenceRange: string | null;
  status: "in_range" | "below_range" | "above_range" | "critical_low" | "critical_high" | "unparseable";
  sourceLine?: string | null;
}

export interface DocumentIntelligence {
  explanation: string;
  confidence: "high" | "medium" | "low";
  needsClinician: boolean;
  caveats: string[];
}

export interface DocWomensHealthIndicator {
  pattern: string;
  note: string;
}

export interface DocWomensHealth {
  relevant: boolean;
  summary: string;
  indicators: DocWomensHealthIndicator[];
  possibleFactors: string[];
  followUpQuestions: string[];
  needsClinician: boolean;
}

export interface DocAgentTraceEntry {
  agent: string;
  duration_ms: number;
}

export interface ReportResult {
  emergency: boolean;
  message?: string;
  recommendedAction?: string;
  matchedSignals?: string[];
  extractedValues: ExtractedValue[];
  documentIntelligence: DocumentIntelligence | null;
  womensHealth: DocWomensHealth | null;
  riskAssessment: RiskAssessment | null;
  carePlan: CarePlan | null;
  questionsToAsk: string[];
  confidence: number;
  confidenceReasons?: string[];
  disclaimer: string;
  agentTrace: DocAgentTraceEntry[];
}

/** The ai-service emits snake_case; normalize once, here, so every consumer
 * (upload flow, persisted report detail) renders from the same camelCase shape. */
export function normalizeLiveResult(raw: any): ReportResult {
  return {
    emergency: Boolean(raw.emergency),
    message: raw.message,
    recommendedAction: raw.recommended_action,
    matchedSignals: raw.matched_signals,
    extractedValues: (raw.extracted_values ?? []).map(normalizeExtractedValue),
    documentIntelligence: raw.document_intelligence
      ? {
          explanation: raw.document_intelligence.explanation,
          confidence: raw.document_intelligence.confidence,
          needsClinician: raw.document_intelligence.needs_clinician,
          caveats: raw.document_intelligence.caveats ?? [],
        }
      : null,
    womensHealth: raw.womens_health
      ? {
          relevant: raw.womens_health.relevant,
          summary: raw.womens_health.summary,
          indicators: raw.womens_health.indicators ?? [],
          possibleFactors: raw.womens_health.possible_factors ?? [],
          followUpQuestions: raw.womens_health.follow_up_questions ?? [],
          needsClinician: raw.womens_health.needs_clinician,
        }
      : null,
    riskAssessment: raw.risk_assessment ?? null,
    carePlan: raw.care_plan ?? null,
    questionsToAsk: raw.questions_to_ask ?? [],
    confidence: raw.confidence,
    confidenceReasons: raw.confidence_reasons,
    disclaimer: raw.disclaimer,
    agentTrace: raw.agent_trace ?? [],
  };
}

function normalizeExtractedValue(v: any): ExtractedValue {
  return {
    parameter: v.parameter,
    value: v.value ?? null,
    unit: v.unit ?? null,
    referenceRange: v.reference_range ?? v.referenceRange ?? null,
    status: v.status,
    sourceLine: v.source_line ?? v.sourceLine ?? null,
  };
}

export interface DocStepEvent {
  type: "agent_step";
  agent: string;
  label: string;
  status: "start" | "complete";
  data?: unknown;
  duration_ms?: number;
}

export interface DocEmergencyEvent {
  type: "emergency";
  data: { emergency: true; matched_signals: string[]; category: string | null; message: string; recommended_action: string };
}

export interface DocFinalEvent {
  type: "final";
  data: any;
}

export type DocPipelineEvent = { type: "pipeline_start" } | DocStepEvent | DocEmergencyEvent | DocFinalEvent | { type: "error"; message: string };

export async function streamDocumentAnalysis(
  file: File,
  healthProfile: HealthProfile | undefined,
  onEvent: (event: DocPipelineEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (healthProfile) {
    form.append("healthProfile", JSON.stringify(healthProfile));
  }

  await streamSSE(
    "/ai/documents/analyze",
    { method: "POST", body: form },
    (data) => onEvent(data as DocPipelineEvent),
    { signal, idleTimeoutMs: 60000 }
  );
}
