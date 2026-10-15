import type { Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { TtlCache } from "./ttlCache.js";

// Admins are listed by email in `app_admins` (managed in the database only, never through the API).
// The email comes from the verified session token, so it can't be spoofed by the client.
// Sign-up doesn't verify email ownership, so an email only counts if the account already existed when
// the admin row was added: nobody can claim an admin address by registering it afterwards.
const cache = new TtlCache<boolean>(60_000);

export async function isAdminEmail(userId: string | undefined, email: string | undefined): Promise<boolean> {
  if (!userId || !email) return false;
  const key = `${userId}:${email.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const { data } = await supabaseAdmin.from("app_admins").select("email, added_at").eq("email", email.toLowerCase()).maybeSingle();
  if (!data) return false;
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const createdAt = user?.user?.created_at ? new Date(user.user.created_at).getTime() : NaN;
  const ok = Number.isFinite(createdAt) && createdAt <= new Date(data.added_at).getTime();
  // Only positives are cached, so adding an admin takes effect at once; removal can lag a minute.
  if (ok) cache.set(key, true);
  return ok;
}

/** 404 (not 403) for everyone else, so the admin area doesn't advertise that it exists. */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (await isAdminEmail(req.userId, req.userEmail)) return next();
  res.status(404).json({ error: "Not found" });
}

export async function audit(req: AuthedRequest, action: string, target: string | null, detail?: unknown) {
  await supabaseAdmin.from("admin_audit").insert({ admin_email: req.userEmail, action, target, detail: detail ?? null });
}
