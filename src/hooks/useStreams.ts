import { useEffect } from 'react'
import type { LogEntry, DownloadTask } from '@/types'
import { useSkyyStore } from '@/store'

export function useConsoleStream() {
  const addLog = useSkyyStore((s) => s.addLog)

  useEffect(() => {
    const unsubscribe = window.skyy.onConsoleLog?.((entry: LogEntry) => {
      addLog(entry)
    })
    return () => unsubscribe?.()
  }, [addLog])
}

export function useDownloadStream() {
  const upsertTask = useSkyyStore((s) => s.upsertTask)

  useEffect(() => {
    const unsubscribe = window.skyy.onDownloadUpdate?.((task: DownloadTask) => {
      upsertTask(task)
    })
    return () => unsubscribe?.()
  }, [upsertTask])
}
