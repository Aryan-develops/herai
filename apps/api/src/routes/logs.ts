import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { requireDateOfBirth } from "../middleware/requireDateOfBirth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createCycleLog,
  createSymptomLog,
  deleteCycleLog,
  deleteSymptomLog,
  getCycleInsights,
  getTimeline,
  listCycleLogs,
  listSymptomLogs,
} from "../controllers/logsController.js";

export const logsRouter = Router();

logsRouter.use(requireAuth);
logsRouter.use(requireDateOfBirth);
logsRouter.use(requireConsent);

logsRouter.post("/symptoms", asyncHandler(createSymptomLog));
logsRouter.get("/symptoms", asyncHandler(listSymptomLogs));
logsRouter.delete("/symptoms/:id", asyncHandler(deleteSymptomLog));

logsRouter.post("/cycles", asyncHandler(createCycleLog));
logsRouter.get("/cycles", asyncHandler(listCycleLogs));
logsRouter.get("/cycles/insights", asyncHandler(getCycleInsights));
logsRouter.delete("/cycles/:id", asyncHandler(deleteCycleLog));

logsRouter.get("/timeline", asyncHandler(getTimeline));
