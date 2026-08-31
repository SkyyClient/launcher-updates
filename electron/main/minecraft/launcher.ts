import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import type { MinecraftProfile, MicrosoftAccount } from '../../../src/types'
import { getVersionsDir, getMinecraftDir, getLibrariesDir, getAssetsDir } from './versions'
import { getStoredAccount } from '../auth/microsoft'
import { emitLog } from '../console'
import { evalRules, currentOs, nativeLibApplies } from './platform'

interface Artifact {
  path?: string
}

interface Library {
  name?: string
  downloads?: { artifact?: Artifact; classifiers?: Record<string, Artifact> }
  natives?: Record<string, string>
  rules?: Array<{ action?: string; os?: { name?: string; arch?: string } }>
}

interface VersionManifest {
  id: string
  mainClass: string
  libraries: Library[]
  assetIndex: { id: string }
  arguments?: {
    game?: Array<
      | string
      | { rules?: Array<{ action: string; os?: { name?: string; arch?: string } }>; value: string | string[] }
    >
    jvm?: Array<
      | string
      | { rules?: Array<{ action: string; os?: { name?: string; arch?: string } }>; value: string | string[] }
    >
  }
  minecraftArguments?: string
  javaVersion?: { majorVersion: number }
}

let gameProcess: ChildProcess | null = null
let gameVersionId: string | null = null
let onGameStateChanged: ((running: boolean, versionId: string | null) => void) | null = null

export function isGameRunning(): boolean {
  return gameProcess !== null
}

export function getGameVersionId(): string | null {
  return gameVersionId
}

export function setGameStateChangedCallback(cb: (running: boolean, versionId: string | null) => void) {
  onGameStateChanged = cb
}

function tokenStore(meta: VersionManifest, profile: MinecraftProfile, account: MicrosoftAccount) {
  const isOffline = account.accessToken === 'offline'
  return {
    auth_player_name: account.username,
    version_name: meta.id,
    game_directory: profile.gameDir || getMinecraftDir(),
    assets_root: getAssetsDir(),
    assets_index_name: meta.assetIndex.id,
    auth_uuid: account.uuid,
    auth_access_token: isOffline ? '0' : account.accessToken,
    clientid: 'skyy-client',
    auth_xuid: '',
    user_type: isOffline ? 'legacy' : 'msa',
    version_type: 'release',
    user_properties: '{}',
  }
}

function substituteToken(arg: string, tokens: Record<string, string>): string {
  let replaced = arg
  for (const [key, value] of Object.entries(tokens)) {
    replaced = replaced.replaceAll(`\${${key}}`, value)
  }
  return replaced
}

function buildClasspath(meta: VersionManifest): string {
  const libsDir = getLibrariesDir()
  const cp: string[] = []

  for (const lib of meta.libraries) {
    if (!evalRules(lib.rules)) continue
    const artifact = lib.downloads?.artifact
    if (!artifact) continue
    // Desde Minecraft 1.19 las librerías nativas (LWJGL) se declaran como un
    // artefacto normal con classifier `natives-<os>` y DEBEN ir al classpath:
    // LWJGL las carga en runtime desde el classpath. Solo excluimos las de
    // otra arquitectura (p. ej. natives-windows-arm64 en una máquina x64).
    if (nativeLibApplies(lib.name, artifact.path) === false) continue
    const full = path.join(libsDir, artifact.path ?? '')
    if (fs.existsSync(full)) cp.push(full)
    else if (artifact.path) {
      emitLog('WARNING', `Missing library: ${artifact.path}`)
    }
  }

  // Version jar
  const versionJar = path.join(getVersionsDir(), meta.id, `${meta.id}.jar`)
  if (fs.existsSync(versionJar)) cp.push(versionJar)
  else emitLog('WARNING', `Missing version jar: ${meta.id}.jar`)

  // Add a mod loader jar if present (fabric/forge placed in version dir)
  const loaderJar = path.join(getVersionsDir(), meta.id, `${meta.id}-loader.jar`)
  if (fs.existsSync(loaderJar)) cp.push(loaderJar)

  return cp.join(process.platform === 'win32' ? ';' : ':')
}

function resolveLibPath(
  fleet: Array<string | { rules?: unknown; value: string | string[] }>,
  meta: VersionManifest,
  profile: MinecraftProfile,
  account: MicrosoftAccount,
  features?: Record<string, boolean>
): string[] {
  const tokens = tokenStore(meta, profile, account)
  const out: string[] = []
  for (const item of fleet) {
    if (typeof item === 'string') {
      out.push(substituteToken(item, tokens))
      continue
    }
    if (!evalRules(item.rules as never, features)) continue
    const values = Array.isArray(item.value) ? item.value : [item.value]
    for (const v of values) out.push(substituteToken(v, tokens))
  }
  return out
}

function resolveGameArgs(
  meta: VersionManifest,
  profile: MinecraftProfile,
  account: MicrosoftAccount
): string[] {
  const tokens = tokenStore(meta, profile, account)
  const args: string[] = []

  // Launcher features — determines which conditional args are included.
  // is_demo_user: we never run in demo mode
  // has_custom_resolution: true if the profile specifies resolution
  const features: Record<string, boolean> = {
    is_demo_user: false,
    has_custom_resolution: !!(profile.resolution?.width && profile.resolution?.height),
  }

  // Modern argument format
  if (meta.arguments?.game?.length) {
    args.push(...resolveLibPath(meta.arguments.game as never, meta, profile, account, features))
  } else if (meta.minecraftArguments) {
    // Legacy format (<= 1.12)
    args.push(...meta.minecraftArguments.trim().split(/\s+/).map((a) => substituteToken(a, tokens)))
  }

  // Inject window resolution
  const width = profile.resolution?.width
  const height = profile.resolution?.height
  if (width && height) {
    if (meta.arguments?.game?.length) {
      args.push(`--width`, String(width), `--height`, String(height))
    } else {
      // Legacy versions accept --width/--height too
      args.push(`--width`, String(width), `--height`, String(height))
    }
  }

  return args.filter(Boolean)
}

function resolveJvmArgs(
  meta: VersionManifest,
  profile: MinecraftProfile,
  account: MicrosoftAccount
): string[] {
  const nativesDir = path.join(getMinecraftDir(), 'natives', meta.id, currentOs())
  const tokens: Record<string, string> = {
    natives_directory: nativesDir,
    launcher_name: 'skyy-client',
    launcher_version: '1.0.0',
    classpath: buildClasspath(meta),
    classpath_separator: process.platform === 'win32' ? ';' : ':',
    library_directory: getLibrariesDir(),
    version_name: meta.id,
  }

  const out: string[] = []
  if (meta.arguments?.jvm?.length) {
    for (const item of meta.arguments.jvm) {
      if (typeof item === 'string') {
        out.push(substituteToken(item, tokens))
      } else if (evalRules(item.rules as never)) {
        const values = Array.isArray(item.value) ? item.value : [item.value]
        for (const v of values) out.push(substituteToken(v, tokens))
      }
    }
  }

  return out
}

async function launchWithProfile(
  profile: MinecraftProfile
): Promise<{ success: boolean; error?: string }> {
  const account = await getStoredAccount()
  if (!account) {
    emitLog('ERROR', 'No Microsoft account logged in')
    return { success: false, error: 'Inicia sesión para jugar' }
  }

  const metaPath = path.join(getVersionsDir(), profile.version, `${profile.version}.json`)
  if (!fs.existsSync(metaPath)) {
    emitLog('ERROR', `Version ${profile.version} is not installed`)
    return { success: false, error: 'La versión no está instalada' }
  }

  let meta: VersionManifest
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as VersionManifest
  } catch (error) {
    emitLog('ERROR', `Invalid version manifest: ${error instanceof Error ? error.message : String(error)}`)
    return { success: false, error: 'Manifest de versión inválido' }
  }

  const javaVersion = meta.javaVersion?.majorVersion ?? 8
  emitLog('INFO', `Launch requires Java ${javaVersion}`)

  // Resolve a Java executable that matches the version requirement.
  // Priority: explicit profile path -> compatible bundled runtime -> compatible system runtime -> auto-download.
  let javaExe = ''

  if (profile.javaPath && fs.existsSync(profile.javaPath)) {
    javaExe = profile.javaPath
    emitLog('INFO', `Using custom Java: ${javaExe}`)
  }

  if (!javaExe) {
    const { listCompatibleRuntimes } = await import('./java-runtime')
    // 1. Prefer an already-installed bundled runtime for this version
    const compatibleBundled = listCompatibleRuntimes(javaVersion)
    if (compatibleBundled && compatibleBundled.length > 0) {
      javaExe = compatibleBundled[0].javaExe
      emitLog('INFO', `Using bundled ${compatibleBundled[0].name} at ${javaExe}`)
    }
  }

  if (!javaExe) {
    // 2. Prefer a system Java with a compatible version
    const { detectJava } = await import('./java')
    const { compatibleMajor } = await import('./java-runtime')
    const detected = detectJava()
    if (detected && compatibleMajor(detected.version, javaVersion)) {
      javaExe = detected.path
      emitLog('INFO', `Using system Java ${detected.version} at ${javaExe}`)
    }
  }

  if (!javaExe) {
    // 3. Auto-download the required runtime so it works for everyone
    const { ensureJavaRuntime } = await import('./java-runtime')
    const runtime = await ensureJavaRuntime(javaVersion)
    if (runtime) {
      javaExe = runtime.javaExe
      emitLog('INFO', `Downloaded and using ${runtime.name} at ${javaExe}`)
    }
  }

  if (!javaExe || !fs.existsSync(javaExe)) {
    emitLog('ERROR', 'No compatible Java runtime available')
    return { success: false, error: 'No se pudo conseguir una versión de Java compatible. Revisa tu conexión a internet.' }
  }

  const gameDir = profile.gameDir || getMinecraftDir()
  fs.mkdirSync(gameDir, { recursive: true })

  const nativesDir = path.join(getMinecraftDir(), 'natives', meta.id, currentOs())
  const classpath = buildClasspath(meta)
  const gameArgs = resolveGameArgs(meta, profile, account)
  const jvmArgs = resolveJvmArgs(meta, profile, account)

  const maxMem = profile.memory * 1024
  const minMem = Math.min(256, maxMem)

  const fullArgs = [
    `-Xmx${maxMem}M`,
    `-Xms${minMem}M`,
    '-Djava.net.preferIPv4Stack=true',
    ...(profile.jvmArgs ?? []),
    `-Djava.library.path=${nativesDir}`,
    '-Dminecraft.launcher.brand=skyy-client',
    '-Dminecraft.launcher.version=1.0.0',
    ...jvmArgs,
    '-cp',
    classpath,
    meta.mainClass,
    ...gameArgs,
  ].filter(Boolean)

  emitLog('INFO', `Launching ${profile.name} (${profile.version}${profile.modLoader !== 'vanilla' ? ' + ' + profile.modLoader : ''})`)
  emitLog('INFO', `Java: ${javaExe}`)
  emitLog('INFO', `Working directory: ${gameDir}`)
  emitLog('INFO', `Command: ${javaExe} ${fullArgs.join(' ')}`)

  try {
    gameProcess = spawn(javaExe, fullArgs, {
      cwd: gameDir,
      windowsHide: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    gameVersionId = profile.version
    onGameStateChanged?.(true, profile.version)
  } catch (error) {
    emitLog('ERROR', `Failed to spawn Java: ${error instanceof Error ? error.message : String(error)}`)
    return { success: false, error: 'Error al iniciar Java' }
  }

  gameProcess.stdout?.on('data', (data: Buffer) => {
    for (const line of data.toString().split(/\r?\n/)) {
      if (line.trim()) emitLog('INFO', line)
    }
  })
  gameProcess.stderr?.on('data', (data: Buffer) => {
    for (const line of data.toString().split(/\r?\n/)) {
      if (!line.trim()) continue
      const text = line.trim()
      if (/error|exception|failed|unsatisfiedlink/i.test(text)) emitLog('ERROR', text)
      else emitLog('INFO', text)
    }
  })

  gameProcess.on('error', (error) => {
    emitLog('ERROR', `Minecraft process error: ${error.message}`)
  })

  gameProcess.on('exit', (code) => {
    emitLog('INFO', `Minecraft exited with code ${code}`)
    gameProcess = null
    gameVersionId = null
    onGameStateChanged?.(false, null)
  })

  return { success: true }
}

export async function launchProfile(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const { getProfiles } = await import('../database/database')
  const profile = getProfiles().find((p) => p.id === profileId)
  if (!profile) {
    emitLog('ERROR', `Profile not found: ${profileId}`)
    return { success: false, error: 'Perfil no encontrado' }
  }
  return launchWithProfile(profile)
}

function getLastVersionFilePath(): string {
  const { app } = require('electron') as typeof import('electron')
  const dir = path.join(app.getPath('appData'), '.skyyclient')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'skyy-last-version.json')
}

export function getLastVersion(): string | null {
  try {
    const file = getLastVersionFilePath()
    if (!fs.existsSync(file)) return null
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as { version?: string }
    return raw.version ?? null
  } catch {
    return null
  }
}

function setLastVersion(id: string) {
  try {
    fs.writeFileSync(getLastVersionFilePath(), JSON.stringify({ version: id }, null, 2), 'utf-8')
  } catch {
    /* ignore */
  }
}

export async function launchVersion(
  versionId: string
): Promise<{ success: boolean; error?: string }> {
  const { installVersion } = await import('./installer')
  const { getSettings } = await import('../database/database')

  const metaPath = path.join(getVersionsDir(), versionId, `${versionId}.json`)
  const nativesDir = path.join(getMinecraftDir(), 'natives', versionId, currentOs())

  // Detect stale/incomplete native extraction: if any required native library jar
  // is newer than the extracted natives dir, the extraction is outdated and must
  // be redone (e.g. a previous install left a broken/empty native set behind).
  let nativesStale = false
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as VersionManifest
      const libsDir = getLibrariesDir()
      const nativesDirMtime = fs.existsSync(nativesDir) ? fs.statSync(nativesDir).mtimeMs : 0
      for (const lib of meta.libraries ?? []) {
        if (!evalRules(lib.rules)) continue

        // Old-style natives (pre-1.19)
        if (lib.natives) {
          const classifier = lib.natives[process.platform === 'win32' ? 'windows' : currentOs()]
          if (!classifier) continue
          const classifierArtifact = lib.downloads?.classifiers?.[classifier]
          const relPath =
            classifierArtifact?.path ?? `${(lib as { name?: string }).name ?? 'lib'}-${classifier}.jar`
          const jarPath = path.join(libsDir, relPath)
          if (fs.existsSync(jarPath) && fs.statSync(jarPath).mtimeMs > nativesDirMtime) {
            nativesStale = true
            break
          }
        }

        // Modern natives (1.19+)
        const artifact = lib.downloads?.artifact
        if (artifact?.path && nativeLibApplies(lib.name, artifact.path) === true) {
          const jarPath = path.join(libsDir, artifact.path)
          if (fs.existsSync(jarPath) && fs.statSync(jarPath).mtimeMs > nativesDirMtime) {
            nativesStale = true
            break
          }
        }
      }
    } catch {
      nativesStale = false
    }
  }

  const needsInstall =
    !fs.existsSync(metaPath) ||
    !fs.existsSync(path.join(getVersionsDir(), versionId, `${versionId}.jar`)) ||
    !fs.existsSync(nativesDir) ||
    (fs.existsSync(nativesDir) && fs.readdirSync(nativesDir).length === 0) ||
    nativesStale

  if (needsInstall) {
    emitLog('INFO', `Version ${versionId} needs setup, running installer...`)
    const result = await installVersion(versionId)
    if (!result.installed) {
      emitLog('ERROR', `Failed to install version ${versionId}`)
      return { success: false, error: 'Error al descargar la versión' }
    }
  }

  const settings = getSettings()
  const profile: MinecraftProfile = {
    id: `direct-${versionId}`,
    name: versionId,
    version: versionId,
    modLoader: 'vanilla',
    gameDir: settings.gameDir || '',
    memory: settings.memory ?? 4,
    jvmArgs: [],
    resolution: settings.resolution ?? { width: 1366, height: 768 },
    mods: [],
    created: new Date().toISOString(),
  }

  setLastVersion(versionId)
  return launchWithProfile(profile)
}

export function stopGame(): Promise<void> {
  return new Promise((resolve) => {
    if (gameProcess) {
      gameProcess.kill()
      gameProcess = null
      gameVersionId = null
      onGameStateChanged?.(false, null)
      emitLog('INFO', 'Minecraft process stopped')
    }
    resolve()
  })
}
