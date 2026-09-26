import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { TtlCache } from "../lib/ttlCache.js";

// A verified token is remembered for 30 seconds so a burst of requests (a page load fires several) checks it
// with the auth server once. Failures are never cached.
const verified = new TtlCache<{ id: string; email?: string }>(30_000);

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

// Mobile has no cookies, so auth is a bearer token (the Supabase access_token
// issued by authController) instead of the old httpOnly cookie.
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const cached = verified.get(token);
  if (cached) {
    req.userId = cached.id;
    req.userEmail = cached.email;
    return next();
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  verified.set(token, { id: data.user.id, email: req.userEmail });
  next();
}
