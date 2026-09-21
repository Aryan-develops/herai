import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

/**
 * Lands here after Supabase's own OAuth callback redirects back with a
 * ?code= in the query string (see authController.oauthStart/oauthCallback).
 * Exchanges it for a session, then hands off to the normal route guards
 * (RequireDateOfBirth -> RequireConsent -> RequireOnboarding) by just
 * landing on /dashboard — they redirect wherever the account actually needs
 * to go, so this doesn't duplicate that routing logic.
 */
export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing authorization code");
      setState("error");
      return;
    }
    api
      .exchangeOAuthCode(code)
      .then(() => refreshUser())
      .then(() => setState("done"))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Sign-in failed");
        setState("error");
      });
    // Runs once on mount — the code is single-use, so this must not re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "done") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      {state === "working" && <p className="text-neutral-500">Signing you in…</p>}
      {state === "error" && (
        <>
          <p className="text-red-600">{error}</p>
          <a href="/login" className="text-sm font-medium text-brand-600 hover:underline">
            Back to login
          </a>
        </>
      )}
    </div>
  );
}
