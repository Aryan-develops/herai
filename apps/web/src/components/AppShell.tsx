import { useEffect, type ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, HeartHandshake, Plus, Settings, Sparkles, Store, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GetHelpButton } from "@/components/GetHelp";
import { takePendingJoin } from "@/lib/join";
import { cn } from "@/lib/utils";

// Five destinations everywhere; Log is the raised centre button on phones. Reports, Care and Timeline
// live under Settings > More so the bar stays calm.
const NAV = [
  { to: "/dashboard", label: "Today", icon: Sun },
  { to: "/cycle", label: "Calendar", icon: CalendarDays },
  { to: "/log", label: "Log", icon: Plus, center: true },
  { to: "/partner", label: "Partner", icon: HeartHandshake },
  { to: "/chat", label: "Ask", icon: Sparkles },
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


  return (
    <div className="min-h-dvh bg-neutral-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 bg-neutral-50/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-800 transition-colors hover:bg-neutral-100"
          >
            <Settings className="h-5.5 w-5.5" aria-hidden="true" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                    isActive ? "bg-brand-100 text-brand-700" : "text-neutral-500 hover:bg-neutral-100 hover:text-ink-900",
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 lg:hidden" aria-label="Lunee home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <LogoMark className="h-4 w-4" />
            </span>
            Lunee
          </Link>
          <div className="flex items-center gap-1">
            {user?.isProvider && (
              <NavLink to="/provider" aria-label="Provider dashboard" title="Provider dashboard" className="flex h-11 w-11 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50">
                <Store className="h-5 w-5" aria-hidden="true" />
              </NavLink>
            )}
            <GetHelpButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:pb-12">
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2">
          {NAV.map(({ to, label, icon: Icon, center }) => (
            <li key={to} className="flex-1">
              {center ? (
                <NavLink to={to} aria-label="Log" className="-mt-6 flex flex-col items-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lift ring-4 ring-neutral-50 transition-transform active:scale-95">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                </NavLink>
              ) : (
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors", isActive ? "text-brand-600" : "text-neutral-500")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-brand-100")}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
