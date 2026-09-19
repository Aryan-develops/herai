import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { computeCycleInsights } from "../lib/cycleInsights.js";

const symptomLogSchema = z.object({
  symptoms: z
    .array(z.object({ name: z.string().min(1).max(80), severity: z.number().int().min(1).max(5) }))
    .min(1),
  notes: z.string().max(2000).optional(),
  loggedAt: z.string().datetime().optional(),
});

const cycleLogSchema = z.object({
  flow: z.enum(["spotting", "light", "medium", "heavy"]),
  symptoms: z.array(z.string().max(80)).optional(),
  notes: z.string().max(2000).optional(),
  loggedAt: z.string().datetime().optional(),
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

export async function createCycleLog(req: AuthedRequest, res: Response) {
  const parsed = cycleLogSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { data, error } = await supabaseAdmin
    .from("cycle_logs")
    .insert({
      user_id: req.userId,
      flow: parsed.data.flow,
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes,
      logged_at: parsed.data.loggedAt,
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
  const [logsResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from("cycle_logs")
      .select("logged_at")
      .eq("user_id", req.userId)
      .order("logged_at", { ascending: true })
      .limit(500),
    supabaseAdmin
      .from("health_profiles")
      .select("cycle_length_days, last_period_start")
      .eq("user_id", req.userId)
      .maybeSingle(),
  ]);

  if (logsResult.error) throw new HttpError(500, "Failed to load cycle logs");

  const profile = profileResult.data
    ? { cycleLengthDays: profileResult.data.cycle_length_days, lastPeriodStart: profileResult.data.last_period_start }
    : null;

  const insights = computeCycleInsights(
    (logsResult.data ?? []).map((l) => ({ loggedAt: l.logged_at })),
    profile,
  );

  res.json({ insights });
}

export async function getTimeline(req: AuthedRequest, res: Response) {
  const [symptomLogs, cycleLogs] = await Promise.all([
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
  ]);

  if (symptomLogs.error || cycleLogs.error) throw new HttpError(500, "Failed to load timeline");

  const events = [
    ...(symptomLogs.data ?? []).map((l) => ({ type: "symptom" as const, id: l.id, loggedAt: l.logged_at, data: l })),
    ...(cycleLogs.data ?? []).map((l) => ({ type: "cycle" as const, id: l.id, loggedAt: l.logged_at, data: l })),
  ].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  res.json({ events });
}
