import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { hitRateLimit } from "../lib/rateLimit.js";
import { redactPii } from "../middleware/piiRedact.js";
import { env } from "../config/env.js";

export const aiRouter = Router();

// 20 chat requests per user per hour. Serverless: per-instance brake, not a hard global cap.
const CHAT_LIMIT = 20;
const CHAT_WINDOW_MS = 60 * 60 * 1000;

aiRouter.post("/chat/stream", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  if (hitRateLimit(`chat:${userId}`, CHAT_LIMIT, CHAT_WINDOW_MS)) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }

  const aiBase = (env.aiServiceUrl ?? "http://localhost:8000").replace(/\/$/, "");
  const upstream = `${aiBase}/chat/stream`;

  // Redact PII from message before forwarding
  const body = req.body as Record<string, unknown>;
  if (typeof body?.message === "string") {
    body.message = redactPii(body.message);
  }

  const upstreamRes = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    res.status(upstreamRes.status).json({ error: "AI service error" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const reader = upstreamRes.body.getReader();
  const flush = () => { if (typeof (res as unknown as { flush?: () => void }).flush === "function") (res as unknown as { flush: () => void }).flush(); };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      flush();
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
});
