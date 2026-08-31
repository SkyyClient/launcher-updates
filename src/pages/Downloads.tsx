import React from 'react'
import { Pause, X, RotateCcw, Download, CheckCircle2 } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toast'
import type { DownloadTask } from '@/types'

const CATEGORY_COLORS: Record<string, { variant: 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral'; label: string }> = {
  libraries: { variant: 'info', label: 'Librerias' },
  assets: { variant: 'violet', label: 'Assets' },
  client: { variant: 'success', label: 'Cliente' },
  version: { variant: 'warning', label: 'Version' },
  modpack: { variant: 'info', label: 'Modpack' },
  launcher: { variant: 'neutral', label: 'Launcher' },
  java: { variant: 'warning', label: 'Java' },
}

export default function Downloads() {
  const tasks = useSkyyStore((s) => s.tasks)
  const addLog = useSkyyStore((s) => s.addLog)

  const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'queued')
  const completed = tasks.filter((t) => t.status === 'completed')
  const failed = tasks.filter((t) => t.status === 'error' || t.status === 'cancelled' || t.status === 'paused')

  const handlePause = (task: DownloadTask) => {
    void window.skyy.cancelDownload(task.id)
    addLog({ id: `ui-${Date.now()}`, timestamp: Date.now(), level: 'INFO', message: `Descarga pausada: ${task.name}` })
  }

  const retry = (task: DownloadTask) => {
    toast.info('Reintentar', `Puedes reintentar ${task.name} desde VERSIONES.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
          DESCARGAS
        </h1>
        <p className="text-sm text-skyy-muted mt-1">Descargas y transferencias</p>
      </div>

      <GlassPanel className="p-5">
        <h3 className="text-sm font-semibold text-skyy-text mb-4">
          Descargas activas ({active.length})
        </h3>
        {active.length === 0 ? (
          <div className="text-center py-10 text-skyy-muted text-sm">
            <Download size={28} className="mx-auto mb-2 opacity-50" />
            No hay descargas activas
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((task) => {
              const cat = CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.version
              const pct = task.total > 0 ? Math.round((task.current / task.total) * 100) : 0
              return (
                <div key={task.id} className="rounded-xl bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={cat.variant}>{cat.label}</Badge>
                      <span className="text-sm font-medium text-skyy-text truncate">{task.name}</span>
                    </div>
                    <span className="text-sm font-bold text-skyy-violet">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-skyy-muted">
                      {formatBytes(task.current)} / {formatBytes(task.total)}
                      {task.speed > 0 && <> · {formatBytes(task.speed)}/s</>}
                    </span>
                    <div className="flex gap-1.5">
                      <ActionBtn title="Pausar" onClick={() => handlePause(task)}><Pause size={13} /></ActionBtn>
                      <ActionBtn title="Cancelar" danger onClick={() => void window.skyy.cancelDownload(task.id)}>
                        <X size={13} />
                      </ActionBtn>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {completed.length > 0 && (
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-skyy-text mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" /> Completadas ({completed.length})
            </h3>
            <div className="space-y-1.5">
              {completed.slice(-8).reverse().map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-skyy-muted">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{t.name}</span>
                  {t.total > 0 && <span className="ml-auto text-emerald-300">{formatBytes(t.total)}</span>}
                </div>
              ))}
            </div>
          </GlassPanel>
        )}

        {failed.length > 0 && (
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-skyy-text mb-3">Fallidas / pausadas ({failed.length})</h3>
            <div className="space-y-1.5">
              {failed.slice(-8).reverse().map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`shrink-0 ${t.status === 'error' ? 'text-rose-400' : t.status === 'paused' ? 'text-amber-400' : 'text-skyy-muted'}`}>
                    {t.status === 'error' ? '✕' : t.status === 'paused' ? '‖' : '—'}
                  </span>
                  <span className="truncate text-skyy-muted">{t.name}</span>
                  <button
                    onClick={() => retry(t)}
                    className="ml-auto text-skyy-violet hover:text-skyy-text transition-colors"
                    title="Reintentar"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'w-7 h-7 flex items-center justify-center rounded-md border transition-colors',
        danger
          ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          : 'border-black text-skyy-muted hover:text-skyy-text hover:bg-white/5',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}
