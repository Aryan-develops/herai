import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { requireDateOfBirth } from "../middleware/requireDateOfBirth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  cancelSubscription,
  checkout,
  createGift,
  getPlans,
  listInvoices,
  redeemGift,
  setAutopay,
  webhook,
} from "../controllers/paymentsController.js";

export const paymentsRouter = Router();

// Webhooks are called by providers, not signed-in users; each provider verifies its own signature.
paymentsRouter.post("/webhook/:provider", asyncHandler(webhook));

paymentsRouter.use(requireAuth);
paymentsRouter.use(requireDateOfBirth);
paymentsRouter.use(requireConsent);
paymentsRouter.get("/plans", asyncHandler(getPlans));
paymentsRouter.post("/checkout", asyncHandler(checkout));
paymentsRouter.post("/autopay", asyncHandler(setAutopay));
paymentsRouter.post("/cancel", asyncHandler(cancelSubscription));
paymentsRouter.get("/invoices", asyncHandler(listInvoices));
paymentsRouter.post("/gift/create", asyncHandler(createGift));
paymentsRouter.post("/gift/redeem", asyncHandler(redeemGift));
