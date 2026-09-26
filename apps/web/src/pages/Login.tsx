import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { loginWithPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleButton } from "@/components/GoogleButton";

export function Login() {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const busy = submitting || passkeySubmitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPasskeyLogin() {
    setError(null);
    setPasskeySubmitting(true);
    try {
      const { session } = await loginWithPasskey();
      api.adoptSession(session);
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed. Try again or use your password.");
    } finally {
      setPasskeySubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to pick up where you left off.">
      <div className="space-y-2.5">
        <GoogleButton />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onPasskeyLogin}
          disabled={busy}
        >
          {passkeySubmitting ? <Spinner /> : <Fingerprint className="h-4 w-4" aria-hidden="true" />}
          {passkeySubmitting ? "Waiting for your device…" : "Sign in with a passkey"}
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-500" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-neutral-200" />
        or use email
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {submitting && <Spinner />}
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-700/75">
        New to Lunee?{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
