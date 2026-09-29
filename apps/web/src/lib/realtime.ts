import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { getSession } from "./session";

// Dedicated client for Realtime only — the app's real session lives in
// lib/session.ts against our own API, not a Supabase Auth session. This
// client just needs the access token attached so Postgres RLS lets the
// subscription through; it never persists or auto-refreshes anything.
const realtimeClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

let authedToken: string | null = null;

function syncAuth(): boolean {
  const token = getSession()?.accessToken ?? null;
  if (token !== authedToken) {
    authedToken = token;
    realtimeClient.realtime.setAuth(token ?? "");
  }
  return !!token;
}

export interface RealtimeWatch {
  table: string;
  /** Postgres changes filter, e.g. "user_id=eq.<uuid>" or "link_id=eq.<uuid>". */
  filter: string;
}

/**
 * Subscribes to live Postgres changes for the given tables/filters and calls
 * `onChange` on any insert/update/delete. Returns an unsubscribe function.
 * Re-syncs the auth token (which can rotate on refresh) before subscribing.
 */
export function watchRealtime(watches: RealtimeWatch[], onChange: () => void): () => void {
  if (!syncAuth() || watches.length === 0) return () => {};

  const channel: RealtimeChannel = realtimeClient.channel(`sync-${Math.random().toString(36).slice(2)}`);
  for (const w of watches) {
    channel.on("postgres_changes" as never, { event: "*", schema: "public", table: w.table, filter: w.filter } as never, onChange);
  }
  channel.subscribe();

  return () => {
    realtimeClient.removeChannel(channel);
  };
}
