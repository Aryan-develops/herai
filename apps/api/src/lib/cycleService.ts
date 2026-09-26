import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import { computeCycleInsights, type CycleInsights } from "./cycleInsights.js";
import { istNow } from "./time.js";

const CRAMP_PATTERN = /cramp|pelvic pain|abdominal pain|period pain/i;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Loads a user's cycle data and computes insights. The one place that knows where cycle inputs live. */
export async function loadCycleInsights(userId: string, today = istNow()): Promise<CycleInsights> {
  const since = new Date(Date.now() - TWO_DAYS_MS).toISOString();
  const [logsResult, profileResult, symptomsResult] = await Promise.all([
    supabaseAdmin
      .from("cycle_logs")
      .select("logged_at, symptoms")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true })
      .limit(500),
    supabaseAdmin.from("health_profiles").select("cycle_length_days, last_period_start").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("symptom_logs").select("symptoms").eq("user_id", userId).gte("logged_at", since).limit(20),
  ]);

  if (logsResult.error) throw new HttpError(500, "Failed to load cycle logs");

  const profile = profileResult.data
    ? { cycleLengthDays: profileResult.data.cycle_length_days, lastPeriodStart: profileResult.data.last_period_start }
    : null;

  const recentCycleSymptoms = (logsResult.data ?? [])
    .filter((l) => new Date(l.logged_at).getTime() >= Date.now() - TWO_DAYS_MS)
    .flatMap((l) => (l.symptoms as string[] | null) ?? []);
  const recentSymptomNames = (symptomsResult.data ?? []).flatMap((l) =>
    ((l.symptoms as { name?: string }[] | null) ?? []).map((s) => s.name ?? ""),
  );
  const crampsRecent = [...recentCycleSymptoms, ...recentSymptomNames].some((name) => CRAMP_PATTERN.test(name));

  return computeCycleInsights(
    (logsResult.data ?? []).map((l) => ({ loggedAt: l.logged_at })),
    profile,
    { today, crampsRecent },
  );
}
