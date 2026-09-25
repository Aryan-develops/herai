import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireDateOfBirth } from "../middleware/requireDateOfBirth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { requireProvider } from "../middleware/requireProvider.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  cancelRequest,
  createRequest,
  getProvider,
  listMyRequests,
  listProviders,
  reviewRequest,
  submitProviderApplication,
  suggestForReport,
} from "../controllers/careController.js";
import {
  addService,
  addSlots,
  deleteService,
  deleteSlot,
  getMe,
  listRequests,
  sharedData,
  updateMe,
  updateRequest,
  updateService,
} from "../controllers/providerController.js";

export const careRouter = Router();
careRouter.use(requireAuth);

// Directory browsing is not health data, so it needs a session only.
careRouter.get("/providers", asyncHandler(listProviders));
careRouter.get("/providers/:id", asyncHandler(getProvider));
careRouter.post("/applications", asyncHandler(submitProviderApplication));

// Sending a request can share health data, so it sits behind the same DOB and
// parental-consent gates as every other health route.
careRouter.use(requireDateOfBirth);
careRouter.use(requireConsent);
careRouter.get("/suggest/:reportId", asyncHandler(suggestForReport));
careRouter.post("/requests", asyncHandler(createRequest));
careRouter.get("/requests", asyncHandler(listMyRequests));
careRouter.post("/requests/:id/cancel", asyncHandler(cancelRequest));
careRouter.post("/requests/:id/review", asyncHandler(reviewRequest));

export const providerRouter = Router();
providerRouter.use(requireAuth);
providerRouter.use(requireProvider);
providerRouter.get("/me", asyncHandler(getMe));
providerRouter.patch("/me", asyncHandler(updateMe));
providerRouter.post("/services", asyncHandler(addService));
providerRouter.patch("/services/:id", asyncHandler(updateService));
providerRouter.delete("/services/:id", asyncHandler(deleteService));
providerRouter.post("/slots", asyncHandler(addSlots));
providerRouter.delete("/slots/:id", asyncHandler(deleteSlot));
providerRouter.get("/requests", asyncHandler(listRequests));
providerRouter.patch("/requests/:id", asyncHandler(updateRequest));
providerRouter.get("/requests/:id/shared", asyncHandler(sharedData));
