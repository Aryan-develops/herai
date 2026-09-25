// Turns a provider application into a live, verified listing owned by the applicant's account.
// Usage: node scripts/approve-provider.mjs <applicationId> "<street address>" [lat] [lng]
// Run it only after you've verified the lab's or doctor's credentials.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const [applicationId, address, lat, lng] = process.argv.slice(2);
if (!applicationId || !address) {
  console.error('Usage: node scripts/approve-provider.mjs <applicationId> "<address>" [lat] [lng]');
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: app, error } = await admin.from("provider_applications").select("*").eq("id", applicationId).single();
if (error || !app) {
  console.error("Application not found");
  process.exit(1);
}
if (!app.applicant_id) {
  console.error("This application has no linked account (the applicant was deleted); can't assign an owner.");
  process.exit(1);
}

const { data: provider, error: insertError } = await admin
  .from("care_providers")
  .insert({
    name: app.org_name,
    type: app.type,
    address,
    city: app.city,
    phone: app.phone,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    owner_id: app.applicant_id,
    verified: true,
    is_sample: false,
  })
  .select("id")
  .single();
if (insertError) {
  console.error(insertError.message);
  process.exit(1);
}

await admin.from("provider_applications").update({ status: "approved" }).eq("id", applicationId);
console.log(`Approved. Provider ${provider.id} is live; ${app.email} can now open the provider dashboard.`);
