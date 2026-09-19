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
