import { useToastStore, type ToastType } from '@/store/toast'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

const STYLES: Record<ToastType, { icon: React.ReactNode; ring: string; bar: string }> = {
  success: { icon: <CheckCircle2 size={18} className="text-emerald-400" />, ring: '', bar: 'bg-emerald-400' },
  error: { icon: <XCircle size={18} className="text-rose-400" />, ring: '', bar: 'bg-rose-400' },
  info: { icon: <Info size={18} className="text-skyy-violet" />, ring: '', bar: 'bg-skyy-violet' },
  warning: { icon: <AlertTriangle size={18} className="text-amber-400" />, ring: '', bar: 'bg-amber-400' },
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const style = STYLES[t.type]
        return (
          <div
            key={t.id}
            className="pointer-events-auto w-80 glass-strong rounded-xl overflow-hidden shadow-glow animate-fade-in-up"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 shrink-0">{style.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-skyy-text">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-skyy-muted mt-0.5 leading-relaxed">{t.message}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-skyy-muted hover:text-skyy-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className={`h-0.5 w-full ${style.bar}`} />
          </div>
        )
      })}
    </div>
  )
}
