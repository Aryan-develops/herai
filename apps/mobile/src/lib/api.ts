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
  isProvider?: boolean;
  isPartner?: boolean;
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
  duration_minutes?: number | null;
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
  duration_minutes?: number | null;
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
  /** Finer overlay on `phase`: PMS window, or cramp-prone days. */
  subPhase: "pms" | "cramps" | null;
  daysUntilNextPeriod: number | null;
  confidence: "high" | "medium" | "low";
  cycleHistory: { start: string; lengthDays: number }[];
  regularity: "regular" | "irregular" | "insufficient_data";
}

export type ProviderType = "lab" | "doctor" | "clinic";
export type ServiceCategory = "test" | "consultation" | "teleconsult";

export interface ProviderService {
  id: string;
  name: string;
  category: ServiceCategory;
  priceInr: number | null;
  turnaroundHours: number | null;
}

export interface CareProvider {
  id: string;
  name: string;
  type: ProviderType;
  specialties: string[];
  address: string;
  city: string;
  pincode: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  homeCollection: boolean;
  isSample: boolean;
  available: boolean;
  availabilityNote: string | null;
  offersTeleconsult: boolean;
  ratingAvg: number;
  ratingCount: number;
  priceFromInr: number | null;
  services: ProviderService[];
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
}

export interface CareSlot {
  id: string;
  startsAt: string;
  durationMin: number;
}

export interface CareReview {
  rating: number;
  comment: string | null;
  createdAt: string;
}

export type RequestKind = "test" | "appointment" | "callback" | "teleconsult";
export type RequestStatus = "new" | "accepted" | "declined" | "completed" | "cancelled";

export interface CareRequest {
  id: string;
  kind: RequestKind;
  serviceName: string | null;
  status: RequestStatus;
  message: string | null;
  slotStartsAt: string | null;
  preferredTime: string | null;
  sharedProfile: boolean;
  sharedReportCount: number;
  providerNote: string | null;
  meetingUrl: string | null;
  createdAt: string;
  reviewed: boolean;
  provider: { id: string; name: string; type: ProviderType; phone: string | null } | null;
}

export interface TestSuggestion {
  test: string;
  because: string[];
  providers: (CareProvider & { matchedService: { id: string; name: string; priceInr: number | null; turnaroundHours: number | null } })[];
}

export interface ProviderInboxItem {
  id: string;
  patientFirstName: string;
  kind: RequestKind;
  serviceName: string | null;
  status: RequestStatus;
  message: string | null;
  slotStartsAt: string | null;
  preferredTime: string | null;
  sharesProfile: boolean;
  sharedReportCount: number;
  providerNote: string | null;
  meetingUrl: string | null;
  createdAt: string;
}

export interface ProviderDashboardData {
  provider: {
    id: string;
    name: string;
    type: ProviderType;
    address: string;
    city: string;
    phone: string | null;
    hours: string | null;
    home_collection: boolean;
    available: boolean;
    availability_note: string | null;
    offers_teleconsult: boolean;
    rating_avg: number;
    rating_count: number;
    verified: boolean;
  };
  services: (ProviderService & { active: boolean })[];
  slots: { id: string; startsAt: string; durationMin: number; status: "open" | "booked" }[];
  requestCounts: Record<string, number>;
}

export interface SharedData {
  profile: { ageRange?: string; conditions?: string[]; medications?: string[]; allergies?: string[]; cycleLengthDays?: number } | null;
  reports: { id: string; fileName: string; uploadedAt: string; values: { parameter: string; value: number | null; unit?: string | null; reference_range?: string | null; status: string }[]; explanation: string | null }[];
}

export type TimelineEvent =
  | { type: "symptom"; id: string; loggedAt: string; data: SymptomLog }
  | { type: "cycle"; id: string; loggedAt: string; data: CycleLog }
  | { type: "mood"; id: string; loggedAt: string; data: { id: string; mood: Mood; energy: number | null; need: Need | null; duration_minutes: number | null } };

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

// ---------------------------------------------------------------- moods, partners, payments, settings

export type Mood = "great" | "good" | "okay" | "low" | "irritable" | "anxious" | "sad";
export type Need = "space" | "hug" | "food" | "talk" | "rest";
export type PhaseKey = "menstrual" | "cramps" | "follicular" | "ovulation" | "luteal" | "pms";
export type DayPhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "pms";
export type Relationship = "partner" | "family" | "friend";
export type Lang = "en" | "hi";

export interface MoodLog {
  id: string;
  mood: Mood;
  energy: number | null;
  need: Need | null;
  loggedAt: string;
  durationMinutes: number | null;
}

export interface SharedScopes {
  phase: boolean;
  mood: boolean;
  symptoms: boolean;
  predictions: boolean;
  comfort: boolean;
  fertility: boolean;
}

export type SupportTopic = "account" | "cycle_tracking" | "partner" | "payments" | "bug" | "other";

export interface PartnerLink {
  id: string;
  firstName: string;
  nickname: string | null;
  relationship: Relationship;
  status: "active" | "paused" | "revoked";
  scopes: SharedScopes;
  createdAt: string;
}

export type InviteDirection = "woman_invites_partner" | "partner_requests_woman";

export interface InviteCreated {
  invite: { id: string; direction: InviteDirection; relationship: Relationship; expiresAt: string };
  code: string;
  link: string;
  emailSent: boolean;
}

export interface OpenInvite {
  id: string;
  direction: InviteDirection;
  relationship: Relationship;
  expiresAt: string;
  createdAt: string;
}

export interface SubscriptionView {
  state: "trialing" | "active" | "expired" | "none";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  autopay: boolean;
  paywallOn: boolean;
  priceInr: number;
  hasAccess: boolean;
  daysLeft: number | null;
}

export interface WomanCard {
  linkId: string;
  firstName: string;
  relationship: Relationship;
  available: boolean;
  phaseKey?: PhaseKey | null;
  cycleDay?: number | null;
  mood?: Mood | null;
}

export interface PartnerGuidance {
  key: string;
  phaseKey: PhaseKey;
  title: string;
  blurb: string;
  do: string[];
  say: string[];
  avoid: string[];
  moodNote: string | null;
  need: { title: string; text: string } | null;
  tasks: { id: string; text: string }[];
  lesson: string;
  disclaimer: string;
  clinicianNote: string;
  source: "curated" | "ai";
}

export interface WomanSummary {
  available: true;
  link: { id: string; firstName: string; relationship: Relationship; since: string };
  phase: {
    key: PhaseKey | null;
    cycleDay: number | null;
    cycleLengthDays: number;
    daysUntilNextPeriod: number | null;
    nextPeriodStart: string | null;
    confidence: "high" | "medium" | "low";
    estimated: boolean;
  };
  mood: { mood: Mood; energy: number | null; need: Need | null; at: string } | null;
  symptoms: string[] | null;
  comfort: string[] | null;
  fertility: { window: { start: string; end: string }; ovulationDate: string | null } | null;
  guidance: PartnerGuidance | null;
  insights: InsightCard[];
  calendar: { date: string; phase: DayPhase | null }[] | null;
  events: { id: string; title: string; date: string; headsUp: "menstrual" | "pms" | null }[];
  progress: { doneToday: string[]; streak: number };
  subscription: SubscriptionView;
}

export type SummaryResponse = WomanSummary | { available: false; message: string };

export interface PaymentPlans {
  plan: { id: string; priceInr: number; period: string; trialDays: number };
  testingPhase: boolean;
  paymentsConnected: boolean;
  methods: { id: string; label: string; providers: string[]; available: boolean }[];
  upiApps: { id: string; label: string }[];
  providers: { id: string; label: string; connected: boolean; autopay: boolean }[];
  subscription: SubscriptionView;
}

export interface NotificationPrefs {
  partnerDailyNudge: boolean;
  nudgeHour: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  language: Lang;
}

export type InsightTone = "body" | "food" | "move" | "mind" | "care" | "talk" | "plan";

export interface InsightCard {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export interface MoodInsight {
  ready: boolean;
  needed?: number;
  insight: { phase: DayPhase; message: string } | null;
  message?: string;
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

  createSymptomLog: (data: { symptoms: SymptomEntry[]; notes?: string; loggedAt?: string; durationMinutes?: number }) =>
    request<{ log: SymptomLog }>("/logs/symptoms", { method: "POST", body: JSON.stringify(data) }),
  listSymptomLogs: () => request<{ logs: SymptomLog[] }>("/logs/symptoms"),
  deleteSymptomLog: (id: string) => request<void>(`/logs/symptoms/${id}`, { method: "DELETE" }),

  createCycleLog: (data: { flow: CycleLog["flow"]; symptoms?: string[]; notes?: string; loggedAt?: string; durationMinutes?: number }) =>
    request<{ log: CycleLog }>("/logs/cycles", { method: "POST", body: JSON.stringify(data) }),
  createPeriodRange: (days: { date: string; flow: CycleLog["flow"] }[], removeDates: string[] = []) =>
    request<{ logs: CycleLog[] }>("/logs/cycles/range", { method: "POST", body: JSON.stringify({ days, removeDates }) }),
  listCycleLogs: () => request<{ logs: CycleLog[] }>("/logs/cycles"),
  deleteCycleLog: (id: string) => request<void>(`/logs/cycles/${id}`, { method: "DELETE" }),
  getCycleInsights: () => request<{ insights: CycleInsights }>("/logs/cycles/insights"),

  getTimeline: () => request<{ events: TimelineEvent[] }>("/logs/timeline"),

  createMoodLog: (data: { mood: Mood; energy?: number; need?: Need; loggedAt?: string; durationMinutes?: number }) =>
    request<{ mood: MoodLog }>("/logs/moods", { method: "POST", body: JSON.stringify(data) }),
  deleteMoodLog: (id: string) => request<void>(`/logs/moods/${id}`, { method: "DELETE" }),
  listMoodLogs: (days = 30) => request<{ moods: MoodLog[] }>(`/logs/moods?days=${days}`),
  moodInsights: () => request<MoodInsight>("/logs/moods/insights"),
  dailyInsights: (lang?: Lang) => request<{ phase: PhaseKey | null; cards: InsightCard[] }>(`/logs/insights/daily${lang ? `?lang=${lang}` : ""}`),

  // Partner mode
  createInvite: (data: { direction?: InviteDirection; relationship?: Relationship; email?: string }) =>
    request<InviteCreated>("/partner/invites", { method: "POST", body: JSON.stringify(data) }),
  listInvites: () => request<{ invites: OpenInvite[] }>("/partner/invites"),
  cancelInvite: (id: string) => request<void>(`/partner/invites/${id}`, { method: "DELETE" }),
  previewInvite: (q: { code?: string; token?: string }) => {
    const p = new URLSearchParams();
    if (q.code) p.set("code", q.code);
    if (q.token) p.set("token", q.token);
    return request<{ inviterFirstName: string; direction: InviteDirection; relationship: Relationship }>(
      `/partner/invites/preview?${p.toString()}`,
    );
  },
  acceptInvite: (data: { code?: string; token?: string }) =>
    request<{ linkId: string; role: "woman" | "partner" }>("/partner/invites/accept", { method: "POST", body: JSON.stringify(data) }),
  supportInfo: () => request<{ email: string | null }>("/support/info"),
  sendSupport: (data: { topic: SupportTopic; message: string }) =>
    request<{ ok: true; id: string; forwarded: boolean }>("/support", { method: "POST", body: JSON.stringify(data) }),
  listMyPartners: () => request<{ partners: PartnerLink[] }>("/partner/links"),
  updatePartnerLink: (id: string, data: { status?: "active" | "paused"; scopes?: Partial<SharedScopes>; nickname?: string | null }) =>
    request<{ partner: PartnerLink }>(`/partner/links/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  revokePartnerLink: (id: string) => request<void>(`/partner/links/${id}`, { method: "DELETE" }),
  partnerAccessLog: (id: string) => request<{ entries: { action: string; at: string }[] }>(`/partner/links/${id}/access-log`),
  listWomen: (lang?: Lang) => request<{ women: WomanCard[]; subscription: SubscriptionView }>(`/partner/women${lang ? `?lang=${lang}` : ""}`),
  womanSummary: (linkId: string, lang?: Lang) => request<SummaryResponse>(`/partner/women/${linkId}/summary${lang ? `?lang=${lang}` : ""}`),
  partnerFeedback: (linkId: string, data: { guidanceKey: string; helpful: boolean }) =>
    request<{ ok: true }>(`/partner/women/${linkId}/feedback`, { method: "POST", body: JSON.stringify(data) }),
  partnerTask: (linkId: string, data: { taskId: string; done: boolean }) =>
    request<{ doneToday: string[]; streak: number }>(`/partner/women/${linkId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  partnerAddEvent: (linkId: string, data: { title: string; date: string }) =>
    request<{ event: { id: string; title: string; date: string } }>(`/partner/women/${linkId}/events`, { method: "POST", body: JSON.stringify(data) }),
  partnerDeleteEvent: (linkId: string, eventId: string) => request<void>(`/partner/women/${linkId}/events/${eventId}`, { method: "DELETE" }),
  mySubscription: () => request<{ subscription: SubscriptionView }>("/partner/subscription"),

  // Payments (interface only until a provider is connected)
  paymentPlans: () => request<PaymentPlans>("/payments/plans"),
  checkout: (data: { method: string; upiApp?: string; vpa?: string; autopay?: boolean }) =>
    request<{ status: "not_connected" | "failed" | "requires_action" | "paid"; message?: string; redirectUrl?: string | null }>("/payments/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  setAutopay: (enabled: boolean) => request<{ autopay: boolean; note: string }>("/payments/autopay", { method: "POST", body: JSON.stringify({ enabled }) }),
  cancelSubscription: () => request<{ subscription: SubscriptionView }>("/payments/cancel", { method: "POST" }),
  createGift: (months: number) => request<{ code: string; months: number; priceInr: number; free: boolean }>("/payments/gift/create", { method: "POST", body: JSON.stringify({ months }) }),
  redeemGift: (code: string) => request<{ months: number; subscription: SubscriptionView }>("/payments/gift/redeem", { method: "POST", body: JSON.stringify({ code }) }),

  // Settings
  getSecurity: () => request<{ email: string | null; providers: string[]; hasPassword: boolean }>("/settings/security"),
  changePassword: async (data: { currentPassword?: string; newPassword: string }) => {
    const res = await request<{ session: Session }>("/settings/password", { method: "POST", body: JSON.stringify(data) });
    await setSession(res.session);
  },
  updateName: (name: string) => request<{ name: string }>("/settings/profile", { method: "PATCH", body: JSON.stringify({ name }) }),
  getPrefs: () => request<{ prefs: NotificationPrefs }>("/settings/prefs"),
  updatePrefs: (data: Partial<NotificationPrefs>) => request<{ prefs: NotificationPrefs }>("/settings/prefs", { method: "PUT", body: JSON.stringify(data) }),
  getComfort: () => request<{ items: string[] }>("/settings/comfort"),
  putComfort: (items: string[]) => request<{ items: string[] }>("/settings/comfort", { method: "PUT", body: JSON.stringify({ items }) }),
  exportData: () => request<Record<string, unknown>>("/settings/export"),
  registerPushToken: (token: string) =>
    request<void>("/settings/push-token", { method: "POST", body: JSON.stringify({ token, platform: "expo" }) }),

  listProviders: (q: { type?: ProviderType; lat?: number; lng?: number; radiusKm?: number; city?: string; homeCollection?: boolean; teleconsult?: boolean; available?: boolean }) => {
    const p = new URLSearchParams();
    if (q.type) p.set("type", q.type);
    if (q.lat !== undefined && q.lng !== undefined) {
      p.set("lat", String(q.lat));
      p.set("lng", String(q.lng));
    }
    if (q.radiusKm) p.set("radiusKm", String(q.radiusKm));
    if (q.city) p.set("city", q.city);
    if (q.homeCollection) p.set("homeCollection", "true");
    if (q.teleconsult) p.set("teleconsult", "true");
    if (q.available) p.set("available", "true");
    return request<{ providers: CareProvider[] }>(`/care/providers?${p.toString()}`);
  },
  getProvider: (id: string) => request<{ provider: CareProvider; slots: CareSlot[]; reviews: CareReview[] }>(`/care/providers/${id}`),
  createCareRequest: (data: {
    providerId: string;
    kind: RequestKind;
    serviceId?: string;
    slotId?: string;
    preferredTime?: string;
    message?: string;
    shareProfile: boolean;
    shareReportIds: string[];
    consent: true;
  }) => request<{ request: { id: string; status: RequestStatus } }>("/care/requests", { method: "POST", body: JSON.stringify(data) }),
  listCareRequests: () => request<{ requests: CareRequest[] }>("/care/requests"),
  cancelCareRequest: (id: string) => request<void>(`/care/requests/${id}/cancel`, { method: "POST" }),
  reviewCareRequest: (id: string, data: { rating: number; comment?: string }) =>
    request<{ ok: true }>(`/care/requests/${id}/review`, { method: "POST", body: JSON.stringify(data) }),
  suggestTests: (reportId: string, coords?: { lat: number; lng: number }) =>
    request<{ suggestions: TestSuggestion[] }>(`/care/suggest/${reportId}${coords ? `?lat=${coords.lat}&lng=${coords.lng}` : ""}`),
  applyAsProvider: (data: { orgName: string; type: ProviderType; contactName: string; email: string; phone?: string; city: string; notes?: string }) =>
    request<{ ok: true }>("/care/applications", { method: "POST", body: JSON.stringify(data) }),

  providerMe: () => request<ProviderDashboardData>("/provider/me"),
  providerUpdateMe: (data: { available?: boolean; availabilityNote?: string | null; hours?: string | null; phone?: string | null; homeCollection?: boolean; offersTeleconsult?: boolean }) =>
    request<{ ok: true }>("/provider/me", { method: "PATCH", body: JSON.stringify(data) }),
  providerAddService: (data: { name: string; category: ServiceCategory; priceInr?: number | null; turnaroundHours?: number | null }) =>
    request<{ id: string }>("/provider/services", { method: "POST", body: JSON.stringify(data) }),
  providerUpdateService: (id: string, data: { active?: boolean; priceInr?: number | null; turnaroundHours?: number | null }) =>
    request<void>(`/provider/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  providerDeleteService: (id: string) => request<void>(`/provider/services/${id}`, { method: "DELETE" }),
  providerAddSlots: (data: { startsAt: string[]; durationMin: number }) =>
    request<{ added: number }>("/provider/slots", { method: "POST", body: JSON.stringify(data) }),
  providerDeleteSlot: (id: string) => request<void>(`/provider/slots/${id}`, { method: "DELETE" }),
  providerRequests: () => request<{ requests: ProviderInboxItem[] }>("/provider/requests"),
  providerUpdateRequest: (id: string, data: { status: "accepted" | "declined" | "completed"; note?: string; meetingUrl?: string }) =>
    request<void>(`/provider/requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  providerShared: (id: string) => request<SharedData>(`/provider/requests/${id}/shared`),


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
