import type { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { hitRateLimit } from "../lib/rateLimit.js";

const schema = z.object({
  source: z.enum(["web", "mobile"]),
  message: z.string().min(1).max(500),
  stack: z.string().max(4000).optional(),
  route: z.string().max(200).optional(),
  status: z.number().int().min(0).max(599).optional(),
  fatal: z.boolean().optional(),
  appVersion: z.string().max(40).optional(),
});

/**
 * First-party crash reporting. It accepts only an error message, a stack trace and a route or HTTP status:
 * no request bodies, no user ids and no free text from the person, so health data cannot end up here. It is
 * unauthenticated (a crash can happen before sign-in) and limited per address.
 */
export async function reportClientError(req: Request, res: Response) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() ?? req.ip ?? "unknown";
  if (hitRateLimit(`client-error:${ip}`, 20, 60 * 1000)) return res.status(204).send();

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(204).send();

  await supabaseAdmin.from("client_errors").insert({
    source: parsed.data.source,
    message: parsed.data.message,
    stack: parsed.data.stack,
    route: parsed.data.route,
    http_status: parsed.data.status,
    fatal: parsed.data.fatal ?? false,
    app_version: parsed.data.appVersion,
  });
  res.status(204).send();
}
