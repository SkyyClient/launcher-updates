import fs from 'node:fs'
import path from 'node:path'
import childProcess from 'node:child_process'
import { app } from 'electron'
import { emitLog } from '../console'
import { extractZip } from './unzip'
import { downloadFile } from './downloader'

interface AdoptiumAsset {
  binary: {
    package: { link: string; name: string; checksum?: string }
    image_type: string
    architecture: string
  }
  version: {
    major: number
    minor: number
    semver: string
  }
}

export interface JavaRuntime {
  major: number
  path: string
  javaExe: string
  home: string
  name: string
}

export function getJavaDir(): string {
  const dir = path.join(app.getPath('appData'), '.skyyclient', 'java')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function listInstalledRuntimes(): JavaRuntime[] {
  const javaDir = getJavaDir()
  const runtimes: JavaRuntime[] = []
  if (!fs.existsSync(javaDir)) return runtimes
  for (const entry of fs.readdirSync(javaDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const major = parseInt(entry.name, 10)
    if (isNaN(major)) continue
    const found = findJavaInDir(path.join(javaDir, entry.name))
    if (found) {
      runtimes.push({
        major,
        path: found,
        javaExe: found,
        home: path.dirname(path.dirname(found)),
        name: `Java ${major}`,
      })
    }
  }
  return runtimes.sort((a, b) => a.major - b.major)
}

function findJavaInDir(dir: string): string | null {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java'
  const candidates = [
    path.join(dir, 'bin', exe),
    path.join(dir, 'jdk', 'bin', exe),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  // Search one level deep (Adoptium zip nests jdk-<ver> folder)
  let entries: string[] = []
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return null
  }
  for (const e of entries) {
    const nested = path.join(dir, e, 'bin', exe)
    if (fs.existsSync(nested)) return nested
    const nested2 = path.join(dir, e)
    for (const sub of fs.readdirSync(nested2)) {
      const deep = path.join(nested2, sub, 'bin', exe)
      if (fs.existsSync(deep)) return deep
    }
  }
  return null
}

function platformName(): string {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'mac'
  return 'linux'
}

function archName(): string {
  return process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'aarch64' : 'x64'
}

/** Map a Minecraft-required Java major to the Adoptium feature version. */
function featureVersion(major: number): number {
  if (major >= 25) return 25
  if (major >= 21) return 21
  if (major >= 17) return 17
  if (major >= 16) return 17
  if (major >= 11) return 17
  return 8
}

export { featureVersion }

/** Whether a detected Java major satisfies a Minecraft-required Java major. */
export function compatibleMajor(detectedMajor: number, requiredMajor: number): boolean {
  // Same feature tier is always fine; a newer standard JDK also satisfies older reqs
  // only when the required version is a standard LTS. For safety, require exact feature match.
  return featureVersion(detectedMajor) === featureVersion(requiredMajor)
}

/** Bundled runtimes installed locally that satisfy the required Java major. */
export function listCompatibleRuntimes(requiredMajor: number): JavaRuntime[] {
  const want = featureVersion(requiredMajor)
  return listInstalledRuntimes().filter((r) => r.major === want)
}

async function resolveDownloadUrl(major: number): Promise<string> {
  const feature = featureVersion(major)
  const os = platformName()
  const arch = archName()
  const url =
    `https://api.adoptium.net/v3/assets/latest/${feature}/hotspot` +
    `?os=${os}&architecture=${arch}&image_type=jdk&vendor=eclipse`
  emitLog('INFO', `Resolving Java ${feature} download from Adoptium`)
  const res = await fetch(url, { headers: { 'user-agent': 'skyy-client/1.0' } })
  if (!res.ok) throw new Error(`Adoptium API failed: ${res.status}`)
  const assets = (await res.json()) as AdoptiumAsset[]
  const zipAsset = assets.find(
    (a) => a.binary.architecture === arch && a.binary.package.link.endsWith('.zip')
  )
  const chosen = zipAsset ?? assets[0]
  if (!chosen?.binary?.package?.link) throw new Error('No Adoptium asset available')
  return chosen.binary.package.link
}

/**
 * Ensure a Java runtime of the given major is installed under .skyyclient/java.
 * Returns the runtime, downloading it if needed.
 */
export async function ensureJavaRuntime(major: number): Promise<JavaRuntime | null> {
  const runtimes = listInstalledRuntimes()
  const local = runtimes.find((r) => r.major === featureVersion(major))
  if (local) {
    emitLog('INFO', `Using bundled Java ${local.major} at ${local.javaExe}`)
    return local
  }

  const feature = featureVersion(major)
  const targetDir = path.join(getJavaDir(), String(feature))
  const dlUrl = await resolveDownloadUrl(major)

  const archivePath = path.join(getJavaDir(), `.download-${feature}.zip`)
  fs.mkdirSync(targetDir, { recursive: true })

  emitLog('INFO', `Downloading Java ${feature} runtime...`)
  try {
    await downloadFile(dlUrl, archivePath, {
      taskId: `java-${feature}`,
      name: `Java ${feature} runtime`,
      category: 'java',
    })
  } catch (error) {
    emitLog('ERROR', `Java download failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }

  try {
    const buffer = fs.readFileSync(archivePath)
    extractZip(buffer, targetDir, [])
    fs.rmSync(archivePath, { force: true })
  } catch (error) {
    emitLog('ERROR', `Java extraction failed: ${error instanceof Error ? error.message : String(error)}`)
    fs.rmSync(archivePath, { force: true })
    return null
  }

  const javaExe = findJavaInDir(targetDir)
  if (!javaExe) {
    emitLog('ERROR', 'Java archive extracted but no java.exe found')
    return null
  }
  emitLog('INFO', `Java ${feature} installed at ${javaExe}`)
  return {
    major: feature,
    path: javaExe,
    javaExe,
    home: path.dirname(path.dirname(javaExe)),
    name: `Java ${feature}`,
  }
}

export async function getJavaRuntimeStatus(): Promise<{
  runtimes: JavaRuntime[]
  systemRuntimes: Array<{ major: number; path: string }>
}> {
  return {
    runtimes: listInstalledRuntimes(),
    systemRuntimes: detectSystemJavaVersions(),
  }
}

export function detectSystemJavaVersions(): Array<{ major: number; path: string }> {
  const { probe } = require('./java') as { probe?: (p: string) => number | null }
  const out: Array<{ major: number; path: string }> = []
  if (typeof probe === 'function') {
    const r = [process.env.JAVA_HOME, 'java'].filter(Boolean) as string[]
    for (const c of r) {
      let p = c
      if (c === 'java') {
        try {
          p = childProcess
            .spawnSync('where', ['java'], { shell: true, encoding: 'utf-8' })
            .stdout?.split(/\r?\n/)[0] || 'java'
        } catch {
          p = 'java'
        }
      }
      const major = probe(p)
      if (major) out.push({ major, path: p })
    }
  }
  return out
}
