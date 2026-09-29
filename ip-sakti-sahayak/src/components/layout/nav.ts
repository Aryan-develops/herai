import { BookMarked, FileSearch, Headset, Leaf, MessageSquareText, Shapes, type LucideIcon } from 'lucide-react'
import type { StringKey } from '../../i18n/strings'

export interface NavItem {
  to: string
  label: StringKey
  short: StringKey
  icon: LucideIcon
  /** Shown directly in the mobile tab bar; others go under "More" */
  mobile: boolean
}

export const NAV: NavItem[] = [
  { to: '/', label: 'nav.assistant', short: 'nav.short.assistant', icon: MessageSquareText, mobile: true },
  { to: '/classify', label: 'nav.classify', short: 'nav.short.classify', icon: Shapes, mobile: true },
  { to: '/abs', label: 'nav.abs', short: 'nav.short.abs', icon: Leaf, mobile: true },
  { to: '/tkdl', label: 'nav.tkdl', short: 'nav.short.tkdl', icon: FileSearch, mobile: true },
  { to: '/sources', label: 'nav.sources', short: 'nav.short.sources', icon: BookMarked, mobile: false },
  { to: '/help', label: 'nav.help', short: 'nav.short.help', icon: Headset, mobile: false },
]
