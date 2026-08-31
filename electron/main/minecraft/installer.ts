import fs from 'node:fs'
import path from 'node:path'
import { getVersionsDir, getLibrariesDir, getAssetsDir, getVersionManifestUrl } from './versions'
import { downloadFile } from './downloader'
import { extractNatives } from './unzip'
import { evalRules, nativeClassifier, currentOs, nativeLibApplies } from './platform'
import { emitLog } from '../console'
import type { InstalledVersion } from '../../../src/types'

interface Artifact {
  url: string
  size: number
  path?: string
  sha1?: string
}

interface LibraryManifest {
  name: string
  downloads?: {
    artifact?: Artifact
    classifiers?: Record<string, Artifact>
  }
  natives?: Record<string, string>
  rules?: Array<{ action?: string; os?: { name?: string; arch?: string } }>
  extract?: { exclude?: string[] }
}

interface VersionManifest {
  id: string
  downloads: {
    client?: { url: string; size: number }
    server?: { url: string; size: number }
  }
  libraries?: LibraryManifest[]
  assetIndex?: { id: string; url: string; sha1?: string }
}

export async function installVersion(id: string): Promise<InstalledVersion> {
  emitLog('INFO', `Starting installation of version ${id}`)

  const taskId = `version-${id}`
  const versionDir = path.join(getVersionsDir(), id)
  const jarName = `${id}.jar`
  const jarPath = path.join(versionDir, jarName)
  const jsonPath = path.join(versionDir, `${id}.json`)
  fs.mkdirSync(versionDir, { recursive: true })

  const manifestUrl = await getVersionManifestUrl(id)

  try {
    // 1. Download the version manifest JSON
    emitLog('INFO', `Downloading version JSON: ${id}`)
    await downloadFile(manifestUrl, jsonPath, {
      taskId: `${taskId}-json`,
      name: `${id} (version json)`,
      category: 'version',
    })

    // 2. Parse and download the client jar
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as VersionManifest

    if (json.downloads?.client?.url) {
      emitLog('INFO', `Downloading client jar: ${id}`)
      await downloadFile(json.downloads.client.url, jarPath, {
        taskId: `${taskId}-jar`,
        name: `${id} (client)`,
        category: 'client',
        expectedSize: json.downloads.client.size,
      })
    }

    // 3. Download libraries (rules-aware) + extract natives
    const libraries = json.libraries ?? []
    const libsDir = getLibrariesDir()
    const nativesDir = path.join(getAssetsDir(), '..', 'natives', id, currentOs())
    fs.mkdirSync(nativesDir, { recursive: true })
    let libCount = 0

    for (const lib of libraries) {
      if (!evalRules(lib.rules)) continue
      const artifact = lib.downloads?.artifact
      const classifiers = lib.downloads?.classifiers
      const classifier = nativeClassifier(lib.natives)
      const classifierArtifact = classifier && classifiers ? classifiers[classifier] : undefined

      // Native classifier jar -> download and extract
      if (classifier && classifierArtifact?.url) {
        const relPath = classifierArtifact.path ?? `${lib.name}-${classifier}.jar`
        const classifierJar = path.join(libsDir, relPath)
        try {
          if (!fs.existsSync(classifierJar)) {
            await downloadFile(classifierArtifact.url, classifierJar, {
              taskId: `${taskId}-native-${libCount}`,
              name: `${lib.name} (natives)`,
              category: 'libraries',
              expectedSize: classifierArtifact.size,
            })
          }
          extractNatives(classifierJar, nativesDir)
        } catch (error) {
          emitLog('ERROR', `Failed to extract natives for ${lib.name}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (!artifact) continue

      // Natives modernos (1.19+): vienen como artefacto normal con classifier
      // "natives-<os>". Si la librería es nativa de OTRA arquitectura, se ignora.
      const modernNative = nativeLibApplies(lib.name, artifact.path)
      if (modernNative === false) continue

      const dest = path.join(libsDir, artifact.path ?? lib.name.replace(/:/g, '_') + '.jar')
      if (!fs.existsSync(dest)) {
        await downloadFile(artifact.url, dest, {
          taskId: `${taskId}-lib-${libCount}`,
          name: `${lib.name} (libraries)`,
          category: 'libraries',
          expectedSize: artifact.size,
        })
      }

      // Si es una librería nativa moderna de nuestra arquitectura, extraer los
      // binarios (.dll/.so/.dylib) al directorio de natives.
      if (modernNative === true) {
        try {
          const n = extractNatives(dest, nativesDir)
          emitLog('INFO', `Natives extraídos (${n}): ${lib.name}`)
        } catch (error) {
          emitLog('ERROR', `Failed to extract modern natives for ${lib.name}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      libCount++
    }
    emitLog('INFO', `Downloaded ${libCount} libraries and natives for ${id}`)

    // 4. Asset index + asset objects
    if (json.assetIndex?.url) {
      const assetDir = getAssetsDir()
      const indexesDir = path.join(assetDir, 'indexes')
      fs.mkdirSync(indexesDir, { recursive: true })
      const assetIndexPath = path.join(indexesDir, `${json.assetIndex.id}.json`)
      if (!fs.existsSync(assetIndexPath)) {
        await downloadFile(json.assetIndex.url, assetIndexPath, {
          taskId: `${taskId}-assetindex`,
          name: `${id} (asset index)`,
          category: 'assets',
        })
      }

      // Download asset objects referenced by the index
      const index = JSON.parse(fs.readFileSync(assetIndexPath, 'utf-8')) as {
        objects?: Record<string, { hash: string; size: number }>
      }
      const objects = index.objects ?? {}
      const objectsDir = path.join(assetDir, 'objects')
      fs.mkdirSync(objectsDir, { recursive: true })
      const entries = Object.entries(objects)
      let assetCount = 0
      const existing = new Set<string>()
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) walk(full)
          else existing.add(e.name)
        }
      }
      if (fs.existsSync(objectsDir)) {
        try { walk(objectsDir) } catch { /* ignore */ }
      }
      for (const [key, obj] of entries) {
        if (!obj?.hash) continue
        const hashPath = path.join(objectsDir, obj.hash.slice(0, 2), obj.hash)
        if (existing.has(path.basename(hashPath)) || fs.existsSync(hashPath)) {
          assetCount++
          continue
        }
        await downloadFile(
          `https://resources.download.minecraft.net/${obj.hash.slice(0, 2)}/${obj.hash}`,
          hashPath,
          {
            taskId: `${taskId}-obj-${assetCount}`,
            name: `asset ${key}`,
            category: 'assets',
            expectedSize: obj.size,
          }
        )
        assetCount++
      }
      emitLog('INFO', `Downloaded ${assetCount} assets for ${id}`)
    }

    emitLog('INFO', `Installation complete for ${id}`)
    return { id, installed: true, progress: 100, status: 'installed' }
  } catch (error) {
    emitLog('ERROR', `Installation failed for ${id}: ${error instanceof Error ? error.message : String(error)}`)
    return { id, installed: false, progress: 0, status: 'error' }
  }
}

export function uninstallVersion(id: string): void {
  emitLog('INFO', `Uninstalling version ${id}`)

  // Delete version jar + json
  const versionDir = path.join(getVersionsDir(), id)
  if (fs.existsSync(versionDir)) {
    fs.rmSync(versionDir, { recursive: true, force: true })
  }

  // Delete extracted natives for this version
  const nativesDir = path.join(getAssetsDir(), '..', 'natives', id)
  if (fs.existsSync(nativesDir)) {
    fs.rmSync(nativesDir, { recursive: true, force: true })
  }
}
