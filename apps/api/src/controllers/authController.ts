import type { Response } from "express";
import { z } from "zod";
import { REPORTS_BUCKET, createAuthClient, supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { createConsentRequest } from "./consentController.js";
import { ageFromDateOfBirth, isMinor } from "../utils/consent.js";

type ConsentStatus = "not_required" | "pending" | "granted" | "declined" | "withdrawn";

const registerSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    // Required: the app is open to minors, and consent handling depends on
    // knowing an actual age rather than the coarse self-reported age band on
    // the health profile.
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
    guardianEmail: z.string().email().optional(),
    guardianName: z.string().min(1).max(120).optional(),
  })
  .refine((data) => !isMinor(data.dateOfBirth) || !!data.guardianEmail, {
    message: "A parent or guardian's email is required to create an account for someone under 18",
    path: ["guardianEmail"],
  })
  .refine((data) => ageFromDateOfBirth(data.dateOfBirth) >= 0 && ageFromDateOfBirth(data.dateOfBirth) < 120, {
    message: "Please enter a valid date of birth",
    path: ["dateOfBirth"],
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AuthPayload {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  consentStatus: ConsentStatus;
}

interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

async function loadAuthPayload(userId: string, email: string): Promise<AuthPayload> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("name, onboarding_complete, consent_status")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new HttpError(500, "Failed to load profile");
  }

  return {
    id: userId,
    name: profile.name,
    email,
    onboardingComplete: profile.onboarding_complete,
    consentStatus: profile.consent_status,
  };
}

// No cookies on mobile — every client (web + future RN app) receives the
// Supabase session tokens in the JSON body and stores them itself, sending
// `Authorization: Bearer <accessToken>` back on every subsequent request.
export async function register(req: AuthedRequest, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, email, password, dateOfBirth, guardianEmail, guardianName } = parsed.data;
  const minor = isMinor(dateOfBirth);

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    const status = createError.status === 422 ? 409 : 500;
    throw new HttpError(status, status === 409 ? "An account with this email already exists" : createError.message);
  }

  // The signup trigger has already created the profile row; fill in the parts
  // only the request knows about. A minor lands in `pending`, which
  // requireConsent blocks on until a guardian responds.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      date_of_birth: dateOfBirth,
      consent_status: minor ? "pending" : "not_required",
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Leaving a minor's account at the default 'not_required' would silently
    // grant them unconsented access, so undo the whole signup instead.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
    throw new HttpError(500, "Failed to complete registration");
  }

  if (minor) {
    await createConsentRequest({
      userId: created.user.id,
      minorName: name,
      guardianEmail: guardianEmail!,
      guardianName,
    });
  }

  const { data: signIn, error: signInError } = await createAuthClient().auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) {
    throw new HttpError(500, "Account created but sign-in failed — please log in");
  }

  const user = await loadAuthPayload(created.user.id, email);
  const session: SessionPayload = {
    accessToken: signIn.session.access_token,
    refreshToken: signIn.session.refresh_token,
    expiresAt: signIn.session.expires_at ?? null,
  };

  res.status(201).json({ user, session });
}

export async function login(req: AuthedRequest, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid email or password");
  }
  const { email, password } = parsed.data;

  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const user = await loadAuthPayload(data.user.id, data.user.email ?? email);
  const session: SessionPayload = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
  };

  res.json({ user, session });
}

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export async function refresh(req: AuthedRequest, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Missing refresh token");
  }

  const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: parsed.data.refreshToken });
  if (error || !data.session) {
    throw new HttpError(401, "Session expired — please log in again");
  }

  res.json({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    } satisfies SessionPayload,
  });
}

export async function logout(req: AuthedRequest, res: Response) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    await supabaseAdmin.auth.admin.signOut(token, "global").catch(() => {});
  }
  res.status(204).send();
}

// Required by both stores (Google Play's account-deletion policy, Apple
// guideline 5.1.1(v)) and by the withdrawal-of-consent right in the privacy
// policy: erasing the account must erase the health data with it.
//
// Every table's user_id is ON DELETE CASCADE against auth.users, so removing
// the auth user clears profile, health profile, logs, reports and execution
// records in one transaction. Storage sits outside Postgres and is therefore
// cleared first and explicitly — deleting the rows would otherwise orphan the
// uploaded report files in the bucket forever.
export async function deleteAccount(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    throw new HttpError(401, "Not authenticated");
  }

  const { data: files } = await supabaseAdmin.storage.from(REPORTS_BUCKET).list(userId);
  if (files && files.length > 0) {
    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await supabaseAdmin.storage.from(REPORTS_BUCKET).remove(paths);
    if (removeError) {
      // Stop rather than proceed: deleting the account here would strand the
      // user's uploaded medical files with no owner and no way to reach them.
      throw new HttpError(500, "Failed to delete stored files — account not deleted");
    }
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw new HttpError(500, "Failed to delete account");
  }

  res.status(204).send();
}

export async function me(req: AuthedRequest, res: Response) {
  if (!req.userId || !req.userEmail) {
    throw new HttpError(401, "Not authenticated");
  }
  const user = await loadAuthPayload(req.userId, req.userEmail);
  res.json({ user });
}
