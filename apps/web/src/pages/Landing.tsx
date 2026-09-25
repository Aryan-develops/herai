import { Link } from "react-router-dom";
import { ArrowRight, Droplet, HeartPulse, MessageCircleHeart, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const PHASES = [
  { name: "Period", tone: "bg-brand-100 text-brand-700", dot: "bg-brand-500" },
  { name: "Follicular", tone: "bg-sage-100 text-sage-700", dot: "bg-sage-500" },
  { name: "Ovulation", tone: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { name: "Luteal", tone: "bg-peach-100 text-peach-600", dot: "bg-peach-400" },
];

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-neutral-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float-slow absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-brand-200 to-peach-400/40 opacity-70 blur-3xl" />
        <div className="animate-float-slower absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-violet-100 to-violet-400/30 opacity-70 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
              <HeartPulse className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            HERAI
          </div>
          <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pt-14 pb-24 text-center sm:px-6 sm:pt-20">
        <div className="animate-fade-up mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-brand-700 shadow-soft">
          <Droplet className="h-3.5 w-3.5" aria-hidden="true" />
          Cycle tracking that actually understands you
        </div>

        <h1 className="animate-fade-up font-display text-4xl leading-[1.1] font-medium tracking-tight text-ink-900 [animation-delay:80ms] sm:text-6xl">
          Understand your body,{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent">
            not just your period
          </span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-ink-700/80 [animation-delay:160ms]">
          Log how you feel, see where you are in your cycle, and get personalised, grounded guidance from a team
          of specialist AI — that knows exactly when it's time to see a clinician.
        </p>

        <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms] sm:gap-4">
          <Link to="/register">
            <Button size="lg" className="shadow-lift">
              Create your free account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              I already have an account
            </Button>
          </Link>
        </div>

        <ul
          aria-label="Cycle phases HERAI tracks"
          className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-2 [animation-delay:300ms]"
        >
          {PHASES.map((p) => (
            <li key={p.name} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${p.tone}`}>
              <span className={`h-2 w-2 rounded-full ${p.dot}`} aria-hidden="true" />
              {p.name}
            </li>
          ))}
        </ul>

        <div className="animate-fade-up mt-20 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4 [animation-delay:360ms]">
          <Feature
            icon={<Droplet className="h-5 w-5" />}
            iconClass="bg-brand-100 text-brand-600"
            title="Cycle intelligence"
            desc="Period, fertile window and phase predictions built from your own logs."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            iconClass="bg-violet-100 text-violet-600"
            title="Multi-agent reasoning"
            desc="Specialist agents for symptoms, risk and care planning work together."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            iconClass="bg-sage-100 text-sage-700"
            title="Safety-first triage"
            desc="Every question is screened first; urgent signs point you to real care."
          />
          <Feature
            icon={<MessageCircleHeart className="h-5 w-5" />}
            iconClass="bg-peach-100 text-peach-600"
            title="Actually personal"
            desc="Grounded in your history and trusted medical guidance — never invented."
          />
        </div>

        <section
          aria-labelledby="couples-heading"
          className="animate-fade-up mt-16 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-8 text-left shadow-soft [animation-delay:420ms] sm:p-10"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="couples-heading" className="font-display text-2xl font-semibold text-ink-900">
                Better together
              </h2>
              <p className="mt-2 max-w-2xl text-ink-700/80">
                Coming soon: invite a partner to understand where you are in your cycle — and get simple,
                thoughtful ideas for how to support you. You choose what's shared, and can stop any time.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-neutral-200 bg-white/60 py-8">
        <p className="mx-auto max-w-2xl px-6 text-center text-xs text-neutral-500">
          HERAI is a health information and risk-awareness support tool. It does not provide medical diagnoses
          and is not a substitute for professional medical care.
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
    <div className="group rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-soft backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700/75">{desc}</p>
    </div>
  );
}
