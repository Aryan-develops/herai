import { CheckCircle2, Info } from 'lucide-react'
import { create } from 'zustand'
import { uid } from '../../lib/utils'

interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'info'
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastItem['tone']) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
}))

export function Toaster() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-rise flex max-w-md items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl dark:bg-slate-100 dark:text-slate-900"
        >
          {t.tone === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-700" aria-hidden />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-sky-300 dark:text-sky-700" aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
