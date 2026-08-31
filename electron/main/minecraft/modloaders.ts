import fs from 'node:fs'
import path from 'node:path'
import { getVersionsDir } from './versions'
import { emitLog } from '../console'
import type { ModLoader } from '../../../src/types'

const FABRIC_META = 'https://meta.fabricmc.net/v2'
const FABRIC_MAVEN = 'https://maven.fabricmc.net'

interface FabricLoader {
  loader: { version: string }
  intermediary: { version: string }
  launcherMeta: {
    libraries: Array<{
      name: string
      url: string
    }>
    mainClass: {
      client: string
    }
  }
}

export async function installModLoader(
  minecraftVersion: string,
  loader: ModLoader
): Promise<boolean> {
  switch (loader) {
    case 'fabric':
      return installFabric(minecraftVersion)
    case 'forge':
      return installForge(minecraftVersion)
    case 'neoforge':
      return installNeoForge(minecraftVersion)
    case 'quilt':
      return installQuilt(minecraftVersion)
    default:
      return true // vanilla needs no extra install
  }
}

async function installFabric(minecraftVersion: string): Promise<boolean> {
  emitLog('INFO', `Installing Fabric for ${minecraftVersion}`)

  // Get latest loader
  const loaderResp = await fetch(`${FABRIC_META}/versions/loader/${minecraftVersion}`)
  if (!loaderResp.ok) {
    emitLog('ERROR', `No Fabric loader available for ${minecraftVersion}`)
    return false
  }
  const loaders = (await loaderResp.json()) as FabricLoader[]
  if (loaders.length === 0) {
    emitLog('ERROR', `No Fabric loader available for ${minecraftVersion}`)
    return false
  }

  const latest = loaders[0]
  const loaderVer = latest.loader.version
  const intermediaryVer = latest.intermediary.version

  emitLog('INFO', `Fabric loader ${loaderVer}`)

  // Build the fabric version json by extending the base version
  const baseJsonPath = path.join(getVersionsDir(), minecraftVersion, `${minecraftVersion}.json`)
  if (!fs.existsSync(baseJsonPath)) {
    emitLog('ERROR', `${minecraftVersion} must be installed before Fabric`)
    return false
  }

  const baseJson = JSON.parse(fs.readFileSync(baseJsonPath, 'utf-8')) as Record<string, unknown>

  const fabricVersionId = `${minecraftVersion}-fabric-${loaderVer}`
  const fabricDir = path.join(getVersionsDir(), fabricVersionId)
  fs.mkdirSync(fabricDir, { recursive: true })

  await download(
    `${FABRIC_META}/v2/versions/loader/${minecraftVersion}/${loaderVer}/${intermediaryVer}/profile/json`,
    path.join(fabricDir, `${fabricVersionId}.json`)
  )

  // Download the loader libraries into libraries dir
  const libraries = latest.launcherMeta.libraries ?? []
  const libsDir = path.join(getVersionsDir(), '..', 'libraries')
  for (const lib of libraries) {
    const nameParts = lib.name.split(':')
    const artifactPath = nameParts
      .slice(0, -1)
      .join('/')
      .replace(/\./g, '/') + '/' + nameParts[nameParts.length - 1] + '.jar'
    const dest = path.join(libsDir, artifactPath)
    if (fs.existsSync(dest)) continue
    const url = lib.url.replace(/\/$/, '') + '/' + artifactPath
    await download(url, dest)
  }

  emitLog('INFO', `Fabric installed as ${fabricVersionId}`)
  return true
}

async function installForge(minecraftVersion: string): Promise<boolean> {
  emitLog('INFO', `Installing Forge for ${minecraftVersion}`)
  // Placeholder - Forge requires version-specific installer jars.
  // We emit a clear message since automated Forge install is version-specific.
  emitLog(
    'WARNING',
    'Forge installation requires a version-specific installer. ' +
      'Use the official Forge installer (https://files.minecraftforge.net/) and point SKYY to the installed version.'
  )
  return false
}

async function installNeoForge(minecraftVersion: string): Promise<boolean> {
  emitLog('INFO', `Installing NeoForge for ${minecraftVersion}`)
  emitLog(
    'WARNING',
    'NeoForge requires a version-specific installer. ' +
      'Use the official NeoForge installer and point SKYY to the installed version.'
  )
  return false
}

async function installQuilt(minecraftVersion: string): Promise<boolean> {
  emitLog('INFO', `Installing Quilt for ${minecraftVersion}`)
  emitLog(
    'WARNING',
    'Quilt requires the Quilt installer. See https://quiltmc.org/en/install/'
  )
  return false
}

async function download(url: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const res = await fetch(url, { headers: { 'user-agent': 'skyy-client/1.0' } })
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
}

export function getModLoaderInstalledVersions(): string[] {
  const versionsDir = getVersionsDir()
  if (!fs.existsSync(versionsDir)) return []
  return fs
    .readdirSync(versionsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /fabric|forge|neoforge|quilt/i.test(e.name))
    .map((e) => e.name)
}
