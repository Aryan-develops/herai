import { BookMarked, Globe2, History, Landmark, Leaf, Megaphone, Microscope, Plus, ScrollText, Stamp, Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnswerCard } from '../components/assistant/AnswerCard'
import { ChatInput } from '../components/assistant/ChatInput'
import { HistoryDrawer } from '../components/assistant/HistoryDrawer'
import { NoticeCard } from '../components/assistant/NoticeCard'
import { SourcesPanel } from '../components/assistant/SourcesPanel'
import { AnswerSkeleton, TypingIndicator } from '../components/assistant/TypingIndicator'
import { JurisdictionToggle } from '../components/JurisdictionToggle'
import { LogoMark } from '../components/layout/Logo'
import { SourceDrawer } from '../components/SourceDrawer'
import { Overlay } from '../components/ui/Overlay'
import { SUGGESTIONS } from '../data/topics'
import { useSpeech } from '../hooks/useSpeech'
import { useT } from '../i18n/useT'
import { cn, uid } from '../lib/utils'
import { api } from '../services/api'
import { useActiveConversation, useAppStore } from '../store/useAppStore'
import type { AssistantMessage, Jurisdiction, Source, TopicId } from '../types'

const TOPIC_ICONS: Record<TopicId, typeof Leaf> = {
  patent: ScrollText,
  gi: Stamp,
  trademark: Tag,
  abs: Leaf,
  advertising: Megaphone,
  budapest: Microscope,
}

function useIsWide() {
  const query = '(min-width: 1280px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export default function AssistantPage() {
  const t = useT()
  const convo = useActiveConversation()
  const { jurisdiction, setJurisdiction, appendMessage, replaceMessage, newConversation, log, highlightedCitation, selectedMessageId } =
    useAppStore()
  const [pending, setPending] = useState(false)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [drawerSource, setDrawerSource] = useState<Source | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const speech = useSpeech()
  const wide = useIsWide()

  const messages = convo?.messages ?? []
  const lang = useAppStore((s) => s.lang)

  // Only a freshly arrived answer types itself out; a language switch shows it in full.
  useEffect(() => setStreamId(null), [lang])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (messages.length === 0 && !pending) el.scrollTo({ top: 0 })
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, pending])

  // On narrow screens, tapping a citation opens the sources sheet.
  const lastHighlight = useRef(highlightedCitation)
  useEffect(() => {
    if (!wide && highlightedCitation && highlightedCitation !== lastHighlight.current) setSourcesOpen(true)
    lastHighlight.current = highlightedCitation
  }, [highlightedCitation, selectedMessageId, wide])

  const jurLabel = (j: Jurisdiction) => (j === 'india' ? 'India' : 'International')

  const ask = async (question: string, replaceId?: string) => {
    if (!replaceId) appendMessage({ id: uid('m_'), role: 'user', text: question, at: new Date().toISOString() })
    log('ask', `Asked (${jurLabel(jurisdiction)}): “${question.slice(0, 90)}”`)
    setPending(true)
    speech.stop()
    let reply: AssistantMessage
    try {
      const res = await api.ask(question)
      reply = { id: replaceId ?? uid('m_'), role: 'assistant', kind: res.kind, topicId: res.topicId, question, at: new Date().toISOString() }
    } catch {
      reply = { id: replaceId ?? uid('m_'), role: 'assistant', kind: 'error', question, at: new Date().toISOString() }
    }
    setPending(false)
    setStreamId(reply.kind === 'answer' ? reply.id : null)
    if (replaceId) replaceMessage(replaceId, reply)
    else appendMessage(reply)
  }

  const changeJurisdiction = (j: Jurisdiction) => {
    if (j === jurisdiction) return
    setStreamId(null)
    speech.stop()
    setJurisdiction(j)
    log('search', `Switched jurisdiction to ${jurLabel(j)}`)
  }

  const india = jurisdiction === 'india'
  const empty = messages.length === 0

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Chat">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface/70 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <History className="h-[18px] w-[18px]" aria-hidden />
            <span className="hidden sm:inline">{t('assistant.history')}</span>
            <span className="sr-only sm:hidden">{t('assistant.history')}</span>
          </button>

          <div className="order-last flex w-full items-center justify-center gap-3 sm:order-none sm:w-auto sm:flex-1">
            <JurisdictionToggle value={jurisdiction} onChange={changeJurisdiction} size="lg" className="w-full sm:w-auto" />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 md:inline-flex',
                india ? 'bg-primary-soft text-primary-soft-text' : 'bg-intl-soft text-intl-text',
              )}
              aria-live="polite"
            >
              {india ? <Landmark className="h-3.5 w-3.5" aria-hidden /> : <Globe2 className="h-3.5 w-3.5" aria-hidden />}
              {india ? t('juris.badge.india') : t('juris.badge.international')}
            </span>
            {!wide && (
              <button
                type="button"
                onClick={() => setSourcesOpen(true)}
                aria-label={t('assistant.sources')}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              >
                <BookMarked className="h-[18px] w-[18px]" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={newConversation}
              aria-label={t('assistant.newChat')}
              title={t('assistant.newChat')}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Mobile jurisdiction badge */}
        <div
          className={cn(
            'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-300 md:hidden',
            india ? 'bg-primary-soft text-primary-soft-text' : 'bg-intl-soft text-intl-text',
          )}
        >
          {india ? <Landmark className="h-3.5 w-3.5" aria-hidden /> : <Globe2 className="h-3.5 w-3.5" aria-hidden />}
          {india ? t('juris.badge.india') : t('juris.badge.international')}
        </div>

        {/* Messages */}
        <div ref={scroller} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {empty ? (
              <Welcome onPick={(q) => void ask(q)} disabled={pending} />
            ) : (
              <ol className="space-y-6" aria-label="Conversation" aria-live="polite" aria-busy={pending}>
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <li key={m.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-fg shadow-sm">
                        <span className="sr-only">You asked: </span>
                        {m.text}
                      </p>
                    </li>
                  ) : (
                    <li key={m.kind === 'answer' ? `${m.id}-${jurisdiction}` : m.id} className="animate-rise">
                      {m.kind === 'answer' ? (
                        <AnswerCard message={m} stream={m.id === streamId} speech={speech} />
                      ) : (
                        <NoticeCard message={m} onRetry={() => void ask(m.question, m.id)} />
                      )}
                    </li>
                  ),
                )}
                {pending && (
                  <li className="space-y-3">
                    <TypingIndicator />
                    <AnswerSkeleton />
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-bg/80 px-4 pb-3 pt-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-3xl">
            <ChatInput onSend={(q) => void ask(q)} busy={pending} autoFocus={wide} />
          </div>
        </div>
      </section>

      {wide && (
        <aside className="w-[22rem] shrink-0 border-l border-line bg-surface 2xl:w-96" aria-label={t('assistant.sources')}>
          <SourcesPanel onOpen={setDrawerSource} />
        </aside>
      )}

      {!wide && (
        <Overlay open={sourcesOpen} onClose={() => setSourcesOpen(false)} placement="right" title={t('assistant.sources')}>
          <div className="-mx-5 -my-5">
            <SourcesPanel
              onOpen={(s) => {
                setSourcesOpen(false)
                setDrawerSource(s)
              }}
            />
          </div>
        </Overlay>
      )}

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <SourceDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
    </div>
  )
}

function Welcome({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  return (
    <div className="animate-rise pt-2 sm:pt-8">
      <div className="text-center">
        <LogoMark className="mx-auto h-14 w-14 drop-shadow-sm" />
        <h1 className="mx-auto mt-5 max-w-xl font-serif text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl">
          {t('assistant.welcome.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{t('assistant.welcome.body')}</p>
      </div>

      <h2 className="mb-3 mt-10 text-xs font-semibold uppercase tracking-wider text-subtle">{t('assistant.suggestions')}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => {
          const Icon = TOPIC_ICONS[s.topicId]
          const text = lang === 'hi' ? s.hi : s.en
          return (
            <li key={s.topicId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(text)}
                className="group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="text-sm font-medium leading-relaxed text-ink" lang={lang === 'hi' ? 'hi' : 'en'}>
                  {text}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {[
          ['Every answer is cited', 'Numbered citations link to the official source.'],
          ['India and international kept apart', 'Switch jurisdiction above; answers never mix the two.'],
          ['Knows its limits', 'It says so when it can\'t answer, and sends disputes to a person.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-dashed border-line-strong px-4 py-3">
            <p className="font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-muted">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
