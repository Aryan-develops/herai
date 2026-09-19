import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, HeartPulse } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, type HealthProfile } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";

const STEPS = ["Basics", "Cycle", "Lifestyle & health"] as const;

interface FormState {
  ageRange: string;
  heightCm: string;
  weightKg: string;
  cycleLengthDays: string;
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
  exerciseFrequency: "none",
  alcohol: "none",
  smoker: false,
  sleepHoursAvg: "",
  knownConditions: [],
  medications: [],
  allergies: [],
};

export function Onboarding() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          HERAI
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-ink-700/60">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-900">Tell us the basics</h2>
                <p className="mt-1 text-sm text-ink-700/70">Helps personalize insight to your body.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Age range</Label>
                <Select value={form.ageRange} onChange={(e) => update("ageRange", e.target.value)}>
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
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={form.heightCm}
                    onChange={(e) => update("heightCm", e.target.value)}
                    placeholder="165"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={form.weightKg}
                    onChange={(e) => update("weightKg", e.target.value)}
                    placeholder="60"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-900">Your cycle</h2>
                <p className="mt-1 text-sm text-ink-700/70">
                  Optional, but powers cycle-aware insights later.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Average cycle length (days)</Label>
                <Input
                  type="number"
                  value={form.cycleLengthDays}
                  onChange={(e) => update("cycleLengthDays", e.target.value)}
                  placeholder="28"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-900">Lifestyle & health</h2>
                <p className="mt-1 text-sm text-ink-700/70">
                  Context our agents use to ground their reasoning — never shared, always yours.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Exercise frequency</Label>
                  <Select
                    value={form.exerciseFrequency}
                    onChange={(e) =>
                      update("exerciseFrequency", e.target.value as FormState["exerciseFrequency"])
                    }
                  >
                    <option value="none">None</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Avg. sleep (hrs)</Label>
                  <Input
                    type="number"
                    value={form.sleepHoursAvg}
                    onChange={(e) => update("sleepHoursAvg", e.target.value)}
                    placeholder="7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Known conditions</Label>
                <TagInput
                  values={form.knownConditions}
                  onChange={(v) => update("knownConditions", v)}
                  placeholder="Type and press Enter"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Medications</Label>
                <TagInput
                  values={form.medications}
                  onChange={(v) => update("medications", v)}
                  placeholder="Type and press Enter"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Allergies</Label>
                <TagInput
                  values={form.allergies}
                  onChange={(v) => update("allergies", v)}
                  placeholder="Type and press Enter"
                />
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="mt-7 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isLastStep ? (
              <Button onClick={finish} disabled={submitting}>
                {submitting ? "Saving…" : "Finish"}
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
