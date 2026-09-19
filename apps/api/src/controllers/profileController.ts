import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";

const profileSchema = z.object({
  ageRange: z.enum(["13-17", "18-24", "25-34", "35-44", "45-54", "55+"]).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightKg: z.number().min(25).max(250).optional(),
  cycleLengthDays: z.number().min(15).max(60).optional(),
  lastPeriodStart: z.string().datetime().optional(),
  knownConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  lifestyle: z
    .object({
      smoker: z.boolean().optional(),
      alcohol: z.enum(["none", "occasional", "regular"]).optional(),
      exerciseFrequency: z.enum(["none", "light", "moderate", "active"]).optional(),
      sleepHoursAvg: z.number().min(0).max(14).optional(),
    })
    .optional(),
});

interface ProfileRow {
  age_range: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  cycle_length_days: number | null;
  last_period_start: string | null;
  known_conditions: string[];
  medications: string[];
  allergies: string[];
  smoker: boolean;
  alcohol: string;
  exercise_frequency: string;
  sleep_hours_avg: number | null;
}

function toApiShape(row: ProfileRow) {
  return {
    ageRange: row.age_range ?? undefined,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    cycleLengthDays: row.cycle_length_days ?? undefined,
    lastPeriodStart: row.last_period_start ?? undefined,
    knownConditions: row.known_conditions,
    medications: row.medications,
    allergies: row.allergies,
    lifestyle: {
      smoker: row.smoker,
      alcohol: row.alcohol,
      exerciseFrequency: row.exercise_frequency,
      sleepHoursAvg: row.sleep_hours_avg ?? undefined,
    },
  };
}

export async function getProfile(req: AuthedRequest, res: Response) {
  const { data: profile, error } = await supabaseAdmin
    .from("health_profiles")
    .select("*")
    .eq("user_id", req.userId)
    .single();

  if (error || !profile) {
    throw new HttpError(404, "Profile not found");
  }
  res.json({ profile: toApiShape(profile) });
}

export async function updateProfile(req: AuthedRequest, res: Response) {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const update: Record<string, unknown> = {};
  if (data.ageRange !== undefined) update.age_range = data.ageRange;
  if (data.heightCm !== undefined) update.height_cm = data.heightCm;
  if (data.weightKg !== undefined) update.weight_kg = data.weightKg;
  if (data.cycleLengthDays !== undefined) update.cycle_length_days = data.cycleLengthDays;
  if (data.lastPeriodStart !== undefined) update.last_period_start = data.lastPeriodStart;
  if (data.knownConditions !== undefined) update.known_conditions = data.knownConditions;
  if (data.medications !== undefined) update.medications = data.medications;
  if (data.allergies !== undefined) update.allergies = data.allergies;
  if (data.lifestyle?.smoker !== undefined) update.smoker = data.lifestyle.smoker;
  if (data.lifestyle?.alcohol !== undefined) update.alcohol = data.lifestyle.alcohol;
  if (data.lifestyle?.exerciseFrequency !== undefined) update.exercise_frequency = data.lifestyle.exerciseFrequency;
  if (data.lifestyle?.sleepHoursAvg !== undefined) update.sleep_hours_avg = data.lifestyle.sleepHoursAvg;

  const { data: profile, error } = await supabaseAdmin
    .from("health_profiles")
    .update(update)
    .eq("user_id", req.userId)
    .select("*")
    .single();

  if (error || !profile) {
    throw new HttpError(500, "Failed to update profile");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", req.userId);
  if (profileError) {
    throw new HttpError(500, "Failed to update onboarding status");
  }

  res.json({ profile: toApiShape(profile) });
}
