import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client: used for every DB/Storage/Auth-admin call in this
// gateway. It bypasses RLS, so every query here must filter by the caller's
// user_id explicitly (RLS policies on the tables/bucket remain as
// defense-in-depth, matching the manual req.userId filtering the old
// Mongoose controllers already did).
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * A throwaway client for user sign-in / token refresh.
 *
 * This exists because `signInWithPassword` and `refreshSession` STORE the
 * resulting session on the client they are called on, and supabase-js then
 * sends that session's user JWT as the Authorization header for every later
 * request from that client — silently downgrading it from service_role to
 * that user, so RLS starts applying.
 *
 * Calling those methods on the shared `supabaseAdmin` therefore breaks
 * unrelated queries for every subsequent request, and makes the gateway's
 * effective identity depend on whoever logged in last. Each sign-in gets its
 * own short-lived client instead, which is discarded immediately.
 *
 * It uses the anon key: signing a user in needs no elevated privileges.
 */
export function createAuthClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const REPORTS_BUCKET = "reports";
