import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { sendEmail } from "../config/notifier.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { hitRateLimit } from "../lib/rateLimit.js";

const TOPICS = ["account", "cycle_tracking", "partner", "payments", "bug", "other"] as const;

const schema = z.object({
  topic: z.enum(TOPICS),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(2000),
});

/** Where people can reach support directly. Null until SUPPORT_EMAIL is configured. */
export function supportInfo(_req: Request, res: Response) {
  res.json({ email: env.supportEmail ?? null });
}

/**
 * Stores a support request and, when SUPPORT_EMAIL and an email provider are configured, forwards it to the
 * support inbox with the person's address as reply-to context. The message is free text, so the form tells
 * people not to include detailed health information.
 */
export async function createSupportRequest(req: AuthedRequest, res: Response) {
  if (hitRateLimit(`support:${req.userId}`, 5, 60 * 60 * 1000)) {
    throw new HttpError(429, "You've sent a few messages already. Please wait a bit before sending another.");
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");

  const { data, error } = await supabaseAdmin
    .from("support_requests")
    .insert({ user_id: req.userId, email: req.userEmail ?? "unknown", topic: parsed.data.topic, message: parsed.data.message })
    .select("id")
    .single();
  if (error || !data) throw new HttpError(500, "Couldn't send your message. Please try again.");

  let forwarded = false;
  if (env.supportEmail) {
    try {
      forwarded = await sendEmail({
        to: env.supportEmail,
        subject: `[Lunee support] ${parsed.data.topic} · ${req.userEmail ?? "unknown"}`,
        text: `Request ${data.id}\nFrom: ${req.userEmail ?? "unknown"} (user ${req.userId})\nTopic: ${parsed.data.topic}\n\n${parsed.data.message}`,
      });
    } catch {
      // Stored in the database either way; the inbox copy is best effort.
    }
  }
  res.status(201).json({ ok: true, id: data.id, forwarded });
}
