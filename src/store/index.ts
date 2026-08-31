import { create } from 'zustand'
import type {
  GameVersion,
  InstalledVersion,
  MicrosoftAccount,
  MinecraftProfile,
  NewsItem,
  JavaInfo,
  LauncherSettings,
  DownloadTask,
  LogEntry,
  LauncherUpdate,
} from '@/types'

function offlineUuid(name: string): string {
  const input = 'OfflinePlayer:' + name
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return '00000000-0000-0000-0000-' + Math.abs(hash).toString(16).padStart(12, '0').slice(-12)
}

interface SkyyState {
  // bootstrap state
  initialized: boolean
  bootError: string | null

  // account
  account: MicrosoftAccount | null

  // versions
  versions: GameVersion[]
  installedVersions: InstalledVersion[]
  versionsLoading: boolean
  versionsError: string | null

  // java
  java: JavaInfo | null
  javaChecked: boolean

  // profiles
  profiles: MinecraftProfile[]

  // settings
  settings: LauncherSettings | null

  // news
  news: NewsItem[]

  // download tasks
  tasks: DownloadTask[]

  // console logs
  logs: LogEntry[]

  // updater
  update: LauncherUpdate

  // game state
  gameRunning: boolean
  gameVersionId: string | null

  // actions
  bootstrap: () => Promise<void>
  setAccount: (account: MicrosoftAccount | null) => void
  setVersions: (versions: GameVersion[]) => void
  setInstalledVersions: (versions: InstalledVersion[]) => void
  setJava: (java: JavaInfo | null) => void
  setProfiles: (profiles: MinecraftProfile[]) => void
  setSettings: (settings: LauncherSettings) => void
  setNews: (news: NewsItem[]) => void
  setTasks: (tasks: DownloadTask[]) => void
  upsertTask: (task: DownloadTask) => void
  addLog: (entry: LogEntry) => void
  setLogs: (entries: LogEntry[]) => void
  setUpdate: (update: LauncherUpdate) => void
  logout: () => Promise<void>
  loginOffline: (name: string) => void
  loginDiscord: () => Promise<void>
  setGameRunning: (running: boolean, versionId: string | null) => void
}

export const useSkyyStore = create<SkyyState>((set, get) => ({
  initialized: false,
  bootError: null,

  account: null,
  versions: [],
  installedVersions: [],
  versionsLoading: false,
  versionsError: null,

  java: null,
  javaChecked: false,

  profiles: [],
  settings: null,
  news: [],
  tasks: [],
  logs: [],
  update: { available: false },
  gameRunning: false,
  gameVersionId: null,

  bootstrap: async () => {
    try {
      const api = window.skyy

      const results = await Promise.allSettled([
        api.getAccount(),
        api.getVersions().catch(() => []),
        api.getInstalledVersions().catch(() => []),
        api.detectJava().catch(() => null),
        api.getProfiles().catch(() => []),
        api.getSettings().catch(() => null),
        api.getNews().catch(() => []),
        api.getDownloads().catch(() => []),
        api.checkForUpdates().catch(() => ({ available: false })),
        api.getGameState().catch(() => ({ running: false, versionId: null })),
      ])

      set({
        account: results[0].status === 'fulfilled' ? results[0].value : null,
        versions: results[1].status === 'fulfilled' ? results[1].value : [],
        installedVersions: results[2].status === 'fulfilled' ? results[2].value : [],
        java: results[3].status === 'fulfilled' ? results[3].value : null,
        javaChecked: true,
        profiles: results[4].status === 'fulfilled' ? results[4].value : [],
        settings: results[5].status === 'fulfilled' ? results[5].value : null,
        news: results[6].status === 'fulfilled' ? results[6].value : [],
        tasks: results[7].status === 'fulfilled' ? results[7].value : [],
        update: results[8].status === 'fulfilled' ? results[8].value : { available: false },
        gameRunning: results[9].status === 'fulfilled' ? results[9].value.running : false,
        gameVersionId: results[9].status === 'fulfilled' ? results[9].value.versionId : null,
        initialized: true,
      })

      // Subscribe to streams
      window.skyy.onConsoleLog?.((entry) => get().addLog(entry))
      window.skyy.onGameState?.((state) => get().setGameRunning(state.running, state.versionId))
      window.skyy.onNewsUpdate?.((fresh) => get().setNews(fresh as NewsItem[]))
    } catch (error) {
      console.error('bootstrap error', error)
      set({
        initialized: true,
        bootError: error instanceof Error ? error.message : String(error),
      })
    }
  },

  setAccount: (account) => set({ account }),

  setVersions: (versions) => set({ versions }),

  setInstalledVersions: (installedVersions) => set({ installedVersions }),

  setJava: (java) => set({ java }),

  setProfiles: (profiles) => set({ profiles }),

  setSettings: (settings) => set({ settings }),

  setNews: (news) => set({ news }),

  setTasks: (tasks) => set({ tasks }),

  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((t) => t.id === task.id)
      return {
        tasks: exists
          ? state.tasks.map((t) => (t.id === task.id ? task : t))
          : [...state.tasks, task],
      }
    }),

  addLog: (entry) =>
    set((state) => ({
      logs: [...state.logs.slice(-400), entry],
    })),

  setLogs: (logs) => set({ logs }),

  setUpdate: (update) => set({ update }),

  setGameRunning: (running, versionId) => set({ gameRunning: running, gameVersionId: versionId }),

  logout: async () => {
    await window.skyy.logout()
    set({ account: null })
  },

  loginOffline: (name: string) => {
    const offlineAccount: MicrosoftAccount = {
      username: name,
      uuid: offlineUuid(name),
      accessToken: 'offline',
      avatar: undefined,
      expiresAt: undefined,
    }
    window.skyy.saveOfflineAccount(offlineAccount)
    set({ account: offlineAccount })
  },

  loginDiscord: async () => {
    const result = await window.skyy.discordLogin()
    if (result) {
      set({ account: result })
    }
  },
}))
