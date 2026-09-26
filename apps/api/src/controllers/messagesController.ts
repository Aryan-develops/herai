import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { sendPush } from "../config/notifier.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { loadLink } from "../lib/partnerAccess.js";
import { hitRateLimit } from "../lib/rateLimit.js";

const sendSchema = z.object({ body: z.string().trim().min(1).max(1000) });

/** Messages between the two people on a link. Either side can read and write; a removed link loses them. */
export async function listMessages(req: AuthedRequest, res: Response) {
  const link = await loadLink(req.params.linkId, req.userId!);
  const { data, error } = await supabaseAdmin
    .from("partner_messages")
    .select("id, sender_id, body, created_at")
    .eq("link_id", link.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new HttpError(500, "Couldn't load messages");
  res.json({
    messages: (data ?? []).reverse().map((m) => ({ id: m.id, mine: m.sender_id === req.userId, body: m.body, createdAt: m.created_at })),
  });
}

export async function sendMessage(req: AuthedRequest, res: Response) {
  const link = await loadLink(req.params.linkId, req.userId!);
  if (hitRateLimit(`msg:${req.userId}`, 30, 60 * 1000)) throw new HttpError(429, "Slow down a little.");
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Write a message first.");

  const { data, error } = await supabaseAdmin
    .from("partner_messages")
    .insert({ link_id: link.id, sender_id: req.userId, body: parsed.data.body })
    .select("id, body, created_at")
    .single();
  if (error || !data) throw new HttpError(500, "Couldn't send");

  // Best-effort push. The preview never includes the text, so nothing private shows on a lock screen.
  const to = link.woman_id === req.userId ? link.partner_id : link.woman_id;
  const [{ data: tokens }, { data: me }] = await Promise.all([
    supabaseAdmin.from("push_tokens").select("token").eq("user_id", to),
    supabaseAdmin.from("profiles").select("name").eq("id", req.userId).maybeSingle(),
  ]);
  if (tokens?.length) {
    sendPush(tokens.map((t) => t.token), "Lunee", `New message from ${(me?.name ?? "your partner").split(" ")[0]}`, { type: "partner_message", linkId: link.id }).catch(() => {});
  }

  res.status(201).json({ message: { id: data.id, mine: true, body: data.body, createdAt: data.created_at } });
}
