import { useT } from '../../i18n/useT'

export function TypingIndicator() {
  const t = useT()
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 shadow-card">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} aria-hidden />
        ))}
      </div>
      <span className="text-sm text-muted">{t('assistant.thinking')}…</span>
    </div>
  )
}

export function AnswerSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-5 shadow-card" aria-hidden>
      <div className="flex gap-3">
        <div className="skeleton h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-11/12 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  )
}
