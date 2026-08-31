import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import type { GameVersion, InstalledVersion } from '../../../src/types'
import { emitLog } from '../console'

const MINECRAFT_VERSION_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

let cachedVersions: GameVersion[] | null = null
let cacheTime = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function getMinecraftDir(): string {
  const dir = path.join(app.getPath('appData'), '.skyyclient', 'game')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getSkyyClientDir(): string {
  const dir = path.join(app.getPath('appData'), '.skyyclient')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getModsDir(): string {
  const dir = path.join(getSkyyClientDir(), 'mods')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getModpacksDir(): string {
  const dir = path.join(getSkyyClientDir(), 'modpacks')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getReshadeDir(): string {
  const dir = path.join(getSkyyClientDir(), 'reshade')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getResourcePacksDir(): string {
  const dir = path.join(getSkyyClientDir(), 'resourcepacks')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getSavesDir(): string {
  const dir = path.join(getSkyyClientDir(), 'saves')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getScreenshotsDir(): string {
  const dir = path.join(getSkyyClientDir(), 'screenshots')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getLogsDir(): string {
  const dir = path.join(getSkyyClientDir(), 'logs')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getVersionsDir(): string {
  const dir = path.join(getMinecraftDir(), 'versions')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getLibrariesDir(): string {
  const dir = path.join(getMinecraftDir(), 'libraries')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getAssetsDir(): string {
  const dir = path.join(getMinecraftDir(), 'assets')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function isFresh(): boolean {
  return cachedVersions !== null && Date.now() - cacheTime < CACHE_TTL
}

export async function fetchVersions(force = false): Promise<GameVersion[]> {
  if (!force && isFresh() && cachedVersions) {
    return cachedVersions
  }

  emitLog('INFO', 'Fetching Minecraft version manifest')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(MINECRAFT_VERSION_MANIFEST, {
      signal: controller.signal,
      headers: { 'user-agent': 'skyy-client/1.0' },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Manifest request failed: ${res.status}`)
    }

    const manifest = (await res.json()) as {
      versions: GameVersion[]
    }

    cachedVersions = manifest.versions
    cacheTime = Date.now()
    emitLog('INFO', `Loaded ${manifest.versions.length} versions from Mojang`)
    return cachedVersions
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emitLog('ERROR', `Failed to fetch versions: ${message}`)
    throw error
  }
}

export async function getVersionManifestUrl(id: string): Promise<string> {
  const versions = cachedVersions ?? (await fetchVersions())
  const version = versions.find((v) => v.id === id)
  if (!version) throw new Error(`Version not found: ${id}`)
  return version.url ?? `https://piston-meta.mojang.com/mc/game/version/${id}/${id}.json`
}

export function getInstalledVersions(): InstalledVersion[] {
  const versionsDir = getVersionsDir()
  fs.mkdirSync(versionsDir, { recursive: true })
  const installed = fs
    .readdirSync(versionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const all = cachedVersions ?? []
  const result: InstalledVersion[] = all.map((v) => ({
    id: v.id,
    installed: installed.includes(v.id),
    progress: installed.includes(v.id) ? 100 : 0,
    status: installed.includes(v.id) ? 'installed' : 'idle',
  }))

  // Include any locally installed versions not in the manifest
  for (const name of installed) {
    if (!result.some((v) => v.id === name)) {
      result.push({
        id: name,
        installed: true,
        progress: 100,
        status: 'installed',
      })
    }
  }

  return result
}
