import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

// On a phone the app may be installed; the browser confirms the email and this button hands the user back to it.
// (Full in-app verification via App Links / Universal Links is a planned follow-up.)
const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Landing page for the emailed confirmation link. */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [message, setMessage] = useState("This link is missing its code. Open the link from your email again.");

  useEffect(() => {
    if (!token) return;
    api
      .verifyEmail(token)
      .then(() => setState("done"))
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : "We couldn't verify that link. Please try again.");
        setState("failed");
      });
  }, [token]);

  return (
    <AuthLayout title={state === "done" ? "Email confirmed" : "Confirming your email"} subtitle={state === "done" ? "Your account is ready." : "This only takes a moment."}>
      {state === "working" && (
        <p className="flex items-center justify-center gap-2 text-ink-700">
          <Spinner /> One moment…
        </p>
      )}
      {state === "done" && (
        <div className="space-y-4 text-center">
          <p className="text-ink-700">Thanks. Log in to start using Lunee.</p>
          {IS_MOBILE && (
            <a
              href="lunee://login"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-brand-600 px-6 font-semibold text-brand-700 hover:bg-brand-50"
            >
              Open the Lunee app
            </a>
          )}
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700"
          >
            Log in
          </Link>
        </div>
      )}
      {state === "failed" && (
        <div className="space-y-4">
          <Alert tone="error">{message}</Alert>
          <p className="text-center text-sm text-ink-700/75">
            Log in with your email and password and we can send a fresh link.{" "}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              Go to log in
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
