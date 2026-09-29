import { Check, ChevronDown, Languages } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LANGUAGES } from '../../i18n/strings'
import { useT } from '../../i18n/useT'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import type { LangCode } from '../../types'

export function LanguageMenu() {
  const t = useT()
  const { lang, setLang } = useAppStore()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const current = LANGUAGES.find((l) => l.code === lang)!

  useEffect(() => {
    if (!open) return
    const idx = LANGUAGES.findIndex((l) => l.code === lang)
    setActive(idx)
    requestAnimationFrame(() => items.current[idx]?.focus())
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, lang])

  const choose = (code: LangCode) => {
    setLang(code)
    setOpen(false)
    wrap.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      wrap.current?.querySelector<HTMLButtonElement>('button')?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + LANGUAGES.length) % LANGUAGES.length
      setActive(next)
      items.current[next]?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const native = LANGUAGES.filter((l) => l.native_ui)
  const bhashini = LANGUAGES.filter((l) => !l.native_ui)

  const renderItem = (l: (typeof LANGUAGES)[number]) => {
    const i = LANGUAGES.indexOf(l)
    const selected = l.code === lang
    return (
      <li key={l.code} role="none">
        <button
          ref={(el) => {
            items.current[i] = el
          }}
          type="button"
          role="menuitemradio"
          aria-checked={selected}
          tabIndex={i === active ? 0 : -1}
          onClick={() => choose(l.code)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
            selected ? 'bg-primary-soft text-primary-soft-text' : 'text-ink hover:bg-surface-2',
          )}
        >
          <span className="flex-1">
            <span className="font-medium" lang={l.code}>
              {l.native}
            </span>
            {l.native !== l.label && <span className="ml-2 text-muted">{l.label}</span>}
          </span>
          {selected && <Check className="h-4 w-4" aria-hidden />}
        </button>
      </li>
    )
  }

  return (
    <div ref={wrap} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('header.language')}: ${current.label}`}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
      >
        <Languages className="h-4 w-4 text-primary" aria-hidden />
        <span className="hidden sm:inline" lang={current.code}>
          {current.native}
        </span>
        <span className="sm:hidden">{current.code.toUpperCase()}</span>
        <ChevronDown className={cn('h-4 w-4 text-subtle transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="animate-rise absolute right-0 top-12 z-40 w-72 rounded-xl border border-line bg-surface p-2 shadow-2xl">
          <ul role="menu" aria-label={t('header.language')}>
            {native.map(renderItem)}
          </ul>
          <div className="my-2 flex items-center gap-2 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{t('header.viaBhashini')}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ul role="menu" aria-label={`${t('header.language')} ${t('header.viaBhashini')}`}>
            {bhashini.map(renderItem)}
          </ul>
          <p className="mt-2 border-t border-line px-3 pb-1 pt-2 text-xs leading-relaxed text-muted">
            Bhashini languages translate answers; interface text stays in English in this prototype.
          </p>
        </div>
      )}
    </div>
  )
}
