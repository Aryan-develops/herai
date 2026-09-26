import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { loadCycleInsights } from "../lib/cycleService.js";

const symptomLogSchema = z.object({
  symptoms: z
    .array(z.object({ name: z.string().min(1).max(80), severity: z.number().int().min(1).max(5) }))
    .min(1),
  notes: z.string().max(2000).optional(),
  loggedAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(14400).optional(),
});

const cycleLogSchema = z.object({
  flow: z.enum(["spotting", "light", "medium", "heavy"]),
  symptoms: z.array(z.string().max(80)).optional(),
  notes: z.string().max(2000).optional(),
  loggedAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(14400).optional(),
});

export async function createSymptomLog(req: AuthedRequest, res: Response) {
  const parsed = symptomLogSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { data, error } = await supabaseAdmin
    .from("symptom_logs")
    .insert({
      user_id: req.userId,
      symptoms: parsed.data.symptoms,
      notes: parsed.data.notes,
      logged_at: parsed.data.loggedAt,
      duration_minutes: parsed.data.durationMinutes,
    })
    .select("*")
    .single();

  if (error || !data) throw new HttpError(500, "Failed to create log");
  res.status(201).json({ log: data });
}

export async function listSymptomLogs(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("symptom_logs")
    .select("*")
    .eq("user_id", req.userId)
    .order("logged_at", { ascending: false })
    .limit(200);

  if (error) throw new HttpError(500, "Failed to list logs");
  res.json({ logs: data });
}

export async function deleteSymptomLog(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("symptom_logs")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("id");

  if (error) throw new HttpError(500, "Failed to delete log");
  if (!data || data.length === 0) throw new HttpError(404, "Log not found");
  res.status(204).send();
}

async function clearCycleDays(userId: string, days: string[]) {
  for (const day of days) {
    await supabaseAdmin
      .from("cycle_logs")
      .delete()
      .eq("user_id", userId)
      .gte("logged_at", `${day}T00:00:00.000Z`)
      .lt("logged_at", `${new Date(Date.parse(`${day}T00:00:00.000Z`) + 86400000).toISOString()}`);
  }
}

const periodRangeSchema = z.object({
  days: z
    .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), flow: z.enum(["spotting", "light", "medium", "heavy"]) }))
    .min(1)
    .max(31),
});

/** Log a whole period in one go: one flow per day, replacing anything already logged on those days. */
export async function createPeriodRange(req: AuthedRequest, res: Response) {
  const parsed = periodRangeSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const today = new Date().toISOString().slice(0, 10);
  const days = [...new Map(parsed.data.days.map((d) => [d.date, d])).values()];
  if (days.some((d) => d.date > today)) throw new HttpError(400, "Periods can't be logged for future days.");
  await clearCycleDays(req.userId!, days.map((d) => d.date));
  const { data, error } = await supabaseAdmin
    .from("cycle_logs")
    .insert(days.map((d) => ({ user_id: req.userId, flow: d.flow, symptoms: [], logged_at: `${d.date}T12:00:00.000Z` })))
    .select("*");
  if (error || !data) throw new HttpError(500, "Failed to create log");
  res.status(201).json({ logs: data });
}

export async function createCycleLog(req: AuthedRequest, res: Response) {
  const parsed = cycleLogSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  // One flow entry per day: a new entry for a day replaces the old one.
  if (parsed.data.loggedAt) await clearCycleDays(req.userId!, [parsed.data.loggedAt.slice(0, 10)]);
  const { data, error } = await supabaseAdmin
    .from("cycle_logs")
    .insert({
      user_id: req.userId,
      flow: parsed.data.flow,
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes,
      logged_at: parsed.data.loggedAt,
      duration_minutes: parsed.data.durationMinutes,
    })
    .select("*")
    .single();

  if (error || !data) throw new HttpError(500, "Failed to create log");
  res.status(201).json({ log: data });
}

export async function listCycleLogs(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("cycle_logs")
    .select("*")
    .eq("user_id", req.userId)
    .order("logged_at", { ascending: false })
    .limit(200);

  if (error) throw new HttpError(500, "Failed to list logs");
  res.json({ logs: data });
}

export async function deleteCycleLog(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("cycle_logs")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("id");

  if (error) throw new HttpError(500, "Failed to delete log");
  if (!data || data.length === 0) throw new HttpError(404, "Log not found");
  res.status(204).send();
}

export async function getCycleInsights(req: AuthedRequest, res: Response) {
  res.json({ insights: await loadCycleInsights(req.userId!) });
}

export async function getTimeline(req: AuthedRequest, res: Response) {
  const [symptomLogs, cycleLogs, moodLogs] = await Promise.all([
    supabaseAdmin
      .from("symptom_logs")
      .select("*")
      .eq("user_id", req.userId)
      .order("logged_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("cycle_logs")
      .select("*")
      .eq("user_id", req.userId)
      .order("logged_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("mood_logs")
      .select("*")
      .eq("user_id", req.userId)
      .order("logged_at", { ascending: false })
      .limit(100),
  ]);

  if (symptomLogs.error || cycleLogs.error || moodLogs.error) throw new HttpError(500, "Failed to load timeline");

  const events = [
    ...(symptomLogs.data ?? []).map((l) => ({ type: "symptom" as const, id: l.id, loggedAt: l.logged_at, data: l })),
    ...(cycleLogs.data ?? []).map((l) => ({ type: "cycle" as const, id: l.id, loggedAt: l.logged_at, data: l })),
    ...(moodLogs.data ?? []).map((l) => ({ type: "mood" as const, id: l.id, loggedAt: l.logged_at, data: l })),
  ].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  res.json({ events });
}
