import { Database, MoreHorizontal, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CORPUS_VERSION, SOURCES } from '../../data/sources'
import { useT } from '../../i18n/useT'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { Overlay } from '../ui/Overlay'
import { NAV } from './nav'

export function Sidebar() {
  const t = useT()
  return (
    <nav aria-label="Main" className="no-print hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <ul className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-soft text-primary-soft-text' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-2 h-7 w-1 rounded-r-full bg-accent" aria-hidden />}
                  <item.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-subtle group-hover:text-ink')} aria-hidden />
                  {t(item.label)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="m-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink">
          <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
          Corpus {CORPUS_VERSION}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{SOURCES.length} official sources · India and international</p>
      </div>
    </nav>
  )
}

export function MobileTabBar() {
  const t = useT()
  const [more, setMore] = useState(false)
  const { pathname } = useLocation()
  const setPermissionsOpen = useAppStore((s) => s.setPermissionsOpen)
  const moreItems = NAV.filter((n) => !n.mobile)
  const moreActive = moreItems.some((n) => pathname.startsWith(n.to))

  const tab = 'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors min-h-14'

  return (
    <>
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="flex">
          {NAV.filter((n) => n.mobile).map((item) => (
            <li key={item.to} className="flex flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted')}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-primary-soft')}>
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    {t(item.short)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              className={cn(tab, 'cursor-pointer', moreActive ? 'text-primary' : 'text-muted')}
            >
              <span className={cn('grid h-7 w-12 place-items-center rounded-full', moreActive && 'bg-primary-soft')}>
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Overlay open={more} onClose={() => setMore(false)} title="More">
        <ul className="space-y-2">
          {moreItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMore(false)}
                className={({ isActive }) =>
                  cn(
                    'flex h-12 items-center gap-3 rounded-xl border px-4 text-sm font-medium',
                    isActive ? 'border-primary/40 bg-primary-soft text-primary-soft-text' : 'border-line text-ink',
                  )
                }
              >
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
                {t(item.label)}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setMore(false)
                setPermissionsOpen(true)
              }}
              className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-line px-4 text-sm font-medium text-ink"
            >
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              {t('header.permissions')}
            </button>
          </li>
        </ul>
      </Overlay>
    </>
  )
}
