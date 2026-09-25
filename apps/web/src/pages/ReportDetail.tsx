import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileText, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { api, type HealthReportRecord } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
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
  in_range: "bg-sage-100 text-sage-700",
  below_range: "bg-amber-100 text-amber-700",
  above_range: "bg-amber-100 text-amber-700",
  critical_low: "bg-red-100 text-red-700",
  critical_high: "bg-red-100 text-red-700",
  unparseable: "bg-neutral-100 text-neutral-500",
};

const RISK_STYLES: Record<string, string> = {
  low: "bg-sage-100 text-sage-700",
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
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="my-1 max-w-full overflow-visible" role="img" aria-label="Value trend across reports">
      <path d={path} fill="none" stroke="var(--color-brand-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <Alert tone="error">{error}</Alert>
        <Link to="/reports" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
          Back to reports
        </Link>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div aria-hidden="true" className="space-y-4">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-56 w-full rounded-3xl" />
          <div className="skeleton h-32 w-full rounded-3xl" />
        </div>
        <p className="sr-only">Loading report…</p>
      </AppShell>
    );
  }

  const risk = report.riskAssessment;
  const care = report.carePlan;
  const values = report.extractedValues;
  const inRange = values.filter((v) => v.status === "in_range").length;
  const attention = values.filter((v) => v.status !== "in_range" && v.status !== "unparseable").length;

  async function handleDelete() {
    if (!report || !window.confirm(`Delete "${report.fileName}"? This can't be undone.`)) return;
    await api.deleteReport(report._id);
    navigate("/reports");
  }

  const card = "mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6";

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link to="/reports" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All reports
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-semibold text-ink-900">{report.fileName}</h1>
          <p className="mt-0.5 text-sm text-ink-700/65">
            Uploaded {new Date(report.uploadedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </div>

      {report.emergency && (
        <Alert tone="error" className="mt-5 p-4">
          <p className="font-semibold">This report needs prompt attention</p>
          <p className="mt-1">
            One or more values are significantly outside typical ranges. Please contact a clinician soon rather than
            waiting.
          </p>
        </Alert>
      )}

      {values.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <SummaryStat label="Values" value={values.length} tone="bg-white text-ink-900" />
          <SummaryStat label="In range" value={inRange} tone="bg-sage-50 text-sage-700" />
          <SummaryStat label="Worth a look" value={attention} tone={attention ? "bg-amber-50 text-amber-700" : "bg-white text-ink-900"} />
        </div>
      )}

      {values.length > 0 && (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Extracted lab values</caption>
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-ink-700/60 uppercase">
                  <th scope="col" className="px-4 py-3">Parameter</th>
                  <th scope="col" className="px-4 py-3">Value</th>
                  <th scope="col" className="px-4 py-3">Reference range</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {values.map((v, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-ink-900">{v.parameter}</th>
                    <td className="tabular px-4 py-3 text-ink-700">{v.value !== null ? `${v.value} ${v.unit ?? ""}` : "—"}</td>
                    <td className="tabular px-4 py-3 text-ink-700/70">{v.reference_range ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-2.5 sm:hidden">
            {values.map((v, i) => (
              <li key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink-900">{v.parameter}</p>
                  <StatusPill status={v.status} />
                </div>
                <p className="tabular mt-1 font-display text-xl font-semibold text-ink-900">
                  {v.value !== null ? `${v.value} ${v.unit ?? ""}` : "—"}
                </p>
                <p className="mt-0.5 text-xs text-ink-700/60">Reference: {v.reference_range ?? "—"}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.documentIntelligence && (
        <section className={card} aria-labelledby="explain-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="explain-h" className="font-display text-lg font-semibold text-ink-900">In plain language</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {report.documentIntelligence.confidence} confidence
            </span>
          </div>
          <p className="mt-3 leading-relaxed text-ink-900">{report.documentIntelligence.explanation}</p>
          {report.documentIntelligence.caveats.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-2xl bg-neutral-50 p-3.5">
              {report.documentIntelligence.caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-700/75">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {trends.length > 0 && (
        <section className={card} aria-labelledby="trends-h">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 id="trends-h" className="font-display text-lg font-semibold text-ink-900">Trends</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {trends.map(({ parameter, points, unit }) => (
              <div key={parameter} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                <p className="text-xs font-semibold text-ink-700/70">
                  {parameter} {unit && `(${unit})`}
                </p>
                <TrendChart points={points} />
                <p className="tabular text-xs text-ink-700/60">
                  {points[0].value} → {points[points.length - 1].value} across {points.length} reports
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {risk && (
        <section className={card} aria-labelledby="risk-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="risk-h" className="font-display text-lg font-semibold text-ink-900">Risk assessment</h2>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[risk.risk_level] ?? "bg-neutral-100 text-neutral-700")}>
              {risk.risk_level} risk
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {risk.factors.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-ink-800">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", f.impact === "increases" ? "bg-orange-500" : f.impact === "decreases" ? "bg-sage-500" : "bg-neutral-300")} aria-hidden="true" />
                {f.factor}
                <span className="sr-only"> ({f.impact})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {care && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <CareColumn title="Today" items={care.today} accent="bg-brand-100 text-brand-700" />
          <CareColumn title="This week" items={care.this_week} accent="bg-violet-100 text-violet-700" />
          <CareColumn title="Ask your clinician" items={care.discuss_with_clinician} accent="bg-sage-100 text-sage-700" />
        </div>
      )}

      {report.questionsToAsk.length > 0 && (
        <section className="mt-6 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/70 p-5 shadow-soft sm:p-6" aria-labelledby="q-h">
          <h2 id="q-h" className="font-display text-lg font-semibold text-ink-900">Questions to ask your doctor</h2>
          <ul className="mt-3 space-y-2">
            {report.questionsToAsk.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-900">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">{i + 1}</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6">
        <SourcesList sources={report.sources ?? []} />
      </div>
    </AppShell>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn("rounded-2xl border border-neutral-200 p-3.5 text-center shadow-soft", tone)}>
      <p className="tabular font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

function CareColumn({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
      <h3 className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-semibold", accent)}>{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-ink-900">{item}</li>
        ))}
      </ul>
    </section>
  );
}
