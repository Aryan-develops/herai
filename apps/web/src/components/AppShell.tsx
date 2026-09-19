import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Bot, CalendarPlus, Droplet, FileText, HeartPulse, LayoutDashboard, ListPlus, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Ask HERAI", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/cycle", label: "Cycle", icon: Droplet },
  { to: "/log", label: "Log entry", icon: CalendarPlus },
  { to: "/timeline", label: "Timeline", icon: ListPlus },
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
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                <HeartPulse className="h-4 w-4" />
              </span>
              HERAI
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive ? "bg-brand-50 text-brand-700" : "text-ink-700/60 hover:text-ink-900"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-neutral-100 px-4 py-1.5 sm:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-700/60"
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
