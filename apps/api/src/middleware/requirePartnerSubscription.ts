import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth.js";
import { getSubscription } from "../lib/partnerAccess.js";

/** No-op while PARTNER_PAYWALL is false (testing phase); enforces trial/subscription once it is on. */
export async function requirePartnerSubscription(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const subscription = await getSubscription(req.userId!);
    if (!subscription.hasAccess) {
      return res.status(402).json({ error: "Your free trial has ended. Subscribe to keep following.", subscription });
    }
    next();
  } catch (err) {
    next(err);
  }
}
