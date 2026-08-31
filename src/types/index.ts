export type ModLoader = 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'

export type VersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha'

export interface GameVersion {
  id: string
  type: VersionType
  releaseTime: string
  url?: string
}

export interface InstalledVersion {
  id: string
  installed: boolean
  progress: number
  status: 'idle' | 'downloading' | 'installing' | 'installed' | 'error' | 'cancelled'
  modLoader?: ModLoader
}

export interface JavaInfo {
  path: string
  version: number
  detected: boolean
}

export interface JavaRuntime {
  major: number
  path: string
  javaExe: string
  home: string
  name: string
}

export interface JavaRuntimeStatus {
  runtimes: JavaRuntime[]
  systemRuntimes: Array<{ major: number; path: string }>
}

export interface NewsItem {
  id: string
  title: string
  description: string
  image: string
  date: string
  category: string
}

export interface MinecraftProfile {
  id: string
  name: string
  version: string
  modLoader: ModLoader
  modLoaderVersion?: string
  gameDir: string
  memory: number // in GB
  jvmArgs: string[]
  resolution: { width: number; height: number }
  mods: string[]
  javaPath?: string
  created: string
}

export interface MicrosoftAccount {
  username: string
  uuid: string
  accessToken: string
  refreshToken?: string
  avatar?: string
  expiresAt?: number
}

export interface LauncherSettings {
  theme: 'sky' | 'dark' | 'light'
  language: string
  memory: number
  autoLogin: boolean
  closeBehavior: 'quit' | 'minimize'
  resolution: { width: number; height: number }
  gameDir: string
}

export interface DownloadTask {
  id: string
  name: string
  current: number
  total: number
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled'
  speed: number
  category: 'libraries' | 'assets' | 'client' | 'version' | 'modpack' | 'launcher' | 'java'
}

export interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  message: string
}

export interface LauncherUpdate {
  available: boolean
  version?: string
  current?: string
  changelog?: string
}

export type Page = 'home' | 'play' | 'versions' | 'mods' | 'installations' | 'news' | 'novedades' | 'shop' | 'forum' | 'settings' | 'account' | 'downloads' | 'console'
