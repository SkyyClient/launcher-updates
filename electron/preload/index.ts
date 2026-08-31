import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { SkyyAPI } from '../../src/types/global'

function subscribe<T>(channel: string, callback: (payload: T) => void) {
  const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload as T)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: SkyyAPI = {
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  openAppFolder: () => ipcRenderer.invoke('shell:openAppFolder'),

  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  onConsoleLog: (callback) =>
    subscribe('console:log', callback) as ReturnType<SkyyAPI['onConsoleLog']>,

  onDownloadUpdate: (callback) =>
    subscribe('downloads:update', callback) as ReturnType<SkyyAPI['onDownloadUpdate']>,

  getVersions: () => ipcRenderer.invoke('versions:list'),
  getInstalledVersions: () => ipcRenderer.invoke('versions:installed'),
  installVersion: (id) => ipcRenderer.invoke('versions:install', id),
  uninstallVersion: (id) => ipcRenderer.invoke('versions:uninstall', id),
  cancelDownload: (id) => ipcRenderer.invoke('versions:cancelDownload', id),

  detectJava: () => ipcRenderer.invoke('java:detect'),
  getJavaInfo: () => ipcRenderer.invoke('java:detect'),
  getJavaRuntimes: () => ipcRenderer.invoke('java:runtimes'),
  ensureJavaRuntime: (major) => ipcRenderer.invoke('java:ensure', major),
  ensureJavaForVersion: (requiredMajor) =>
    ipcRenderer.invoke('java:ensure-required', requiredMajor),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  getProfiles: () => ipcRenderer.invoke('profiles:list'),
  saveProfile: (profile) => ipcRenderer.invoke('profiles:save', profile),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),

  getNews: () => ipcRenderer.invoke('news:list'),

  launchGame: (profileId) => ipcRenderer.invoke('launch:game', profileId),
  launchVersion: (versionId) => ipcRenderer.invoke('launch:version', versionId),
  getLastVersion: () => ipcRenderer.invoke('lastversion:get'),
  stopGame: () => ipcRenderer.invoke('launch:stop'),
  getGameState: () => ipcRenderer.invoke('game:getState'),
  onGameState: (callback) =>
    subscribe('game:state', callback) as ReturnType<SkyyAPI['onGameState']>,

  microsoftLogin: () => ipcRenderer.invoke('auth:login'),
  getAccount: () => ipcRenderer.invoke('auth:account'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  getDownloads: () => ipcRenderer.invoke('downloads:list'),

  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),

  onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) =>
    subscribe('update:available', cb) as () => void,
  onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) =>
    subscribe('update:progress', cb) as () => void,
  onUpdateReady: (cb: (info: { version: string }) => void) =>
    subscribe('update:ready', cb) as () => void,
  onUpdateError: (cb: (info: { message: string }) => void) =>
    subscribe('update:error', cb) as () => void,

  saveOfflineAccount: (account: { username: string; uuid: string; accessToken: string; avatar?: string; expiresAt?: number }) =>
    ipcRenderer.invoke('auth:save-offline', account),

  discordLogin: () => ipcRenderer.invoke('auth:discord'),

  // Mods (Modrinth)
  searchMods: (query: string, mcVersion?: string, loader?: string, category?: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke('mods:search', query, mcVersion, loader, category, limit, offset),
  getModVersions: (projectId: string, mcVersion?: string, loader?: string) =>
    ipcRenderer.invoke('mods:versions', projectId, mcVersion, loader),
  downloadMod: (version: unknown, filename?: string) =>
    ipcRenderer.invoke('mods:download', version, filename),
  getInstalledMods: () => ipcRenderer.invoke('mods:installed'),
  uninstallMod: (filename: string) => ipcRenderer.invoke('mods:uninstall', filename),
  getModCategories: () => ipcRenderer.invoke('mods:categories'),

  // OptiFine
  getOptifineVersions: () => ipcRenderer.invoke('optifine:versions'),

  // Live news updates
  onNewsUpdate: (cb: (news: never[]) => void) =>
    subscribe('news:update', cb) as () => void,

  // Online tracking
  onOnlineCount: (cb: (count: number) => void) =>
    subscribe('online:count', cb) as () => void,

  // System info
  getSystemRam: () => ipcRenderer.invoke('system:ram'),
  getSystemResolution: () => ipcRenderer.invoke('system:resolution'),
}

contextBridge.exposeInMainWorld('skyy', api)
