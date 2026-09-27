import { useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, type Gender } from "@/lib/api";
import { GENDER_OPTIONS } from "@/lib/gender";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { SettingsCard } from "@/components/settings/SettingsCard";

export function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [savingGender, setSavingGender] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.updateName(name.trim());
      await refreshUser();
      setMessage({ tone: "success", text: "Name updated." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't save that." });
    } finally {
      setSaving(false);
    }
  }

  async function saveGender(gender: Gender) {
    setSavingGender(true);
    try {
      await api.setGender(gender);
      await refreshUser();
    } finally {
      setSavingGender(false);
    }
  }

  return (
    <SettingsCard id="profile" icon={UserRound} title="Profile" description="How you appear in Lunee.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">Name</Label>
          <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" value={user?.email ?? ""} readOnly aria-readonly="true" className="bg-neutral-100 text-ink-700" />
          <p className="text-xs text-ink-700/60">Your date of birth is set when you sign up and can't be changed here.</p>
        </div>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving || !name.trim() || name.trim() === user?.name}>
            {saving && <Spinner />}
            Save name
          </Button>
          <Link to="/onboarding" className="text-sm font-medium text-brand-600 hover:underline">
            Edit health profile
          </Link>
        </div>
        <div className="space-y-1.5 border-t border-neutral-100 pt-4">
          <Label htmlFor="settings-gender">I use Lunee as</Label>
          <Select
            id="settings-gender"
            value={user?.gender ?? ""}
            disabled={savingGender}
            onChange={(e) => saveGender(e.target.value as Gender)}
          >
            <option value="" disabled>
              Select…
            </option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-ink-700/60">
            Choosing "Woman" gives you the full tracking app. Any other choice switches you to the partner experience —
            supporting someone else, with no cycle logging.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
