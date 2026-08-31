import { app, BrowserWindow, ipcMain, Menu, shell, screen, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'
import {
  fetchVersions,
  getInstalledVersions,
} from './minecraft/versions'
import { installVersion, uninstallVersion } from './minecraft/installer'
import { cancelTask, getTasks, pauseTask, subscribeToTasks } from './minecraft/downloader'
import { detectJava, validateJavaPath } from './minecraft/java'
import { ensureJavaRuntime, getJavaRuntimeStatus, listCompatibleRuntimes } from './minecraft/java-runtime'
import { launchProfile, launchVersion, getLastVersion, stopGame, isGameRunning, getGameVersionId, setGameStateChangedCallback } from './minecraft/launcher'
import { installModLoader } from './minecraft/modloaders'
import { fetchOptifineVersions } from './minecraft/optifine'
import { getSettings, setSettings, getProfiles, saveProfile, deleteProfile } from './database/database'
import {
  microsoftLogin,
  getStoredAccount,
  logoutAccount,
} from './auth/microsoft'
import { discordLogin } from './auth/discord'
import { emitLog, getRecentLogs, subscribeToLogs, clearLogBuffer } from './console'
import { getNews } from '../data/news'
import { registerUpdateIpc, startUpdateCheck, setUpdateSender } from './updates'
import { startRichPresence, setPlaying, setIdle, stopRichPresence } from './rpc'
import { startOnlineTracking, setOnlineSender, getOnlineCount } from './online'
import { searchMods, getModVersions, downloadMod, getInstalledMods, uninstallMod, MOD_CATEGORIES } from './minecraft/mods'
import type { DownloadTask } from '../../src/types'

const VERSION = app.getVersion()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const isDev = !app.isPackaged
  const devIcon = path.join(__dirname, '../../public/icono.png')
  const prodIcon = path.join(process.resourcesPath, 'icono.png')
  const iconPath = fs.existsSync(prodIcon)
    ? prodIcon
    : fs.existsSync(devIcon)
    ? devIcon
    : path.join(__dirname, '../../../src/img/logo.ico')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#050816',
    title: 'SKYY CLIENT',
    frame: false,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Notify renderer when game process starts/stops
  setGameStateChangedCallback((running, versionId) => {
    mainWindow?.webContents.send('game:state', { running, versionId })
    // Actualizar el Rich Presence de Discord
    if (running && versionId) setPlaying(versionId)
    else setIdle()
  })
}

function registerIpc() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url)
    }
  })

  // Abre la carpeta de datos del launcher (%appdata%/.skyyclient) en el explorador.
  ipcMain.handle('shell:openAppFolder', async () => {
    const dir = path.join(app.getPath('appData'), '.skyyclient')
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {
      /* la carpeta ya existe */
    }
    const error = await shell.openPath(dir)
    if (error) emitLog('ERROR', `No se pudo abrir la carpeta: ${error}`)
  })

  ipcMain.handle('app:info', () => ({
    version: VERSION,
    platform: process.platform,
  }))

  // Console
  ipcMain.handle('console:recent', () => getRecentLogs())
  ipcMain.handle('console:clear', () => {
    clearLogBuffer()
  })

  // Versions
  ipcMain.handle('versions:list', () => fetchVersions())
  ipcMain.handle('versions:installed', () => {
    // Ensure the version list is loaded so statuses are complete
    return getInstalledVersions()
  })
  ipcMain.handle('versions:install', (_e, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid version id')
    return installVersion(id)
  })
  ipcMain.handle('versions:uninstall', (_e, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid version id')
    uninstallVersion(id)
  })
  ipcMain.handle('versions:cancelDownload', (_e, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid id')
    cancelTask(id)
  })

  // OptiFine (scraping de optifine.net, no hay API oficial)
  ipcMain.handle('optifine:versions', () => fetchOptifineVersions())

  // Mod loaders
  ipcMain.handle('modloaders:install', (_e, version: string, loader: string) => {
    if (typeof version !== 'string' || typeof loader !== 'string') {
      throw new Error('Invalid args')
    }
    return installModLoader(version, loader as never)
  })

  // Java
  ipcMain.handle('java:detect', () => detectJava())
  ipcMain.handle('java:validate', (_e, p: string) => validateJavaPath(String(p)))
  ipcMain.handle('java:runtimes', () => getJavaRuntimeStatus())
  ipcMain.handle('java:ensure', (_e, major: number) => ensureJavaRuntime(Number(major)))
  ipcMain.handle('java:ensure-required', async (_e, requiredMajor: number) => {
    const compatible = listCompatibleRuntimes(Number(requiredMajor))
    if (compatible.length > 0) return compatible[0]
    return ensureJavaRuntime(Number(requiredMajor))
  })

  // Settings
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: unknown) => {
    if (!patch || typeof patch !== 'object') throw new Error('Invalid settings')
    setSettings(patch as never)
    return getSettings()
  })

  // Profiles
  ipcMain.handle('profiles:list', () => getProfiles())
  ipcMain.handle('profiles:save', (_e, profile: unknown) => {
    if (!profile || typeof profile !== 'object') throw new Error('Invalid profile')
    saveProfile(profile as never)
    return getProfiles()
  })
  ipcMain.handle('profiles:delete', (_e, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid profile id')
    deleteProfile(id)
  })

  // News
  ipcMain.handle('news:list', () => getNews())

  // Launch
  ipcMain.handle('launch:game', (_e, profileId: string) => {
    if (typeof profileId !== 'string') throw new Error('Invalid profile id')
    return launchProfile(profileId)
  })
  ipcMain.handle('launch:version', (_e, versionId: string) => {
    if (typeof versionId !== 'string') throw new Error('Invalid version id')
    return launchVersion(versionId)
  })
  ipcMain.handle('lastversion:get', () => getLastVersion())
  ipcMain.handle('launch:stop', () => stopGame())
  ipcMain.handle('game:getState', () => ({
    running: isGameRunning(),
    versionId: getGameVersionId(),
  }))

  // Auth
  ipcMain.handle('auth:login', () => microsoftLogin())
  ipcMain.handle('auth:account', () => getStoredAccount())
  ipcMain.handle('auth:logout', () => logoutAccount())
  ipcMain.handle('auth:save-offline', (_e, account: unknown) => {
    if (!account || typeof account !== 'object') throw new Error('Invalid account')
    const { storeAccount } = require('./auth/token-store')
    storeAccount(account)
  })
  ipcMain.handle('auth:discord', async () => {
    return discordLogin()
  })

  // Downloads
  ipcMain.handle('downloads:list', () => getTasks())
  ipcMain.handle('downloads:pause', (_e, id: string) => {
    pauseTask(id)
  })
  ipcMain.handle('downloads:cancel', (_e, id: string) => {
    cancelTask(id)
  })

  // Mods (Modrinth)
  ipcMain.handle('mods:search', async (_e, query: string, mcVersion?: string, loader?: string, category?: string, limit?: number, offset?: number) => {
    return searchMods(query, mcVersion, loader, category, limit, offset)
  })
  ipcMain.handle('mods:versions', async (_e, projectId: string, mcVersion?: string, loader?: string) => {
    return getModVersions(projectId, mcVersion, loader)
  })
  ipcMain.handle('mods:download', async (_e, version: unknown, filename?: string) => {
    return downloadMod(version as never, filename)
  })
  ipcMain.handle('mods:installed', () => getInstalledMods())
  ipcMain.handle('mods:uninstall', (_e, filename: string) => uninstallMod(filename))
  ipcMain.handle('mods:categories', () => MOD_CATEGORIES)

  // System info
  ipcMain.handle('system:ram', () => {
    const totalBytes = os.totalmem()
    const totalGB = Math.floor(totalBytes / (1024 * 1024 * 1024))
    return { totalGB, totalBytes }
  })
  ipcMain.handle('system:resolution', () => {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    const factor = primaryDisplay.scaleFactor
    return {
      width: Math.floor(width / factor),
      height: Math.floor(height / factor),
      physicalWidth: width,
      physicalHeight: height,
      scaleFactor: factor,
    }
  })
}

export function sendToRenderer(channel: string, payload: unknown) {
  mainWindow?.webContents.send(channel, payload)
}

function broadcastTasks() {
  subscribeToTasks((task: DownloadTask) => {
    sendToRenderer('downloads:update', task)
  })
}

function broadcastLogs() {
  subscribeToLogs((entry) => {
    sendToRenderer('console:log', entry)
  })
}

// ── Verificación de integridad de bytecode ──────────────────
function getJscHashes(): Record<string, string> {
  const electronDir = path.join(__dirname)
  const hashes: Record<string, string> = {}
  const scanDir = (dir: string) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) scanDir(full)
        else if (entry.name.endsWith('.jsc')) {
          const content = fs.readFileSync(full)
          hashes[path.relative(__dirname, full)] = crypto.createHash('sha256').update(content).digest('hex')
        }
      }
    } catch { /* dir may not exist */ }
  }
  scanDir(electronDir)
  return hashes
}

function saveIntegrity(integrityFile: string, hashes: Record<string, string>) {
  fs.mkdirSync(path.dirname(integrityFile), { recursive: true })
  const key = crypto.scryptSync(app.getPath('exe'), 'skyy-integrity', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const payload = JSON.stringify({ version: app.getVersion(), hashes })
  let enc = cipher.update(payload, 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag()
  fs.writeFileSync(integrityFile, JSON.stringify({ iv: iv.toString('hex'), data: enc, tag: tag.toString('hex') }))
}

function checkIntegrity(): boolean {
  if (!app.isPackaged) return true
  const integrityFile = path.join(app.getPath('appData'), '.skyyclient', 'integrity.dat')
  const current = getJscHashes()
  if (Object.keys(current).length === 0) return true

  try {
    if (!fs.existsSync(integrityFile)) {
      saveIntegrity(integrityFile, current)
      return true
    }

    const raw = JSON.parse(fs.readFileSync(integrityFile, 'utf-8'))
    const key = crypto.scryptSync(app.getPath('exe'), 'skyy-integrity', 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(raw.tag, 'hex'))
    let out = decipher.update(raw.data, 'hex', 'utf8')
    out += decipher.final('utf8')
    const stored = JSON.parse(out) as { version?: string; hashes?: Record<string, string> }

    if (stored.version !== app.getVersion()) {
      saveIntegrity(integrityFile, current)
      return true
    }

    const storedHashes = stored.hashes ?? (stored as unknown as Record<string, string>)
    for (const [file, hash] of Object.entries(storedHashes)) {
      if (current[file] && current[file] !== hash) {
        emitLog('ERROR', `Integrity check failed: ${file}`)
        return false
      }
    }
    return true
  } catch {
    return true
  }
}

// ── Anti-debug ──────────────────────────────────────────────
function setupAntiDebug(win: BrowserWindow) {
  if (!app.isPackaged) return
  for (const arg of process.execArgv) {
    if (arg.includes('--inspect') || arg.includes('--inspect-brk')) {
      emitLog('WARNING', 'Debug flags detected in execArgv')
    }
  }
  setInterval(() => {
    try {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      }
    } catch { /* window may be destroyed */ }
  }, 5_000)
}

app.whenReady().then(() => {
  if (!checkIntegrity()) {
    dialog.showErrorBox('SKYY CLIENT', 'Se detectó una modificación no autorizada. La aplicación se cerrará.')
    app.quit()
    return
  }

  registerIpc()
  setUpdateSender(sendToRenderer)
  setOnlineSender(sendToRenderer)
  registerUpdateIpc()
  broadcastTasks()
  broadcastLogs()

  void fetchVersions().catch(() => {
    /* network may be offline; UI handles errors */
  })

  emitLog('INFO', `Starting SKYY Client v${VERSION}`)
  emitLog('INFO', `Platform: ${process.platform}`)

  createWindow()

  if (mainWindow) setupAntiDebug(mainWindow)

  startRichPresence()

  setInterval(async () => {
    try {
      const fresh = await getNews()
      sendToRenderer('news:update', fresh)
    } catch {}
  }, 1_000)

  startOnlineTracking()

  setTimeout(() => startUpdateCheck(), 4000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopRichPresence()
  if (process.platform !== 'darwin') app.quit()
})

Menu.setApplicationMenu(null)
