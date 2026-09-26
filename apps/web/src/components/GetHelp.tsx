import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Ambulance, HeartHandshake, LifeBuoy, MapPin, Phone, ShieldAlert, Stethoscope, X } from "lucide-react";
import { SupportForm } from "@/components/SupportForm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// India national numbers. Shown as tel: links so one tap dials on a phone.
const HELPLINES = [
  { name: "Emergency (police, fire, ambulance)", number: "112", tone: "bg-red-100 text-red-700", icon: ShieldAlert },
  { name: "Ambulance", number: "108", tone: "bg-red-100 text-red-700", icon: Ambulance },
  { name: "Women helpline", number: "181", tone: "bg-brand-100 text-brand-700", icon: HeartHandshake },
  { name: "Tele-MANAS mental health support (24x7)", number: "14416", tone: "bg-violet-100 text-violet-700", icon: Phone },
];

export function GetHelpButton({ variant = "soft", className }: { variant?: "soft" | "outline"; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)} className={className}>
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
        Get help
      </Button>
      {open && <HelpSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Portalled to <body>: the header uses backdrop-blur, which would otherwise become the containing
  // block for this fixed overlay and clip the sheet to the header strip.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="help-title" className="font-display text-xl font-semibold text-ink-900">
              Get help
            </h2>
            <p className="mt-1 text-sm text-ink-700/75">If you're in danger or feel very unwell, call now.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="mt-5 space-y-2.5">
          {HELPLINES.map(({ name, number, tone, icon: Icon }) => (
            <li key={number}>
              <a
                href={`tel:${number}`}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-ink-900">{name}</span>
                <span className="tabular font-display text-lg font-semibold text-ink-900">{number}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl bg-brand-50/70 p-4">
          <p className="text-sm font-semibold text-ink-900">Want to see a clinician or get tested?</p>
          <p className="mt-1 text-sm text-ink-700/75">Find labs and doctors near you.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/care" onClick={onClose}>
              <Button size="sm">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Labs near me
              </Button>
            </Link>
            <Link to="/care?type=doctor" onClick={onClose}>
              <Button size="sm" variant="outline">
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                Doctors
              </Button>
            </Link>
          </div>
        </div>

        <SupportForm />

        <p className="mt-4 text-xs text-neutral-500">
          Numbers shown are for India. Lunee can't summon help for you and can't detect every emergency.
        </p>
      </div>
    </div>,
    document.body,
  );
}
