import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getConsentRequest,
  resendConsentRequest,
  respondToConsentRequest,
  withdrawConsent,
} from "../controllers/consentController.js";

export const consentRouter = Router();

// Guardian-facing routes are intentionally unauthenticated — a guardian has a
// emailed link, not an account. The unguessable token is the credential.
consentRouter.get("/:token", asyncHandler(getConsentRequest));
consentRouter.post("/:token/respond", asyncHandler(respondToConsentRequest));
consentRouter.post("/:token/withdraw", asyncHandler(withdrawConsent));

// Minor-facing: re-send to a corrected guardian address.
consentRouter.post("/", requireAuth, asyncHandler(resendConsentRequest));
