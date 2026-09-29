import { SOURCE_BY_ID } from '../data/sources'
import { cn } from '../lib/utils'
import type { Jurisdiction } from '../types'

interface Props {
  index: number
  sourceId: string
  active?: boolean
  jurisdiction: Jurisdiction
  onClick: () => void
}

export function CitationChip({ index, sourceId, active, jurisdiction, onClick }: Props) {
  const source = SOURCE_BY_ID[sourceId]
  const india = jurisdiction === 'india'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Citation ${index}: ${source?.shortName ?? sourceId}. Show in sources panel`}
      title={source?.shortName}
      className={cn(
        'group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border pl-1 pr-2.5 text-xs font-medium transition-all duration-150',
        active
          ? 'border-accent bg-accent-soft text-accent-text shadow-sm'
          : india
            ? 'border-line bg-surface text-muted hover:border-primary/40 hover:text-primary'
            : 'border-line bg-surface text-muted hover:border-intl/40 hover:text-intl',
      )}
    >
      <span
        className={cn(
          'grid h-6 min-w-6 place-items-center rounded-md px-1 text-[11px] font-bold tabular-nums',
          active ? 'bg-accent text-[#2b1d00]' : india ? 'bg-primary-soft text-primary-soft-text' : 'bg-intl-soft text-intl-text',
        )}
      >
        {index}
      </span>
      <span className="max-w-[14rem] truncate">{source?.shortName ?? sourceId}</span>
    </button>
  )
}
