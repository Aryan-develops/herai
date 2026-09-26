import { supabaseAdmin } from "../config/supabase.js";
import { TtlCache } from "./ttlCache.js";

export interface ProfileGate {
  date_of_birth: string | null;
  consent_status: string;
}

// Only "all clear" rows are cached (date of birth on file and consent not pending or denied), so granting
// consent or adding a date of birth takes effect immediately. Withdrawing consent can lag by up to 30 seconds.
const clear = new TtlCache<ProfileGate>(30_000);

export async function loadProfileGate(userId: string): Promise<ProfileGate | null> {
  const cached = clear.get(userId);
  if (cached) return cached;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("date_of_birth, consent_status")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  if (data.date_of_birth && (data.consent_status === "not_required" || data.consent_status === "granted")) clear.set(userId, data);
  return data;
}
