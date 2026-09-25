import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

/**
 * Lands here after Supabase's OAuth callback. The gateway starts the flow
 * statelessly (no PKCE verifier to carry between serverless invocations), so
 * Supabase returns the session in the URL hash (implicit flow) rather than a
 * ?code=. Adopt it into the local session store, then let the normal route
 * guards (RequireDateOfBirth -> RequireConsent -> RequireOnboarding) send the
 * user wherever the account needs to go by landing on /dashboard.
 */
export function OAuthCallback() {
  const { refreshUser } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const providerError = params.get("error_description") ?? new URLSearchParams(window.location.search).get("error_description");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (providerError || !accessToken || !refreshToken) {
      setError(providerError ?? "Sign-in did not complete — please try again");
      setState("error");
      return;
    }

    api.adoptSession({
      accessToken,
      refreshToken,
      expiresAt: Number(params.get("expires_at")) || null,
    });
    // Drop the tokens from the address bar and history.
    window.history.replaceState(null, "", window.location.pathname);

    refreshUser()
      .then(() => setState("done"))
      .catch(() => {
        setError("Sign-in failed — please try again");
        setState("error");
      });
    // Runs once on mount; the tokens are read from the hash exactly once.
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
