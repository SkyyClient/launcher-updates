import React, { useEffect, useRef } from 'react'
import { Copy, Trash2, TerminalSquare } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { toast } from '@/store/toast'
import type { LogEntry } from '@/types'

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  INFO: 'text-skyy-violet',
  WARNING: 'text-amber-300',
  ERROR: 'text-rose-400',
  SUCCESS: 'text-emerald-300',
}

const LEVEL_PREFIX: Record<LogEntry['level'], string> = {
  INFO: '[INFO]',
  WARNING: '[WARN]',
  ERROR: '[ERR]',
  SUCCESS: '[OK]',
}

export default function Console() {
  const logs = useSkyyStore((s) => s.logs)
  const setLogs = useSkyyStore((s) => s.setLogs)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const copyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${LEVEL_PREFIX[l.level]} ${l.message}`)
      .join('\n')
    navigator.clipboard.writeText(text).then(
      () => toast.success('Logs copiados'),
      () => toast.error('No se pudieron copiar los logs')
    )
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
            CONSOLA
          </h1>
          <p className="text-sm text-skyy-muted mt-1">Registro de actividad de SKYY CLIENT</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Trash2 size={14} />} onClick={clearLogs}>
            Limpiar
          </Button>
          <Button size="sm" icon={<Copy size={14} />} onClick={copyLogs}>
            COPIAR LOGS
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-1">
        <Legend color="text-skyy-violet" label="INFO" />
        <Legend color="text-amber-300" label="WARNING" />
        <Legend color="text-rose-400" label="ERROR" />
        <Legend color="text-emerald-300" label="SUCCESS" />
      </div>

      <GlassPanel className="flex-1 p-4 overflow-hidden flex flex-col" strong>
        <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-skyy-muted">
              <TerminalSquare size={32} className="opacity-40 mb-2" />
              <span>Sin registros todavia</span>
            </div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="whitespace-pre-wrap hover:bg-white/[0.03] px-2 rounded">
                <span className="text-skyy-muted/60">
                  [{new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour12: false })}]
                </span>{' '}
                <span className={`${LEVEL_STYLES[entry.level]} font-semibold`}>
                  {LEVEL_PREFIX[entry.level]}
                </span>{' '}
                <span className="text-skyy-text/90">{entry.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </GlassPanel>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-skyy-muted">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  )
}
