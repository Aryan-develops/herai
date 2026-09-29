import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { cn } from '../../lib/utils'

interface OverlayProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** 'right' and 'left' are side drawers, 'center' a modal, 'bottom' a mobile sheet */
  placement?: 'center' | 'right' | 'left'
  size?: 'md' | 'lg' | 'xl'
}

const WIDTHS = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/** Accessible modal or drawer with focus trap, Escape to close and focus return. */
export function Overlay({ open, onClose, title, description, children, footer, placement = 'center', size = 'md' }: OverlayProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose)
  const titleId = useId()
  const descId = useId()
  if (!open) return null

  const panel =
    placement === 'center'
      ? cn('relative m-auto flex max-h-[min(90dvh,860px)] w-[calc(100%-2rem)] flex-col rounded-2xl animate-rise', WIDTHS[size])
      : cn(
          'fixed inset-y-0 flex w-full flex-col animate-rise',
          placement === 'right' ? 'right-0 sm:border-l' : 'left-0 sm:border-r',
          WIDTHS[size],
        )

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn('border-line bg-surface shadow-2xl', panel)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1 text-sm text-muted">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
