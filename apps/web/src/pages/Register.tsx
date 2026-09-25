import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Mail, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { isMinor } from "@/lib/age";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleButton } from "@/components/GoogleButton";
import { MinorConsentNotice } from "@/components/MinorConsentNotice";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minor = dateOfBirth !== "" && isMinor(dateOfBirth);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({
        name,
        email,
        password,
        dateOfBirth,
        guardianEmail: minor ? guardianEmail : undefined,
      });
      // A minor can't reach the app until a guardian approves.
      navigate(user.consentStatus === "pending" ? "/consent-pending" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free to start — set up in under a minute.">
      <GoogleButton />

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-500" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-neutral-200" />
        or sign up with email
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            autoComplete="name"
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="password-hint" className="text-xs text-neutral-500">
            Use 8 or more characters.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            required
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            aria-describedby="dob-hint"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <p id="dob-hint" className="text-xs text-neutral-500">
            Used to keep the app safe for your age. Never shown to anyone else.
          </p>
        </div>

        {minor && <MinorConsentNotice value={guardianEmail} onChange={setGuardianEmail} />}

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-neutral-500">
          By continuing you agree that HERAI provides health information, not medical diagnosis.
        </p>
      </form>

      <p className="mt-7 text-center text-sm text-ink-700/75">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
