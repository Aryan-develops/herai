import { request } from "@/lib/api";

export interface AdminOverview {
  users: { total: number; last7: number; last30: number; onboarded: number };
  partner: { linksActive: number; linksPaused: number; followers: number };
  premium: { paywallOn: boolean; priceInr: number; trialing: number; active: number; canceled: number; expired: number; giftsIssued: number; giftsRedeemed: number; mrrInr: number };
  care: { providers: number; providersLive: number; applicationsNew: number; requestsTotal: number; requestsNew: number };
  ops: { supportOpen: number; errors24h: number };
  activity: { cycleLogs7: number; moodLogs7: number; chats7: number };
  signups: { day: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastSignIn: string | null;
  provider: string;
  onboarded: boolean;
  consent: string | null;
  sharesWith: number;
  follows: number;
  subscription: { status: string; trial_ends_at: string | null; current_period_end: string | null; provider: string | null } | null;
}

export interface AdminProvider {
  id: string;
  name: string;
  type: string;
  city: string | null;
  verified: boolean;
  available: boolean;
  is_sample: boolean;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
}

export interface AdminApplication {
  id: string;
  org_name: string;
  type: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string;
  status: "new" | "contacted" | "approved" | "rejected";
  created_at: string;
}

export interface AdminSupport {
  id: string;
  email: string;
  topic: string;
  message: string;
  status: "open" | "answered" | "closed";
  created_at: string;
}

export const adminApi = {
  overview: () => request<AdminOverview>("/admin/overview"),
  users: (q: string, page: number) => request<{ users: AdminUser[]; hasMore: boolean; page: number }>(`/admin/users?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  premium: (userId: string, body: { action: "grant" | "extend_trial" | "revoke"; months?: number; days?: number }) =>
    request<{ subscription: unknown }>(`/admin/users/${userId}/premium`, { method: "POST", body: JSON.stringify(body) }),
  providers: () => request<{ providers: AdminProvider[]; applications: AdminApplication[] }>("/admin/providers"),
  updateProvider: (id: string, body: { verified?: boolean; available?: boolean }) =>
    request<unknown>(`/admin/providers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateApplication: (id: string, status: AdminApplication["status"]) =>
    request<unknown>(`/admin/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  support: () => request<{ requests: AdminSupport[] }>("/admin/support"),
  updateSupport: (id: string, status: AdminSupport["status"]) =>
    request<unknown>(`/admin/support/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  errors: () => request<{ errors: { id: string; source: string; message: string; route: string | null; http_status: number | null; fatal: boolean; created_at: string }[] }>("/admin/errors"),
  audit: () => request<{ entries: { id: string; admin_email: string; action: string; target: string | null; detail: unknown; created_at: string }[] }>("/admin/audit"),
};
