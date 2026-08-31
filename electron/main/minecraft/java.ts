import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import type { JavaInfo } from '../../../src/types'
import { emitLog } from '../console'

const COMMON_ROOTS = [
  'C:\\Program Files\\Java',
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Microsoft',
  'C:\\Program Files\\Amazon Corretto',
  'C:\\Program Files\\Zulu',
  'C:\\Program Files (x86)\\Java',
  '/usr/lib/jvm',
  '/opt/java',
  '/Library/Java/JavaVirtualMachines',
]

interface FoundJava {
  javaPath: string
  version: number
}

function javaExecutableName(): string {
  return process.platform === 'win32' ? 'java.exe' : 'java'
}

function candidatePaths(root: string): string[] {
  if (!fs.existsSync(root)) return []
  const out: string[] = []

  // root itself might be a dir containing a bin
  const binCandidate = path.join(root, 'bin', javaExecutableName())
  if (fs.existsSync(binCandidate)) {
    out.push(binCandidate)
    return out
  }

  // walk one level of immediate subdirectories
  let entries: string[] = []
  try {
    entries = fs.readdirSync(root)
  } catch {
    return out
  }

  for (const entry of entries) {
    const nested = path.join(root, entry)
    const candidate = path.join(nested, 'bin', javaExecutableName())
    if (fs.existsSync(candidate)) {
      out.push(candidate)
    } else if (fs.existsSync(path.join(nested, javaExecutableName()))) {
      out.push(path.join(nested, javaExecutableName()))
    }
  }
  return out
}

function probe(javaPath: string): number | null {
  try {
    const result = spawnSync(javaPath, ['-version'], {
      encoding: 'utf-8',
      timeout: 8000,
      windowsHide: true,
    })
    const output = (result.stderr || result.stdout || '')
      .replace(/\r?\n/g, ' ')
      .trim()
    const match = output.match(/version\s+"?(?:1\.)?(\d+)/)
    if (match) {
      const major = parseInt(match[1], 10)
      return major
    }
    return null
  } catch {
    return null
  }
}

export { probe }

function buildJavaInfo(found: FoundJava): JavaInfo {
  return {
    path: found.javaPath,
    version: found.version,
    detected: true,
  }
}

export function detectJava(): JavaInfo | null {
  emitLog('INFO', 'Detecting Java installations')

  const candidates: string[] = []

  // JAVA_HOME
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    const exe = path.join(process.env.JAVA_HOME, 'bin', javaExecutableName())
    if (fs.existsSync(exe)) candidates.push(exe)
  }

  // Shell command 'java' on PATH
  candidates.push(javaExecutableName())

  for (const root of COMMON_ROOTS) {
    candidates.push(...candidatePaths(root))
  }

  const found: FoundJava[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    const version = probe(candidate)
    if (version) {
      found.push({ javaPath: candidate, version })
      emitLog('INFO', `Java ${version} found: ${candidate}`)
    }
  }

  if (found.length === 0) {
    emitLog('WARNING', 'No Java installation detected')
    return null
  }

  // Prefer newest
  found.sort((a, b) => b.version - a.version)
  return buildJavaInfo(found[0])
}

export function validateJavaPath(javaPath: string): boolean {
  if (!fs.existsSync(javaPath)) {
    emitLog('ERROR', `Java path does not exist: ${javaPath}`)
    return false
  }
  const version = probe(javaPath)
  if (!version) {
    emitLog('ERROR', `Not a valid Java executable: ${javaPath}`)
    return false
  }
  emitLog('INFO', `Validated Java ${version} at ${javaPath}`)
  return true
}
