import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listProviders, submitProviderApplication } from "../controllers/careController.js";

export const careRouter = Router();

// Provider directory is not health data (no profile, logs or reports), so it
// needs a session but not the DOB/consent gates.
careRouter.use(requireAuth);
careRouter.get("/providers", asyncHandler(listProviders));
careRouter.post("/applications", asyncHandler(submitProviderApplication));
