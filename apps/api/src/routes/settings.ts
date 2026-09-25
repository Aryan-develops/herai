import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { requireDateOfBirth } from "../middleware/requireDateOfBirth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  changePassword,
  exportData,
  getComfort,
  getPrefs,
  getSecurity,
  putComfort,
  putPrefs,
  registerPushToken,
  removePushToken,
  updateBasics,
} from "../controllers/settingsController.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// Account basics work for everyone signed in, including a minor still waiting on consent.
settingsRouter.get("/security", asyncHandler(getSecurity));
settingsRouter.post("/password", asyncHandler(changePassword));
settingsRouter.get("/export", asyncHandler(exportData));

settingsRouter.use(requireDateOfBirth);
settingsRouter.use(requireConsent);
settingsRouter.patch("/profile", asyncHandler(updateBasics));
settingsRouter.get("/prefs", asyncHandler(getPrefs));
settingsRouter.put("/prefs", asyncHandler(putPrefs));
settingsRouter.get("/comfort", asyncHandler(getComfort));
settingsRouter.put("/comfort", asyncHandler(putComfort));
settingsRouter.post("/push-token", asyncHandler(registerPushToken));
settingsRouter.delete("/push-token", asyncHandler(removePushToken));
