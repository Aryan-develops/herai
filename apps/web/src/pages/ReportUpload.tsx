import { useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, Loader2, ShieldAlert, Trash2, Upload } from "lucide-react";
import { api, type HealthProfile, type HealthReportRecord } from "@/lib/api";
import { streamDocumentAnalysis, type DocPipelineEvent } from "@/lib/aiDocument";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

interface StepState {
  agent: string;
  label: string;
  status: "running" | "done";
  duration_ms?: number;
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-sage-100 text-sage-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function StepRow({ step }: { step: StepState }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {step.status === "running" ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-500" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sage-500" />
      )}
      <span className={step.status === "running" ? "text-ink-900" : "text-ink-700/70"}>{step.label}</span>
    </div>
  );
}

export function ReportUpload() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [reports, setReports] = useState<HealthReportRecord[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "saving">("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function refreshReports() {
    api.listReports().then(({ reports }) => setReports(reports)).catch(() => setReports([]));
  }

  async function handleDelete(id: string, fileName: string) {
    if (!window.confirm(`Delete "${fileName}"? This can't be undone.`)) return;
    await api.deleteReport(id).catch(() => {});
    refreshReports();
  }

  useEffect(() => {
    api.getProfile().then(({ profile }) => setProfile(profile)).catch(() => setProfile(null));
    refreshReports();
  }, []);

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type — please upload a PDF, JPG, or PNG.";
    }
    if (file.size > MAX_BYTES) {
      return "File is too large — the limit is 10MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSteps([]);
    setPhase("uploading");

    let finalData: any = null;

    function onEvent(event: DocPipelineEvent) {
      if (event.type === "pipeline_start") {
        setPhase("analyzing");
      } else if (event.type === "agent_step") {
        setSteps((prev) => {
          if (event.status === "start") {
            return [...prev, { agent: event.agent, label: event.label, status: "running" }];
          }
          return prev.map((s) => (s.agent === event.agent ? { ...s, status: "done", duration_ms: event.duration_ms } : s));
        });
      } else if (event.type === "final") {
        finalData = event.data;
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    try {
      await streamDocumentAnalysis(file, profile ?? undefined, onEvent);

      if (!finalData) {
        throw new Error("The analysis pipeline didn't return a result.");
      }

      setPhase("saving");
      const { report } = await api.uploadReport(file, finalData);

      api
        .logAgentExecution({
          triggerType: "document",
          triggerRef: report._id,
          agents: finalData.agent_trace ?? [],
          emergency: Boolean(finalData.emergency),
          riskLevel: finalData.risk_assessment?.risk_level,
        })
        .catch(() => {});

      navigate(`/reports/${report._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing this report.");
      setPhase("idle");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const busy = phase !== "idle";

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Lab reports</h1>
      <p className="mt-1.5 max-w-xl text-ink-700/75">
        Upload a lab report and HERAI explains your values in plain language, flags anything worth a
        clinician's attention, and suggests questions to ask.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "mt-6 rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-12",
          dragActive ? "scale-[1.01] border-brand-400 bg-brand-50" : "border-brand-200 bg-white/70",
          busy && "pointer-events-none opacity-70"
        )}
      >
        <input
          ref={inputRef}
          id="report-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 text-brand-600">
          <Upload className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-ink-900">Drop a report here</p>
        <p className="mt-1 text-sm text-ink-700/70">PDF, JPG or PNG, up to 10MB</p>
        <Button type="button" className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose a file
        </Button>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {busy && (
        <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft" aria-live="polite">
          {phase === "uploading" && (
            <div className="flex items-center gap-2 text-sm text-ink-700/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Uploading…
            </div>
          )}
          {steps.length > 0 && <div className="space-y-1.5">{steps.map((s) => <StepRow key={s.agent} step={s} />)}</div>}
          {phase === "saving" && (
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-700/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Saving to your reports…
            </div>
          )}
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900">Your reports</h2>

        {reports === null && (
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="skeleton h-16 w-full rounded-2xl" />
            <div className="skeleton h-16 w-full rounded-2xl" />
          </div>
        )}

        {reports?.length === 0 && (
          <div className="mt-4 rounded-3xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium text-ink-900">No reports yet</p>
            <p className="mt-1 text-sm text-ink-700/70">Your uploaded reports and their explanations will appear here.</p>
          </div>
        )}

        {reports && reports.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {reports.map((r) => {
              const risk = r.riskAssessment?.risk_level;
              return (
                <li key={r._id} className="group relative flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 pr-2 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift sm:p-4">
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", r.emergency ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-600")}>
                    {r.emergency ? <ShieldAlert className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <Link to={`/reports/${r._id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl">
                    <p className="truncate text-sm font-semibold text-ink-900">{r.fileName}</p>
                    <p className="mt-0.5 text-xs text-ink-700/60">
                      {new Date(r.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </Link>
                  {r.emergency ? (
                    <span className="hidden rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 sm:inline">Urgent</span>
                  ) : risk ? (
                    <span className={cn("hidden rounded-full px-2.5 py-1 text-xs font-semibold capitalize sm:inline", RISK_STYLES[risk] ?? "bg-neutral-100 text-neutral-700")}>
                      {risk} risk
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(r._id, r.fileName)}
                    className="relative z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${r.fileName}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
