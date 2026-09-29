import { AlertTriangle, Biohazard, ChevronDown, ClipboardCheck, Leaf, Plane, RotateCcw, Route, ShieldCheck, Table2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SourceDrawer } from '../components/SourceDrawer'
import { Badge, Button, Card, ErrorState, OptionCard, PageHeader, Skeleton } from '../components/ui/primitives'
import { Wizard, type WizardStep } from '../components/Wizard'
import {
  CATEGORIES,
  COMPARISON_ROWS,
  ORIGIN_OPTIONS,
  type CategoryId,
  type ClassifyResult,
  type ExportPlan,
  type Origin,
  type YesNo,
} from '../data/classify'
import { SOURCE_BY_ID } from '../data/sources'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/utils'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import type { Source } from '../types'

export default function ClassifyPage() {
  const [step, setStep] = useState(0)
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [claim, setClaim] = useState<YesNo | null>(null)
  const [exportPlan, setExportPlan] = useState<ExportPlan | null>(null)
  const result = useAsync(api.classifyProduct)
  const log = useAppStore((s) => s.log)

  const restart = () => {
    setStep(0)
    setOrigin(null)
    setClaim(null)
    setExportPlan(null)
    result.reset()
  }

  const finish = async () => {
    const r = await result.run({ origin: origin!, diseaseClaim: claim!, exportPlan: exportPlan! })
    if (r) log('search', `Classified a product: ${r.category.name}`)
  }

  const steps: WizardStep[] = [
    {
      id: 'origin',
      title: 'Where does the formulation come from?',
      description: 'Pick the option closest to your product. The First Schedule lists the authoritative Ayurveda books.',
      canContinue: !!origin,
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {ORIGIN_OPTIONS.map((o) => (
            <OptionCard key={o.value} name="origin" value={o.value} label={o.label} hint={o.hint} selected={origin === o.value} onSelect={() => setOrigin(o.value)} />
          ))}
        </div>
      ),
    },
    {
      id: 'claim',
      title: 'Will the label claim to treat or prevent a disease?',
      description: 'For example “controls blood sugar” or “prevents joint pain”. Claims like “supports digestion” are not disease claims.',
      canContinue: !!claim,
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard name="claim" value="yes" label="Yes" hint="The label or advertising names a disease or condition it treats or prevents." selected={claim === 'yes'} onSelect={() => setClaim('yes')} />
          <OptionCard name="claim" value="no" label="No" hint="Only general wellness, taste, or grooming statements." selected={claim === 'no'} onSelect={() => setClaim('no')} />
        </div>
      ),
    },
    {
      id: 'export',
      title: 'Do you plan to export?',
      description: 'Exporting adds certificates and changes what you can claim abroad.',
      canContinue: !!exportPlan,
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          <OptionCard name="export" value="no" label="No, India only" selected={exportPlan === 'no'} onSelect={() => setExportPlan('no')} />
          <OptionCard name="export" value="yes" label="Yes" hint="Within the next two years." selected={exportPlan === 'yes'} onSelect={() => setExportPlan('yes')} />
          <OptionCard name="export" value="unsure" label="Not sure yet" selected={exportPlan === 'unsure'} onSelect={() => setExportPlan('unsure')} />
        </div>
      ),
    },
  ]

  const showResult = result.status === 'success' || result.status === 'error' || (result.status === 'loading' && step === steps.length)

  return (
    <>
      <PageHeader
        eyebrow="Classify product"
        title="Which regulatory category is my product in?"
        description="Three questions. You get the likely category, the route to a licence, and what it means for IP and biodiversity rules."
      />

      {!showResult ? (
        <Wizard
          steps={steps}
          current={step}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onRestart={restart}
          onNext={() => {
            if (step < steps.length - 1) setStep(step + 1)
            else {
              setStep(steps.length)
              void finish()
            }
          }}
          finishing={result.status === 'loading'}
        />
      ) : result.status === 'loading' ? (
        <ResultSkeleton />
      ) : result.status === 'error' ? (
        <div className="space-y-4">
          <ErrorState message={result.error.message} onRetry={result.retry} />
          <Button variant="ghost" icon={RotateCcw} onClick={restart}>
            Start again
          </Button>
        </div>
      ) : (
        <Result result={result.data!} onRestart={restart} onBack={() => { result.reset(); setStep(steps.length - 1) }} />
      )}

      <Comparison highlight={result.status === 'success' ? result.data.category.id : undefined} />
    </>
  )
}

function ResultSkeleton() {
  return (
    <Card className="space-y-5 p-6" >
      <div aria-busy="true" aria-label="Working out your category" className="space-y-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </Card>
  )
}

function Result({ result, onRestart, onBack }: { result: ClassifyResult; onRestart: () => void; onBack: () => void }) {
  const { category, extraWatchOut, exportNotes } = result
  const [source, setSource] = useState<Source | null>(null)
  const watch = [...extraWatchOut, ...category.watchOut]

  return (
    <div className="animate-rise space-y-4">
      <Card className="overflow-hidden">
        <div className="relative border-b border-line bg-gradient-to-br from-primary-soft to-surface px-6 py-6">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-accent" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Likely category</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-ink sm:text-3xl">{category.name}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            Regulated by <Badge tone="primary">{category.regulator}</Badge>
          </p>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2">
          <Section icon={Route} title="Regulatory route">
            <p>{category.route}</p>
          </Section>
          <Section icon={ClipboardCheck} title="What you need">
            <ul className="space-y-1.5">
              {category.needs.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          </Section>
          <Section icon={ShieldCheck} title="IP position">
            <p>{category.ip}</p>
          </Section>
          <Section icon={Leaf} title="Biodiversity (ABS) position">
            <p>{category.abs}</p>
            <Link to="/abs" className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline">
              Check your ABS steps
            </Link>
          </Section>
        </div>

        <div className="border-t border-line bg-warn-soft px-6 py-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle className="h-4 w-4 text-accent-text" aria-hidden />
            Watch out
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink">
            {watch.map((w) => (
              <li key={w} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </div>

        {exportNotes.length > 0 && (
          <div className="border-t border-line px-6 py-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Plane className="h-4 w-4 text-intl" aria-hidden />
              If you export
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
              {exportNotes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-intl" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-subtle">Sources</span>
          {category.sources.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setSource(SOURCE_BY_ID[id])}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line pl-1 pr-2.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary"
            >
              <span className="grid h-6 min-w-6 place-items-center rounded-md bg-primary-soft text-[11px] font-bold text-primary-soft-text">{i + 1}</span>
              {SOURCE_BY_ID[id].shortName}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Change my answers
        </Button>
        <Button variant="secondary" icon={RotateCcw} onClick={onRestart}>
          Classify another product
        </Button>
      </div>
      <p className="text-xs text-muted">
        <Biohazard className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
        This is an indicative classification based on your answers, not a regulatory decision. Your State Licensing Authority decides the category.
      </p>
      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof Route; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface px-6 py-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function Comparison({ highlight }: { highlight?: CategoryId }) {
  const [open, setOpen] = useState(false)
  const ids = Object.keys(CATEGORIES) as CategoryId[]
  return (
    <Card className="mt-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="comparison-table"
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <Table2 className="h-5 w-5 text-primary" aria-hidden />
        <span className="flex-1">
          <span className="block font-semibold text-ink">Compare all six categories</span>
          <span className="block text-sm text-muted">Regulator, claims, evidence and patent prospects side by side.</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 text-subtle transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id="comparison-table" className="scrollbar-thin animate-rise overflow-x-auto border-t border-line">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Comparison of Ayurveda product categories</caption>
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="sticky left-0 bg-surface-2 px-4 py-3 font-semibold text-ink" />
                {ids.map((id) => (
                  <th
                    key={id}
                    scope="col"
                    className={cn('px-4 py-3 font-semibold', highlight === id ? 'bg-accent-soft text-accent-text' : 'text-ink')}
                  >
                    {CATEGORIES[id].name}
                    {highlight === id && <span className="sr-only"> (your result)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <th scope="row" className="sticky left-0 bg-surface px-4 py-3 text-left font-medium text-ink">
                    {row.label}
                  </th>
                  {ids.map((id) => (
                    <td key={id} className={cn('px-4 py-3 text-muted', highlight === id && 'bg-accent-soft/50 text-ink')}>
                      {row.values[id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
