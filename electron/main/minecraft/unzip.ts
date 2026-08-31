import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const LOCAL_HEADER_SIGNATURE = 0x04034b50

interface CentralEntry {
  name: string
  method: number
  compressedSize: number
  localHeaderOffset: number
  localHeaderSize: number
}

/**
 * Minimal ZIP reader that parses both local headers (fast, no central dir
 * required) and falls back to the central directory when entries use data
 * descriptors (common on entries written in streaming mode). Returns the raw
 * (still compressed) bytes and the method for each entry.
 */
function readCentralDirectory(buf: Buffer): CentralEntry[] {
  const entries: CentralEntry[] = []
  // Find End of Central Directory (EOCD) - scan from the end
  for (let i = buf.length - 22; i >= 0; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      const entryCount = buf.readUInt16LE(i + 10)
      const cdOffset = buf.readUInt32LE(i + 16)
      let p = cdOffset
      for (let e = 0; e < entryCount; e++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) break
        const method = buf.readUInt16LE(p + 10)
        const compressedSize = buf.readUInt32LE(p + 20)
        const nameLen = buf.readUInt16LE(p + 28)
        const extraLen = buf.readUInt16LE(p + 30)
        const commentLen = buf.readUInt16LE(p + 32)
        const localHeaderOffset = buf.readUInt32LE(p + 42)
        const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
        entries.push({
          name,
          method,
          compressedSize,
          localHeaderOffset,
          localHeaderSize: 0,
        })
        p += 46 + nameLen + extraLen + commentLen
      }
      return entries
    }
  }
  return entries
}

function localHeaderSize(buf: Buffer, offset: number): number {
  // signature(4) ver(2) flag(2) method(2) time(2) date(2) crc(4)
  // csize(4) usize(4) nameLen(2) extraLen(2)
  return (
    30 +
    buf.readUInt16LE(offset + 26) +
    buf.readUInt16LE(offset + 28)
  )
}

function getEntryData(buf: Buffer, entry: CentralEntry): Buffer | null {
  const local = entry.localHeaderOffset
  if (local < 0 || local + 4 > buf.length) return null
  if (buf.readUInt32LE(local) !== LOCAL_HEADER_SIGNATURE) return null

  const size = entry.localHeaderSize > 0 ? entry.localHeaderSize : localHeaderSize(buf, local)
  const dataStart = local + size
  if (dataStart + entry.compressedSize > buf.length) return null
  return buf.subarray(dataStart, dataStart + entry.compressedSize)
}

/**
 * Extract all files from a zip/jar buffer into an output directory, honoring a
 * set of exclude rules (paths that should not be extracted, e.g. META-INF/).
 */
export function extractZip(
  zipBuffer: Buffer,
  outputDir: string,
  excludes: string[] = []
): void {
  const entries = readCentralDirectory(zipBuffer)
  fs.mkdirSync(outputDir, { recursive: true })

  for (const entry of entries) {
    const name = entry.name.replace(/\\/g, '/')
    // Skip directories, absolute paths and anything trying to escape outputDir
    if (name.endsWith('/')) continue
    if (name.startsWith('/') || name.includes('..')) continue
    if (excludes.some((ex) => name === ex || name.startsWith(ex.replace(/\/?$/, '/')))) continue

    const data = getEntryData(zipBuffer, entry)
    if (!data) continue

    let content: Buffer
    try {
      if (entry.method === 0) {
        content = data
      } else if (entry.method === 8) {
        content = zlib.inflateRawSync(data)
      } else {
        continue // unsupported compression
      }
    } catch {
      continue
    }

    const destPath = path.join(outputDir, name)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, content)
  }
}

export function unzipFile(zipPath: string, outputDir: string, excludes: string[] = []): void {
  extractZip(fs.readFileSync(zipPath), outputDir, excludes)
}

/**
 * Extrae SOLO los binarios nativos (.dll/.so/.dylib/.jnilib) de un jar de
 * natives, aplanándolos al directorio de salida (sin la ruta interna tipo
 * "windows/x64/org/lwjgl/"). Necesario para Minecraft 1.19+, donde los natives
 * vienen anidados dentro del jar y `java.library.path` los necesita planos.
 * Devuelve la cantidad de binarios extraídos.
 */
export function extractNatives(zipPath: string, outputDir: string): number {
  const buf = fs.readFileSync(zipPath)
  const entries = readCentralDirectory(buf)
  fs.mkdirSync(outputDir, { recursive: true })
  let count = 0

  for (const entry of entries) {
    const name = entry.name.replace(/\\/g, '/')
    if (name.endsWith('/')) continue
    if (!/\.(dll|so|dylib|jnilib)$/i.test(name)) continue

    const data = getEntryData(buf, entry)
    if (!data) continue

    let content: Buffer
    try {
      if (entry.method === 0) content = data
      else if (entry.method === 8) content = zlib.inflateRawSync(data)
      else continue
    } catch {
      continue
    }

    const destPath = path.join(outputDir, path.basename(name))
    fs.writeFileSync(destPath, content)
    count++
  }
  return count
}
