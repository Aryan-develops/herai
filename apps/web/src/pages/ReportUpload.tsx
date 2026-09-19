import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, Loader2, ShieldAlert, Trash2, Upload } from "lucide-react";
import { api, type HealthProfile, type HealthReportRecord } from "@/lib/api";
import { streamDocumentAnalysis, type DocPipelineEvent } from "@/lib/aiDocument";
import { AppShell } from "@/components/AppShell";
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
  low: "bg-emerald-100 text-emerald-700",
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
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
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
      <div className="flex items-center gap-2 text-xs font-medium text-brand-600">
        <FileText className="h-3.5 w-3.5" />
        Phase 4 · Document Intelligence
      </div>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">Lab reports</h1>
      <p className="mt-1 max-w-xl text-ink-700/70">
        Upload a lab report (PDF, JPG, or PNG) and the same agent pipeline that powers chat — Document
        Intelligence, Women's Health, Risk Assessment, and the Safety gate — reasons over your actual values.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragActive ? "border-brand-400 bg-brand-50/50" : "border-neutral-300 bg-white/60",
          busy && "pointer-events-none opacity-70"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 text-brand-500" />
        <p className="mt-3 font-medium text-ink-900">Drag & drop a report here, or click to browse</p>
        <p className="mt-1 text-xs text-ink-700/50">PDF, JPG, or PNG — up to 10MB</p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {busy && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          {phase === "uploading" && (
            <div className="flex items-center gap-2 text-sm text-ink-700/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </div>
          )}
          {steps.length > 0 && <div className="space-y-1.5">{steps.map((s) => <StepRow key={s.agent} step={s} />)}</div>}
          {phase === "saving" && (
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-700/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving to your reports…
            </div>
          )}
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink-900">Your reports</h2>

        {reports === null && <p className="mt-4 text-sm text-ink-700/60">Loading…</p>}

        {reports?.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center">
            <p className="text-ink-700/70">No reports uploaded yet.</p>
          </div>
        )}

        {reports && reports.length > 0 && (
          <div className="mt-4 space-y-2">
            {reports.map((r) => {
              const risk = r.riskAssessment?.risk_level;
              return (
                <div
                  key={r._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/reports/${r._id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/reports/${r._id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:border-brand-300"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", r.emergency ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-600")}>
                    {r.emergency ? <ShieldAlert className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{r.fileName}</p>
                    <p className="text-xs text-ink-700/50">
                      {new Date(r.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  {r.emergency ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Urgent</span>
                  ) : risk ? (
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[risk] ?? "bg-neutral-100 text-neutral-700")}>
                      {risk} risk
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r._id, r.fileName);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete ${r.fileName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
