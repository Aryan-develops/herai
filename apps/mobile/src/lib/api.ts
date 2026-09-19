import { API_URL } from "../config";
import { clearSession, getSession, setSession, type Session } from "./session";
import { reportError } from "./errorReporting";

/**
 * Ported from apps/web/src/lib/api.ts — same Express gateway, same JSON
 * contracts, so this stays a straight port rather than a rewrite. Two
 * differences, both forced by native having no cookies and no DOM:
 *   - session storage is SecureStore (async) instead of localStorage (sync)
 *   - the base URL is absolute (API_URL) instead of a relative "/api" that
 *     Vite's dev proxy resolves for the web app
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const { session: next } = (await res.json()) as { session: Session };
        await setSession(next);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_retried && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
    await clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    // 5xx is a server bug worth surfacing; 4xx (validation, auth) is normal
    // request/response traffic the UI already handles — not a crash signal.
    // The path alone is reported, never the request body (health data).
    if (res.status >= 500) reportError(new Error(`API ${res.status}: ${path}`), { status: res.status, path });
    throw new ApiError(res.status, body.error ?? "Something went wrong");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** A file as returned by expo-document-picker / expo-image-picker (Phase 4) — RN
 * has no DOM `File`, so FormData is built from a {uri, name, type} descriptor. */
export interface RNFile {
  uri: string;
  name: string;
  type: string;
}

async function requestForm<T>(path: string, formData: FormData, _retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: await authHeaders(),
  });

  if (res.status === 401 && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return requestForm<T>(path, formData, true);
    await clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status >= 500) reportError(new Error(`API ${res.status}: ${path}`), { status: res.status, path });
    throw new ApiError(res.status, body.error ?? "Something went wrong");
  }

  return res.json() as Promise<T>;
}

export type ConsentStatus = "not_required" | "pending" | "granted" | "declined" | "withdrawn";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  consentStatus: ConsentStatus;
}

export interface ConsentRequest {
  minorName: string;
  guardianEmail: string;
  guardianName?: string;
  status: ConsentStatus;
  expired: boolean;
}

export interface HealthProfile {
  ageRange?: string;
  heightCm?: number;
  weightKg?: number;
  cycleLengthDays?: number;
  lastPeriodStart?: string;
  knownConditions: string[];
  medications: string[];
  allergies: string[];
  lifestyle: {
    smoker: boolean;
    alcohol: "none" | "occasional" | "regular";
    exerciseFrequency: "none" | "light" | "moderate" | "active";
    sleepHoursAvg?: number;
  };
}

export interface SymptomEntry {
  name: string;
  severity: number;
}

export interface SymptomLog {
  _id: string;
  symptoms: SymptomEntry[];
  notes?: string;
  loggedAt: string;
}

export interface CycleLog {
  _id: string;
  flow: "spotting" | "light" | "medium" | "heavy";
  symptoms: string[];
  notes?: string;
  loggedAt: string;
}

export interface CycleInsights {
  cycleLengthDays: number;
  periodLengthDays: number;
  lastPeriodStart: string | null;
  currentCycleDay: number | null;
  predictedNextPeriodStart: string | null;
  ovulationDate: string | null;
  fertileWindow: { start: string; end: string } | null;
  phase: "menstrual" | "follicular" | "ovulation" | "luteal" | null;
  cycleHistory: { start: string; lengthDays: number }[];
  regularity: "regular" | "irregular" | "insufficient_data";
}

export type TimelineEvent =
  | { type: "symptom"; id: string; loggedAt: string; data: SymptomLog }
  | { type: "cycle"; id: string; loggedAt: string; data: CycleLog };

export interface HealthReportRecord {
  _id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  extractedValues: {
    parameter: string;
    value: number | null;
    unit?: string | null;
    reference_range?: string | null;
    status: string;
    source_line?: string | null;
  }[];
  ocr?: unknown;
  documentIntelligence?: { explanation: string; confidence: string; needsClinician: boolean; caveats: string[] } | null;
  womensHealth?: unknown;
  riskAssessment?: { risk_level: string; factors: { factor: string; impact: string; weight?: string }[]; rationale: string } | null;
  carePlan?: { today: string[]; this_week: string[]; discuss_with_clinician: string[] } | null;
  questionsToAsk: string[];
  sources: { title: string; source: string; url: string | null; topic: string }[];
  emergency: boolean;
  confidence?: number;
  agentTrace?: { agent: string; duration_ms: number }[];
  uploadedAt: string;
}

export interface AgentExecutionRecord {
  _id: string;
  triggerType: "chat" | "document";
  triggerRef?: string;
  agents: { agent: string; duration_ms: number }[];
  emergency: boolean;
  riskLevel?: string;
  createdAt: string;
}

export const api = {
  register: async (data: {
    name: string;
    email: string;
    password: string;
    dateOfBirth: string;
    guardianEmail?: string;
    guardianName?: string;
  }) => {
    const res = await request<{ user: AuthUser; session: Session }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await setSession(res.session);
    return res;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await request<{ user: AuthUser; session: Session }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await setSession(res.session);
    return res;
  },
  logout: async () => {
    await request<void>("/auth/logout", { method: "POST" }).catch(() => {});
    await clearSession();
  },
  me: () => request<{ user: AuthUser }>("/auth/me"),
  deleteAccount: async () => {
    await request<void>("/auth/account", { method: "DELETE" });
    await clearSession();
  },

  getConsentRequest: (token: string) => request<{ request: ConsentRequest }>(`/consent/${token}`),
  respondToConsent: (token: string, decision: "grant" | "decline") =>
    request<{ status: ConsentStatus }>(`/consent/${token}/respond`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),
  withdrawConsent: (token: string) =>
    request<{ status: ConsentStatus }>(`/consent/${token}/withdraw`, { method: "POST" }),
  resendConsentRequest: (data: { guardianEmail: string; guardianName?: string }) =>
    request<{ status: ConsentStatus }>("/consent", { method: "POST", body: JSON.stringify(data) }),

  getProfile: () => request<{ profile: HealthProfile }>("/profile"),
  updateProfile: (data: Partial<HealthProfile>) =>
    request<{ profile: HealthProfile }>("/profile", { method: "PUT", body: JSON.stringify(data) }),

  createSymptomLog: (data: { symptoms: SymptomEntry[]; notes?: string }) =>
    request<{ log: SymptomLog }>("/logs/symptoms", { method: "POST", body: JSON.stringify(data) }),
  listSymptomLogs: () => request<{ logs: SymptomLog[] }>("/logs/symptoms"),
  deleteSymptomLog: (id: string) => request<void>(`/logs/symptoms/${id}`, { method: "DELETE" }),

  createCycleLog: (data: { flow: CycleLog["flow"]; symptoms?: string[]; notes?: string }) =>
    request<{ log: CycleLog }>("/logs/cycles", { method: "POST", body: JSON.stringify(data) }),
  listCycleLogs: () => request<{ logs: CycleLog[] }>("/logs/cycles"),
  deleteCycleLog: (id: string) => request<void>(`/logs/cycles/${id}`, { method: "DELETE" }),
  getCycleInsights: () => request<{ insights: CycleInsights }>("/logs/cycles/insights"),

  getTimeline: () => request<{ events: TimelineEvent[] }>("/logs/timeline"),

  // Full implementation (expo-document-picker/-image-picker wiring) lands in
  // Phase 4; the contract is settled now so screens can be built against it.
  uploadReport: (file: RNFile, result: unknown) => {
    const form = new FormData();
    // @ts-expect-error React Native's FormData accepts a {uri,name,type}
    // descriptor here; the DOM FormData typings don't know this shape.
    form.append("file", file);
    form.append("result", JSON.stringify(result));
    return requestForm<{ report: HealthReportRecord }>("/reports", form);
  },
  listReports: () => request<{ reports: HealthReportRecord[] }>("/reports"),
  getReport: (id: string) => request<{ report: HealthReportRecord }>(`/reports/${id}`),
  deleteReport: (id: string) => request<void>(`/reports/${id}`, { method: "DELETE" }),

  logAgentExecution: (data: {
    triggerType: "chat" | "document";
    triggerRef?: string;
    agents: { agent: string; duration_ms: number }[];
    emergency?: boolean;
    riskLevel?: string;
  }) => request<{ execution: AgentExecutionRecord }>("/agent-executions", { method: "POST", body: JSON.stringify(data) }),
};
