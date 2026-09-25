import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, type InviteDirection } from "@/lib/api";
import { PENDING_JOIN_KEY } from "@/lib/join";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Landing page for /join/:token invite links. Works signed out: it remembers the invite through sign-in. */
export function Join() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ inviterFirstName: string; direction: InviteDirection } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !token) return;
    if (!user) {
      try {
        sessionStorage.setItem(PENDING_JOIN_KEY, token);
      } catch {
        // Private mode: they'll need to open the link again after signing in.
      }
      return;
    }
    api
      .previewInvite({ token })
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "That invite isn't valid."));
  }, [loading, user, token]);

  async function accept() {
    if (!token) return;
    setBusy(true);
    try {
      const { role } = await api.acceptInvite({ token });
      try {
        sessionStorage.removeItem(PENDING_JOIN_KEY);
      } catch {
        // Nothing to clear.
      }
      await api.me().catch(() => {});
      navigate(role === "partner" ? "/partner" : "/settings#partner", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't connect.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 text-center shadow-lift">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
          <HeartHandshake className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">You've been invited to HERAI</h1>

        {(loading || (user && !preview && !error)) && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-700/70">
            <Spinner /> Checking your invite…
          </p>
        )}

        {!loading && !user && (
          <>
            <p className="mt-3 text-sm text-ink-700/80">Sign in or create an account to accept. Your invite will be waiting.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/register">
                <Button className="w-full">Create an account</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  I have an account
                </Button>
              </Link>
            </div>
          </>
        )}

        {preview && (
          <>
            <p className="mt-3 text-sm text-ink-700/80">
              {preview.direction === "woman_invites_partner"
                ? `${preview.inviterFirstName} invited you to follow her cycle so you can support her. She decides what you see and can stop at any time.`
                : `${preview.inviterFirstName} would like to follow your cycle updates. If you accept, they see only what you choose to share.`}
            </p>
            <Button className="mt-5 w-full" onClick={accept} disabled={busy}>
              {busy && <Spinner />}
              Accept and connect
            </Button>
            <Link to="/dashboard" className="mt-3 inline-block text-sm text-ink-700/70 hover:underline">
              Not now
            </Link>
          </>
        )}

        {error && (
          <>
            <Alert tone="error" className="mt-4 text-left">{error}</Alert>
            <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
              Go to HERAI
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
