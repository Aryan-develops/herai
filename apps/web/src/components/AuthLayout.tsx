import { Link } from "react-router-dom";
import { Droplet, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="animate-float-slow absolute -top-24 -left-24 h-96 w-96 rounded-full bg-peach-400/30 blur-3xl" />
          <div className="animate-float-slower absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-1/3 right-12 h-40 w-40 rounded-full border border-white/20" />
          <div className="absolute top-1/3 right-20 mt-8 h-24 w-24 rounded-full border border-white/25" />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2 font-display text-xl font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </span>
          Lunee
        </Link>

        <div className="relative z-10">
          <p className="font-display text-4xl leading-tight font-medium text-white">
            Know your body.
            <br />
            Feel understood.
          </p>
          <p className="mt-4 max-w-sm text-white/85">
            Track your cycle, log how you feel, and get grounded guidance from a team of specialist AI — that
            always knows when to point you to a real clinician.
          </p>

          <div className="mt-10 space-y-3.5">
            <TrustPoint icon={<Droplet className="h-4 w-4" />} text="Cycle predictions that learn from you" />
            <TrustPoint icon={<Sparkles className="h-4 w-4" />} text="Specialist AI agents, not one generic chatbot" />
            <TrustPoint icon={<ShieldCheck className="h-4 w-4" />} text="Safety-first, and private by design" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/70">© 2026 Lunee</p>
      </div>

      <div className="flex items-center justify-center bg-neutral-50 px-5 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl font-semibold text-ink-900 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
            </span>
            Lunee
          </Link>

          <h1 className="font-display text-3xl font-semibold text-ink-900">{title}</h1>
          <p className="mt-2 text-sm text-ink-700/75">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TrustPoint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/95">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
        {icon}
      </span>
      {text}
    </div>
  );
}
