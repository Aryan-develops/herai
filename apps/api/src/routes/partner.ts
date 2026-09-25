import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { requireDateOfBirth } from "../middleware/requireDateOfBirth.js";
import { requirePartnerSubscription } from "../middleware/requirePartnerSubscription.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  acceptInvite,
  accessLog,
  addEvent,
  cancelInvite,
  createInvite,
  deleteEvent,
  listInvites,
  listMyPartners,
  listWomen,
  mySubscription,
  previewInvite,
  revokeLink,
  setTask,
  submitFeedback,
  updateLink,
  womanSummary,
} from "../controllers/partnerController.js";

export const partnerRouter = Router();

partnerRouter.use(requireAuth);
partnerRouter.use(requireDateOfBirth);
partnerRouter.use(requireConsent);

// Inviting and connecting (either direction)
partnerRouter.post("/invites", asyncHandler(createInvite));
partnerRouter.get("/invites", asyncHandler(listInvites));
partnerRouter.get("/invites/preview", asyncHandler(previewInvite));
partnerRouter.post("/invites/accept", asyncHandler(acceptInvite));
partnerRouter.delete("/invites/:id", asyncHandler(cancelInvite));

// Her side: who she shares with, what, and the audit trail
partnerRouter.get("/links", asyncHandler(listMyPartners));
partnerRouter.patch("/links/:id", asyncHandler(updateLink));
partnerRouter.delete("/links/:id", asyncHandler(revokeLink));
partnerRouter.get("/links/:id/access-log", asyncHandler(accessLog));

// Partner side: everyone who shares with them
partnerRouter.get("/subscription", asyncHandler(mySubscription));
partnerRouter.get("/women", asyncHandler(listWomen));
partnerRouter.get("/women/:linkId/summary", requirePartnerSubscription, asyncHandler(womanSummary));
partnerRouter.post("/women/:linkId/feedback", requirePartnerSubscription, asyncHandler(submitFeedback));
partnerRouter.post("/women/:linkId/tasks", requirePartnerSubscription, asyncHandler(setTask));
partnerRouter.post("/women/:linkId/events", requirePartnerSubscription, asyncHandler(addEvent));
partnerRouter.delete("/women/:linkId/events/:eventId", asyncHandler(deleteEvent));
