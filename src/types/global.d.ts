import type {
  GameVersion,
  InstalledVersion,
  JavaInfo,
  JavaRuntime,
  JavaRuntimeStatus,
  LauncherSettings,
  LauncherUpdate,
  LogEntry,
  MicrosoftAccount,
  MinecraftProfile,
  NewsItem,
  DownloadTask,
} from './index'

export interface SkyyAPI {
  getAppInfo: () => Promise<{ version: string; platform: NodeJS.Platform }>
  openExternal: (url: string) => Promise<void>
  openAppFolder: () => Promise<void>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  onConsoleLog: (callback: (entry: LogEntry) => void) => () => void
  onDownloadUpdate: (callback: (task: DownloadTask) => void) => () => void

  getVersions: () => Promise<GameVersion[]>
  getInstalledVersions: () => Promise<InstalledVersion[]>
  installVersion: (id: string) => Promise<InstalledVersion>
  uninstallVersion: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>

  detectJava: () => Promise<JavaInfo | null>
  getJavaInfo: () => Promise<JavaInfo | null>
  getJavaRuntimes: () => Promise<JavaRuntimeStatus>
  ensureJavaRuntime: (major: number) => Promise<JavaRuntime | null>
  ensureJavaForVersion: (requiredMajor: number) => Promise<JavaRuntime | null>

  getSettings: () => Promise<LauncherSettings | null>
  setSettings: (settings: Partial<LauncherSettings>) => Promise<LauncherSettings>

  getProfiles: () => Promise<MinecraftProfile[]>
  saveProfile: (profile: MinecraftProfile) => Promise<MinecraftProfile[]>
  deleteProfile: (id: string) => Promise<void>

  getNews: () => Promise<NewsItem[]>

  launchGame: (profileId: string) => Promise<{ success: boolean; error?: string }>
  launchVersion: (versionId: string) => Promise<{ success: boolean; error?: string }>
  getLastVersion: () => Promise<string | null>
  stopGame: () => Promise<void>
  getGameState: () => Promise<{ running: boolean; versionId: string | null }>
  onGameState: (callback: (state: { running: boolean; versionId: string | null }) => void) => () => void

  microsoftLogin: () => Promise<MicrosoftAccount | null>
  getAccount: () => Promise<MicrosoftAccount | null>
  logout: () => Promise<void>
  saveOfflineAccount: (account: MicrosoftAccount) => Promise<void>
  discordLogin: () => Promise<MicrosoftAccount | null>

  getDownloads: () => Promise<DownloadTask[]>

  checkForUpdates: () => Promise<LauncherUpdate>
  downloadUpdate: () => Promise<boolean>
  installUpdate: () => Promise<void>
  onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) => () => void
  onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void
  onUpdateReady: (cb: (info: { version: string }) => void) => () => void
  onUpdateError: (cb: (info: { message: string }) => void) => () => void

  // Mods (Modrinth)
  searchMods: (
    query: string,
    mcVersion?: string,
    loader?: string,
    category?: string,
    limit?: number,
    offset?: number
  ) => Promise<{
    mods: Array<{
      slug: string
      title: string
      description: string
      project_type: string
      downloads: number
      icon_url: string | null
      categories: string[]
      versions: string[]
      loaders: string[]
      date_created: string
      date_modified: string
      latest_followers: number
      author: string
      project_id: string
    }>
    total: number
  }>
  getModVersions: (
    projectId: string,
    mcVersion?: string,
    loader?: string
  ) => Promise<Array<{
    id: string
    project_id: string
    name: string
    version_number: string
    changelog: string | null
    date_published: string
    downloads: number
    version_type: 'release' | 'beta' | 'alpha'
    files: Array<{
      hashes: { sha1?: string; sha512?: string }
      url: string
      filename: string
      primary: boolean
      size: number
    }>
    dependencies: unknown[]
  }>>
  downloadMod: (
    version: unknown,
    filename?: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  getInstalledMods: () => Promise<Array<{
    slug: string
    name: string
    version: string
    filename: string
    modrinthId: string
    installedAt: string
  }>>
  uninstallMod: (filename: string) => Promise<{ success: boolean; error?: string }>
  getModCategories: () => Promise<string[]>

  // OptiFine (scraping de optifine.net, sin API oficial)
  getOptifineVersions: () => Promise<Array<{
    version: string
    mcVersion: string
    filename: string
    preview: boolean
  }>>

  // Live news updates
  onNewsUpdate: (cb: (news: NewsItem[]) => void) => () => void

  // Online tracking
  onOnlineCount: (cb: (count: number) => void) => () => void

  // System info
  getSystemRam: () => Promise<{ totalGB: number; totalBytes: number }>
  getSystemResolution: () => Promise<{
    width: number
    height: number
    physicalWidth: number
    physicalHeight: number
    scaleFactor: number
  }>
}

declare global {
  interface Window {
    skyy: SkyyAPI
  }
}

export {}
