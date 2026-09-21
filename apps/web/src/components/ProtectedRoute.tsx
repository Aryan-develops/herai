import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * OAuth and passkey sign-in never ask for date of birth, so consent status
 * can't be trusted until this clears — must run before RequireConsent, not
 * after (see requireDateOfBirth on the gateway for the full reasoning).
 */
export function RequireDateOfBirth() {
  const { user } = useAuth();

  if (user && user.needsDateOfBirth) {
    return <Navigate to="/confirm-dob" replace />;
  }

  return <Outlet />;
}

/**
 * Minors can hold a valid session while having no right to have their health
 * data processed yet, so this runs before onboarding — the onboarding form
 * itself writes to the health profile.
 */
export function RequireConsent() {
  const { user } = useAuth();

  if (user && user.consentStatus !== "not_required" && user.consentStatus !== "granted") {
    return <Navigate to="/consent-pending" replace />;
  }

  return <Outlet />;
}

export function RequireOnboarding() {
  const { user } = useAuth();

  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
