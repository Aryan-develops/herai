// Dev-only: creates a patient (with a flagged report) and a provider owner for browser checks.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
dotenv.config({ path: "../../.env" });

const API = "http://localhost:4000/api";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function signUp(email, name) {
  const res = await fetch(API + "/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password: "testpass123", dateOfBirth: "1995-05-05" }) });
  const j = await res.json();
  await admin.from("profiles").update({ onboarding_complete: true }).eq("id", j.user.id);
  return { id: j.user.id, session: j.session };
}

const stamp = Date.now();
const patient = await signUp(`pv-pat-${stamp}@herai.test`, "Priya Sharma");
const owner = await signUp(`pv-prov-${stamp}@herai.test`, "Dr Sample Sharma");
await admin.from("care_providers").update({ owner_id: owner.id }).eq("name", "Dr. Sample Sharma");
await admin.from("health_reports").insert({
  user_id: patient.id, file_name: "blood-test.pdf", mime_type: "application/pdf", file_size: 100, storage_path: `${patient.id}/x.pdf`,
  emergency: false,
  extracted_values: [
    { parameter: "Hemoglobin", value: 9.4, unit: "g/dL", reference_range: "12-15", status: "below_range" },
    { parameter: "TSH", value: 6.1, unit: "mIU/L", reference_range: "0.4-4.0", status: "above_range" },
    { parameter: "Vitamin D", value: 31, unit: "ng/mL", reference_range: "30-100", status: "in_range" },
  ],
  document_intelligence: { explanation: "Your hemoglobin is a little low and TSH a little high.", confidence: "medium", needsClinician: true, caveats: [] },
  risk_assessment: { risk_level: "moderate", factors: [], rationale: "" },
});
writeFileSync(process.argv[2], JSON.stringify({ patient, owner }));
console.log("seeded", patient.id, owner.id);
