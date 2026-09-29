import { CheckCircle2, ClipboardList, KeyRound, Lock, Search, ShieldCheck, ShieldOff, Trash2, Unlock } from 'lucide-react'
import { useState } from 'react'
import { cn, formatDateTime } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import type { AuditAction, DataSourcePermission } from '../types'
import { Overlay } from './ui/Overlay'
import { Badge, Button, EmptyState } from './ui/primitives'

const ACTION_META: Record<AuditAction, { label: string; tone: 'primary' | 'danger' | 'neutral' | 'accent' | 'intl'; icon: typeof Search }> = {
  grant: { label: 'Grant', tone: 'primary', icon: Unlock },
  revoke: { label: 'Revoke', tone: 'danger', icon: ShieldOff },
  search: { label: 'Search', tone: 'neutral', icon: Search },
  ask: { label: 'Question', tone: 'intl', icon: Search },
  request: { label: 'Request', tone: 'accent', icon: ClipboardList },
}

export function PermissionsModal() {
  const { permissionsOpen, setPermissionsOpen, permissions, audit, clearAudit } = useAppStore()
  const [tab, setTab] = useState<'sources' | 'audit'>('sources')
  const free = permissions.filter((p) => p.kind === 'free')
  const paid = permissions.filter((p) => p.kind === 'paid')

  return (
    <Overlay
      open={permissionsOpen}
      onClose={() => setPermissionsOpen(false)}
      title="Permissions and audit log"
      description="Choose which databases the assistant may search, and see a record of every access decision."
      size="lg"
    >
      <div role="tablist" aria-label="Permissions sections" className="mb-5 inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {(
          [
            ['sources', 'Data sources', ShieldCheck],
            ['audit', `Audit log (${audit.length})`, ClipboardList],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`perm-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`perm-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-all',
              tab === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'sources' ? (
        <div role="tabpanel" id="perm-panel-sources" aria-labelledby="perm-tab-sources" className="space-y-7">
          <section>
            <h3 className="text-sm font-semibold text-ink">Free official databases</h3>
            <p className="mb-3 text-sm text-muted">Public government and intergovernmental sources. Always on.</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {free.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{p.name}</p>
                      <Badge tone="primary">Always on</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{p.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-ink">Your paid subscriptions</h3>
            <p className="mb-3 text-sm text-muted">
              Off by default. The assistant only searches a subscription after you explicitly allow it. You can revoke access at any time.
            </p>
            <ul className="space-y-2.5">
              {paid.map((p) => (
                <PaidRow key={p.id} p={p} />
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div role="tabpanel" id="perm-panel-audit" aria-labelledby="perm-tab-audit">
          {audit.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nothing logged yet"
              body="Every permission grant, revoke and search is recorded here with a timestamp."
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted">Newest first · stored only in this browser</p>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={clearAudit}>
                  Clear log
                </Button>
              </div>
              <ol className="relative space-y-0 border-l border-line pl-5">
                {audit.map((e) => {
                  const meta = ACTION_META[e.action]
                  return (
                    <li key={e.id} className="relative pb-4">
                      <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-line-strong" aria-hidden />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={meta.tone} icon={meta.icon}>
                          {meta.label}
                        </Badge>
                        <time dateTime={e.at} className="font-mono text-xs tabular-nums text-subtle">
                          {formatDateTime(e.at)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-ink">{e.detail}</p>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </Overlay>
  )
}

function PaidRow({ p }: { p: DataSourcePermission }) {
  const setPermission = useAppStore((s) => s.setPermission)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [consent, setConsent] = useState(false)
  const nameOk = typed.trim().toLowerCase() === p.name.toLowerCase()

  const reset = () => {
    setConfirming(false)
    setTyped('')
    setConsent(false)
  }

  return (
    <li className={cn('rounded-xl border p-3.5 transition-colors', p.enabled ? 'border-primary/40 bg-primary-soft/40' : 'border-line')}>
      <div className="flex items-start gap-3">
        {p.enabled ? (
          <Unlock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-subtle" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{p.name}</p>
            <Badge tone={p.enabled ? 'primary' : 'neutral'}>{p.enabled ? 'Enabled' : 'Off'}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">{p.description}</p>
        </div>
        {p.enabled ? (
          <Button size="sm" variant="danger" onClick={() => setPermission(p.id, false)}>
            Revoke
          </Button>
        ) : (
          !confirming && (
            <Button size="sm" icon={KeyRound} onClick={() => setConfirming(true)} aria-expanded={confirming}>
              Enable
            </Button>
          )
        )}
      </div>

      {confirming && !p.enabled && (
        <form
          className="animate-rise mt-4 space-y-3 rounded-lg border border-line bg-surface p-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!nameOk || !consent) return
            setPermission(p.id, true)
            reset()
          }}
        >
          <div>
            <label htmlFor={`confirm-${p.id}`} className="block text-sm font-medium text-ink">
              Type <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">{p.name}</span> to confirm
            </label>
            <input
              id={`confirm-${p.id}`}
              data-autofocus
              autoFocus
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={typed.length > 0 && !nameOk}
              aria-describedby={`confirm-hint-${p.id}`}
              className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
            />
            <p id={`confirm-hint-${p.id}`} className={cn('mt-1 text-xs', typed && !nameOk ? 'text-danger' : 'text-subtle')}>
              {typed && !nameOk ? 'The name does not match yet.' : 'This prevents enabling a paid source by accident.'}
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
            />
            <span>
              I allow IP-SAKTI Sahayak to search my {p.name} subscription on my behalf. Searches will be logged, and I can revoke this at any
              time.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={!nameOk || !consent}>
              Grant access
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}
