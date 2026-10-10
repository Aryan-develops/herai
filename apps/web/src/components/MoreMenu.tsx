import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, History, MoreHorizontal, Settings, Stethoscope } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isPartnerOnly } from "@/lib/gender";

export function MoreMenu() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { to: "/settings", label: "Settings", icon: Settings },
    ...(isPartnerOnly(user)
      ? []
      : [
          { to: "/care", label: "Find care", icon: Stethoscope },
          { to: "/reports", label: "Lab reports", icon: FileText },
          { to: "/timeline", label: "History", icon: History },
        ]),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-800 transition-colors hover:bg-neutral-100"
      >
        <MoreHorizontal className="h-5.5 w-5.5" aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="absolute left-0 top-12 z-40 w-48 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1 shadow-lift">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} role="none">
              <Link
                to={to}
                role="menuitem"
                className="flex min-h-11 items-center gap-3 px-4 text-sm font-medium text-ink-800 hover:bg-neutral-50"
              >
                <Icon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
