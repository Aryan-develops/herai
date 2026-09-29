import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'
import type { Confidence } from '../types'

const FILL = {
  high: 'bg-emerald-600 dark:bg-emerald-400',
  medium: 'bg-amber-500 dark:bg-amber-400',
  low: 'bg-red-600 dark:bg-red-400',
}

/** Five-segment meter. The level is always written out, so colour is never the only signal. */
export function ConfidenceBar({ confidence, className }: { confidence: Confidence; className?: string }) {
  const t = useT()
  const label = t(`confidence.${confidence.level}`)
  return (
    <div className={cn('flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3', className)}>
      <div className="flex items-center gap-2.5">
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={confidence.score}
          aria-valuetext={`${label}, ${confidence.score} of 5`}
          className="flex gap-1"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn('h-2 w-5 rounded-full transition-colors', i <= confidence.score ? FILL[confidence.level] : 'bg-line')}
            />
          ))}
        </div>
        <span className="whitespace-nowrap text-xs font-semibold text-ink">{label}</span>
      </div>
      <span className="text-xs leading-snug text-muted">{confidence.reason}</span>
    </div>
  )
}
