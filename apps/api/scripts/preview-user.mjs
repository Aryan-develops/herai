// Dev-only: creates a throwaway test account with a logged period for visual checks, or deletes it.
// Usage: node scripts/preview-user.mjs create <out.json> | node scripts/preview-user.mjs delete <id>
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
dotenv.config({ path: "../../.env" });

const API = process.env.API_URL ?? "http://localhost:4000/api";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [cmd, arg] = process.argv.slice(2);
if (cmd === "delete") {
  await admin.auth.admin.deleteUser(arg);
  console.log("deleted");
} else {
  const res = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Preview Tester", email: `preview${Date.now()}@herai.test`, password: randomBytes(12).toString("hex"), dateOfBirth: "1995-05-05" }),
  });
  const j = await res.json();
  await admin.from("profiles").update({ onboarding_complete: true }).eq("id", j.user.id);
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${j.session.accessToken}` };
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const days = [];
  for (const start of [40, 12]) for (let i = 0; i < 5; i++) days.push({ date: day(start - i), flow: "medium" });
  await fetch(API + "/logs/cycles/range", { method: "POST", headers: auth, body: JSON.stringify({ days }) });
  writeFileSync(arg, JSON.stringify({ id: j.user.id, session: j.session }));
  console.log("created", j.user.id);
}
