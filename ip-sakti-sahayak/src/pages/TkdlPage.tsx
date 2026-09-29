import { BookOpenText, ExternalLink, FileSearch, Info, Search, SearchX, ShieldCheck, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/primitives'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/utils'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import type { TkdlResult } from '../types'

const EXAMPLES = ['Chyawanprash', 'Triphala', 'Ashwagandha', 'Guggulu', 'Brahmi']

export default function TkdlPage() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const search = useAsync(api.searchTkdl)
  const log = useAppStore((s) => s.log)

  const run = (q: string) => {
    const term = q.trim()
    if (!term) return
    setQuery(term)
    setSubmitted(term)
    log('search', `TKDL prior-art search: “${term}”`)
    void search.run(term)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    run(query)
  }

  return (
    <>
      <PageHeader
        eyebrow="TKDL and prior art"
        title="Is this formulation already known?"
        description="Search classical formulation names or ingredients. If a formulation is in the classical texts, it is prior art and cannot be patented as it is."
        actions={
          <a
            href="https://www.tkdl.res.in/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Open TKDL
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <form onSubmit={onSubmit} role="search" className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <label htmlFor="tkdl-q" className="sr-only">
                  Formulation name or ingredient
                </label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" aria-hidden />
                <input
                  id="tkdl-q"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Chyawanprash, Triphala, Ashwagandha"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-10 text-[15px] text-ink outline-none transition-colors placeholder:text-subtle focus:border-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setSubmitted('')
                      search.reset()
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary" size="lg" icon={Search} loading={search.status === 'loading'} disabled={!query.trim()}>
                Search
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Try:</span>
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => run(e)}
                  className="h-8 cursor-pointer rounded-full border border-line px-3 text-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <div aria-live="polite" aria-busy={search.status === 'loading'}>
            {search.status === 'idle' && (
              <Card>
                <EmptyState icon={FileSearch} title="Search the demo prior-art index" body="Results show where a formulation appears in the classical texts, and how closely it matches your search." />
              </Card>
            )}
            {search.status === 'loading' && (
              <div className="space-y-3" aria-label="Searching">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="space-y-3 p-5">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                  </Card>
                ))}
              </div>
            )}
            {search.status === 'error' && <ErrorState message={search.error.message} onRetry={search.retry} />}
            {search.status === 'success' &&
              (search.data.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={SearchX}
                    title={`No classical match for “${submitted}”`}
                    body="This demo index holds only a few formulations. No match here does not mean your formulation is new. Search the full TKDL before filing."
                  />
                </Card>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted">
                    {search.data.length} {search.data.length === 1 ? 'match' : 'matches'} for <strong className="text-ink">“{submitted}”</strong>
                  </p>
                  <ul className="space-y-3">
                    {search.data.map((r) => (
                      <ResultRow key={r.id} r={r} />
                    ))}
                  </ul>
                </>
              ))}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              Why this matters
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Patent examiners at the Indian Patent Office, the EPO, the USPTO and other offices search TKDL as prior art. If your claimed formulation, or
              an obvious variation of it, is in a classical text, the claim will be refused.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Section 3(p) of the Patents Act also excludes traditional knowledge directly, and anyone can oppose a patent that copies it.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Info className="h-5 w-5 text-accent-text" aria-hidden />
              Reading the score
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li><strong className="text-ink">80% and above:</strong> very likely the same formulation.</li>
              <li><strong className="text-ink">50 to 79%:</strong> related name or shared key ingredient.</li>
              <li><strong className="text-ink">Below 50%:</strong> weak match; review manually.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}

function ResultRow({ r }: { r: TkdlResult }) {
  const pct = Math.round(r.similarity * 100)
  const tone = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low'
  return (
    <li>
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-ink">
              {r.name}{' '}
              <span className="font-normal text-muted" lang="sa">
                {r.devanagari}
              </span>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <BookOpenText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-medium text-ink">{r.sourceText}</span>, {r.chapter}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                'text-2xl font-semibold tabular-nums',
                tone === 'high' ? 'text-primary' : tone === 'mid' ? 'text-accent-text' : 'text-muted',
              )}
            >
              {pct}%
            </p>
            <p className="text-xs text-subtle">similarity</p>
          </div>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
          role="meter"
          aria-label={`Similarity ${pct}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className={cn('h-full rounded-full', tone === 'high' ? 'bg-primary' : tone === 'mid' ? 'bg-accent' : 'bg-line-strong')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-subtle">Key ingredients</dt>
            <dd className="mt-0.5 capitalize text-ink">{r.ingredients.slice(0, 5).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Traditional use</dt>
            <dd className="mt-0.5 text-ink">{r.use}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Demo record</dt>
            <dd className="mt-0.5 font-mono text-xs text-ink">{r.id}</dd>
          </div>
        </dl>
      </Card>
    </li>
  )
}
