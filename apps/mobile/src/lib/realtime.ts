import "react-native-url-polyfill/auto";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { getSession } from "./session";

// Dedicated client for Realtime only — mirrors apps/web/src/lib/realtime.ts.
// The app's real session lives in lib/session.ts against our own API, not a
// Supabase Auth session; this client just needs the access token attached so
// Postgres RLS lets the subscription through.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const realtimeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

let authedToken: string | null = null;

async function syncAuth(): Promise<boolean> {
  const token = (await getSession())?.accessToken ?? null;
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
 * `onChange` on any insert/update/delete. Returns an unsubscribe function
 * (safe to call even if the subscription never finished setting up).
 */
export function watchRealtime(watches: RealtimeWatch[], onChange: () => void): () => void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || watches.length === 0) return () => {};

  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  syncAuth().then((authed) => {
    if (!authed || cancelled) return;
    channel = realtimeClient.channel(`sync-${Math.random().toString(36).slice(2)}`);
    for (const w of watches) {
      channel.on("postgres_changes" as never, { event: "*", schema: "public", table: w.table, filter: w.filter } as never, onChange);
    }
    channel.subscribe();
  });

  return () => {
    cancelled = true;
    if (channel) realtimeClient.removeChannel(channel);
  };
}
