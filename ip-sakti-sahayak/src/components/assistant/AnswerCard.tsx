import {
  ArrowLeftRight,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Headset,
  Landmark,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SOURCE_BY_ID } from '../../data/sources'
import { TOPIC_BY_ID } from '../../data/topics'
import { LANGUAGES } from '../../i18n/strings'
import { useT } from '../../i18n/useT'
import { useTypewriter } from '../../hooks/useTypewriter'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import type { AssistantMessage } from '../../types'
import { CitationChip } from '../CitationChip'
import { ConfidenceBar } from '../ConfidenceBar'
import { useToast } from '../ui/Toast'

interface Props {
  message: AssistantMessage
  stream: boolean
  speech: { supported: boolean; speakingId: string | null; speak: (id: string, text: string, lang: string) => void; stop: () => void }
}

export function AnswerCard({ message, stream, speech }: Props) {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast((s) => s.push)
  const { jurisdiction, lang, selectedMessageId, highlightedCitation, setJurisdiction, selectCitation, setFeedback, log } =
    useAppStore()
  const [copied, setCopied] = useState(false)

  const topic = TOPIC_BY_ID[message.topicId!]
  const answer = topic.answers[jurisdiction]
  const india = jurisdiction === 'india'
  const summary = lang === 'hi' ? answer.summary.hi : answer.summary.en
  const typed = useTypewriter(summary, stream)
  const isSelected = selectedMessageId === message.id
  const speakingThis = speech.speakingId === message.id

  const copy = async () => {
    const sources = answer.citations.map((id, i) => `[${i + 1}] ${SOURCE_BY_ID[id].name}, ${SOURCE_BY_ID[id].provision}`)
    const text = [
      `${answer.title} (${india ? 'India' : 'International'})`,
      '',
      summary,
      '',
      ...answer.keyPoints.map((p) => `• ${p}`),
      '',
      'Sources:',
      ...sources,
      '',
      'Information, not legal advice. Source: IP-SAKTI Sahayak prototype.',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast(t('answer.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Copy is blocked in this browser. Select the text instead.', 'info')
    }
  }

  const listen = () => {
    if (speakingThis) return speech.stop()
    const speechLang = LANGUAGES.find((l) => l.code === (lang === 'hi' ? 'hi' : 'en'))!.speech
    const body = lang === 'hi' ? summary : `${answer.title}. ${summary} ${answer.keyPoints.join(' ')}`
    speech.speak(message.id, body, speechLang)
  }

  const feedback = (f: 'up' | 'down') => {
    const next = message.feedback === f ? undefined : f
    setFeedback(message.id, next)
    if (next) toast(next === 'up' ? 'Thanks. Marked as helpful.' : 'Thanks. We will use this to improve answers.', 'info')
  }

  const flip = () => {
    const next = india ? 'international' : 'india'
    setJurisdiction(next)
    log('search', `Switched jurisdiction to ${next === 'india' ? 'India' : 'International'}`)
  }

  return (
    <article
      aria-label={answer.title}
      onClick={() => !isSelected && selectCitation(message.id, null)}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-surface shadow-card transition-all duration-300',
        isSelected ? (india ? 'border-primary/35' : 'border-intl/35') : 'border-line',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1 transition-colors duration-300', india ? 'bg-primary' : 'bg-intl')} />

      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pl-6 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-300',
              india ? 'bg-primary-soft text-primary' : 'bg-intl-soft text-intl',
            )}
            aria-hidden
          >
            {india ? <Landmark className="h-[18px] w-[18px]" /> : <Globe2 className="h-[18px] w-[18px]" />}
          </span>
          <div className="min-w-0">
            <p className={cn('text-xs font-semibold uppercase tracking-wider', india ? 'text-primary' : 'text-intl')}>
              {india ? t('juris.badge.india') : t('juris.badge.international')} · {topic.label}
            </p>
            <h3 className="mt-0.5 text-[17px] font-semibold leading-snug text-ink">{answer.title}</h3>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-4 pl-6">
        <p className="text-[15px] leading-relaxed text-ink" lang={lang === 'hi' ? 'hi' : 'en'} aria-live={stream ? 'polite' : undefined}>
          {typed.text}
          {!typed.done && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-ink" aria-hidden />}
        </p>

        {typed.done && (
          <div className="animate-rise space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                {t('answer.keyPoints')}
                {lang !== 'en' && <span className="ml-2 font-normal normal-case tracking-normal">(English in this prototype)</span>}
              </h4>
              <ul className="space-y-2">
                {answer.keyPoints.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                    <span aria-hidden className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', india ? 'bg-primary' : 'bg-intl')} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{t('assistant.sources')}</h4>
              <div className="flex flex-wrap gap-2">
                {answer.citations.map((id, i) => (
                  <CitationChip
                    key={id}
                    index={i + 1}
                    sourceId={id}
                    jurisdiction={jurisdiction}
                    active={isSelected && highlightedCitation === i + 1}
                    onClick={() => selectCitation(message.id, i + 1)}
                  />
                ))}
              </div>
            </div>

            {answer.links.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {answer.links.map((l) =>
                  l.url.startsWith('/') ? (
                    <Link key={l.url} to={l.url} className="font-medium text-primary underline-offset-4 hover:underline">
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn('inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline', india ? 'text-primary' : 'text-intl')}
                    >
                      {l.label}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ),
                )}
              </div>
            )}

            <div className="rounded-lg bg-surface-2 px-3 py-2.5">
              <ConfidenceBar confidence={answer.confidence} />
            </div>

            <button
              type="button"
              onClick={flip}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline',
                india ? 'text-intl' : 'text-primary',
              )}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              {india ? t('juris.see.international') : t('juris.see.india')}
            </button>
          </div>
        )}
      </div>

      {typed.done && (
        <footer className="flex flex-wrap items-center gap-1 border-t border-line px-3 py-2 pl-4">
          <IconAction label={copied ? t('answer.copied') : t('answer.copy')} onClick={copy} icon={copied ? Check : Copy} showLabel />
          {speech.supported && (
            <IconAction
              label={speakingThis ? t('answer.stop') : t('answer.listen')}
              onClick={listen}
              icon={speakingThis ? VolumeX : Volume2}
              pressed={speakingThis}
              showLabel
            />
          )}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <IconAction label={t('answer.helpful')} onClick={() => feedback('up')} icon={ThumbsUp} pressed={message.feedback === 'up'} />
          <IconAction label={t('answer.notHelpful')} onClick={() => feedback('down')} icon={ThumbsDown} pressed={message.feedback === 'down'} />
          <button
            type="button"
            onClick={() => navigate(`/help?topic=${encodeURIComponent(topic.label)}`)}
            className="ml-auto inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-accent-soft px-3 text-sm font-semibold text-accent-text transition-all hover:brightness-95"
          >
            <Headset className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('answer.facilitator')}</span>
            <span className="sm:hidden">Facilitator</span>
          </button>
        </footer>
      )}
    </article>
  )
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  pressed,
  showLabel,
}: {
  label: string
  onClick: () => void
  icon: typeof Copy
  pressed?: boolean
  showLabel?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={showLabel ? undefined : label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
        pressed ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {showLabel && <span className="sr-only sm:hidden">{label}</span>}
    </button>
  )
}
