import { Gavel, Headset, RefreshCw, SearchX, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useT'
import type { AssistantMessage } from '../../types'
import { Button } from '../ui/primitives'

/** Cards for when the assistant should not answer: out of scope, litigation, or a failed request. */
export function NoticeCard({ message, onRetry }: { message: AssistantMessage; onRetry: (q: string) => void }) {
  const t = useT()
  const navigate = useNavigate()
  const goHelp = (topic: string) => navigate(`/help?topic=${encodeURIComponent(topic)}`)

  if (message.kind === 'error') {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center">
        <WifiOff className="h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-ink">The answer did not load</p>
          <p className="text-muted">The service did not respond in time. Your question has been kept.</p>
        </div>
        <Button size="sm" icon={RefreshCw} onClick={() => onRetry(message.question)}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const advocate = message.kind === 'advocate'
  const Icon = advocate ? Gavel : SearchX

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex gap-4 p-5">
        <span
          className={
            advocate
              ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text'
              : 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted'
          }
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            {advocate ? 'Needs a human advocate' : 'Outside what I can answer'}
          </p>
          <h3 className="text-[17px] font-semibold text-ink">
            {advocate
              ? 'This sounds like a dispute. Please speak to an advocate.'
              : 'I can\'t answer this from my sources.'}
          </h3>
          <p className="text-sm leading-relaxed text-muted">
            {advocate
              ? 'Questions about winning a case, suing someone or defending an infringement claim depend on the facts and evidence of your situation. An automated assistant should not predict outcomes. An IP facilitator can connect you with a qualified advocate, or with free legal aid through your District Legal Services Authority.'
              : 'My answers come only from a fixed set of official sources on Ayurveda IP and regulation. Rather than guess, I\'m not answering. Try rephrasing around patents, GI tags, trade marks, biodiversity rules, advertising claims or microorganism deposits, or ask a person.'}
          </p>
          {!advocate && (
            <p className="text-sm text-muted">
              You asked: <span className="font-medium text-ink">“{message.question}”</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line bg-surface-2/60 px-5 py-3">
        <Button variant={advocate ? 'accent' : 'primary'} size="sm" icon={Headset} onClick={() => goHelp('Something else')}>
          {advocate ? 'Request help from a facilitator' : t('answer.facilitator')}
        </Button>
      </div>
    </article>
  )
}
