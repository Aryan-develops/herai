import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileText, ShieldAlert, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { api, type HealthReportRecord } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SourcesList } from "@/components/SourcesList";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  in_range: "Normal",
  below_range: "Below range",
  above_range: "Above range",
  critical_low: "Critically low",
  critical_high: "Critically high",
  unparseable: "Could not parse",
};

const STATUS_STYLE: Record<string, string> = {
  in_range: "bg-emerald-100 text-emerald-700",
  below_range: "bg-amber-100 text-amber-700",
  above_range: "bg-amber-100 text-amber-700",
  critical_low: "bg-red-100 text-red-700",
  critical_high: "bg-red-100 text-red-700",
  unparseable: "bg-neutral-100 text-neutral-500",
};

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[status] ?? "bg-neutral-100 text-neutral-500")}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function TrendChart({ points }: { points: { date: string; value: number }[] }) {
  const width = 260;
  const height = 64;
  const padding = 8;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke="var(--color-brand-500, #a855f7)" strokeWidth="2" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3" className="fill-brand-500" />
          <title>{`${new Date(c.date).toLocaleDateString()}: ${c.value}`}</title>
        </g>
      ))}
    </svg>
  );
}

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<HealthReportRecord | null>(null);
  const [allReports, setAllReports] = useState<HealthReportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getReport(id)
      .then(({ report }) => setReport(report))
      .catch(() => setError("Couldn't load this report."));
    api
      .listReports()
      .then(({ reports }) => setAllReports(reports))
      .catch(() => {});
  }, [id]);

  const trends = useMemo(() => {
    if (!report) return [];
    const currentParams = new Set(report.extractedValues.filter((v) => v.value !== null).map((v) => v.parameter));
    const byParam = new Map<string, { date: string; value: number }[]>();

    for (const r of allReports) {
      for (const v of r.extractedValues) {
        if (v.value === null || !currentParams.has(v.parameter)) continue;
        const list = byParam.get(v.parameter) ?? [];
        list.push({ date: r.uploadedAt, value: v.value });
        byParam.set(v.parameter, list);
      }
    }

    return Array.from(byParam.entries())
      .filter(([, points]) => points.length >= 2)
      .map(([parameter, points]) => ({
        parameter,
        points: points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        unit: report.extractedValues.find((v) => v.parameter === parameter)?.unit ?? "",
      }));
  }, [report, allReports]);

  if (error) {
    return (
      <AppShell>
        <p className="text-red-600">{error}</p>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <p className="text-ink-700/60">Loading…</p>
      </AppShell>
    );
  }

  const risk = report.riskAssessment;
  const care = report.carePlan;

  async function handleDelete() {
    if (!report || !window.confirm(`Delete "${report.fileName}"? This can't be undone.`)) return;
    await api.deleteReport(report._id);
    navigate("/reports");
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          All reports
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-600">
        <FileText className="h-3.5 w-3.5" />
        Document Intelligence
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">{report.fileName}</h1>
      <p className="mt-1 text-sm text-ink-700/60">
        Uploaded {new Date(report.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {report.emergency && (
        <div className="mt-5 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">The Safety Agent flagged this report as urgent</p>
            <p className="mt-1 text-sm text-red-700">
              One or more values on this report are significantly outside typical ranges. Please seek prompt medical
              attention rather than waiting.
            </p>
          </div>
        </div>
      )}

      {report.extractedValues.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-semibold tracking-wide text-ink-700/50 uppercase">
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Reference range</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.extractedValues.map((v, i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{v.parameter}</td>
                  <td className="px-4 py-3 text-ink-700">{v.value !== null ? `${v.value} ${v.unit ?? ""}` : "—"}</td>
                  <td className="px-4 py-3 text-ink-700/70">{v.reference_range ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.documentIntelligence && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900">AI explanation</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3 w-3" />
              {report.documentIntelligence.confidence} confidence
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-900">{report.documentIntelligence.explanation}</p>
          {report.documentIntelligence.caveats.length > 0 && (
            <ul className="mt-3 space-y-1">
              {report.documentIntelligence.caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-ink-700/60">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {trends.length > 0 && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="font-display font-semibold text-ink-900">Trends</h2>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {trends.map(({ parameter, points, unit }) => (
              <div key={parameter} className="rounded-xl border border-neutral-100 p-3">
                <p className="text-xs font-semibold text-ink-700/60">
                  {parameter} {unit && `(${unit})`}
                </p>
                <TrendChart points={points} />
                <p className="text-xs text-ink-700/50">
                  {points[0].value} → {points[points.length - 1].value} across {points.length} reports
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {risk && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900">Risk assessment</h2>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[risk.risk_level] ?? "bg-neutral-100 text-neutral-700")}>
              {risk.risk_level} risk
            </span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {risk.factors.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink-700/80">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", f.impact === "increases" ? "bg-orange-500" : f.impact === "decreases" ? "bg-emerald-500" : "bg-neutral-300")} />
                {f.factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {care && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <h3 className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">Today</h3>
            <ul className="mt-2 space-y-1.5">
              {care.today.map((item, i) => (
                <li key={i} className="text-sm text-ink-900">• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <h3 className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">This week</h3>
            <ul className="mt-2 space-y-1.5">
              {care.this_week.map((item, i) => (
                <li key={i} className="text-sm text-ink-900">• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <h3 className="text-xs font-semibold tracking-wide text-ink-700/60 uppercase">Discuss with clinician</h3>
            <ul className="mt-2 space-y-1.5">
              {care.discuss_with_clinician.map((item, i) => (
                <li key={i} className="text-sm text-ink-900">• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {report.questionsToAsk.length > 0 && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
          <h2 className="font-display font-semibold text-ink-900">Questions to ask your doctor</h2>
          <ul className="mt-2 space-y-1.5">
            {report.questionsToAsk.map((q, i) => (
              <li key={i} className="text-sm text-ink-900">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <SourcesList sources={report.sources ?? []} />
      </div>
    </AppShell>
  );
}
