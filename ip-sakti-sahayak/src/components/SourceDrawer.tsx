import { CalendarDays, ExternalLink, FileText, Globe2, Landmark, RefreshCw } from 'lucide-react'
import { formatDate } from '../lib/utils'
import type { Source } from '../types'
import { Overlay } from './ui/Overlay'
import { Badge } from './ui/primitives'
import { SourceTypeBadge } from './SourceTypeBadge'

export function SourceDrawer({ source, onClose }: { source: Source | null; onClose: () => void }) {
  return (
    <Overlay
      open={!!source}
      onClose={onClose}
      placement="right"
      size="md"
      title={source?.shortName ?? ''}
      description={source?.name}
      footer={
        source && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
          >
            Open official source
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )
      }
    >
      {source && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <SourceTypeBadge type={source.type} />
            {source.jurisdiction === 'india' ? (
              <Badge tone="primary" icon={Landmark}>India</Badge>
            ) : (
              <Badge tone="intl" icon={Globe2}>International</Badge>
            )}
          </div>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Plain-language summary</h3>
            <p className="text-[15px] leading-relaxed text-ink">{source.summary}</p>
          </section>

          <dl className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
            <div className="flex gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div>
                <dt className="text-subtle">Provisions used</dt>
                <dd className="font-medium text-ink">{source.provision}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div>
                <dt className="text-subtle">Version in force from</dt>
                <dd className="font-medium text-ink">{formatDate(source.versionDate)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div>
                <dt className="text-subtle">Corpus entry last checked</dt>
                <dd className="font-medium text-ink">{formatDate(source.lastUpdated)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div>
                <dt className="text-subtle">Publisher</dt>
                <dd className="font-medium text-ink">{source.publisher}</dd>
              </div>
            </div>
          </dl>

          <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs leading-relaxed text-accent-text">
            Summaries are written for this prototype. Always read the official text before relying on it.
          </p>
        </div>
      )}
    </Overlay>
  )
}
