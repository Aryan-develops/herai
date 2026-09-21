import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { isMinor } from "@/lib/age";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";

/**
 * OAuth and passkey sign-in create an account with no date of birth at all —
 * see requireDateOfBirth on the gateway. This is the mandatory interstitial
 * that collects it before anything else, so a minor can't reach health-data
 * routes without the same parental-consent gate password signup already has.
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
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="One more thing" subtitle="We need your date of birth before HERAI can record any health information.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            icon={<CalendarDays className="h-4 w-4" />}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {minor && (
          <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <div className="flex items-start gap-2.5 text-sm text-ink-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <p>
                Since you're under 18, a parent or guardian has to approve your account before HERAI
                can record any health information. We'll email them a link.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guardianEmail">Parent or guardian's email</Label>
              <Input
                id="guardianEmail"
                type="email"
                required
                icon={<Mail className="h-4 w-4" />}
                placeholder="parent@example.com"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
