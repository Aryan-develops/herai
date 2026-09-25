import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Bot, CalendarPlus, Droplet, FileText, HeartPulse, LayoutDashboard, ListPlus, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DESKTOP_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/cycle", label: "Cycle", icon: Droplet },
  { to: "/chat", label: "Ask HERAI", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/timeline", label: "Timeline", icon: ListPlus },
  { to: "/log", label: "Log entry", icon: CalendarPlus },
];

// Bottom bar is capped at five top-level destinations; Timeline stays
// reachable from the Home screen's "View all".
const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/cycle", label: "Cycle", icon: Droplet },
  { to: "/log", label: "Log", icon: CalendarPlus },
  { to: "/chat", label: "Ask", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
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
            <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
              </span>
              HERAI
            </div>
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {DESKTOP_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
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
          <div className="flex items-center gap-2">
            <span
              aria-label={user?.name ? `Signed in as ${user.name}` : "Signed in"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-violet-100 text-xs font-semibold text-brand-700"
            >
              {initials}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()} aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
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
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
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
