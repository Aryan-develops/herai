import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  accent: 'bg-accent text-[#2b1d00] hover:brightness-95 shadow-sm',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-11 w-11 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <As className={cn('rounded-xl border border-line bg-surface shadow-card', className)}>{children}</As>
}

type BadgeTone = 'neutral' | 'primary' | 'accent' | 'intl' | 'danger'
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  primary: 'bg-primary-soft text-primary-soft-text border-transparent',
  accent: 'bg-accent-soft text-accent-text border-transparent',
  intl: 'bg-intl-soft text-intl-text border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry, compact }: { message?: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft text-sm', compact ? 'p-3' : 'p-4')}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
      <div className="flex-1">
        <p className="font-medium text-ink">Something went wrong</p>
        <p className="mt-0.5 text-muted">{message ?? 'The request could not be completed.'}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-accent-text">{eyebrow}</p>}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function OptionCard({
  selected,
  onSelect,
  label,
  hint,
  name,
  value,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  hint?: string
  name: string
  value: string
}) {
  return (
    <label
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        selected ? 'border-primary bg-primary-soft/60 shadow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <input type="radio" name={name} value={value} checked={selected} onChange={onSelect} className="peer sr-only" />
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
          selected ? 'border-primary' : 'border-line-strong',
        )}
        aria-hidden
      >
        <span className={cn('h-2.5 w-2.5 rounded-full bg-primary transition-transform', selected ? 'scale-100' : 'scale-0')} />
      </span>
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm leading-relaxed text-muted">{hint}</span>}
      </span>
    </label>
  )
}
