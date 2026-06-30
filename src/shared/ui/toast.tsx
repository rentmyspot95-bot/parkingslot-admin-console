import { create } from 'zustand'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../lib/cn'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
  /** Request id surfaced on error toasts so support can trace backend logs. */
  requestId?: string
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let counter = 1

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = counter++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 6000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** Imperative helper usable outside React (e.g. mutation onError). */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'success', title, description }),
  error: (title: string, description?: string, requestId?: string) =>
    useToastStore.getState().push({ tone: 'error', title, description, requestId }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'info', title, description }),
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}
const TONES = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone]
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-md',
              TONES[t.tone],
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs">{t.description}</p>}
              {t.requestId && (
                <p className="mt-1 font-mono text-[10px] opacity-70">requestId: {t.requestId}</p>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
