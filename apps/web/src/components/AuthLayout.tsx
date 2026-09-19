import { Link } from "react-router-dom";
import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-float-slow absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="animate-float-slower absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2 font-display text-xl font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          HERAI
        </Link>

        <div className="relative z-10">
          <p className="font-display text-3xl leading-snug font-medium text-white">
            "Your health data, reasoned about by a team of specialists — grounded, explainable,
            never guessed."
          </p>

          <div className="mt-10 space-y-4">
            <TrustPoint icon={<Sparkles className="h-4 w-4" />} text="Multi-agent AI, not a single chatbot" />
            <TrustPoint icon={<ShieldCheck className="h-4 w-4" />} text="Safety-first triage, always defers to clinicians" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/70">© 2026 HERAI · SIH USICT034</p>
      </div>

      <div className="flex items-center justify-center bg-neutral-50 px-6 py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl font-semibold text-ink-900 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            HERAI
          </Link>

          <h1 className="font-display text-2xl font-semibold text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-700/70">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TrustPoint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/90">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">{icon}</span>
      {text}
    </div>
  );
}
