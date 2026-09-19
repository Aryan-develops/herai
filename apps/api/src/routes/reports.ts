import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireConsent } from "../middleware/requireConsent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reportUpload } from "../config/uploads.js";
import { deleteReport, getReport, listReports, uploadReport } from "../controllers/reportsController.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireConsent);
reportsRouter.post("/", reportUpload.single("file"), asyncHandler(uploadReport));
reportsRouter.get("/", asyncHandler(listReports));
reportsRouter.get("/:id", asyncHandler(getReport));
reportsRouter.delete("/:id", asyncHandler(deleteReport));
