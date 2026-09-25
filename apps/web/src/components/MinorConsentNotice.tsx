import { Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shown once a date of birth makes the user a minor; shared by sign-up and the post-OAuth DOB step. */
export function MinorConsentNotice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
      <div className="flex items-start gap-2.5 text-sm text-ink-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p>
          Since you're under 18, a parent or guardian needs to approve your account before HERAI records any
          health information. We'll email them a link.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guardianEmail">Parent or guardian's email</Label>
        <Input
          id="guardianEmail"
          type="email"
          required
          autoComplete="off"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          placeholder="parent@example.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
