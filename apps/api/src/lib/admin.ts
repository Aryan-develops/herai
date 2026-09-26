import type { Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { TtlCache } from "./ttlCache.js";

// Admins are listed by email in `app_admins` (managed in the database only, never through the API).
// The email comes from the verified session token, so it can't be spoofed by the client.
const cache = new TtlCache<boolean>(60_000);

export async function isAdminEmail(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const key = email.toLowerCase();
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const { data } = await supabaseAdmin.from("app_admins").select("email").eq("email", key).maybeSingle();
  // Only positives are cached, so adding an admin takes effect at once; removal can lag a minute.
  if (data) cache.set(key, true);
  return !!data;
}

/** 404 (not 403) for everyone else, so the admin area doesn't advertise that it exists. */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (await isAdminEmail(req.userEmail)) return next();
  res.status(404).json({ error: "Not found" });
}

export async function audit(req: AuthedRequest, action: string, target: string | null, detail?: unknown) {
  await supabaseAdmin.from("admin_audit").insert({ admin_email: req.userEmail, action, target, detail: detail ?? null });
}
