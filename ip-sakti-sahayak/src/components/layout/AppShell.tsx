import { FlaskConical, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LANGUAGES } from '../../i18n/strings'
import { useT } from '../../i18n/useT'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { PermissionsModal } from '../PermissionsModal'
import { Toaster } from '../ui/Toast'
import { Header } from './Header'
import { MobileTabBar, Sidebar } from './Navigation'

export function AppShell() {
  const t = useT()
  const { pathname } = useLocation()
  const lang = useAppStore((s) => s.lang)
  const language = LANGUAGES.find((l) => l.code === lang)!
  const [dismissedLang, setDismissedLang] = useState<string | null>(null)
  const fullBleed = pathname === '/'

  // Move focus to main content on route change so keyboard users land in the right place.
  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        Skip to main content
      </a>
      <Header />

      {!language.native_ui && dismissedLang !== lang && (
        <div role="status" className="no-print flex items-start gap-3 border-b border-line bg-intl-soft px-4 py-2.5 text-sm text-intl-text lg:px-6">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="flex-1">
            <strong className="font-semibold">{language.label} via Bhashini.</strong> {t('lang.fallback')}
          </p>
          <button
            type="button"
            onClick={() => setDismissedLang(lang)}
            aria-label="Dismiss language notice"
            className="-my-1 grid h-8 w-8 cursor-pointer place-items-center rounded-lg hover:bg-intl/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main" tabIndex={-1} className={cn('min-w-0 flex-1 outline-none', fullBleed ? 'overflow-hidden' : 'scrollbar-thin overflow-y-auto')}>
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pt-10">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      <footer className="no-print mb-[calc(3.5rem+env(safe-area-inset-bottom))] flex flex-col items-center justify-between gap-1 border-t border-line bg-surface px-4 py-2 text-xs text-muted sm:flex-row lg:mb-0 lg:px-6">
        <p className="flex items-center gap-1.5 text-center">
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden />
          <span>{t('footer.prototype')}</span>
        </p>
        <p className="hidden md:block">{t('footer.ministry')}</p>
      </footer>

      <MobileTabBar />
      <PermissionsModal />
      <Toaster />
    </div>
  )
}
