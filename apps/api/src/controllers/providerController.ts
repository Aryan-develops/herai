import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { ProviderRequest } from "../middleware/requireProvider.js";

export async function getMe(req: ProviderRequest, res: Response) {
  const id = req.providerId!;
  const [provider, services, slots, counts] = await Promise.all([
    supabaseAdmin
      .from("care_providers")
      .select("id, name, type, address, city, phone, hours, home_collection, available, availability_note, offers_teleconsult, rating_avg, rating_count, verified")
      .eq("id", id)
      .single(),
    supabaseAdmin.from("provider_services").select("id, name, category, price_inr, turnaround_hours, active").eq("provider_id", id).order("created_at"),
    supabaseAdmin
      .from("provider_slots")
      .select("id, starts_at, duration_min, status")
      .eq("provider_id", id)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
    supabaseAdmin.from("care_requests").select("status").eq("provider_id", id),
  ]);
  if (provider.error) throw new HttpError(500, "Failed to load provider");
  const tally: Record<string, number> = {};
  for (const r of counts.data ?? []) tally[r.status] = (tally[r.status] ?? 0) + 1;

  res.json({
    provider: provider.data,
    services: (services.data ?? []).map((s) => ({ id: s.id, name: s.name, category: s.category, priceInr: s.price_inr, turnaroundHours: s.turnaround_hours, active: s.active })),
    slots: (slots.data ?? []).map((s) => ({ id: s.id, startsAt: s.starts_at, durationMin: s.duration_min, status: s.status })),
    requestCounts: tally,
  });
}

const meSchema = z.object({
  available: z.boolean().optional(),
  availabilityNote: z.string().trim().max(200).nullable().optional(),
  hours: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  homeCollection: z.boolean().optional(),
  offersTeleconsult: z.boolean().optional(),
});

export async function updateMe(req: ProviderRequest, res: Response) {
  const parsed = meSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.available !== undefined) patch.available = d.available;
  if (d.availabilityNote !== undefined) patch.availability_note = d.availabilityNote;
  if (d.hours !== undefined) patch.hours = d.hours;
  if (d.phone !== undefined) patch.phone = d.phone;
  if (d.homeCollection !== undefined) patch.home_collection = d.homeCollection;
  if (d.offersTeleconsult !== undefined) patch.offers_teleconsult = d.offersTeleconsult;
  if (Object.keys(patch).length === 0) throw new HttpError(400, "Nothing to update");

  const { error } = await supabaseAdmin.from("care_providers").update(patch).eq("id", req.providerId);
  if (error) throw new HttpError(500, "Failed to update");
  res.json({ ok: true });
}

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(["test", "consultation", "teleconsult"]).default("test"),
  priceInr: z.number().int().min(0).max(1000000).nullable().optional(),
  turnaroundHours: z.number().int().min(0).max(720).nullable().optional(),
  active: z.boolean().optional(),
});

export async function addService(req: ProviderRequest, res: Response) {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid service");
  const d = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("provider_services")
    .insert({ provider_id: req.providerId, name: d.name, category: d.category, price_inr: d.priceInr ?? null, turnaround_hours: d.turnaroundHours ?? null })
    .select("id")
    .single();
  if (error || !data) throw new HttpError(500, "Failed to add service");
  res.status(201).json({ id: data.id });
}

export async function updateService(req: ProviderRequest, res: Response) {
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid service");
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  if (d.category !== undefined) patch.category = d.category;
  if (d.priceInr !== undefined) patch.price_inr = d.priceInr;
  if (d.turnaroundHours !== undefined) patch.turnaround_hours = d.turnaroundHours;
  if (d.active !== undefined) patch.active = d.active;
  const { data, error } = await supabaseAdmin
    .from("provider_services")
    .update(patch)
    .eq("id", req.params.id)
    .eq("provider_id", req.providerId)
    .select("id");
  if (error) throw new HttpError(500, "Failed to update service");
  if (!data?.length) throw new HttpError(404, "Service not found");
  res.status(204).send();
}

export async function deleteService(req: ProviderRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("provider_services")
    .delete()
    .eq("id", req.params.id)
    .eq("provider_id", req.providerId)
    .select("id");
  if (error) throw new HttpError(500, "Failed to delete service");
  if (!data?.length) throw new HttpError(404, "Service not found");
  res.status(204).send();
}

const slotsSchema = z.object({
  startsAt: z.array(z.string().datetime()).min(1).max(60),
  durationMin: z.number().int().min(10).max(240).default(30),
});

export async function addSlots(req: ProviderRequest, res: Response) {
  const parsed = slotsSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid slots");
  const future = parsed.data.startsAt.filter((s) => new Date(s).getTime() > Date.now());
  if (future.length === 0) throw new HttpError(400, "Slots must be in the future");
  const { error } = await supabaseAdmin
    .from("provider_slots")
    .insert(future.map((s) => ({ provider_id: req.providerId, starts_at: s, duration_min: parsed.data.durationMin })));
  if (error) throw new HttpError(500, "Failed to add slots");
  res.status(201).json({ added: future.length });
}

export async function deleteSlot(req: ProviderRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("provider_slots")
    .delete()
    .eq("id", req.params.id)
    .eq("provider_id", req.providerId)
    .eq("status", "open")
    .select("id");
  if (error) throw new HttpError(500, "Failed to delete slot");
  if (!data?.length) throw new HttpError(404, "Open slot not found");
  res.status(204).send();
}

export async function listRequests(req: ProviderRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("care_requests")
    .select("id, patient_id, kind, service_name, status, message, preferred_time, slot_id, share_profile, shared_report_ids, provider_note, meeting_url, created_at")
    .eq("provider_id", req.providerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new HttpError(500, "Failed to load requests");
  const rows = data ?? [];

  const [{ data: profiles }, { data: slots }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, name").in("id", rows.length ? [...new Set(rows.map((r) => r.patient_id))] : [""]),
    supabaseAdmin.from("provider_slots").select("id, starts_at").in("id", rows.map((r) => r.slot_id).filter(Boolean) as string[]),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, (p.name as string).split(" ")[0] || "Patient"]));
  const slotMap = new Map((slots ?? []).map((s) => [s.id, s.starts_at]));

  res.json({
    requests: rows.map((r) => ({
      id: r.id,
      patientFirstName: names.get(r.patient_id) ?? "Patient",
      kind: r.kind,
      serviceName: r.service_name,
      status: r.status,
      message: r.message,
      slotStartsAt: r.slot_id ? (slotMap.get(r.slot_id) ?? null) : null,
      preferredTime: r.preferred_time,
      sharesProfile: r.share_profile,
      sharedReportCount: (r.shared_report_ids ?? []).length,
      providerNote: r.provider_note,
      meetingUrl: r.meeting_url,
      createdAt: r.created_at,
    })),
  });
}

const updateRequestSchema = z.object({
  status: z.enum(["accepted", "declined", "completed"]),
  note: z.string().trim().max(500).optional(),
  meetingUrl: z.string().trim().url().max(500).optional(),
});

const ALLOWED: Record<string, string[]> = {
  new: ["accepted", "declined"],
  accepted: ["completed", "declined"],
};

export async function updateRequest(req: ProviderRequest, res: Response) {
  const parsed = updateRequestSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid update");

  const { data: current } = await supabaseAdmin
    .from("care_requests")
    .select("id, status, slot_id")
    .eq("id", req.params.id)
    .eq("provider_id", req.providerId)
    .maybeSingle();
  if (!current) throw new HttpError(404, "Request not found");
  if (!ALLOWED[current.status]?.includes(parsed.data.status)) {
    throw new HttpError(409, `Can't change a ${current.status} request to ${parsed.data.status}`);
  }

  const { error } = await supabaseAdmin
    .from("care_requests")
    .update({
      status: parsed.data.status,
      provider_note: parsed.data.note,
      meeting_url: parsed.data.meetingUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);
  if (error) throw new HttpError(500, "Failed to update request");
  if (parsed.data.status === "declined" && current.slot_id) {
    await supabaseAdmin.from("provider_slots").update({ status: "open" }).eq("id", current.slot_id);
  }
  res.status(204).send();
}

// What the patient chose to share, and only while the request is live. A
// cancelled or declined request withdraws access immediately.
export async function sharedData(req: ProviderRequest, res: Response) {
  const { data: request } = await supabaseAdmin
    .from("care_requests")
    .select("id, patient_id, status, share_profile, shared_report_ids")
    .eq("id", req.params.id)
    .eq("provider_id", req.providerId)
    .maybeSingle();
  if (!request) throw new HttpError(404, "Request not found");
  if (request.status === "cancelled" || request.status === "declined") {
    throw new HttpError(403, "The patient has withdrawn this request");
  }

  let profile: Record<string, unknown> | null = null;
  if (request.share_profile) {
    const { data } = await supabaseAdmin
      .from("health_profiles")
      .select("age_range, known_conditions, medications, allergies, cycle_length_days")
      .eq("user_id", request.patient_id)
      .maybeSingle();
    profile = data
      ? { ageRange: data.age_range, conditions: data.known_conditions, medications: data.medications, allergies: data.allergies, cycleLengthDays: data.cycle_length_days }
      : null;
  }

  let reports: unknown[] = [];
  if ((request.shared_report_ids ?? []).length > 0) {
    const { data } = await supabaseAdmin
      .from("health_reports")
      .select("id, file_name, uploaded_at, extracted_values, document_intelligence")
      .eq("user_id", request.patient_id)
      .in("id", request.shared_report_ids);
    reports = (data ?? []).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      uploadedAt: r.uploaded_at,
      values: r.extracted_values,
      explanation: (r.document_intelligence as { explanation?: string } | null)?.explanation ?? null,
    }));
  }

  res.json({ profile, reports });
}
