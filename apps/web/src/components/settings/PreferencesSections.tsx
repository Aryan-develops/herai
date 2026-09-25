import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Download, Globe, LifeBuoy, Moon, Monitor, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { api, ApiError, type NotificationPrefs } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SettingsCard, ToggleRow } from "@/components/settings/SettingsCard";
import { GetHelpButton } from "@/components/GetHelp";
import { cn } from "@/lib/utils";

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPrefs().then(({ prefs }) => setPrefs(prefs)).catch(() => setError("Couldn't load your preferences."));
  }, []);

  async function update(patch: Partial<NotificationPrefs>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setError(null);
    try {
      setPrefs((await api.updatePrefs(patch)).prefs);
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    }
  }

  return (
    <SettingsCard id="notifications" icon={Bell} title="Notifications and language" description="For the daily support note when you follow someone.">
      {!prefs ? (
        <div className="skeleton h-24" aria-hidden="true" />
      ) : (
        <div className="divide-y divide-neutral-200">
          <ToggleRow label="Daily support note" hint="A short morning note when someone you follow is in a tougher phase." checked={prefs.partnerDailyNudge} onChange={(v) => update({ partnerDailyNudge: v })} />
          <ToggleRow label="By email" checked={prefs.emailEnabled} onChange={(v) => update({ emailEnabled: v })} />
          <ToggleRow label="On my phone" hint="Push notifications in the HERAI mobile app." checked={prefs.pushEnabled} onChange={(v) => update({ pushEnabled: v })} />
          <div className="flex items-center justify-between gap-4 py-2.5">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                <Globe className="h-4 w-4 text-ink-700/60" aria-hidden="true" />
                Language for tips
              </p>
              <p className="text-xs text-ink-700/60">Used for partner tips and notes.</p>
            </div>
            <div role="radiogroup" aria-label="Language" className="flex gap-1.5">
              {(
                [
                  ["en", "English"],
                  ["hi", "हिन्दी"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.language === id}
                  onClick={() => update({ language: id })}
                  className={cn(
                    "min-h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium transition-colors",
                    prefs.language === id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </SettingsCard>
  );
}

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match device", icon: Monitor },
];

export function AppearanceSection() {
  const [pref, setPref] = useTheme();
  return (
    <SettingsCard id="appearance" icon={Sun} title="Appearance" description="Pick the look that's easiest on your eyes.">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pref === id}
            onClick={() => setPref(id)}
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-colors",
              pref === id ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </SettingsCard>
  );
}

export function PrivacySection() {
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const data = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "herai-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount();
      await logout().catch(() => {});
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account. Nothing was removed.");
      setDeleting(false);
    }
  }

  return (
    <SettingsCard id="privacy" icon={ShieldCheck} title="Privacy and your data" description="It's your data. Download it or delete it whenever you like.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? <Spinner /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Download my data
          </Button>
          <Link to="/care/requests" className="text-sm font-medium text-brand-600 hover:underline">
            Manage what labs and doctors can see
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Delete my account</p>
          <p className="mt-1 text-sm text-red-700">
            Permanently erases your account, logs, reports and everything shared with partners. This can't be undone.
          </p>
          {!showDelete ? (
            <Button className="mt-3" variant="outline" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete my account
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
              <div className="flex gap-2">
                <Button onClick={deleteAccount} disabled={confirmText !== "DELETE" || deleting} className="from-red-600 to-red-700">
                  {deleting && <Spinner />}
                  Permanently delete
                </Button>
                <Button variant="ghost" onClick={() => { setShowDelete(false); setConfirmText(""); }}>
                  Keep my account
                </Button>
              </div>
            </div>
          )}
        </div>
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </SettingsCard>
  );
}

export function HelpSection() {
  return (
    <SettingsCard id="help" icon={LifeBuoy} title="Help" description="Emergency numbers and care near you.">
      <div className="flex flex-wrap items-center gap-3">
        <GetHelpButton variant="outline" />
        <Link to="/care" className="text-sm font-medium text-brand-600 hover:underline">
          Find labs and doctors
        </Link>
      </div>
      <p className="mt-4 text-xs text-ink-700/60">
        HERAI gives general information, not medical advice. If you're in danger or feel very unwell, call your local emergency number.
      </p>
    </SettingsCard>
  );
}
