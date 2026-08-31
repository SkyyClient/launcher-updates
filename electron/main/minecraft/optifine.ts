import { emitLog } from '../console'

// ============================================================
// OPTIFINE — listado de versiones
//
// OptiFine NO ofrece una API pública/oficial. La única forma de
// obtener el listado de versiones es leyendo el HTML de la página
// de descargas y extrayendo los nombres de archivo `OptiFine_*.jar`.
//
// Esto es un scraping frágil: si OptiFine cambia el HTML de su web,
// esta función deja de encontrar versiones y hay que ajustarla.
// ============================================================

const OPTIFINE_DOWNLOADS_URL = 'https://optifine.net/downloads'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'

export interface OptifineVersion {
  /** Nombre legible, ej: "OptiFine 1.20.1 HD U I6" */
  version: string
  /** Versión de Minecraft asociada, ej: "1.20.1" */
  mcVersion: string
  /** Nombre del archivo .jar original, ej: "OptiFine_1.20.1_HD_U_I6.jar" */
  filename: string
  /** true si es una preview/beta */
  preview: boolean
}

let cache: { at: number; data: OptifineVersion[] } | null = null
const CACHE_MS = 30 * 60 * 1000 // 30 min

/**
 * Descarga y parsea el listado de versiones de OptiFine desde su web.
 * Devuelve [] si la red falla o si el HTML no contiene versiones.
 */
export async function fetchOptifineVersions(): Promise<OptifineVersion[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data

  try {
    emitLog('INFO', 'Obteniendo versiones de OptiFine (scraping)')
    const res = await fetch(OPTIFINE_DOWNLOADS_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const versions = parseOptifineHtml(html)

    if (versions.length === 0) {
      emitLog('WARNING', 'No se encontraron versiones de OptiFine en el HTML')
    } else {
      emitLog('INFO', `OptiFine: ${versions.length} versiones encontradas`)
    }

    cache = { at: Date.now(), data: versions }
    return versions
  } catch (error) {
    emitLog(
      'ERROR',
      `No se pudo obtener OptiFine: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

/** Extrae los archivos `OptiFine_*.jar` (y previews) del HTML de descargas. */
function parseOptifineHtml(html: string): OptifineVersion[] {
  const seen = new Set<string>()
  const out: OptifineVersion[] = []

  // Captura nombres de archivo tipo:
  //   OptiFine_1.20.1_HD_U_I6.jar
  //   preview_OptiFine_1.21_HD_U_J1_pre5.jar
  const re = /((?:preview_)?OptiFine_[A-Za-z0-9._-]+?\.jar)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const filename = m[1]
    if (seen.has(filename)) continue
    seen.add(filename)

    const preview = filename.startsWith('preview_')
    const mcMatch = filename.match(/OptiFine_(\d+(?:\.\d+){1,2})/)
    const mcVersion = mcMatch ? mcMatch[1] : ''
    const version = filename
      .replace(/\.jar$/i, '')
      .replace(/^preview_/i, '')
      .replace(/_/g, ' ')

    out.push({ version: preview ? `${version} (preview)` : version, mcVersion, filename, preview })
  }

  return out
}
