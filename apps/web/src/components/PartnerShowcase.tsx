import { Link } from "react-router-dom";
import { ArrowRight, Check, Gift, Link2, MessageCircleHeart, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: Link2, title: "Invite", desc: "Share a short code or a link. You can also accept a request from them." },
  { icon: ShieldCheck, title: "You choose", desc: "Pick exactly what's shared: phase, mood, predictions. Pause or stop any time." },
  { icon: MessageCircleHeart, title: "They show up", desc: "Simple daily ideas on what to do, say and avoid, timed to your cycle." },
];

/** Marketing block for partner mode. The card is a static sample, clearly labelled as such. */
export function PartnerShowcase() {
  return (
    <section aria-labelledby="couples-heading" className="mt-20 text-left">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          For couples · coming soon
        </span>
        <h2 id="couples-heading" className="mt-4 font-display text-3xl font-medium text-ink-900 sm:text-4xl">
          Better together
        </h2>
        <p className="mt-3 text-ink-700/80">
          Let someone who cares understand where you are in your cycle, and know how to show up for you. Private by
          default. Entirely your call.
        </p>
      </div>

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <ol className="space-y-5">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-ink-900">
                  <span className="tabular mr-2 text-brand-500">{i + 1}.</span>
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-ink-700/75">{desc}</p>
              </div>
            </li>
          ))}

          <li className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-ink-700/80">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-sage-500" aria-hidden="true" /> 14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-sage-500" aria-hidden="true" /> Partner supports HERAI for ₹100/month
            </span>
            <span className="flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-brand-500" aria-hidden="true" /> Gift a subscription
            </span>
          </li>
        </ol>

        <figure className="relative mx-auto w-full max-w-sm" aria-label="Sample of what a partner sees">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/60 to-violet-200/60 blur-2xl" aria-hidden="true" />
          <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-4 shadow-lift">
            <div className="rounded-2xl bg-gradient-to-br from-peach-400 to-peach-600 p-5 text-white">
              <p className="text-[11px] font-medium tracking-wide text-white/85 uppercase">Priya · today</p>
              <p className="mt-1 font-display text-2xl font-semibold">PMS window</p>
              <p className="mt-1 text-sm text-white/90">Period likely in about 3 days. She may be more tired or sensitive.</p>
            </div>

            <div className="mt-4 space-y-3">
              <SampleRow tone="bg-sage-100 text-sage-700" label="Do" text="Take something off her plate tonight, like dinner or errands." />
              <SampleRow tone="bg-violet-100 text-violet-700" label="Say" text={'"No pressure today. Want me to handle it?"'} />
              <SampleRow tone="bg-red-100 text-red-700" label="Avoid" text={'"You\'re just hormonal."'} />
            </div>
          </div>
          <figcaption className="mt-3 text-center text-xs text-neutral-500">Sample preview. She controls what's shared.</figcaption>
        </figure>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link to="/register">
          <Button size="lg">
            Start with your own account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <p className="text-sm text-neutral-500">Partner invites open soon. Join now and be first.</p>
      </div>
    </section>
  );
}

function SampleRow({ tone, label, text }: { tone: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
      <p className="text-sm text-ink-800">{text}</p>
    </div>
  );
}
