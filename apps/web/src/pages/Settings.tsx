import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { CalendarCheck, ChevronRight, ShieldCheck, FileText, History, MapPin } from "lucide-react";
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

const MORE = [
  { to: "/timeline", label: "History", hint: "Everything you've logged", icon: History },
  { to: "/reports", label: "Lab reports", hint: "Upload and understand reports", icon: FileText },
  { to: "/care", label: "Find care", hint: "Labs and doctors near you", icon: MapPin },
  { to: "/care/requests", label: "My requests", hint: "Tests and appointments you asked for", icon: CalendarCheck },
];

export function Settings() {
  const { hash } = useLocation();
  const { logout, user } = useAuth();

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
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>

      <nav aria-label="Settings sections" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
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

      <section aria-labelledby="more-h" className="mt-5 rounded-3xl border border-neutral-200 bg-white p-2 shadow-soft">
        <h2 id="more-h" className="sr-only">More</h2>
        <ul className="divide-y divide-neutral-100">
          {[...MORE, ...(user?.isAdmin ? [{ to: "/admin", label: "Admin", hint: "Dashboard, users, premium, services", icon: ShieldCheck }] : [])].map(({ to, label, hint, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-neutral-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{label}</span>
                  <span className="block text-xs text-neutral-500">{hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
