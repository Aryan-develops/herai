import { ChevronRight, Database, Globe2, Landmark, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SourceDrawer } from '../components/SourceDrawer'
import { SourceTypeBadge } from '../components/SourceTypeBadge'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/primitives'
import { useLoad } from '../hooks/useAsync'
import { cn, formatDate } from '../lib/utils'
import { api } from '../services/api'
import type { Jurisdiction, Source, SourceType } from '../types'

const TYPES: SourceType[] = ['Statute', 'Treaty', 'Registry', 'Foreign law']

function isRecent(iso: string, updated: string) {
  const days = (new Date(updated).getTime() - new Date(iso).getTime()) / 86_400_000
  return days <= 45
}

export default function SourcesPage() {
  const load = useLoad(api.listSources)
  const [q, setQ] = useState('')
  const [jur, setJur] = useState<Jurisdiction | 'all'>('all')
  const [types, setTypes] = useState<SourceType[]>([])
  const [open, setOpen] = useState<Source | null>(null)

  const filtered = useMemo(() => {
    const list = load.data?.sources ?? []
    const term = q.trim().toLowerCase()
    return list.filter(
      (s) =>
        (jur === 'all' || s.jurisdiction === jur) &&
        (types.length === 0 || types.includes(s.type)) &&
        (!term || [s.name, s.shortName, s.provision, s.summary].some((f) => f.toLowerCase().includes(term))),
    )
  }, [load.data, q, jur, types])

  const toggleType = (t: SourceType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const clear = () => {
    setQ('')
    setJur('all')
    setTypes([])
  }

  return (
    <>
      <PageHeader
        eyebrow="Sources library"
        title="Every source the assistant can cite"
        description="The assistant answers only from these statutes, treaties and registries. Open any entry for a plain-language summary and the official link."
        actions={
          load.data && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-card">
              <Database className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm leading-tight">
                <p className="font-semibold text-ink">Corpus {load.data.version}</p>
                <p className="text-xs text-muted">Updated {formatDate(load.data.updated)}</p>
              </div>
            </div>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <label htmlFor="src-q" className="sr-only">
              Search sources
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              id="src-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, provision or topic"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-primary"
            />
          </div>
          <div role="radiogroup" aria-label="Jurisdiction" className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
            {(
              [
                ['all', 'All', null],
                ['india', 'India', Landmark],
                ['international', 'International', Globe2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={jur === id}
                onClick={() => setJur(id)}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all',
                  jur === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {Icon && <Icon className="h-4 w-4" aria-hidden />}
                {label}
              </button>
            ))}
          </div>
        </div>
        <fieldset className="mt-3 flex flex-wrap items-center gap-2">
          <legend className="sr-only">Filter by type</legend>
          <span className="mr-1 text-sm text-muted" aria-hidden>
            Type:
          </span>
          {TYPES.map((t) => {
            const on = types.includes(t)
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(t)}
                className={cn(
                  'h-8 cursor-pointer rounded-full border px-3 text-sm transition-colors',
                  on ? 'border-primary bg-primary text-primary-fg' : 'border-line text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {t}
              </button>
            )
          })}
        </fieldset>
      </Card>

      {load.status === 'error' ? (
        <ErrorState message={load.error.message} onRetry={load.retry} />
      ) : load.status !== 'success' ? (
        <Card className="divide-y divide-line" >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4" aria-hidden>
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No sources match these filters"
            body="Try a different word or clear the filters."
            action={<Button onClick={clear}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <p className="border-b border-line px-4 py-2.5 text-sm text-muted" aria-live="polite">
            Showing {filtered.length} of {load.data.sources.length} sources
          </p>
          {/* Table on wide screens */}
          <div className="scrollbar-thin hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Sources in the corpus</caption>
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Jurisdiction</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Provision</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Version</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => (
                  <tr key={s.id} className="group cursor-pointer transition-colors hover:bg-surface-2" onClick={() => setOpen(s)}>
                    <td className="px-4 py-3.5">
                      <button type="button" onClick={() => setOpen(s)} className="cursor-pointer text-left font-medium text-ink group-hover:text-primary">
                        {s.shortName}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <SourceTypeBadge type={s.type} />
                    </td>
                    <td className="px-4 py-3.5">
                      <JurBadge j={s.jurisdiction} />
                    </td>
                    <td className="max-w-[16rem] px-4 py-3.5 text-muted">
                      <span className="line-clamp-2">{s.provision}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-muted">{formatDate(s.versionDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <UpdatedBadge iso={s.lastUpdated} corpus={load.data.updated} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards on small screens */}
          <ul className="divide-y divide-line md:hidden">
            {filtered.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setOpen(s)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{s.shortName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{s.provision}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <SourceTypeBadge type={s.type} />
                      <JurBadge j={s.jurisdiction} />
                      <UpdatedBadge iso={s.lastUpdated} corpus={load.data.updated} />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SourceDrawer source={open} onClose={() => setOpen(null)} />
    </>
  )
}

function JurBadge({ j }: { j: Jurisdiction }) {
  return j === 'india' ? (
    <Badge tone="primary" icon={Landmark}>India</Badge>
  ) : (
    <Badge tone="intl" icon={Globe2}>International</Badge>
  )
}

function UpdatedBadge({ iso, corpus }: { iso: string; corpus: string }) {
  const fresh = isRecent(iso, corpus)
  return (
    <Badge tone={fresh ? 'accent' : 'neutral'}>
      {fresh && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      {fresh ? 'Updated ' : ''}
      {formatDate(iso)}
    </Badge>
  )
}
