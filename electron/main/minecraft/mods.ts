import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { emitLog } from '../console'

const MODRINTH_API = 'https://api.modrinth.com/v2'
const USER_AGENT = 'skyy-client/1.0 (contact@skyyclient.com)'

// ─── Types ──────────────────────────────────────────────────

export interface ModrinthSearchResult {
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
}

export interface ModrinthSearchResponse {
  hits: ModrinthSearchResult[]
  offset: number
  limit: number
  total_hits: number
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  changelog: string | null
  date_published: string
  downloads: number
  version_type: 'release' | 'beta' | 'alpha'
  files: ModrinthFile[]
  dependencies: unknown[]
}

export interface ModrinthFile {
  hashes: { sha1?: string; sha512?: string }
  url: string
  filename: string
  primary: boolean
  size: number
}

export interface InstalledMod {
  slug: string
  name: string
  version: string
  filename: string
  modrinthId: string
  installedAt: string
}

// ─── Helpers ────────────────────────────────────────────────

function getModsDir(): string {
  const dir = path.join(app.getPath('appData'), '.skyyclient', 'mods')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getInstalledModsFile(): string {
  return path.join(getModsDir(), 'installed.json')
}

function loadInstalledMods(): InstalledMod[] {
  try {
    const file = getInstalledModsFile()
    if (!fs.existsSync(file)) return []
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as InstalledMod[]
  } catch {
    return []
  }
}

function saveInstalledMods(mods: InstalledMod[]) {
  const file = getInstalledModsFile()
  fs.writeFileSync(file, JSON.stringify(mods, null, 2), 'utf-8')
}

// ─── Modrinth API ───────────────────────────────────────────

async function modrinthFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  let url = MODRINTH_API + endpoint
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    url += '?' + qs
  }
  emitLog('INFO', `Modrinth fetch: ${url}`)
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    emitLog('ERROR', `Modrinth ${res.status}: ${body.substring(0, 200)}`)
    throw new Error(`Modrinth API error: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export async function searchMods(
  query: string,
  mcVersion?: string,
  loader?: string,
  category?: string,
  limit = 30,
  offset = 0
): Promise<{ mods: ModrinthSearchResult[]; total: number }> {
  const facets: string[][] = []
  if (mcVersion) facets.push([`versions:${mcVersion}`])
  if (loader && loader !== 'vanilla') facets.push([`loaders:${loader}`])
  if (category) facets.push([`categories:${category}`])

  const params: Record<string, string> = {
    query,
    limit: String(limit),
    offset: String(offset),
    index: 'relevance',
  }
  if (facets.length > 0) {
    params.facets = JSON.stringify(facets)
  }

  emitLog('INFO', `Searching Modrinth: "${query}" v=${mcVersion} loader=${loader}`)
  const data = await modrinthFetch<ModrinthSearchResponse>('/search', params)
  return { mods: data.hits, total: data.total_hits }
}

export async function getModVersions(
  projectId: string,
  mcVersion?: string,
  loader?: string
): Promise<ModrinthVersion[]> {
  const params: Record<string, string> = {}
  if (mcVersion) params.game_versions = JSON.stringify([mcVersion])
  if (loader && loader !== 'vanilla') params.loaders = JSON.stringify([loader])

  emitLog('INFO', `Fetching versions for mod ${projectId}`)
  return modrinthFetch<ModrinthVersion[]>(`/project/${projectId}/version`, params)
}

export async function downloadMod(
  version: ModrinthVersion,
  filename?: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = version.files.find((f) => f.primary) || version.files[0]
    if (!file) return { success: false, error: 'No hay archivos para descargar' }

    const modsDir = getModsDir()
    const destPath = path.join(modsDir, file.filename)

    emitLog('INFO', `Downloading mod: ${file.filename} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)

    const res = await fetch(file.url, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return { success: false, error: `Error HTTP ${res.status}` }

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(destPath, buffer)

    // Register as installed
    const installed = loadInstalledMods()
    installed.push({
      slug: version.project_id,
      name: version.name,
      version: version.version_number,
      filename: file.filename,
      modrinthId: version.project_id,
      installedAt: new Date().toISOString(),
    })
    saveInstalledMods(installed)

    emitLog('INFO', `Mod installed: ${file.filename}`)
    return { success: true, path: destPath }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emitLog('ERROR', `Download failed: ${msg}`)
    return { success: false, error: msg }
  }
}

export function getInstalledMods(): InstalledMod[] {
  return loadInstalledMods()
}

export function uninstallMod(filename: string): { success: boolean; error?: string } {
  try {
    const modsDir = getModsDir()
    const filePath = path.join(modsDir, filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    const installed = loadInstalledMods()
    const updated = installed.filter((m) => m.filename !== filename)
    saveInstalledMods(updated)

    emitLog('INFO', `Mod uninstalled: ${filename}`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export const MOD_CATEGORIES = [
  'fabric',
  'forge',
  'neoforge',
  'quilt',
  'performance',
  'optimization',
  'technology',
  'magic',
  'adventure',
  'rpg',
  'utility',
  'decoration',
  'library',
  'storage',
  'transport',
  'worldgen',
  'cosmetic',
  'food',
  'game-mechanics',
  'redstone',
  'crafting',
  'mobs',
  'dimensons',
]
