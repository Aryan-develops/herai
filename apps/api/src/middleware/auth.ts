import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

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

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  next();
}
