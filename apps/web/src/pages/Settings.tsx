import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { PartnerSection } from "@/components/settings/PartnerSection";
import { AppearanceSection, HelpSection, NotificationsSection, PrivacySection } from "@/components/settings/PreferencesSections";

const SECTIONS = [
  ["profile", "Profile"],
  ["security", "Sign-in"],
  ["partner", "Partner"],
  ["notifications", "Notifications"],
  ["appearance", "Appearance"],
  ["privacy", "Privacy"],
  ["help", "Help"],
] as const;

export function Settings() {
  const { hash } = useLocation();
  const { logout } = useAuth();

  // Deep links like /settings#partner scroll to the section once it has rendered.
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink-900 sm:text-4xl">Settings</h1>
          <p className="mt-1.5 max-w-xl text-ink-700/70">Your account, sign-in, sharing and privacy in one place.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>

      <nav aria-label="Settings sections" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-5">
        <ProfileSection />
        <SecuritySection />
        <PartnerSection />
        <NotificationsSection />
        <AppearanceSection />
        <PrivacySection />
        <HelpSection />
      </div>
    </AppShell>
  );
}
