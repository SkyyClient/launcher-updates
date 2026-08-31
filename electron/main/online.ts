import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import { emitLog } from './console'

const API_URL = 'https://skyyclient.vercel.app/api/online'
const HEARTBEAT_INTERVAL = 1_000

let deviceId: string = ''
let onlineCount = 0
let sendToRenderer: ((channel: string, payload: unknown) => void) | null = null

export function setOnlineSender(fn: (channel: string, payload: unknown) => void) {
  sendToRenderer = fn
}

export function getOnlineCount(): number {
  return onlineCount
}

async function heartbeat() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'skyy-client/1.0' },
      body: JSON.stringify({ deviceId, source: 'launcher' }),
    })
    if (res.ok) {
      const data = (await res.json()) as { count: number }
      onlineCount = data.count
      sendToRenderer?.('online:count', onlineCount)
    }
  } catch {
    // Sin conexión — no es un error fatal
  }
}

export function startOnlineTracking() {
  deviceId = randomUUID()
  void heartbeat()
  setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL)
}
