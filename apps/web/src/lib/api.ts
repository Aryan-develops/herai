import { clearSession, getSession, setSession, type Session } from "@/lib/session";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

// Bearer-token auth (no cookies — mobile has none). On a 401 from an expired
// access token, try the refresh token once before giving up, so a session
// doesn't die mid-use just because the 1hr access token expired.
async function tryRefresh(): Promise<boolean> {
  const session = getSession();
  if (!session) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const { session: next } = (await res.json()) as { session: Session };
        setSession(next);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function authHeaders(): Record<string, string> {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_retried && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
    clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Something went wrong");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestForm<T>(path: string, formData: FormData, _retried = false): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    body: formData,
    headers: authHeaders(),
  });

  if (res.status === 401 && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return requestForm<T>(path, formData, true);
    clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
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
  /** Minors need a guardian's approval before any health data is processed. */
  consentStatus: ConsentStatus;
  /** True for OAuth/passkey accounts until they've been asked their age. */
  needsDateOfBirth: boolean;
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

export type ProviderType = "lab" | "doctor" | "clinic";

export interface CareProvider {
  id: string;
  name: string;
  type: ProviderType;
  specialties: string[];
  services: string[];
  address: string;
  city: string;
  pincode: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  homeCollection: boolean;
  isSample: boolean;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
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
    setSession(res.session);
    return res;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await request<{ user: AuthUser; session: Session }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setSession(res.session);
    return res;
  },
  logout: async () => {
    await request<void>("/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
  },
  me: () => request<{ user: AuthUser }>("/auth/me"),
  // Full page navigation, not fetch — the gateway 302s straight to the
  // provider's consent screen, which fetch() can't follow cross-origin.
  oauthUrl: (provider: "google") => `/api/auth/oauth/${provider}`,
  submitDateOfBirth: (data: { dateOfBirth: string; name?: string; guardianEmail?: string; guardianName?: string }) =>
    request<{ user: AuthUser }>("/auth/date-of-birth", { method: "POST", body: JSON.stringify(data) }),
  // Passkey auth (lib/supabaseBrowser.ts) yields a Supabase session directly
  // in the browser, with no gateway round-trip — this just hands it to the
  // same local session store password/OAuth logins use, so every other call
  // treats it identically from here on.
  adoptSession: (session: Session) => setSession(session),
  // Permanent and irreversible: erases the account plus all health data.
  // Callers must confirm with the user before calling this.
  deleteAccount: async () => {
    await request<void>("/auth/account", { method: "DELETE" });
    clearSession();
  },

  // Guardian-facing: reached from an emailed link, so these send no auth token.
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

  listProviders: (q: { type?: ProviderType; lat?: number; lng?: number; radiusKm?: number; city?: string; homeCollection?: boolean }) => {
    const p = new URLSearchParams();
    if (q.type) p.set("type", q.type);
    if (q.lat !== undefined && q.lng !== undefined) {
      p.set("lat", String(q.lat));
      p.set("lng", String(q.lng));
    }
    if (q.radiusKm) p.set("radiusKm", String(q.radiusKm));
    if (q.city) p.set("city", q.city);
    if (q.homeCollection) p.set("homeCollection", "true");
    return request<{ providers: CareProvider[] }>(`/care/providers?${p.toString()}`);
  },
  applyAsProvider: (data: { orgName: string; type: ProviderType; contactName: string; email: string; phone?: string; city: string; notes?: string }) =>
    request<{ ok: true }>("/care/applications", { method: "POST", body: JSON.stringify(data) }),

  uploadReport: (file: File, result: unknown) => {
    const form = new FormData();
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
