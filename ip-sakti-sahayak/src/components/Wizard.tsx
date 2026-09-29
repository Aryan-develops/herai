import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import { Button, Card } from './ui/primitives'

export interface WizardStep {
  id: string
  title: string
  description?: string
  content: ReactNode
  canContinue: boolean
}

interface Props {
  steps: WizardStep[]
  current: number
  onBack: () => void
  onNext: () => void
  onRestart: () => void
  finishLabel?: string
  finishing?: boolean
}

/** Step-by-step question flow with a progress bar and step list. Controlled by the parent. */
export function Wizard({ steps, current, onBack, onNext, onRestart, finishLabel = 'See result', finishing }: Props) {
  const t = useT()
  const step = steps[current]
  const last = current === steps.length - 1
  const headingRef = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)

  // Move focus to the new question so keyboard and screen reader users know it changed.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus()
    mounted.current = true
  }, [current])

  const pct = Math.round(((current + (last && finishing ? 1 : 0)) / steps.length) * 100)

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-surface-2/60 px-5 pb-4 pt-5 sm:px-7">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">
            Step {current + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-muted transition-colors hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t('common.restart')}
          </button>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
        <ol className="mt-4 hidden gap-2 sm:flex" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-2 text-xs" aria-current={i === current ? 'step' : undefined}>
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  i < current ? 'bg-primary text-primary-fg' : i === current ? 'bg-accent text-[#2b1d00]' : 'bg-line text-muted',
                )}
              >
                {i < current ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('truncate', i === current ? 'font-semibold text-ink' : 'text-muted')}>{s.title}</span>
            </li>
          ))}
        </ol>
      </div>

      <fieldset className="px-5 py-6 sm:px-7" key={step.id}>
        <legend className="sr-only">{step.title}</legend>
        <div className="animate-rise">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-ink outline-none">
            {step.title}
          </h2>
          {step.description && <p className="mt-1 text-sm text-muted">{step.description}</p>}
          <div className="mt-5">{step.content}</div>
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack} disabled={current === 0}>
          {t('common.back')}
        </Button>
        <Button variant="primary" onClick={onNext} disabled={!step.canContinue} loading={finishing}>
          {last ? finishLabel : t('common.next')}
          {!finishing && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    </Card>
  )
}
