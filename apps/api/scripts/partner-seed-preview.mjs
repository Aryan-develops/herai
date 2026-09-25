// Dev-only: two connected test accounts (she shares with he) for checking the Partner screens in a browser.
// Usage: node scripts/partner-seed-preview.mjs [out.json]   (cleanup: node scripts/partner-seed-preview.mjs --clean out.json)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
dotenv.config({ path: "../../.env" });

const API = "http://localhost:4000/api";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

if (process.argv[2] === "--clean") {
  const { ids } = JSON.parse(readFileSync(process.argv[3], "utf8"));
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log("cleaned", ids.length);
  process.exit(0);
}

async function signUp(email, name) {
  const res = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "testpass123", dateOfBirth: "1995-05-05" }),
  });
  const j = await res.json();
  await admin.from("profiles").update({ onboarding_complete: true }).eq("id", j.user.id);
  return { id: j.user.id, email, token: j.session.accessToken };
}

const call = async (token, method, path, body) => {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return r.json().catch(() => ({}));
};

const stamp = Date.now();
const she = await signUp(`pv-she-${stamp}@herai.test`, "Priya Sharma");
const he = await signUp(`pv-he-${stamp}@herai.test`, "Rohan Mehta");
const anna = await signUp(`pv-anna-${stamp}@herai.test`, "Anna Rao");

// Priya is 23 days into a 28-day cycle (pre-period days).
await admin.from("health_profiles").upsert({ user_id: she.id, cycle_length_days: 28, last_period_start: new Date(Date.now() - 23 * 86400000).toISOString().slice(0, 10) });
// Anna is on day 2 (period).
await admin.from("health_profiles").upsert({ user_id: anna.id, cycle_length_days: 29, last_period_start: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10) });
await call(she.token, "PUT", "/settings/comfort", { items: ["Dark chocolate", "Masala chai", "Heating pad"] });
await call(she.token, "POST", "/logs/moods", { mood: "irritable", energy: 2, need: "food" });

for (const woman of [she, anna]) {
  const inv = await call(woman.token, "POST", "/partner/invites", { direction: "woman_invites_partner" });
  await call(he.token, "POST", "/partner/invites/accept", { code: inv.code });
}
writeFileSync(process.argv[2] ?? "partner-seed.json", JSON.stringify({ she, he, anna, ids: [she.id, he.id, anna.id] }));
console.log("seeded", { she: she.email, he: he.email, anna: anna.email });
