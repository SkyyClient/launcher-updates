import { Client } from '@xhayper/discord-rpc'
import { emitLog } from './console'

const CLIENT_ID = '1542876598825517066'
const DISCORD_INVITE = 'https://discord.gg/VrETNfpeRC'
const DOWNLOAD_URL = 'https://github.com/SkyyClient/launcher-updates/releases/latest'

const RETRY_INTERVAL = 15_000

let client: Client | null = null
let ready = false
let retryTimer: ReturnType<typeof setInterval> | null = null
let destroyed = false
const sessionStart = Math.floor(Date.now() / 1000)

let current = {
  details: 'Explorando el launcher',
  state: 'Navegando versiones',
  largeImageKey: 'skyy_logo',
  largeImageText: 'SKYY CLIENT',
}

async function apply() {
  if (!client || !ready) return
  try {
    await client.user?.setActivity({
      details: current.details,
      state: current.state,
      startTimestamp: sessionStart,
      largeImageKey: current.largeImageKey,
      largeImageText: current.largeImageText,
      buttons: [
        { label: 'Comunidad Discord', url: DISCORD_INVITE },
        { label: 'Descargar SKYY CLIENT', url: DOWNLOAD_URL },
      ],
    })
  } catch (err) {
    emitLog('WARNING', `RPC setActivity falló: ${err instanceof Error ? err.message : String(err)}`)
    ready = false
    client = null
    startRetry()
  }
}

function startRetry() {
  if (retryTimer || destroyed) return
  retryTimer = setInterval(() => {
    if (destroyed) {
      stopRetry()
      return
    }
    emitLog('INFO', 'Reintentando conexión a Discord RPC…')
    attemptConnect()
  }, RETRY_INTERVAL)
}

function stopRetry() {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}

function attemptConnect() {
  if (client) return
  client = new Client({ clientId: CLIENT_ID })

  client.on('ready', () => {
    ready = true
    stopRetry()
    emitLog('INFO', 'Discord Rich Presence conectado')
    void apply()
  })

  client.on('disconnected', () => {
    emitLog('INFO', 'Discord RPC desconectado')
    ready = false
    client = null
    startRetry()
  })

  client.login().catch((err) => {
    emitLog('INFO', `Rich Presence no disponible: ${err instanceof Error ? err.message : String(err)}`)
    client = null
    startRetry()
  })
}

export function startRichPresence() {
  destroyed = false
  attemptConnect()
}

export function setPlaying(versionId: string) {
  current = {
    details: `Jugando Minecraft ${versionId}`,
    state: 'En partida',
    largeImageKey: 'skyy_logo',
    largeImageText: 'SKYY CLIENT',
  }
  void apply()
}

export function setIdle() {
  current = {
    details: 'Explorando el launcher',
    state: 'Navegando versiones',
    largeImageKey: 'skyy_logo',
    largeImageText: 'SKYY CLIENT',
  }
  void apply()
}

export function stopRichPresence() {
  destroyed = true
  stopRetry()
  try {
    void client?.destroy()
  } catch {
    /* ignorar */
  }
  client = null
  ready = false
}
