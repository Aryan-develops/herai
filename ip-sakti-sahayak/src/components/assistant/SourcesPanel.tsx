import { BookMarked, ExternalLink, Globe2, Landmark } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SOURCE_BY_ID } from '../../data/sources'
import { TOPIC_BY_ID } from '../../data/topics'
import { useT } from '../../i18n/useT'
import { cn, formatDate } from '../../lib/utils'
import { useActiveConversation, useAppStore } from '../../store/useAppStore'
import type { Source } from '../../types'
import { SourceTypeBadge } from '../SourceTypeBadge'
import { EmptyState } from '../ui/primitives'

/** Lists the sources behind the selected answer. The cited source is highlighted and scrolled into view. */
export function SourcesPanel({ onOpen }: { onOpen: (s: Source) => void }) {
  const t = useT()
  const convo = useActiveConversation()
  const { selectedMessageId, highlightedCitation, jurisdiction, selectCitation } = useAppStore()
  const itemRefs = useRef<Record<number, HTMLLIElement | null>>({})

  const message = convo?.messages.find((m) => m.id === selectedMessageId)
  const topicId = message?.role === 'assistant' && message.kind === 'answer' ? message.topicId : undefined
  const answer = topicId ? TOPIC_BY_ID[topicId].answers[jurisdiction] : undefined
  const india = jurisdiction === 'india'

  useEffect(() => {
    if (highlightedCitation) {
      itemRefs.current[highlightedCitation]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [highlightedCitation, selectedMessageId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <BookMarked className="h-4 w-4 text-primary" aria-hidden />
          {t('assistant.sources')}
        </h2>
        {answer && (
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', india ? 'text-primary' : 'text-intl')}>
            {india ? <Landmark className="h-3.5 w-3.5" aria-hidden /> : <Globe2 className="h-3.5 w-3.5" aria-hidden />}
            {india ? t('juris.india') : t('juris.international')}
          </span>
        )}
      </div>

      {!answer ? (
        <EmptyState
          icon={BookMarked}
          title="No answer selected"
          body="Sources for an answer appear here. Select a citation number in any answer to jump to its source."
        />
      ) : (
        <ol className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-3" aria-label={`Sources for: ${answer.title}`}>
          {answer.citations.map((id, i) => {
            const s = SOURCE_BY_ID[id]
            const n = i + 1
            const active = highlightedCitation === n
            return (
              <li
                key={`${selectedMessageId}-${jurisdiction}-${id}`}
                ref={(el) => {
                  itemRefs.current[n] = el
                }}
                className={cn(
                  'rounded-xl border bg-surface p-3.5 transition-all duration-300',
                  active ? 'cite-flash border-accent bg-accent-soft/50 shadow-sm' : 'border-line',
                )}
              >
                <button
                  type="button"
                  onClick={() => selectCitation(selectedMessageId!, n)}
                  className="flex w-full cursor-pointer items-start gap-3 text-left"
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      'grid h-6 min-w-6 place-items-center rounded-md text-[11px] font-bold tabular-nums',
                      active ? 'bg-accent text-[#2b1d00]' : india ? 'bg-primary-soft text-primary-soft-text' : 'bg-intl-soft text-intl-text',
                    )}
                  >
                    {n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-ink">{s.shortName}</span>
                    <span className="mt-0.5 block text-xs text-muted">{s.provision}</span>
                  </span>
                </button>
                <p className={cn('mt-2.5 text-xs leading-relaxed text-muted', active ? '' : 'line-clamp-3')}>{s.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SourceTypeBadge type={s.type} />
                  <span className="text-[11px] text-subtle">Version {formatDate(s.versionDate)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(s)}
                    className="h-9 cursor-pointer rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
                  >
                    Details
                  </button>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                  >
                    Official text <ExternalLink className="h-3 w-3" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
