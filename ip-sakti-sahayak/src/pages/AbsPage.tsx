import { CheckCircle2, CircleDashed, Download, Globe2, Info, Landmark, RotateCcw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { JurisdictionToggle } from '../components/JurisdictionToggle'
import { SourceDrawer } from '../components/SourceDrawer'
import { useToast } from '../components/ui/Toast'
import { Badge, Button, Card, ErrorState, OptionCard, PageHeader, Skeleton } from '../components/ui/primitives'
import { Wizard, type WizardStep } from '../components/Wizard'
import {
  ACTOR_OPTIONS,
  CODIFIED_OPTIONS,
  PURPOSE_OPTIONS,
  type AbsAnswers,
  type AbsStep,
  type Actor,
  type Codified,
  type Purpose,
} from '../data/abs'
import { SOURCE_BY_ID } from '../data/sources'
import { useAsync } from '../hooks/useAsync'
import { cn, formatDate } from '../lib/utils'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import type { Jurisdiction, Source } from '../types'

const TAG_META = {
  required: { label: 'Required', tone: 'primary' as const, icon: CheckCircle2 },
  exempt: { label: 'Likely exempt', tone: 'accent' as const, icon: ShieldAlert },
  check: { label: 'Check', tone: 'neutral' as const, icon: CircleDashed },
}

export default function AbsPage() {
  const [step, setStep] = useState(0)
  const [actor, setActor] = useState<Actor | null>(null)
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [codified, setCodified] = useState<Codified | null>(null)
  const [tab, setTab] = useState<Jurisdiction>('india')
  const result = useAsync(api.absChecklist)
  const log = useAppStore((s) => s.log)

  const restart = () => {
    setStep(0)
    setActor(null)
    setPurpose(null)
    setCodified(null)
    result.reset()
  }

  const steps: WizardStep[] = [
    {
      id: 'actor',
      title: 'Who will use the biological resource or knowledge?',
      canContinue: !!actor,
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          {ACTOR_OPTIONS.map((o) => (
            <OptionCard key={o.value} name="actor" value={o.value} label={o.label} hint={o.hint} selected={actor === o.value} onSelect={() => setActor(o.value)} />
          ))}
        </div>
      ),
    },
    {
      id: 'purpose',
      title: 'What is it for?',
      canContinue: !!purpose,
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          {PURPOSE_OPTIONS.map((o) => (
            <OptionCard key={o.value} name="purpose" value={o.value} label={o.label} hint={o.hint} selected={purpose === o.value} onSelect={() => setPurpose(o.value)} />
          ))}
        </div>
      ),
    },
    {
      id: 'codified',
      title: 'Is the knowledge codified, and used as written?',
      description: 'Codified means it is recorded in an authoritative Ayurveda text, such as those in the First Schedule of the Drugs and Cosmetics Act.',
      canContinue: !!codified,
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          {CODIFIED_OPTIONS.map((o) => (
            <OptionCard key={o.value} name="codified" value={o.value} label={o.label} hint={o.hint} selected={codified === o.value} onSelect={() => setCodified(o.value)} />
          ))}
        </div>
      ),
    },
  ]

  const answers: AbsAnswers | null = actor && purpose && codified ? { actor, purpose, codified } : null
  const showResult = step === steps.length

  return (
    <>
      <PageHeader
        eyebrow="Access and benefit sharing"
        title="What do I need before using Indian plants or knowledge?"
        description="Answer three questions to get an ordered checklist under the Biological Diversity Act and, separately, under international rules."
      />

      {!showResult ? (
        <Wizard
          steps={steps}
          current={step}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onRestart={restart}
          finishLabel="Build my checklist"
          onNext={async () => {
            if (step < steps.length - 1) return setStep(step + 1)
            setStep(steps.length)
            const r = await result.run(answers!)
            if (r) log('search', `Built ABS checklist (${actor}, ${purpose}, codified: ${codified})`)
          }}
        />
      ) : result.status === 'error' ? (
        <div className="space-y-4">
          <ErrorState message={result.error.message} onRetry={result.retry} />
          <Button variant="ghost" icon={RotateCcw} onClick={restart}>
            Start again
          </Button>
        </div>
      ) : result.status !== 'success' ? (
        <Card className="space-y-4 p-6">
          <div aria-busy="true" aria-label="Building your checklist" className="space-y-4">
            <Skeleton className="h-10 w-64" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Checklist
          data={result.data}
          answers={answers!}
          tab={tab}
          onTab={setTab}
          onRestart={restart}
          onEdit={() => {
            result.reset()
            setStep(steps.length - 1)
          }}
        />
      )}
    </>
  )
}

function Checklist({
  data,
  answers,
  tab,
  onTab,
  onRestart,
  onEdit,
}: {
  data: Record<Jurisdiction, AbsStep[]>
  answers: AbsAnswers
  tab: Jurisdiction
  onTab: (j: Jurisdiction) => void
  onRestart: () => void
  onEdit: () => void
}) {
  const toast = useToast((s) => s.push)
  const log = useAppStore((s) => s.log)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [source, setSource] = useState<Source | null>(null)
  const steps = data[tab]
  const india = tab === 'india'
  const summary = [
    ACTOR_OPTIONS.find((o) => o.value === answers.actor)!.label,
    PURPOSE_OPTIONS.find((o) => o.value === answers.purpose)!.label,
    CODIFIED_OPTIONS.find((o) => o.value === answers.codified)!.label,
  ]

  const download = () => {
    log('search', `Downloaded ABS checklist (${india ? 'India' : 'International'})`)
    toast('Choose “Save as PDF” in the print dialog.', 'info')
    setTimeout(() => window.print(), 300)
  }

  return (
    <div className="animate-rise space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <JurisdictionToggle value={tab} onChange={onTab} />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onEdit}>
            Change answers
          </Button>
          <Button variant="primary" icon={Download} onClick={download}>
            Download as PDF checklist
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div id="print-area">
          <div className={cn('border-b border-line px-6 py-5', india ? 'bg-primary-soft/60' : 'bg-intl-soft/60')}>
            <p className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider', india ? 'text-primary' : 'text-intl')}>
              {india ? <Landmark className="h-3.5 w-3.5" aria-hidden /> : <Globe2 className="h-3.5 w-3.5" aria-hidden />}
              {india ? 'India: Biological Diversity Act 2002' : 'International: CBD and Nagoya Protocol'}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">Your ABS checklist</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </div>

          <ol className="divide-y divide-line">
            {steps.map((s, i) => {
              const key = `${tab}-${i}`
              const meta = s.tag ? TAG_META[s.tag] : null
              return (
                <li key={key} className="flex gap-4 px-6 py-5">
                  <label className="relative mt-0.5 flex shrink-0 cursor-pointer no-print">
                    <input
                      type="checkbox"
                      checked={!!done[key]}
                      onChange={(e) => setDone((d) => ({ ...d, [key]: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-bold transition-all peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                        done[key] ? 'border-primary bg-primary text-primary-fg' : india ? 'border-primary/40 text-primary' : 'border-intl/40 text-intl',
                      )}
                    >
                      {done[key] ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
                    </span>
                    <span className="sr-only">Mark step {i + 1} as done</span>
                  </label>
                  <span className="hidden font-bold print:inline">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn('font-semibold text-ink', done[key] && 'text-muted line-through')}>{s.title}</h3>
                      {meta && (
                        <Badge tone={meta.tone} icon={meta.icon}>
                          {meta.label}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.detail}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {s.citations.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSource(SOURCE_BY_ID[id])}
                          className="inline-flex h-7 cursor-pointer items-center rounded-md border border-line px-2 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {SOURCE_BY_ID[id].shortName}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="hidden px-6 py-4 text-xs print:block">
            Generated by IP-SAKTI Sahayak (prototype) on {formatDate(new Date().toISOString())}. Information, not legal advice.
          </p>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>
          The 2023 amendment to the Biological Diversity Act changed several exemptions, and new regulations are still being notified. Confirm with the
          National Biodiversity Authority or your State Biodiversity Board before you rely on an exemption.
        </p>
      </div>

      <Button variant="secondary" icon={RotateCcw} onClick={onRestart}>
        Start again
      </Button>
      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  )
}
