import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { isMinor } from "@/lib/age";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "@/components/AuthLayout";
import { MinorConsentNotice } from "@/components/MinorConsentNotice";

/**
 * OAuth and passkey sign-in create an account with no date of birth — see
 * requireDateOfBirth on the gateway. This is the mandatory step that collects
 * it, so a minor can't reach health-data routes without parental consent.
 */
export function ConfirmDateOfBirth() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
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
      const { user } = await api.submitDateOfBirth({
        dateOfBirth,
        guardianEmail: minor ? guardianEmail : undefined,
      });
      await refreshUser();
      navigate(user.consentStatus === "pending" ? "/consent-pending" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="One last thing" subtitle="We need your date of birth before HERAI can record any health information.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            required
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {minor && <MinorConsentNotice value={guardianEmail} onChange={setGuardianEmail} />}

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
