import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
  Package,
  FolderOpen,
  RefreshCw,
  X,
} from 'lucide-react'
import { useSkyyStore } from '@/store'
import { toast } from '@/store/toast'
import heroMods from '@/img/hero-mods.png'

interface ModrinthMod {
  slug: string
  title: string
  description: string
  project_type: string
  downloads: number
  icon_url: string | null
  categories: string[]
  versions: string[]
  loaders: string[]
  date_created: string
  date_modified: string
  latest_followers: number
  author: string
  project_id: string
}

interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  changelog: string | null
  date_published: string
  downloads: number
  version_type: 'release' | 'beta' | 'alpha'
  files: Array<{
    hashes: { sha1?: string; sha512?: string }
    url: string
    filename: string
    primary: boolean
    size: number
  }>
  dependencies: unknown[]
}

interface InstalledMod {
  slug: string
  name: string
  version: string
  filename: string
  modrinthId: string
  installedAt: string
}

const LOADERS = [
  { value: 'all', label: 'Todos' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
]

const CATEGORIES = [
  'performance',
  'optimization',
  'technology',
  'magic',
  'adventure',
  'rpg',
  'utility',
  'decoration',
  'library',
  'storage',
  'transport',
  'worldgen',
  'cosmetic',
  'food',
  'game-mechanics',
  'redstone',
  'crafting',
  'mobs',
]

export default function Mods() {
  const versions = useSkyyStore((s) => s.versions)
  const installedVersions = useSkyyStore((s) => s.installedVersions)

  const [search, setSearch] = useState('')
  const [mcVersion, setMcVersion] = useState('')
  const [loader, setLoader] = useState('all')
  const [category, setCategory] = useState('')
  const [mods, setMods] = useState<ModrinthMod[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [selectedMod, setSelectedMod] = useState<ModrinthMod | null>(null)
  const [modVersions, setModVersions] = useState<ModrinthVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'installed'>('search')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get last played version on mount
  useEffect(() => {
    window.skyy.getLastVersion().then((v) => {
      if (v) setMcVersion(v)
    }).catch(() => {})
    loadInstalledMods()
  }, [])

  const loadInstalledMods = async () => {
    try {
      const mods = await window.skyy.getInstalledMods()
      setInstalledMods(mods)
    } catch (err) {
      console.error('Failed to load installed mods:', err)
    }
  }

  // Debounced search - muestra todos los mods al inicio sin necesidad de escribir
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await window.skyy.searchMods(
          search.trim(),
          mcVersion || undefined,
          loader !== 'all' ? loader : undefined,
          category || undefined,
          30,
          0
        )
        if (result && Array.isArray(result.mods)) {
          setMods(result.mods)
          setTotal(result.total || 0)
        } else {
          setMods([])
          setTotal(0)
        }
      } catch (err) {
        console.error('Search error:', err)
        toast.error('Error', 'No se pudieron buscar mods')
        setMods([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search, mcVersion, loader, category])

  const openModDetail = async (mod: ModrinthMod) => {
    setSelectedMod(mod)
    setModVersions([])
    setVersionsLoading(true)
    try {
      const versions = await window.skyy.getModVersions(
        mod.project_id,
        mcVersion || undefined,
        loader !== 'all' ? loader : undefined
      )
      setModVersions(Array.isArray(versions) ? versions : [])
    } catch (err) {
      console.error('Failed to fetch versions:', err)
    } finally {
      setVersionsLoading(false)
    }
  }

  const handleDownload = async (version: ModrinthVersion) => {
    setDownloading(version.id)
    try {
      const res = await window.skyy.downloadMod(version)
      if (res.success) {
        toast.success('Mod instalado', `${version.name} se ha descargado correctamente.`)
        await loadInstalledMods()
        setSelectedMod(null)
      } else {
        toast.error('Error', res.error || 'No se pudo descargar el mod')
      }
    } catch (err) {
      toast.error('Error', 'No se pudo descargar el mod')
    } finally {
      setDownloading(null)
    }
  }

  const handleUninstall = async (filename: string) => {
    try {
      const res = await window.skyy.uninstallMod(filename)
      if (res.success) {
        toast.success('Mod desinstalado', `${filename} se ha eliminado.`)
        await loadInstalledMods()
      } else {
        toast.error('Error', res.error || 'No se pudo eliminar el mod')
      }
    } catch (err) {
      toast.error('Error', 'No se pudo eliminar el mod')
    }
  }

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const getLatestRelease = (mod: ModrinthMod): ModrinthVersion | null => {
    const releaseVersions = modVersions.filter(
      (v) => v.version_type === 'release' && v.project_id === mod.project_id
    )
    return releaseVersions.length > 0 ? releaseVersions[0] : null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative w-full h-[300px] shrink-0 overflow-hidden">
        <img src={heroMods} alt="" className="absolute inset-0 w-full h-full object-cover brightness-[1.25]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 px-6 pb-5">
          <h1 className="text-5xl font-black text-white tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            MODS / MODPACKS
          </h1>
          <p className="text-sm text-white/70 mt-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            Busca y descarga mods desde Modrinth (API gratis)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 mb-4 pt-6">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'search'
              ? 'bg-skyy-violet/20 text-violet-300 border border-skyy-violet/40'
              : 'text-skyy-muted hover:text-skyy-text border border-transparent'
          }`}
        >
          Buscar mods
        </button>
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'installed'
              ? 'bg-skyy-violet/20 text-violet-300 border border-skyy-violet/40'
              : 'text-skyy-muted hover:text-skyy-text border border-transparent'
          }`}
        >
          Instalados ({installedMods.length})
        </button>
      </div>

      {activeTab === 'search' ? (
        <>
          {/* Filters */}
          <div className="px-6 flex flex-wrap gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-skyy-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mods en Modrinth..."
                className="w-full bg-white/[0.03] border border-black rounded-xl pl-10 pr-4 py-2.5 text-sm text-skyy-text placeholder-skyy-muted focus:outline-none focus:border-skyy-violet/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-skyy-muted hover:text-skyy-text"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* MC Version */}
            <select
              value={mcVersion}
              onChange={(e) => setMcVersion(e.target.value)}
              className="bg-white/[0.03] border border-black rounded-xl px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50 min-w-[120px]"
            >
              <option value="">Todas las versiones</option>
              {versions.slice(0, 30).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>

            {/* Loader */}
            <select
              value={loader}
              onChange={(e) => setLoader(e.target.value)}
              className="bg-white/[0.03] border border-black rounded-xl px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50 min-w-[100px]"
            >
              {LOADERS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white/[0.03] border border-black rounded-xl px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50 min-w-[120px]"
            >
              <option value="">Todas las categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Results count */}
          {total > 0 && (
            <div className="px-6 text-xs text-skyy-muted mb-3">
              {total} mods encontrados
            </div>
          )}

          {/* Mods Grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-skyy-violet" />
              </div>
            ) : mods.length === 0 ? (
              <div className="text-center py-20">
                <Package size={48} className="mx-auto text-skyy-muted mb-4" />
                <p className="text-sm text-skyy-muted">
                  No se encontraron mods
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {mods.filter(Boolean).map((mod) => {
                  const isInstalled = installedMods.some(
                    (m) => m.modrinthId === mod.project_id
                  )
                  return (
                    <div
                      key={mod.project_id || mod.slug}
                      className="glass rounded-2xl p-5 flex flex-col hover:bg-white/[0.05] transition-colors cursor-pointer"
                      onClick={() => openModDetail(mod)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {mod.icon_url ? (
                          <img
                            src={mod.icon_url}
                            alt={mod.title}
                            className="w-10 h-10 rounded-xl object-cover border border-skyy-violet/20"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-skyy-surface border border-skyy-violet/20 flex items-center justify-center text-skyy-violet shrink-0">
                            <Package size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-skyy-text truncate">
                            {mod.title || 'Mod sin nombre'}
                          </div>
                          <div className="text-[10px] text-skyy-muted">
                            {mod.project_type || 'mod'} · {formatDownloads(mod.downloads || 0)} descargas
                          </div>
                        </div>
                        {isInstalled && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                            INSTALADO
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-skyy-muted leading-relaxed mb-3 flex-1 line-clamp-2">
                        {mod.description || ''}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(mod.loaders || []).map((l) => (
                          <span
                            key={l}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-skyy-muted"
                          >
                            {l}
                          </span>
                        ))}
                        {(mod.categories || []).slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-skyy-muted"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Installed Mods Tab */
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {installedMods.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen size={48} className="mx-auto text-skyy-muted mb-4" />
              <p className="text-sm text-skyy-muted">No tienes mods instalados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {installedMods.map((mod) => (
                <div
                  key={mod.filename}
                  className="glass rounded-xl px-5 py-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-skyy-surface border border-skyy-violet/20 flex items-center justify-center text-skyy-violet shrink-0">
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-skyy-text truncate">
                      {mod.name}
                    </div>
                    <div className="text-[10px] text-skyy-muted">
                      v{mod.version} · {mod.filename}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUninstall(mod.filename)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Desinstalar mod"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mod Detail Modal */}
      {selectedMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-black">
              {selectedMod.icon_url ? (
                <img
                  src={selectedMod.icon_url}
                  alt={selectedMod.title}
                  className="w-14 h-14 rounded-xl object-cover border border-skyy-violet/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-skyy-surface border border-skyy-violet/20 flex items-center justify-center text-skyy-violet">
                  <Package size={24} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold font-display text-skyy-text">
                  {selectedMod.title}
                </h2>
                <p className="text-xs text-skyy-muted">
                  {selectedMod.project_type} · {formatDownloads(selectedMod.downloads)} descargas
                </p>
              </div>
              <button
                onClick={() => setSelectedMod(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-skyy-muted"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <div className="px-6 py-4 border-b border-black">
              <p className="text-sm text-skyy-text leading-relaxed">
                {selectedMod.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedMod.loaders.map((l) => (
                  <span
                    key={l}
                    className="text-[9px] px-2 py-0.5 rounded bg-skyy-violet/20 text-violet-300"
                  >
                    {l}
                  </span>
                ))}
                {selectedMod.categories.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-skyy-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Versions */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-skyy-text mb-3">
                Versiones disponibles
              </h3>
              {versionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-skyy-violet" />
                </div>
              ) : modVersions.length === 0 ? (
                <p className="text-xs text-skyy-muted text-center py-8">
                  No hay versiones para esta configuracion
                </p>
              ) : (
                <div className="space-y-2">
                  {modVersions.map((ver) => {
                    const isDownloading = downloading === ver.id
                    return (
                      <div
                        key={ver.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-black"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-skyy-text font-medium">
                            {ver.name}
                          </div>
                          <div className="text-[10px] text-skyy-muted">
                            v{ver.version_number} · {formatDownloads(ver.downloads)} descargas
                            {ver.version_type !== 'release' && (
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded ${
                                  ver.version_type === 'beta'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {ver.version_type}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(ver)}
                          disabled={isDownloading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-skyy-violet text-white text-xs font-bold hover:bg-skyy-violet/80 hover:shadow-glow transition-all disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Descargar
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-black flex justify-end gap-2">
              <button
                onClick={() => setSelectedMod(null)}
                className="px-4 py-2 rounded-lg text-sm text-skyy-muted hover:text-skyy-text transition-colors"
              >
                Cerrar
              </button>
              <a
                href={`https://modrinth.com/mod/${selectedMod.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-skyy-violet/20 text-violet-300 text-sm font-semibold hover:bg-skyy-violet/30 transition-colors"
              >
                <ExternalLink size={14} />
                Ver en Modrinth
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
