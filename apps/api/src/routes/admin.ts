import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../lib/admin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  auditLog,
  listProviders,
  listSupport,
  listUsers,
  overview,
  recentErrors,
  setPremium,
  updateApplication,
  updateProvider,
  updateSupport,
} from "../controllers/adminController.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(asyncHandler(requireAdmin));

adminRouter.get("/overview", asyncHandler(overview));
adminRouter.get("/users", asyncHandler(listUsers));
adminRouter.post("/users/:userId/premium", asyncHandler(setPremium));
adminRouter.get("/providers", asyncHandler(listProviders));
adminRouter.patch("/providers/:id", asyncHandler(updateProvider));
adminRouter.patch("/applications/:id", asyncHandler(updateApplication));
adminRouter.get("/support", asyncHandler(listSupport));
adminRouter.patch("/support/:id", asyncHandler(updateSupport));
adminRouter.get("/errors", asyncHandler(recentErrors));
adminRouter.get("/audit", asyncHandler(auditLog));
