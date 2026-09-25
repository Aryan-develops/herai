// Dev-only end-to-end check of the referral flow against a locally running API.
// Usage: node scripts/care-e2e.mjs   (needs SHOW_SAMPLE_PROVIDERS=true on the API)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const API = "http://localhost:4000/api";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failures++;
};

async function call(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function signUp(email, name) {
  const res = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "testpass123", dateOfBirth: "1995-05-05" }),
  });
  const j = await res.json();
  await admin.from("profiles").update({ onboarding_complete: true }).eq("id", j.user.id);
  return { id: j.user.id, token: j.session.accessToken };
}

const stamp = Date.now();
const patient = await signUp(`pat${stamp}@herai.test`, "Asha Patient");
const provUser = await signUp(`prov${stamp}@herai.test`, "Dr Owner");
const stranger = await signUp(`str${stamp}@herai.test`, "Stranger Person");
const created = [patient.id, provUser.id, stranger.id];

try {
  const { data: sample } = await admin.from("care_providers").select("id").eq("name", "Dr. Sample Sharma").single();
  await admin.from("care_providers").update({ owner_id: provUser.id }).eq("id", sample.id);

  // Patient side
  const list = await call(patient.token, "GET", "/care/providers");
  check("lists sample providers with prices/ratings", list.status === 200 && list.json.providers.length >= 3 && list.json.providers.some((p) => p.priceFromInr !== null));

  const detail = await call(patient.token, "GET", `/care/providers/${sample.id}`);
  check("provider detail has services + open slots", detail.status === 200 && detail.json.provider.services.length > 0 && detail.json.slots.length > 0);
  const slot = detail.json.slots[0];
  const service = detail.json.provider.services.find((s) => s.category === "consultation");

  // A report to share
  const { data: report } = await admin
    .from("health_reports")
    .insert({ user_id: patient.id, file_name: "cbc.pdf", mime_type: "application/pdf", file_size: 10, storage_path: `${patient.id}/x.pdf`, extracted_values: [{ parameter: "Hemoglobin", value: 9.1, unit: "g/dL", status: "below_range" }, { parameter: "TSH", value: 2, status: "in_range" }] })
    .select("id")
    .single();

  const noConsent = await call(patient.token, "POST", "/care/requests", { providerId: sample.id, kind: "appointment", slotId: slot.id, consent: false });
  check("request without consent is rejected", noConsent.status === 400);

  const req1 = await call(patient.token, "POST", "/care/requests", {
    providerId: sample.id, kind: "appointment", serviceId: service.id, slotId: slot.id,
    message: "Period issues", shareProfile: true, shareReportIds: [report.id], consent: true,
  });
  check("appointment request created", req1.status === 201, JSON.stringify(req1.json));

  const clash = await call(stranger.token, "POST", "/care/requests", { providerId: sample.id, kind: "appointment", slotId: slot.id, consent: true });
  check("same slot can't be double-booked", clash.status === 409);

  const sugg = await call(patient.token, "GET", `/care/suggest/${report.id}`);
  check("test suggestions come from flagged values only", sugg.status === 200 && sugg.json.suggestions.some((s) => s.test.includes("CBC")) && !sugg.json.suggestions.some((s) => s.test.includes("Thyroid")));

  // Provider side
  const notProv = await call(stranger.token, "GET", "/provider/me");
  check("non-provider blocked from dashboard", notProv.status === 403);
  const inbox = await call(provUser.token, "GET", "/provider/requests");
  const rid = req1.json.request.id;
  check("provider sees request, first name only", inbox.status === 200 && inbox.json.requests.some((r) => r.id === rid && r.patientFirstName === "Asha" && !("patient_id" in r)));

  const shared = await call(provUser.token, "GET", `/provider/requests/${rid}/shared`);
  check("provider sees shared report + profile", shared.status === 200 && shared.json.reports.length === 1 && shared.json.profile !== null);

  const reviewEarly = await call(patient.token, "POST", `/care/requests/${rid}/review`, { rating: 5 });
  check("can't review before completion", reviewEarly.status === 409);

  const acc = await call(provUser.token, "PATCH", `/provider/requests/${rid}`, { status: "accepted", note: "See you then" });
  check("provider accepts", acc.status === 204);
  const skip = await call(provUser.token, "PATCH", `/provider/requests/${rid}`, { status: "accepted" });
  check("invalid transition rejected", skip.status === 409);
  const done = await call(provUser.token, "PATCH", `/provider/requests/${rid}`, { status: "completed" });
  check("provider completes", done.status === 204);

  const rev = await call(patient.token, "POST", `/care/requests/${rid}/review`, { rating: 4, comment: "Kind and clear" });
  const dupe = await call(patient.token, "POST", `/care/requests/${rid}/review`, { rating: 1 });
  const after = await call(patient.token, "GET", `/care/providers/${sample.id}`);
  check("review saved once, rating updated", rev.status === 201 && dupe.status === 409 && after.json.provider.ratingCount >= 1 && after.json.provider.ratingAvg > 0);

  // Cancel withdraws access
  const detail2 = await call(patient.token, "GET", `/care/providers/${sample.id}`);
  const slot2 = detail2.json.slots[0];
  const req2 = await call(patient.token, "POST", "/care/requests", { providerId: sample.id, kind: "callback", slotId: slot2.id, shareProfile: true, consent: true });
  const cancel = await call(patient.token, "POST", `/care/requests/${req2.json.request.id}/cancel`);
  const sharedAfter = await call(provUser.token, "GET", `/provider/requests/${req2.json.request.id}/shared`);
  const slotFree = await call(patient.token, "GET", `/care/providers/${sample.id}`);
  check("cancel withdraws provider access", cancel.status === 204 && sharedAfter.status === 403);
  check("cancelled slot is bookable again", slotFree.json.slots.some((s) => s.id === slot2.id));

  // Scoping
  const other = await call(stranger.token, "POST", `/care/requests/${rid}/cancel`);
  check("can't cancel someone else's request", other.status === 404);
  const svcAdd = await call(provUser.token, "POST", "/provider/services", { name: "PCOS panel", category: "test", priceInr: 1200, turnaroundHours: 24 });
  check("provider adds priced service", svcAdd.status === 201);
  const slotsAdd = await call(provUser.token, "POST", "/provider/slots", { startsAt: [new Date(Date.now() + 5 * 86400000).toISOString()], durationMin: 20 });
  check("provider adds slots", slotsAdd.status === 201);
  const away = await call(provUser.token, "PATCH", "/provider/me", { available: false, availabilityNote: "Back Monday" });
  const hidden = await call(patient.token, "GET", "/care/providers?available=true");
  check("availability toggle filters listing", away.status === 200 && !hidden.json.providers.some((p) => p.id === sample.id));
} finally {
  await admin.from("care_providers").update({ owner_id: null, available: true, availability_note: null, rating_avg: 0, rating_count: 0 }).eq("name", "Dr. Sample Sharma");
  await admin.from("provider_services").delete().eq("name", "PCOS panel");
  for (const id of created) await admin.auth.admin.deleteUser(id);
  await admin.from("provider_slots").update({ status: "open" }).eq("status", "booked");
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exit(failures ? 1 : 0);
}
