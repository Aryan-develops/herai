import { Moon, ShieldCheck, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { LanguageMenu } from './LanguageMenu'
import { LogoMark } from './Logo'

export function Header() {
  const t = useT()
  const { theme, toggleTheme, setPermissionsOpen, permissions } = useAppStore()
  const paidOn = permissions.filter((p) => p.kind === 'paid' && p.enabled).length

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md no-print">
      <div className="tricolour h-1 w-full" aria-hidden />
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg" aria-label="IP-SAKTI Sahayak home">
          <LogoMark />
          <div className="min-w-0 leading-tight">
            <p className="font-serif text-[15px] font-semibold tracking-tight text-ink sm:text-[17px]">
              IP-SAKTI <span className="block text-primary sm:inline">Sahayak</span>
            </p>
            <p className="hidden truncate text-xs text-muted sm:block">{t('app.tagline')}</p>
          </div>
        </Link>

        <span className="ml-1 hidden items-center rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted xl:inline-flex">
          Ministry of Ayush · SIH26045
        </span>

        <div className="ml-auto flex items-center gap-2">
          <LanguageMenu />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('header.theme.light') : t('header.theme.dark')}
            title={theme === 'dark' ? t('header.theme.light') : t('header.theme.dark')}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setPermissionsOpen(true)}
            className="relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:bg-primary-hover"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">{t('header.permissions')}</span>
            <span className="sr-only md:hidden">{t('header.permissions')}</span>
            {paidOn > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-[#2b1d00]">
                {paidOn}
                <span className="sr-only"> paid sources enabled</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
