export function currentOs(): string {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'osx'
  return 'linux'
}

export function currentArch(): string {
  if (process.arch === 'arm64') return 'arm64'
  if (process.arch === 'ia32') return 'x86'
  return 'x64'
}

export interface OsRule {
  action?: string
  os?: { name?: string; arch?: string; version?: string }
  features?: Record<string, boolean>
}

/**
 * Evaluate the rules array from a library/argument entry.
 * - If no rules, default = allow.
 * - For each rule, check os AND features conditions.
 * - Features rule: all listed features must be true in the provided features map.
 * - Return true only if the final accumulated result is "allow".
 */
export function evalRules(rules?: OsRule[], features?: Record<string, boolean>): boolean {
  if (!rules || rules.length === 0) return true
  const os = currentOs()
  const arch = currentArch()
  let allowed = false
  for (const rule of rules) {
    const action = rule.action === 'disallow' ? 'disallow' : 'allow'
    let matches = true

    // Check OS conditions
    if (rule.os) {
      if (rule.os.name && rule.os.name !== os) matches = false
      if (rule.os.arch && rule.os.arch !== arch) matches = false
      if (rule.os.version && rule.os.version === 'windows_11' && os !== 'windows') matches = false
    }

    // Check features conditions — all listed features must be true
    if (matches && rule.features) {
      for (const [key, required] of Object.entries(rule.features)) {
        if ((features?.[key] ?? false) !== required) {
          matches = false
          break
        }
      }
    }

    if (matches) {
      if (action === 'disallow') return false
      allowed = true
    }
  }
  return allowed
}

/** Which natives classifier matches this OS from a `natives` map. */
export function nativeClassifier(natives?: Record<string, string>): string | null {
  if (!natives) return null
  return natives[currentOs()] ?? null
}

// ── Natives modernos (Minecraft 1.19+) ───────────────────────
// Desde 1.19, las librerías nativas (LWJGL) ya no usan el mapa `natives`,
// sino que vienen como artefactos normales con un classifier tipo
// "natives-windows" / "natives-windows-arm64" / "natives-linux", etc.
// En Windows las 3 variantes de arquitectura comparten la MISMA regla
// (sin distinción de arch), así que hay que elegir la correcta a mano.

/** El classifier de natives que corresponde a ESTA máquina. */
export function wantedNativeClassifier(): string {
  const os = currentOs()
  const base = os === 'osx' ? 'macos' : os // Mojang usa "macos" en el classifier
  const arch = process.arch
  if (arch === 'arm64') return `natives-${base}-arm64`
  if (arch === 'ia32') return `natives-${base}-x86`
  return `natives-${base}` // x64 (default)
}

/** Extrae el classifier `natives-...` de una librería, o null si no es nativa. */
export function libNativeClassifier(name?: string, artifactPath?: string): string | null {
  if (name) {
    const parts = name.split(':')
    const last = parts[parts.length - 1]
    if (/^natives-/i.test(last)) return last
  }
  if (artifactPath) {
    const m = artifactPath.match(/(natives-[a-z0-9-]+)\.jar$/i)
    if (m) return m[1]
  }
  return null
}

/**
 * Para una librería nativa moderna, indica si aplica a esta plataforma:
 *  - null  → no es una librería nativa moderna (tratarla normal)
 *  - true  → es nativa y corresponde a esta arquitectura (descargar + extraer)
 *  - false → es nativa de OTRA arquitectura (ignorarla por completo)
 */
export function nativeLibApplies(name?: string, artifactPath?: string): boolean | null {
  const classifier = libNativeClassifier(name, artifactPath)
  if (!classifier) return null
  return classifier === wantedNativeClassifier()
}
