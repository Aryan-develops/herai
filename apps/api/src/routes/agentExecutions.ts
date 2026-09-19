import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listAgentExecutions, logAgentExecution } from "../controllers/agentExecutionsController.js";

export const agentExecutionsRouter = Router();

agentExecutionsRouter.use(requireAuth);
agentExecutionsRouter.use(requireConsent);
agentExecutionsRouter.post("/", asyncHandler(logAgentExecution));
agentExecutionsRouter.get("/", asyncHandler(listAgentExecutions));
