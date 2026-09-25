import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { suggestTests } from "../lib/testSuggestions.js";

const PROVIDER_COLS =
  "id, name, type, specialties, services, address, city, pincode, lat, lng, phone, website, hours, home_collection, is_sample, available, availability_note, offers_teleconsult, rating_avg, rating_count";

interface ProviderRow {
  id: string;
  name: string;
  type: "lab" | "doctor" | "clinic";
  specialties: string[];
  services: string[];
  address: string;
  city: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  home_collection: boolean;
  is_sample: boolean;
  available: boolean;
  availability_note: string | null;
  offers_teleconsult: boolean;
  rating_avg: number;
  rating_count: number;
}

interface ServiceRow {
  id: string;
  provider_id: string;
  name: string;
  category: "test" | "consultation" | "teleconsult";
  price_inr: number | null;
  turnaround_hours: number | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shapeProvider(p: ProviderRow, services: ServiceRow[], origin?: { lat: number; lng: number }) {
  const prices = services.map((s) => s.price_inr).filter((n): n is number => typeof n === "number");
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    specialties: p.specialties,
    address: p.address,
    city: p.city,
    pincode: p.pincode,
    phone: p.phone,
    website: p.website,
    hours: p.hours,
    homeCollection: p.home_collection,
    isSample: p.is_sample,
    available: p.available,
    availabilityNote: p.availability_note,
    offersTeleconsult: p.offers_teleconsult,
    ratingAvg: Number(p.rating_avg),
    ratingCount: p.rating_count,
    priceFromInr: prices.length ? Math.min(...prices) : null,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      priceInr: s.price_inr,
      turnaroundHours: s.turnaround_hours,
    })),
    lat: p.lat,
    lng: p.lng,
    distanceKm:
      origin && p.lat !== null && p.lng !== null
        ? Math.round(haversineKm(origin.lat, origin.lng, p.lat, p.lng) * 10) / 10
        : null,
  };
}

async function servicesFor(providerIds: string[]): Promise<Map<string, ServiceRow[]>> {
  const map = new Map<string, ServiceRow[]>();
  if (providerIds.length === 0) return map;
  const { data, error } = await supabaseAdmin
    .from("provider_services")
    .select("id, provider_id, name, category, price_inr, turnaround_hours")
    .in("provider_id", providerIds)
    .eq("active", true);
  if (error) throw new HttpError(500, "Failed to load services");
  for (const s of (data ?? []) as ServiceRow[]) map.set(s.provider_id, [...(map.get(s.provider_id) ?? []), s]);
  return map;
}

// Sample rows exist for development only and are excluded unless
// SHOW_SAMPLE_PROVIDERS is set, so real patients never see an invented lab.
function visibleProviders() {
  let q = supabaseAdmin.from("care_providers").select(PROVIDER_COLS).eq("verified", true);
  if (!env.showSampleProviders) q = q.eq("is_sample", false);
  return q;
}

const listSchema = z.object({
  type: z.enum(["lab", "doctor", "clinic"]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(200).default(25),
  city: z.string().trim().min(1).max(80).optional(),
  homeCollection: z.enum(["true", "false"]).optional(),
  teleconsult: z.enum(["true", "false"]).optional(),
  available: z.enum(["true", "false"]).optional(),
});

export async function listProviders(req: AuthedRequest, res: Response) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid search");
  const { type, lat, lng, radiusKm, city, homeCollection, teleconsult, available } = parsed.data;
  const origin = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;

  let query = visibleProviders().limit(300);
  if (type) query = query.eq("type", type);
  if (homeCollection === "true") query = query.eq("home_collection", true);
  if (teleconsult === "true") query = query.eq("offers_teleconsult", true);
  if (available === "true") query = query.eq("available", true);
  if (city && !origin) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query;
  if (error) throw new HttpError(500, "Failed to load providers");
  const rows = (data ?? []) as unknown as ProviderRow[];
  const services = await servicesFor(rows.map((r) => r.id));

  const providers = rows
    .map((r) => shapeProvider(r, services.get(r.id) ?? [], origin))
    .filter((p) => !origin || p.distanceKm === null || p.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || b.ratingAvg - a.ratingAvg);

  res.json({ providers });
}

export async function getProvider(req: AuthedRequest, res: Response) {
  const { data, error } = await visibleProviders().eq("id", req.params.id).maybeSingle();
  if (error) throw new HttpError(500, "Failed to load provider");
  if (!data) throw new HttpError(404, "Provider not found");
  const row = data as unknown as ProviderRow;

  const [services, slots, reviews] = await Promise.all([
    servicesFor([row.id]),
    supabaseAdmin
      .from("provider_slots")
      .select("id, starts_at, duration_min")
      .eq("provider_id", row.id)
      .eq("status", "open")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(40),
    supabaseAdmin
      .from("provider_reviews")
      .select("rating, comment, created_at")
      .eq("provider_id", row.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  res.json({
    provider: shapeProvider(row, services.get(row.id) ?? []),
    slots: (slots.data ?? []).map((s) => ({ id: s.id, startsAt: s.starts_at, durationMin: s.duration_min })),
    reviews: (reviews.data ?? []).map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.created_at })),
  });
}

const requestSchema = z
  .object({
    providerId: z.string().uuid(),
    kind: z.enum(["test", "appointment", "callback", "teleconsult"]),
    serviceId: z.string().uuid().optional(),
    slotId: z.string().uuid().optional(),
    preferredTime: z.string().datetime().optional(),
    message: z.string().trim().max(1000).optional(),
    shareProfile: z.boolean().default(false),
    shareReportIds: z.array(z.string().uuid()).max(10).default([]),
    consent: z.literal(true, { errorMap: () => ({ message: "Please confirm what you're sharing" }) }),
  })
  .refine((d) => d.kind !== "test" || !!d.serviceId, { message: "Choose a test", path: ["serviceId"] });

export async function createRequest(req: AuthedRequest, res: Response) {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const d = parsed.data;

  const { data: provider } = await visibleProviders().eq("id", d.providerId).maybeSingle();
  if (!provider) throw new HttpError(404, "Provider not found");

  let serviceName: string | undefined;
  if (d.serviceId) {
    const { data: service } = await supabaseAdmin
      .from("provider_services")
      .select("name")
      .eq("id", d.serviceId)
      .eq("provider_id", d.providerId)
      .eq("active", true)
      .maybeSingle();
    if (!service) throw new HttpError(400, "That service isn't offered by this provider");
    serviceName = service.name;
  }

  // Only reports that belong to the caller can be shared.
  let reportIds: string[] = [];
  if (d.shareReportIds.length > 0) {
    const { data: owned } = await supabaseAdmin
      .from("health_reports")
      .select("id")
      .eq("user_id", req.userId)
      .in("id", d.shareReportIds);
    reportIds = (owned ?? []).map((r) => r.id);
  }

  // Booking a slot: claim it atomically so two people can't take the same one.
  if (d.slotId) {
    const { data: claimed } = await supabaseAdmin
      .from("provider_slots")
      .update({ status: "booked" })
      .eq("id", d.slotId)
      .eq("provider_id", d.providerId)
      .eq("status", "open")
      .select("id, starts_at")
      .maybeSingle();
    if (!claimed) throw new HttpError(409, "That slot was just taken. Please pick another.");
  }

  const { data, error } = await supabaseAdmin
    .from("care_requests")
    .insert({
      patient_id: req.userId,
      provider_id: d.providerId,
      kind: d.kind,
      service_id: d.serviceId,
      service_name: serviceName,
      slot_id: d.slotId,
      preferred_time: d.preferredTime,
      message: d.message,
      share_profile: d.shareProfile,
      shared_report_ids: reportIds,
    })
    .select("id, status")
    .single();

  if (error || !data) {
    if (d.slotId) await supabaseAdmin.from("provider_slots").update({ status: "open" }).eq("id", d.slotId);
    throw new HttpError(500, "Failed to send request");
  }
  res.status(201).json({ request: data });
}

export async function listMyRequests(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("care_requests")
    .select("id, kind, service_name, status, message, preferred_time, slot_id, share_profile, shared_report_ids, provider_note, meeting_url, created_at, provider_id")
    .eq("patient_id", req.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new HttpError(500, "Failed to load requests");

  const rows = data ?? [];
  const providerIds = [...new Set(rows.map((r) => r.provider_id))];
  const [{ data: providers }, { data: reviews }, { data: slots }] = await Promise.all([
    supabaseAdmin.from("care_providers").select("id, name, type, phone").in("id", providerIds.length ? providerIds : [""]),
    supabaseAdmin.from("provider_reviews").select("request_id").eq("patient_id", req.userId),
    supabaseAdmin.from("provider_slots").select("id, starts_at").in("id", rows.map((r) => r.slot_id).filter(Boolean) as string[]),
  ]);
  const pMap = new Map((providers ?? []).map((p) => [p.id, p]));
  const reviewed = new Set((reviews ?? []).map((r) => r.request_id));
  const slotMap = new Map((slots ?? []).map((s) => [s.id, s.starts_at]));

  res.json({
    requests: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      serviceName: r.service_name,
      status: r.status,
      message: r.message,
      slotStartsAt: r.slot_id ? (slotMap.get(r.slot_id) ?? null) : null,
      preferredTime: r.preferred_time,
      sharedProfile: r.share_profile,
      sharedReportCount: (r.shared_report_ids ?? []).length,
      providerNote: r.provider_note,
      meetingUrl: r.meeting_url,
      createdAt: r.created_at,
      reviewed: reviewed.has(r.id),
      provider: pMap.get(r.provider_id) ?? null,
    })),
  });
}

// Withdrawing a request also withdraws the provider's access to what was shared.
export async function cancelRequest(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("care_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("patient_id", req.userId)
    .in("status", ["new", "accepted"])
    .select("id, slot_id")
    .maybeSingle();
  if (error) throw new HttpError(500, "Failed to cancel");
  if (!data) throw new HttpError(404, "Request not found or already closed");
  if (data.slot_id) await supabaseAdmin.from("provider_slots").update({ status: "open" }).eq("id", data.slot_id);
  res.status(204).send();
}

const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(600).optional() });

export async function reviewRequest(req: AuthedRequest, res: Response) {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid review");

  const { data: request } = await supabaseAdmin
    .from("care_requests")
    .select("id, provider_id, status")
    .eq("id", req.params.id)
    .eq("patient_id", req.userId)
    .maybeSingle();
  if (!request) throw new HttpError(404, "Request not found");
  if (request.status !== "completed") throw new HttpError(409, "You can review once the visit is completed");

  const { error } = await supabaseAdmin.from("provider_reviews").insert({
    provider_id: request.provider_id,
    patient_id: req.userId,
    request_id: request.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });
  if (error) throw new HttpError(error.code === "23505" ? 409 : 500, error.code === "23505" ? "Already reviewed" : "Failed to save review");

  const { data: all } = await supabaseAdmin.from("provider_reviews").select("rating").eq("provider_id", request.provider_id);
  const ratings = (all ?? []).map((r) => r.rating as number);
  const avg = ratings.reduce((a, b) => a + b, 0) / Math.max(ratings.length, 1);
  await supabaseAdmin
    .from("care_providers")
    .update({ rating_avg: Math.round(avg * 100) / 100, rating_count: ratings.length })
    .eq("id", request.provider_id);

  res.status(201).json({ ok: true });
}

// Follow-up tests worth discussing for a report's flagged values, with nearby
// partners that offer them. Guidance only — never an order or a diagnosis.
export async function suggestForReport(req: AuthedRequest, res: Response) {
  const { data: report } = await supabaseAdmin
    .from("health_reports")
    .select("id, extracted_values")
    .eq("id", req.params.reportId)
    .eq("user_id", req.userId)
    .maybeSingle();
  if (!report) throw new HttpError(404, "Report not found");

  const suggestions = suggestTests((report.extracted_values ?? []) as { parameter: string; status: string }[]);
  if (suggestions.length === 0) return res.json({ suggestions: [] });

  const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
  const origin = lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

  const { data } = await visibleProviders().eq("available", true).limit(300);
  const rows = (data ?? []) as unknown as ProviderRow[];
  const services = await servicesFor(rows.map((r) => r.id));

  res.json({
    suggestions: suggestions.map((s) => ({
      test: s.test,
      because: s.because,
      providers: rows
        .map((p) => {
          const match = (services.get(p.id) ?? []).find((sv) => s.keywords.some((k) => sv.name.toLowerCase().includes(k)));
          return match ? { ...shapeProvider(p, [match], origin), matchedService: { id: match.id, name: match.name, priceInr: match.price_inr, turnaroundHours: match.turnaround_hours } } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, 3),
    })),
  });
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
