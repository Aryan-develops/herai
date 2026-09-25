import type { Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import type { AuthedRequest } from "./auth.js";

export interface ProviderRequest extends AuthedRequest {
  providerId?: string;
}

/**
 * Provider dashboard access. The provider is whichever care_providers row this
 * user owns (owner_id is set by an admin when an application is approved), and
 * every provider query is scoped to that id — never to an id from the client.
 */
export async function requireProvider(req: ProviderRequest, res: Response, next: NextFunction) {
  const { data } = await supabaseAdmin.from("care_providers").select("id").eq("owner_id", req.userId).maybeSingle();
  if (!data) {
    return res.status(403).json({ error: "This account isn't linked to a partner provider", code: "NOT_A_PROVIDER" });
  }
  req.providerId = data.id;
  next();
}
