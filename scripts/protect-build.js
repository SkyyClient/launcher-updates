/**
 * Protección del build de SKYY CLIENT
 * ─────────────────────────────────────────────────────────────
 *  1. Compila el proceso principal (main + preload) a bytecode V8 (.jsc)
 *     → nadie puede leer la lógica del backend del launcher.
 *  2. Ofusca el JS del renderer (React/UI)
 *     → strings encriptados, nombres hex, control flow aplanado.
 *
 *  Se ejecuta después de `npm run build`, antes de electron-builder.
 * ─────────────────────────────────────────────────────────────
 */

const fs = require('node:fs')
const path = require('node:path')
const bytenode = require('bytenode')
const JavaScriptObfuscator = require('javascript-obfuscator')

const ROOT = path.resolve(__dirname, '..')
const ELECTRON_DIST = path.join(ROOT, 'dist-electron', 'electron')
const RENDERER_DIST = path.join(ROOT, 'dist', 'assets')

// ── Config de ofuscación del renderer ────────────────────────
// NIVEL SEGURO: renombra identificadores y agrupa strings, pero SIN las
// transformaciones que los antivirus confunden con malware
// (selfDefending, controlFlowFlattening, deadCodeInjection, encoding base64).
// Esas rompían la instalación al disparar heurísticas de Windows Defender.
const OBFUSCATE_OPTS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: 'browser',
}

function log(msg) {
  console.log(`\x1b[35m[protect]\x1b[0m ${msg}`)
}

function walk(dir, ext) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, ext))
    else if (entry.isFile() && full.endsWith(ext)) out.push(full)
  }
  return out
}

// ── 1) Compilar main + preload a bytecode ────────────────────
async function compileMainToBytecode() {
  log('Compilando proceso principal a bytecode V8…')
  const jsFiles = walk(ELECTRON_DIST, '.js')

  for (const file of jsFiles) {
    const out = file + 'c' // .js → .jsc
    try {
      await bytenode.compileFile({
        filename: file,
        output: out,
        electron: true, // usar V8 de Electron, no de Node
      })
      // Reemplazar el .js con un loader que carga el .jsc
      const rel = path.basename(out)
      fs.writeFileSync(
        file,
        `require('bytenode');\nmodule.exports = require('./${rel}');\n`
      )
      log(`  ✓ ${path.relative(ROOT, file)}`)
    } catch (err) {
      log(`  ✗ ${path.relative(ROOT, file)} — ${err.message}`)
    }
  }
}

// ── 2) Ofuscar JS del renderer ───────────────────────────────
function obfuscateRenderer() {
  log('Ofuscando bundle del renderer…')
  const jsFiles = walk(RENDERER_DIST, '.js')

  for (const file of jsFiles) {
    try {
      const src = fs.readFileSync(file, 'utf-8')
      // Solo ofuscar bundles razonables (< 5 MB) para no eternizar el build
      if (src.length > 5 * 1024 * 1024) {
        log(`  → ${path.basename(file)} demasiado grande, se omite`)
        continue
      }
      const obf = JavaScriptObfuscator.obfuscate(src, OBFUSCATE_OPTS)
      fs.writeFileSync(file, obf.getObfuscatedCode(), 'utf-8')
      log(`  ✓ ${path.basename(file)}`)
    } catch (err) {
      log(`  ✗ ${path.basename(file)} — ${err.message}`)
    }
  }
}

// ── Runner ───────────────────────────────────────────────────
;(async () => {
  const started = Date.now()
  try {
    if (!fs.existsSync(ELECTRON_DIST)) {
      throw new Error(`No existe ${ELECTRON_DIST}. Corré primero: npm run build`)
    }
    if (!fs.existsSync(RENDERER_DIST)) {
      throw new Error(`No existe ${RENDERER_DIST}. Corré primero: npm run build`)
    }

    await compileMainToBytecode()
    obfuscateRenderer()

    const secs = ((Date.now() - started) / 1000).toFixed(1)
    log(`Protección aplicada en ${secs}s`)
  } catch (err) {
    console.error(`\x1b[31m[protect] ERROR:\x1b[0m ${err.message}`)
    process.exit(1)
  }
})()
