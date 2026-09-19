import { Link } from "react-router-dom";
import { ArrowRight, HeartPulse, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-brand-200 to-brand-400/40 opacity-60 blur-3xl" />
        <div className="animate-float-slower absolute top-1/3 -left-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-violet-100 to-violet-400/30 opacity-60 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            HERAI
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
        <div className="animate-fade-up mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-brand-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Built for Smart India Hackathon 2026 · USICT034
        </div>

        <h1 className="animate-fade-up font-display text-5xl leading-[1.1] font-medium tracking-tight text-ink-900 sm:text-6xl [animation-delay:80ms]">
          Understand your body with{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent">
            agentic AI
          </span>
          , not guesswork
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-ink-700/80 [animation-delay:160ms]">
          HERAI pairs symptom tracking, cycle intelligence, and a team of specialist AI agents to
          give you personalized, grounded health insight — and to know exactly when it's time to
          see a clinician.
        </p>

        <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4 [animation-delay:240ms]">
          <Link to="/register">
            <Button size="lg" className="shadow-lg shadow-brand-500/25">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              I already have an account
            </Button>
          </Link>
        </div>

        <div className="animate-fade-up mt-24 grid gap-5 text-left sm:grid-cols-3 [animation-delay:320ms]">
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            iconClass="bg-brand-100 text-brand-600"
            title="Multi-agent reasoning"
            desc="Specialist agents for symptoms, risk, and care planning work together — not one generic prompt pretending to know everything."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            iconClass="bg-violet-100 text-violet-600"
            title="Safety-first triage"
            desc="A dedicated safety layer screens every query first and defers to real clinicians the moment something looks urgent."
          />
          <Feature
            icon={<MessageCircleHeart className="h-5 w-5" />}
            iconClass="bg-brand-100 text-brand-700"
            title="Actually personalized"
            desc="Insight grounded in your own logged history and trusted medical guidelines — never generic, never invented."
          />
        </div>
      </main>

      <footer className="relative z-10 border-t border-neutral-200 bg-white/60 py-8">
        <p className="mx-auto max-w-2xl px-6 text-center text-xs text-neutral-400">
          HERAI is a health information and risk-awareness support tool. It does not provide
          medical diagnoses and is not a substitute for professional medical care.
        </p>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  iconClass,
  title,
  desc,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">{desc}</p>
    </div>
  );
}
