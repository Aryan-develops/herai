import { Router } from "express";
import {
  deleteAccount,
  login,
  logout,
  me,
  oauthCallback,
  oauthStart,
  refresh,
  register,
  submitDateOfBirth,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.delete("/account", requireAuth, asyncHandler(deleteAccount));

authRouter.get("/oauth/:provider", asyncHandler(oauthStart));
authRouter.post("/oauth/callback", asyncHandler(oauthCallback));
authRouter.post("/date-of-birth", requireAuth, asyncHandler(submitDateOfBirth));
