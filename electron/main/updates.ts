import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { emitLog } from './console'

let sendToRenderer: (channel: string, payload: unknown) => void = () => {}

export function setUpdateSender(fn: (channel: string, payload: unknown) => void) {
  sendToRenderer = fn
}

let updateDownloaded = false
let updateFound = false

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.requestHeaders = { 'Cache-Control': 'no-cache' }

  autoUpdater.on('checking-for-update', () => {
    emitLog('INFO', 'Buscando actualizaciones…')
  })

  autoUpdater.on('update-available', (info) => {
    if (updateFound) return
    updateFound = true
    emitLog('INFO', `Nueva versión disponible: ${info.version}`)
    sendToRenderer('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes ?? '',
    })
  })

  autoUpdater.on('update-not-available', () => {
    emitLog('INFO', 'El launcher está actualizado.')
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    emitLog('INFO', `Actualización ${info.version} descargada. Lista para instalar.`)
    sendToRenderer('update:ready', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    emitLog('ERROR', `Error en auto-update: ${err.message}`)
    sendToRenderer('update:error', { message: err.message })
  })
}

const UPDATE_CHECK_INTERVAL = 30_000

export function startUpdateCheck() {
  if (!require('electron').app.isPackaged) {
    emitLog('INFO', 'Modo desarrollo: actualizaciones omitidas.')
    return
  }
  setupAutoUpdater()
  void autoUpdater.checkForUpdates()
  setInterval(() => {
    if (!updateDownloaded && !updateFound) {
      void autoUpdater.checkForUpdates()
    }
  }, UPDATE_CHECK_INTERVAL)
}

export function registerUpdateIpc() {
  ipcMain.handle('updates:check', async () => {
    if (!require('electron').app.isPackaged) {
      return { available: false, current: require('electron').app.getVersion() }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      const current = require('electron').app.getVersion()
      if (!result) return { available: false, current }
      const available = result.updateInfo.version !== current
      return {
        available,
        version: result.updateInfo.version,
        current,
        changelog: String(result.updateInfo.releaseNotes ?? ''),
      }
    } catch {
      return { available: false, current: require('electron').app.getVersion() }
    }
  })

  ipcMain.handle('updates:download', async () => {
    if (!require('electron').app.isPackaged) return false
    try {
      await autoUpdater.downloadUpdate()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('updates:install', () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true)
    }
  })
}
