import { ArrowUp, Info, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useT } from '../../i18n/useT'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

const MOCK_TRANSCRIPTS = {
  en: 'Can I get a GI tag for turmeric grown in our district?',
  hi: 'क्या हमारे ज़िले की हल्दी के लिए GI टैग मिल सकता है?',
}

interface Props {
  onSend: (text: string) => void
  busy: boolean
  autoFocus?: boolean
}

export function ChatInput({ onSend, busy, autoFocus }: Props) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [value, setValue] = useState('')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [value])

  useEffect(() => () => window.clearInterval(timer.current), [])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const text = value.trim()
    if (!text || busy) return
    onSend(text)
    setValue('')
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  // Mock voice capture: animates for a few seconds, then fills in a sample transcript.
  const toggleMic = () => {
    if (recording) {
      stopRecording()
      return
    }
    setRecording(true)
    setSeconds(0)
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  useEffect(() => {
    if (recording && seconds >= 4) stopRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, seconds])

  const stopRecording = () => {
    window.clearInterval(timer.current)
    setRecording(false)
    setValue(lang === 'hi' ? MOCK_TRANSCRIPTS.hi : MOCK_TRANSCRIPTS.en)
    ref.current?.focus()
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className={cn(
          'relative flex items-end gap-2 rounded-2xl border bg-surface p-2 shadow-card transition-colors',
          recording ? 'border-danger/50' : 'border-line focus-within:border-primary/50',
        )}
      >
        <label htmlFor="chat-input" className="sr-only">
          {t('assistant.placeholder')}
        </label>

        {recording ? (
          <div className="flex min-h-11 flex-1 items-center gap-3 px-3" role="status" aria-live="assertive">
            <div className="flex h-6 items-center gap-[3px]" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="voice-bar w-[3px] rounded-full bg-danger"
                  style={{ height: `${10 + ((i * 7) % 14)}px`, animationDelay: `${(i % 5) * 0.12}s` }}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-danger">{t('mic.listening')}</span>
            <span className="ml-auto font-mono text-sm tabular-nums text-muted">0:0{seconds}</span>
          </div>
        ) : (
          <textarea
            id="chat-input"
            ref={ref}
            rows={1}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={t('assistant.placeholder')}
            className="max-h-44 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-subtle focus-visible:outline-none"
          />
        )}

        <button
          type="button"
          onClick={toggleMic}
          aria-label={recording ? t('mic.stop') : t('mic.start')}
          aria-pressed={recording}
          className={cn(
            'grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl transition-all',
            recording ? 'recording bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          {recording ? <Square className="h-4 w-4 fill-current" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
        </button>
        <button
          type="submit"
          disabled={!value.trim() || busy || recording}
          aria-label={t('assistant.send')}
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-primary text-primary-fg shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-line disabled:text-subtle disabled:shadow-none"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      </form>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Info className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden />
        <span>
          <strong className="font-semibold text-ink">{t('assistant.disclaimer')}</strong>{' '}
          <span className="hidden sm:inline">{t('assistant.disclaimer.more')}</span>
        </span>
      </p>
    </div>
  )
}
