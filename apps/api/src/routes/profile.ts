import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.use(requireConsent);
profileRouter.get("/", asyncHandler(getProfile));
profileRouter.put("/", asyncHandler(updateProfile));
