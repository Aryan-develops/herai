import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, Lock, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { loginWithPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
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
      setError(err instanceof Error ? err.message : "Passkey sign-in failed");
    } finally {
      setPasskeySubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to pick up your health insights where you left off.">
      <div className="space-y-2">
        <GoogleButton />
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={onPasskeyLogin} disabled={passkeySubmitting}>
          <Fingerprint className="h-4 w-4" />
          {passkeySubmitting ? "Checking…" : "Sign in with a passkey"}
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-700/50">
        <div className="h-px flex-1 bg-neutral-200" />
        or
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            icon={<Mail className="h-4 w-4" />}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-700/70">
        No account?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
