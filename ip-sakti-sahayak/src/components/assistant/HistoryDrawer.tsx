import { MessageSquare, MessagesSquare, Plus, Trash2 } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { cn, relativeTime } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { Overlay } from '../ui/Overlay'
import { Button, EmptyState } from '../ui/primitives'

export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { conversations, activeConversationId, openConversation, deleteConversation, newConversation } = useAppStore()

  return (
    <Overlay
      open={open}
      onClose={onClose}
      placement="left"
      title={t('assistant.history')}
      description="Stored only in this browser."
      footer={
        <Button
          variant="primary"
          icon={Plus}
          className="w-full justify-center"
          onClick={() => {
            newConversation()
            onClose()
          }}
        >
          {t('assistant.newChat')}
        </Button>
      }
    >
      {conversations.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No conversations yet" body="Questions you ask are saved here so you can come back to them." />
      ) : (
        <ul className="-mx-2 space-y-1">
          {conversations.map((c) => {
            const active = c.id === activeConversationId
            const answers = c.messages.filter((m) => m.role === 'assistant').length
            return (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    openConversation(c.id)
                    onClose()
                  }}
                  aria-current={active || undefined}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 pr-12 text-left transition-colors',
                    active ? 'bg-primary-soft' : 'hover:bg-surface-2',
                  )}
                >
                  <MessageSquare className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-primary' : 'text-subtle')} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{c.title}</span>
                    <span className="text-xs text-muted">
                      {relativeTime(c.updatedAt)} · {answers} {answers === 1 ? 'answer' : 'answers'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  aria-label={`Delete conversation: ${c.title}`}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-subtle opacity-100 transition-all hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Overlay>
  )
}
