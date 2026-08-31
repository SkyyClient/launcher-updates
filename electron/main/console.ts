import type { LogEntry } from '../../src/types'

type Listener = (entry: LogEntry) => void

const listeners: Set<Listener> = new Set()
const buffer: LogEntry[] = []
let idCounter = 0

export function emitLog(
  level: LogEntry['level'],
  message: string
): LogEntry {
  const entry: LogEntry = {
    id: `log-${idCounter++}`,
    timestamp: Date.now(),
    level,
    message,
  }
  buffer.push(entry)
  if (buffer.length > 500) buffer.shift()
  listeners.forEach((listener) => listener(entry))
  return entry
}

export function subscribeToLogs(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getRecentLogs(limit = 200): LogEntry[] {
  return buffer.slice(-limit)
}

export function clearLogBuffer() {
  buffer.length = 0
}
