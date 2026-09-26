import { useEffect, type ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bot, CalendarPlus, Droplet, FileText, HeartHandshake, LayoutDashboard, ListPlus, Settings, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GetHelpButton } from "@/components/GetHelp";
import { takePendingJoin } from "@/lib/join";
import { cn } from "@/lib/utils";

const DESKTOP_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/cycle", label: "Cycle", icon: Droplet },
  { to: "/partner", label: "Partner", icon: HeartHandshake },
  { to: "/chat", label: "Ask", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/timeline", label: "Timeline", icon: ListPlus },
  { to: "/log", label: "Log", icon: CalendarPlus },
];

// Bottom bar is capped at five top-level destinations. Partner always has its own tab; Reports and Timeline
// stay reachable from the Home screen's cards.
const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/cycle", label: "Cycle", icon: Droplet },
  { to: "/log", label: "Log", icon: CalendarPlus },
  { to: "/partner", label: "Partner", icon: HeartHandshake },
  { to: "/chat", label: "Ask", icon: Bot },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // An invite link opened while signed out is resumed once they're in.
  useEffect(() => {
    const pending = takePendingJoin();
    if (pending && !pathname.startsWith("/join")) navigate(`/join/${pending}`, { replace: true });
  }, [pathname, navigate]);

  const desktopNav = DESKTOP_NAV;
  const mobileNav = MOBILE_NAV;
  const initials = user?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-neutral-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              to="/settings"
              aria-label="Lunee settings"
              title="Settings"
              className="group flex items-center gap-2 rounded-xl font-display text-lg font-semibold text-ink-900 transition-opacity hover:opacity-80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
                <LogoMark className="h-4 w-4" />
              </span>
              Lunee
              <Settings className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {desktopNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-neutral-500 hover:bg-neutral-100 hover:text-ink-900"
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user?.isProvider && (
              <NavLink
                to="/provider"
                aria-label="Provider dashboard"
                title="Provider dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-700 hover:bg-brand-50"
              >
                <Store className="h-4.5 w-4.5" aria-hidden="true" />
              </NavLink>
            )}
            <GetHelpButton />
            <Link
              to="/settings"
              aria-label={user?.name ? `Settings for ${user.name}` : "Settings"}
              title="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-violet-100 text-xs font-semibold text-brand-700 transition-shadow hover:shadow-soft"
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:pb-12">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors",
                    isActive ? "text-brand-600" : "text-neutral-500"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        isActive && "bg-brand-100"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
