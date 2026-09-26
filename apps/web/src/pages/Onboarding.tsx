import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, HeartPulse, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, type HealthProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Basics", heading: "Tell us the basics", blurb: "Helps Lunee tailor insight to your body." },
  { title: "Cycle", heading: "Your cycle", blurb: "Optional, but it powers your phase and period predictions." },
  { title: "Health", heading: "Lifestyle & health", blurb: "Context our agents use to ground their advice. It stays private to you." },
] as const;

const DISCLAIMER =
  "Lunee provides health information and risk-awareness support. It does not diagnose conditions and is not a substitute for professional medical care. If you're worried, please consult a licensed clinician.";

interface FormState {
  ageRange: string;
  heightCm: string;
  weightKg: string;
  cycleLengthDays: string;
  lastPeriodStart: string;
  exerciseFrequency: HealthProfile["lifestyle"]["exerciseFrequency"];
  alcohol: HealthProfile["lifestyle"]["alcohol"];
  smoker: boolean;
  sleepHoursAvg: string;
  knownConditions: string[];
  medications: string[];
  allergies: string[];
}

const initialState: FormState = {
  ageRange: "",
  heightCm: "",
  weightKg: "",
  cycleLengthDays: "",
  lastPeriodStart: "",
  exerciseFrequency: "none",
  alcohol: "none",
  smoker: false,
  sleepHoursAvg: "",
  knownConditions: [],
  medications: [],
  allergies: [],
};

export function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  // Someone who already finished onboarding is editing their profile from Settings: prefill it and skip the disclaimer.
  const editing = !!user?.onboardingComplete;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [acknowledged, setAcknowledged] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api
      .getProfile()
      .then(({ profile: p }) =>
        setForm({
          ageRange: p.ageRange ?? "",
          heightCm: p.heightCm ? String(p.heightCm) : "",
          weightKg: p.weightKg ? String(p.weightKg) : "",
          cycleLengthDays: p.cycleLengthDays ? String(p.cycleLengthDays) : "",
          lastPeriodStart: p.lastPeriodStart ? p.lastPeriodStart.slice(0, 10) : "",
          exerciseFrequency: p.lifestyle?.exerciseFrequency ?? "none",
          alcohol: p.lifestyle?.alcohol ?? "none",
          smoker: p.lifestyle?.smoker ?? false,
          sleepHoursAvg: p.lifestyle?.sleepHoursAvg ? String(p.lifestyle.sleepHoursAvg) : "",
          knownConditions: p.knownConditions ?? [],
          medications: p.medications ?? [],
          allergies: p.allergies ?? [],
        }),
      )
      .catch(() => {});
  }, [editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function finish() {
    setError(null);
    setSubmitting(true);
    try {
      await api.updateProfile({
        ageRange: form.ageRange || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        cycleLengthDays: form.cycleLengthDays ? Number(form.cycleLengthDays) : undefined,
        lastPeriodStart: form.lastPeriodStart || undefined,
        knownConditions: form.knownConditions,
        medications: form.medications,
        allergies: form.allergies,
        lifestyle: {
          smoker: form.smoker,
          alcohol: form.alcohol,
          exerciseFrequency: form.exerciseFrequency,
          sleepHoursAvg: form.sleepHoursAvg ? Number(form.sleepHoursAvg) : undefined,
        },
      });
      await refreshUser();
      navigate(editing ? "/settings" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-neutral-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-100 opacity-70 blur-3xl" />
        <div className="absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-violet-100 opacity-70 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
            <HeartPulse className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          Lunee
        </div>

        <ol className="mb-8 flex items-center" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.title} className="flex flex-1 items-center last:flex-none" aria-current={active ? "step" : undefined}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      done && "bg-brand-500 text-white",
                      active && "bg-brand-100 text-brand-700 ring-2 ring-brand-500",
                      !done && !active && "bg-neutral-200 text-neutral-500"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={cn("hidden text-sm font-medium sm:inline", active ? "text-ink-900" : "text-neutral-500")}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("mx-3 h-0.5 flex-1 rounded-full", done ? "bg-brand-500" : "bg-neutral-200")} />
                )}
              </li>
            );
          })}
        </ol>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-medium tracking-wide text-brand-600 uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">{current.heading}</h1>
          <p className="mt-1 text-sm text-ink-700/75">{current.blurb}</p>

          <div className="mt-6 space-y-5">
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ageRange">Age range</Label>
                  <Select id="ageRange" value={form.ageRange} onChange={(e) => update("ageRange", e.target.value)}>
                    <option value="">Select…</option>
                    {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" inputMode="numeric" value={form.heightCm} onChange={(e) => update("heightCm", e.target.value)} placeholder="165" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" type="number" inputMode="numeric" value={form.weightKg} onChange={(e) => update("weightKg", e.target.value)} placeholder="60" />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cycleLength">Average cycle length (days)</Label>
                  <Input id="cycleLength" type="number" inputMode="numeric" value={form.cycleLengthDays} onChange={(e) => update("cycleLengthDays", e.target.value)} placeholder="28" aria-describedby="cycle-hint" />
                  <p id="cycle-hint" className="text-xs text-neutral-500">
                    Not sure? Leave it blank. Lunee learns it from your logs.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastPeriod">First day of your last period</Label>
                  <Input id="lastPeriod" type="date" max={new Date().toISOString().slice(0, 10)} value={form.lastPeriodStart} onChange={(e) => update("lastPeriodStart", e.target.value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="exercise">Exercise</Label>
                    <Select id="exercise" value={form.exerciseFrequency} onChange={(e) => update("exerciseFrequency", e.target.value as FormState["exerciseFrequency"])}>
                      <option value="none">None</option>
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="active">Active</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sleep">Avg. sleep (hrs)</Label>
                    <Input id="sleep" type="number" inputMode="decimal" value={form.sleepHoursAvg} onChange={(e) => update("sleepHoursAvg", e.target.value)} placeholder="7" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conditions">Known conditions</Label>
                  <TagInput id="conditions" values={form.knownConditions} onChange={(v) => update("knownConditions", v)} placeholder="Type and press Enter, e.g. PCOS" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meds">Medications</Label>
                  <TagInput id="meds" values={form.medications} onChange={(v) => update("medications", v)} placeholder="Type and press Enter" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="allergies">Allergies</Label>
                  <TagInput id="allergies" values={form.allergies} onChange={(v) => update("allergies", v)} placeholder="Type and press Enter" />
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <div className="flex items-start gap-2.5 text-sm text-ink-800">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
                    <p>{DISCLAIMER}</p>
                  </div>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm font-medium text-ink-900">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-neutral-300 accent-brand-600"
                    />
                    I understand Lunee does not provide medical diagnoses.
                  </label>
                </div>
              </>
            )}
          </div>

          {error && <Alert tone="error" className="mt-5">{error}</Alert>}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            {isLastStep ? (
              <Button onClick={finish} disabled={submitting || !acknowledged}>
                {submitting && <Spinner />}
                {submitting ? "Saving…" : editing ? "Save changes" : "Finish"}
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
