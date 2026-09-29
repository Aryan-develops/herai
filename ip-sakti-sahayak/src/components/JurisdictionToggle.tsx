import { Globe2, Landmark } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import type { Jurisdiction } from '../types'

interface Props {
  value: Jurisdiction
  onChange: (j: Jurisdiction) => void
  size?: 'md' | 'lg'
  className?: string
}

/** Segmented radio group. Arrow keys move between options, as with native radios. */
export function JurisdictionToggle({ value, onChange, size = 'md', className }: Props) {
  const t = useT()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const options: { value: Jurisdiction; label: string; icon: typeof Globe2 }[] = [
    { value: 'india', label: t('juris.india'), icon: Landmark },
    { value: 'international', label: t('juris.international'), icon: Globe2 },
  ]

  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const next: Jurisdiction = value === 'india' ? 'international' : 'india'
    onChange(next)
    refs.current[next === 'india' ? 0 : 1]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('juris.label')}
      onKeyDown={onKey}
      className={cn('relative inline-grid grid-cols-2 rounded-xl border border-line bg-surface-2 p-1', className)}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out',
          value === 'india' ? 'translate-x-0 bg-primary' : 'translate-x-full bg-intl',
        )}
      />
      {options.map((o, i) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200',
              size === 'lg' ? 'h-11 px-5 text-sm sm:min-w-40' : 'h-9 px-3.5 text-sm',
              active ? (o.value === 'india' ? 'text-primary-fg' : 'text-white dark:text-slate-950') : 'text-muted hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
