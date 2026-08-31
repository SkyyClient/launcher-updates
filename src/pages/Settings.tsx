import React, { useState, useEffect } from 'react'
import { RefreshCw, Coffee, Database, Monitor, Check, AlertTriangle, Download, Loader2, FolderOpen, Trash2 } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { toast } from '@/store/toast'
import type { LauncherSettings, JavaRuntime } from '@/types'
import heroAjustes from '@/img/ajustes-hero.png'

const RESOLUTIONS = [
  { w: 854, h: 480, label: '854 × 480 (SD)' },
  { w: 1280, h: 720, label: '1280 × 720 (HD)' },
  { w: 1366, h: 768, label: '1366 × 768' },
  { w: 1600, h: 900, label: '1600 × 900' },
  { w: 1920, h: 1080, label: '1920 × 1080 (Full HD)' },
  { w: 2560, h: 1440, label: '2560 × 1440 (2K)' },
  { w: 3840, h: 2160, label: '3840 × 2160 (4K)' },
]

const JAVA_RUNTIMES: Array<{ major: number; label: string; desc: string }> = [
  { major: 8, label: 'Java 8', desc: 'Para Minecraft 1.8 - 1.16' },
  { major: 17, label: 'Java 17', desc: 'Para Minecraft 1.17+ (actual)' },
  { major: 21, label: 'Java 21', desc: 'Para Minecraft 1.20.5+' },
]

export default function Settings() {
  const settings = useSkyyStore((s) => s.settings)
  const setSettings = useSkyyStore((s) => s.setSettings)
  const installedVersions = useSkyyStore((s) => s.installedVersions)
  const setInstalledVersions = useSkyyStore((s) => s.setInstalledVersions)

  const [memory, setMemory] = useState(settings?.memory ?? 4)
  const [resW, setResW] = useState(settings?.resolution.width ?? 1920)
  const [resH, setResH] = useState(settings?.resolution.height ?? 1080)
  const [saving, setSaving] = useState(false)

  const [systemRam, setSystemRam] = useState<number>(16)
  const [systemRes, setSystemRes] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 })

  const [bundled, setBundled] = useState<JavaRuntime[]>([])
  const [systemJava, setSystemJava] = useState<Array<{ major: number; path: string }>>([])
  const [downloading, setDownloading] = useState<number | null>(null)
  const [deletingVersion, setDeletingVersion] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => {
    void detectSystemInfo()
    void refreshJava()
  }, [])

  const refreshJava = async () => {
    try {
      const status = await window.skyy.getJavaRuntimes()
      setBundled(status.runtimes)
      setSystemJava(status.systemRuntimes)
    } catch {
      // ignore
    }
  }

  const detectSystemInfo = async () => {
    try {
      const ram = await window.skyy.getSystemRam()
      setSystemRam(ram.totalGB)
      if (!settings?.memory) setMemory(Math.min(8, Math.floor(ram.totalGB / 2)))
    } catch {
      // fallback
    }
    try {
      const res = await window.skyy.getSystemResolution()
      setSystemRes({ width: res.width, height: res.height })
      if (!settings?.resolution) {
        setResW(res.width)
        setResH(res.height)
      }
    } catch {
      // fallback
    }
  }

  const handleDownloadJava = async (major: number) => {
    if (downloading !== null) return
    setDownloading(major)
    try {
      const runtime = await window.skyy.ensureJavaRuntime(major)
      if (runtime) {
        toast.success('Java instalado', `${runtime.name} listo`)
      } else {
        toast.error('No se pudo instalar Java', 'Revisa tu conexion a internet')
      }
    } catch {
      toast.error('Error al instalar Java')
    } finally {
      setDownloading(null)
      await refreshJava()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const patch: Partial<LauncherSettings> = {
      memory,
      resolution: { width: resW, height: resH },
    }
    const updated = await window.skyy.setSettings(patch)
    setSettings(updated)
    setSaving(false)
    toast.success('Ajustes guardados')
  }

  const refreshVersions = async () => {
    try {
      const list = await window.skyy.getInstalledVersions()
      setInstalledVersions(list)
    } catch {
      // ignore
    }
  }

  const installedIds = installedVersions
    .filter((v) => v.installed)
    .map((v) => v.id)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

  const handleDeleteVersion = async (id: string) => {
    if (!window.confirm(`¿Eliminar la version ${id}?`)) return
    setDeletingVersion(id)
    try {
      await window.skyy.uninstallVersion(id)
      toast.success('Version eliminada', id)
      await refreshVersions()
    } catch {
      toast.error('No se pudo eliminar', id)
    } finally {
      setDeletingVersion(null)
    }
  }

  const handleDeleteAll = async () => {
    if (installedIds.length === 0) return
    if (
      !window.confirm(
        `¿Eliminar todas las versiones instaladas (${installedIds.length})? Esta accion borra sus archivos del juego.`
      )
    )
      return
    setDeletingAll(true)
    try {
      for (const id of installedIds) {
        await window.skyy.uninstallVersion(id)
      }
      toast.success('Versiones eliminadas', `${installedIds.length} instalaciones borradas`)
      await refreshVersions()
    } catch {
      toast.error('No se pudieron eliminar todas las versiones')
    } finally {
      setDeletingAll(false)
    }
  }

  const maxRam = Math.min(16, Math.floor(systemRam * 0.75))
  const recommendedRam = Math.min(8, Math.floor(systemRam / 2))

  const filteredResolutions = RESOLUTIONS.filter(
    (r) => r.w <= systemRes.width && r.h <= systemRes.height
  )

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative w-full h-[240px] shrink-0 overflow-hidden">
        <img src={heroAjustes} alt="" className="absolute inset-0 w-full h-full object-cover brightness-[1.15]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 px-6 pb-6">
          <h1 className="text-4xl font-black text-white tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            AJUSTES
          </h1>
          <p className="text-sm text-white/70 mt-1.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            Configuracion de SKYY CLIENT
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Java runtime manager */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-skyy-violet/15 border border-skyy-violet/20 flex items-center justify-center">
                <Coffee size={18} className="text-skyy-violet" />
              </div>
              <div>
                <h3 className="text-base font-black text-skyy-text tracking-wider">JAVA</h3>
                <p className="text-xs text-skyy-muted">El launcher instala el Java que cada version necesita</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] p-4 mb-4">
              <div className="text-xs text-skyy-muted mb-2">Instalados en el launcher</div>
              {bundled.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bundled.map((r) => (
                    <div
                      key={r.major}
                      className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5"
                    >
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-xs font-bold text-skyy-text">{r.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-skyy-muted">
                  <AlertTriangle size={14} className="text-amber-400" />
                  Ninguno instalado todavia. Descargalos abajo o se bajaran solos al jugar.
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white/[0.03] p-4 mb-4">
              <div className="text-xs text-skyy-muted mb-2">Java del sistema</div>
              {systemJava.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {systemJava.map((j, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-skyy-text">
                      <span className="font-bold">Java {j.major}</span>
                      <span className="text-[10px] text-skyy-muted truncate font-mono">{j.path}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-skyy-muted">No se encontro Java en el sistema.</div>
              )}
            </div>

            <div className="text-xs text-skyy-muted mb-2">Descargar Java (necesario para jugar)</div>
            <div className="flex flex-col gap-2">
              {JAVA_RUNTIMES.map((j) => {
                const installed = bundled.some((b) => b.major === j.major)
                return (
                  <div
                    key={j.major}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-black px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-skyy-text">{j.label}</div>
                      <div className="text-[10px] text-skyy-muted">{j.desc}</div>
                    </div>
                    {installed ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <Check size={13} /> Instalado
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={downloading === j.major ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        onClick={() => void handleDownloadJava(j.major)}
                        disabled={downloading !== null}
                      >
                        {downloading === j.major ? 'Descargando...' : 'Descargar'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex">
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={() => void refreshJava()}
              >
                Refrescar
              </Button>
            </div>
          </GlassPanel>

          {/* Right stack: Memory + Resolution */}
          <div className="flex flex-col gap-6">
            {/* Memory */}
            <GlassPanel className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-skyy-magenta/15 border border-skyy-magenta/20 flex items-center justify-center">
                  <Database size={18} className="text-skyy-magenta" />
                </div>
                <div>
                  <h3 className="text-base font-black text-skyy-text tracking-wider">MEMORIA RAM</h3>
                  <p className="text-xs text-skyy-muted">Asignacion para Minecraft</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-skyy-muted">Sistema detectado</span>
                  <span className="text-xs font-bold text-skyy-text">{systemRam} GB</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-skyy-gradient transition-all"
                    style={{ width: `${Math.min(100, (memory / systemRam) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-skyy-muted">Asignar al juego</span>
                  <span className="font-bold text-skyy-text">{memory} GB</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={maxRam}
                  step={1}
                  value={memory}
                  onChange={(e) => setMemory(Number(e.target.value))}
                  className="w-full accent-skyy-violet"
                />
                <div className="flex justify-between text-[10px] text-skyy-muted mt-1">
                  <span>2 GB</span>
                  <span>Recomendado: {recommendedRam} GB</span>
                  <span>{maxRam} GB</span>
                </div>
              </div>
            </GlassPanel>

            {/* Resolution */}
            <GlassPanel className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-skyy-violet/15 border border-skyy-violet/20 flex items-center justify-center">
                  <Monitor size={18} className="text-skyy-violet" />
                </div>
                <div>
                  <h3 className="text-base font-black text-skyy-text tracking-wider">RESOLUCION</h3>
                  <p className="text-xs text-skyy-muted">Tamano de ventana del juego</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-skyy-muted">Pantalla detectada</span>
                  <span className="text-xs font-bold text-skyy-text">{systemRes.width} × {systemRes.height}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredResolutions.map((r) => {
                  const isSelected = resW === r.w && resH === r.h
                  const isNative = r.w === systemRes.width && r.h === systemRes.height
                  return (
                    <button
                      key={`${r.w}x${r.h}`}
                      onClick={() => { setResW(r.w); setResH(r.h) }}
                      className={`relative p-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-skyy-violet/20 border border-skyy-violet/50 text-skyy-text'
                          : 'bg-white/[0.03] border border-black text-skyy-muted hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="text-sm font-bold">{r.w} × {r.h}</div>
                      {isNative && (
                        <span className="absolute top-2 right-2 text-[8px] px-1 py-0.5 rounded bg-skyy-violet/30 text-violet-300">
                          NATIVA
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </GlassPanel>
          </div>

          {/* Installed versions */}
          <GlassPanel className="p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-skyy-violet/15 border border-skyy-violet/20 flex items-center justify-center">
                <FolderOpen size={18} className="text-skyy-violet" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-skyy-text tracking-wider">VERSIONES INSTALADAS</h3>
                <p className="text-xs text-skyy-muted">{installedIds.length} versiones en disco</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={() => void refreshVersions()}
              >
                Refrescar
              </Button>
            </div>

            {installedIds.length === 0 ? (
              <div className="rounded-xl bg-white/[0.03] p-6 text-center text-sm text-skyy-muted">
                No tienes versiones instaladas aun. Bajalas desde la pantalla de inicio.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 mb-4">
                  {installedIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-black px-3 py-2"
                    >
                      <span className="flex-1 truncate text-sm text-skyy-text">{id}</span>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={deletingVersion === id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        onClick={() => void handleDeleteVersion(id)}
                        disabled={deletingVersion !== null || deletingAll}
                      >
                        {deletingVersion === id ? 'Eliminando...' : 'Eliminar'}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-rose-500/5 border border-rose-500/20 px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold text-rose-300">Eliminar todas las versiones</div>
                    <div className="text-[10px] text-skyy-muted">
                      Borra las {installedIds.length} versiones instaladas y sus archivos del juego.
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    icon={deletingAll ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    onClick={() => void handleDeleteAll()}
                    disabled={deletingAll}
                  >
                    {deletingAll ? 'Eliminando...' : 'Eliminar todas'}
                  </Button>
                </div>
              </>
            )}
          </GlassPanel>
        </div>

        <div className="flex justify-end pt-2">
          <Button loading={saving} onClick={() => void handleSave()} className="px-8 py-3 text-base font-bold">
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )
}
