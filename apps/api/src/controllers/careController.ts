import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";

const listSchema = z.object({
  type: z.enum(["lab", "doctor", "clinic"]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(200).default(25),
  city: z.string().trim().min(1).max(80).optional(),
  homeCollection: z.enum(["true", "false"]).optional(),
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Only verified partners are ever listed. Sample rows exist for development
// and are excluded unless SHOW_SAMPLE_PROVIDERS is set, so real patients never
// see an invented lab or doctor.
export async function listProviders(req: AuthedRequest, res: Response) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid search");
  const { type, lat, lng, radiusKm, city, homeCollection } = parsed.data;

  let query = supabaseAdmin
    .from("care_providers")
    .select("id, name, type, specialties, services, address, city, pincode, lat, lng, phone, website, hours, home_collection, is_sample")
    .eq("verified", true)
    .limit(300);

  if (!env.showSampleProviders) query = query.eq("is_sample", false);
  if (type) query = query.eq("type", type);
  if (homeCollection === "true") query = query.eq("home_collection", true);
  if (city && (lat === undefined || lng === undefined)) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query;
  if (error) throw new HttpError(500, "Failed to load providers");

  const hasLocation = lat !== undefined && lng !== undefined;
  const providers = (data ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      specialties: p.specialties,
      services: p.services,
      address: p.address,
      city: p.city,
      pincode: p.pincode,
      phone: p.phone,
      website: p.website,
      hours: p.hours,
      homeCollection: p.home_collection,
      isSample: p.is_sample,
      lat: p.lat,
      lng: p.lng,
      distanceKm:
        hasLocation && p.lat !== null && p.lng !== null ? Math.round(haversineKm(lat, lng, p.lat, p.lng) * 10) / 10 : null,
    }))
    .filter((p) => !hasLocation || p.distanceKm === null || p.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name));

  res.json({ providers });
}

const applicationSchema = z.object({
  orgName: z.string().trim().min(2).max(120),
  type: z.enum(["lab", "doctor", "clinic"]),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(1000).optional(),
});

export async function submitProviderApplication(req: AuthedRequest, res: Response) {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const a = parsed.data;

  const { error } = await supabaseAdmin.from("provider_applications").insert({
    applicant_id: req.userId,
    org_name: a.orgName,
    type: a.type,
    contact_name: a.contactName,
    email: a.email,
    phone: a.phone,
    city: a.city,
    notes: a.notes,
  });
  if (error) throw new HttpError(500, "Failed to submit application");
  res.status(201).json({ ok: true });
}
