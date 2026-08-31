import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play as PlayIcon,
  ChevronDown,
  Newspaper,
  Check,
  Download,
  Loader2,
  Search,
  Square,
} from 'lucide-react'
import { useSkyyStore } from '@/store'
import { toast } from '@/store/toast'
import inicioFoto from '@/img/inicio_foto.png'
import versionsCatalog from '@/data/versions.json'

interface VersionCatalog {
  meta: { source: string; generated: string; count: number }
  latest: { release: string; snapshot: string }
  vanilla: Array<{ id: string; type: string; releaseTime: string; url?: string }>
  fabric: string[]
  forge: string[]
  neoforge: string[]
  quilt: string[]
  optifine: string[]
}

export default function Home() {
  const navigate = useNavigate()
  const account = useSkyyStore((s) => s.account)
  const versions = useSkyyStore((s) => s.versions)
  const installedVersions = useSkyyStore((s) => s.installedVersions)
  const news = useSkyyStore((s) => s.news)
  const gameRunning = useSkyyStore((s) => s.gameRunning)
  const gameVersionId = useSkyyStore((s) => s.gameVersionId)

  const [lastVersion, setLastVersion] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [launching, setLaunching] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('vanilla')
  const [search, setSearch] = useState('')
  const [optifineVersions, setOptifineVersions] = useState<string[]>([])
  const [optifineLoading, setOptifineLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // OptiFine no tiene API oficial: se obtiene por scraping en el proceso
  // principal. Lo pedimos solo cuando el usuario abre la pestaña OptiFine.
  useEffect(() => {
    if (category !== 'optifine' || optifineVersions.length > 0 || optifineLoading) return
    setOptifineLoading(true)
    window.skyy
      .getOptifineVersions()
      .then((list) => setOptifineVersions(list.map((o) => o.version)))
      .catch(() => {})
      .finally(() => setOptifineLoading(false))
  }, [category, optifineVersions.length, optifineLoading])

  const installedIds = useMemo(
    () => installedVersions.filter((v) => v.installed).map((v) => v.id),
    [installedVersions]
  )

  const loaderTabs = [
    { key: 'vanilla', label: 'Vanilla' },
    { key: 'fabric', label: 'Fabric' },
    { key: 'forge', label: 'Forge' },
    { key: 'optifine', label: 'OptiFine' },
    { key: 'neoforge', label: 'NeoForge' },
    { key: 'quilt', label: 'Quilt' },
  ]

  const loaderGroups = useMemo(() => {
    const groups: Record<string, { id: string }[]> = {
      vanilla: [], fabric: [], forge: [], optifine: [], neoforge: [], quilt: [],
    }
    for (const iv of installedVersions) {
      if (!iv.installed) continue
      const lower = iv.id.toLowerCase()
      if (lower.includes('fabric')) groups.fabric.push(iv)
      else if (lower.includes('neoforge')) groups.neoforge.push(iv)
      else if (lower.includes('forge')) groups.forge.push(iv)
      else if (lower.includes('optifine')) groups.optifine.push(iv)
      else if (lower.includes('quilt')) groups.quilt.push(iv)
      else groups.vanilla.push(iv)
    }
    return groups
  }, [installedVersions])

  const filteredVersions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return versions
    return versions.filter((v) => v.id.toLowerCase().includes(q))
  }, [versions, search])

  const catalogLoaderList = useMemo(() => {
    const map: Record<string, string[]> = {
      fabric: (versionsCatalog as VersionCatalog).fabric,
      forge: (versionsCatalog as VersionCatalog).forge,
      neoforge: (versionsCatalog as VersionCatalog).neoforge,
      quilt: (versionsCatalog as VersionCatalog).quilt,
      optifine:
        optifineVersions.length > 0
          ? optifineVersions
          : (versionsCatalog as VersionCatalog).optifine,
    }
    const q = search.trim().toLowerCase()
    const base = map[category] ?? []
    const filtered = q ? base.filter((v) => v.toLowerCase().includes(q)) : base
    return filtered
  }, [category, search, optifineVersions])

  const MAX_LOADER_ROWS = 120

  useEffect(() => {
    window.skyy.getLastVersion().then(setLastVersion).catch(() => {})
  }, [])

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const runLaunch = async (id: string) => {
    if (!account) {
      toast.info('Inicia sesion', 'Necesitas iniciar sesion para jugar.')
      navigate('/settings')
      return
    }
    setLaunching(id)
    setDropdownOpen(false)
    try {
      const res = await window.skyy.launchVersion(id)
      if (res.success) {
        toast.success('Lanzando Minecraft', id)
        setLastVersion(id)
      } else {
        toast.error('Error', res.error ?? 'No se pudo lanzar la version')
      }
    } finally {
      setLaunching(null)
    }
  }

  const handlePlay = () => {
    if (!account) {
      toast.info('Inicia sesion', 'Necesitas iniciar sesion para jugar.')
      navigate('/settings')
      return
    }
    // If game is running, stop it
    if (gameRunning) {
      void window.skyy.stopGame()
      return
    }
    if (lastVersion) {
      void runLaunch(lastVersion)
    } else {
      setDropdownOpen((o) => !o)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="relative w-full h-[220px] sm:h-[260px] md:h-[400px] shrink-0 bg-[#000000]">
        {/* Clipped background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
  src={inicioFoto}
  alt=""
  className="absolute inset-0 w-full h-full object-cover"
  style={{ filter: 'brightness(0.7)' }}
/>
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#080808] to-transparent" />
        </div>

        {/* Controls container */}
        <div className="absolute inset-0 z-10 flex items-end justify-between p-6 gap-4">
          {/* Play button with arrow */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-stretch rounded-lg overflow-hidden bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%] shadow-lg shadow-skyy-violet/30 transition-all duration-300 hover:shadow-glow">
              {/* Main play */}
              <button
                onClick={handlePlay}
                disabled={!!launching}
                className="px-14 py-4 text-white font-extrabold text-3xl tracking-[0.18em] transition-colors disabled:opacity-70"
              >
                <div className="flex items-center gap-3">
                  {launching ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : gameRunning ? (
                    <Square size={28} fill="currentColor" />
                  ) : (
                    <PlayIcon size={28} fill="currentColor" />
                  )}
                  {launching ? 'DESCARGANDO...' : gameRunning ? 'DETENER' : 'JUGAR'}
                </div>
              </button>
              {/* Arrow toggle */}
              <button
                onClick={() => {
                  setDropdownOpen((o) => {
                    if (!o) {
                      setCategory('vanilla')
                      setSearch('')
                    }
                    return !o
                  })
                }}
                disabled={!!launching || gameRunning}
                className="px-3 text-white/90 hover:bg-black/20 transition-colors border-l border-black disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Elegir version"
              >
                <ChevronDown
                  size={22}
                  className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Version selector modal */}
            {dropdownOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="relative bg-[#111111] border border-black rounded-2xl w-[460px] shadow-2xl animate-fade-in-up flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-minecraft text-lg text-skyy-text mb-1.5">
                          Elegir version
                        </h2>
                        <p className="text-sm text-skyy-muted">
                          {lastVersion
                            ? `Ultima jugada: ${lastVersion}`
                            : 'Selecciona una version para descargar o jugar.'}
                        </p>
                      </div>
                      <button
                        onClick={() => setDropdownOpen(false)}
                        className="text-skyy-muted hover:text-white transition-colors mt-1"
                        aria-label="Cerrar"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative px-6 pb-4">
                    <Search
                      size={18}
                      className="absolute left-9 top-1/2 -translate-y-1/2 text-skyy-muted"
                    />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar version..."
                      className="w-full bg-skyy-surface border border-black rounded-lg pl-11 pr-4 py-3 text-sm text-skyy-text placeholder-skyy-muted focus:outline-none focus:border-skyy-violet/50 transition-colors"
                    />
                  </div>

                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1.5 px-6 py-3 border-y border-black bg-white/[0.02]">
                    {loaderTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setCategory(tab.key)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                          category === tab.key
                            ? 'bg-skyy-violet text-white'
                            : 'text-skyy-muted hover:text-skyy-text hover:bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Category content */}
                  <div className="overflow-y-auto py-2 max-h-[420px]">
                    {category === 'vanilla' ? (
                      <>
                        {filteredVersions.length === 0 && (
                          <div className="px-6 py-10 text-sm text-skyy-muted text-center">
                            {search.trim()
                              ? 'No se encontro ninguna version con ese nombre.'
                              : 'Cargando versiones...'}
                          </div>
                        )}
                        {filteredVersions.map((v) => (
                          <VersionRow
                            key={v.id}
                            id={v.id}
                            installed={installedIds.includes(v.id)}
                            lastVersion={lastVersion}
                            launching={launching}
                            gameRunning={gameRunning}
                            gameVersionId={gameVersionId}
                            onSelect={() => void runLaunch(v.id)}
                          />
                        ))}
                      </>
                    ) : (
                      (() => {
                        const group = loaderGroups[category] ?? []
                        if (group.length === 0 && catalogLoaderList.length === 0) {
                          if (category === 'optifine' && optifineLoading) {
                            return (
                              <div className="px-6 py-8 text-center">
                                <div className="text-3xl mb-2">⏳</div>
                                <p className="text-sm text-skyy-text font-semibold">
                                  Obteniendo versiones de OptiFine…
                                </p>
                                <p className="text-xs text-skyy-muted mt-1 max-w-[260px] mx-auto">
                                  Leyendo el listado desde optifine.net.
                                </p>
                              </div>
                            )
                          }
                          return (
                            <div className="px-6 py-8 text-center">
                              <div className="text-3xl mb-2">🚧</div>
                              <p className="text-sm text-skyy-text font-semibold">
                                {category.charAt(0).toUpperCase() + category.slice(1)} no disponible aun
                              </p>
                              <p className="text-xs text-skyy-muted mt-1 max-w-[260px] mx-auto">
                                {category === 'optifine'
                                  ? 'OptiFine no tiene API oficial. Intentamos leer su web, pero no se pudo obtener el listado (revisa tu conexion).'
                                  : 'Estas versiones del modloader estan disponibles, pero la instalacion completa llegara en una futura actualizacion.'}
                              </p>
                            </div>
                          )
                        }
                        if (group.length > 0) {
                          return group.map((iv) => (
                            <VersionRow
                              key={iv.id}
                              id={iv.id}
                              installed
                              lastVersion={lastVersion}
                              launching={launching}
                              gameRunning={gameRunning}
                              gameVersionId={gameVersionId}
                              onSelect={() => void runLaunch(iv.id)}
                            />
                          ))
                        }
                        const shown = catalogLoaderList.slice(0, MAX_LOADER_ROWS)
                        return (
                          <>
                            {shown.length === 0 && (
                              <div className="px-6 py-10 text-sm text-skyy-muted text-center">
                                No se encontro ninguna version con ese nombre.
                              </div>
                            )}
                            {shown.map((v) => (
                              <LoaderRow
                                key={v}
                                id={v}
                                lastVersion={lastVersion}
                                gameRunning={gameRunning}
                                onSelect={() => void runLaunch(v)}
                              />
                            ))}
                            {catalogLoaderList.length > MAX_LOADER_ROWS && (
                              <div className="px-6 py-3 text-xs text-skyy-muted text-center">
                                {catalogLoaderList.length - MAX_LOADER_ROWS} versiones mas... usa la busqueda para encontrarlas.
                              </div>
                            )}
                          </>
                        )
                      })()
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current / last version indicator */}
          <div className="text-right pointer-events-none select-none">
            <div className="text-sm uppercase tracking-[0.2em] text-white font-semibold">
              {gameRunning ? 'Jugando' : 'Ultima jugada'}
            </div>
            <div className="font-minecraft text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] tracking-wide">
              {gameRunning ? (gameVersionId ?? '') : (lastVersion ?? '—')}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News */}
          <div className="lg:col-span-2">
            <h2 className="font-minecraft text-lg text-skyy-text mb-3 tracking-wide">
              Noticias
            </h2>
            <div className="space-y-3">
              {news.length === 0 ? (
                <div className="rounded-xl bg-skyy-surface border border-black p-8 text-center text-skyy-muted text-sm">
                  No hay noticias disponibles.
                </div>
              ) : (
                news.slice(0, 5).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate('/novedades')}
                    className="w-full rounded-xl bg-skyy-surface border border-black p-4 text-left hover:border-skyy-violet/30 transition-colors group"
                  >
                    <div className="flex gap-4">
                      <div className="w-24 h-16 rounded-lg bg-skyy-violet/10 border border-skyy-violet/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {n.image ? (
                          <img src={n.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Newspaper size={20} className="text-skyy-violet/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-skyy-violet uppercase tracking-wider">
                            {n.category}
                          </span>
                          <span className="text-[10px] text-skyy-muted">{n.date}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-skyy-text truncate group-hover:text-skyy-violet transition-colors">
                          {n.title}
                        </h3>
                        <p className="text-xs text-skyy-muted mt-1 line-clamp-2">{n.description}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Redes sociales */}
          <div>
            <h2 className="font-minecraft text-lg text-skyy-text mb-3 tracking-wide">
              Redes sociales
            </h2>
            <div className="grid grid-cols-6 gap-2">
              <SocialLink href="https://youtube.com/@TuCanal" icon={<YoutubeIcon />} label="YouTube" color="hover:bg-red-500/20 hover:text-red-400" />
              <SocialLink href="https://instagram.com/tuusuario" icon={<InstagramIcon />} label="Instagram" color="hover:bg-pink-500/20 hover:text-pink-400" />
              <SocialLink href="https://tiktok.com/@tuusuario" icon={<TiktokIcon />} label="TikTok" color="hover:bg-white/10 hover:text-white" />
              <SocialLink href="https://twitter.com/tuusuario" icon={<TwitterIcon />} label="Twitter" color="hover:bg-sky-500/20 hover:text-sky-400" />
              <SocialLink href="https://facebook.com/tuusuario" icon={<FacebookIcon />} label="Facebook" color="hover:bg-blue-500/20 hover:text-blue-400" />
              <SocialLink href="https://discord.gg/VrETNfpeRC" icon={<DiscordIcon />} label="Discord" color="hover:bg-[#5865F2]/20 hover:text-[#5865F2]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialLink({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center p-2 rounded-lg text-skyy-violet transition-colors hover:text-skyy-violet ${color}`}
      title={label}
    >
      {icon}
    </a>
  )
}

function YoutubeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function TiktokIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function TwitchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

function VersionRow({
  id,
  installed,
  lastVersion,
  launching,
  gameRunning,
  gameVersionId,
  onSelect,
}: {
  id: string
  installed: boolean
  lastVersion: string | null
  launching: string | null
  gameRunning: boolean
  gameVersionId: string | null
  onSelect: () => void
}) {
  const isLaunching = launching === id
  const isRunning = gameRunning && gameVersionId === id
  return (
    <button
      onClick={onSelect}
      disabled={launching !== null || gameRunning}
      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left text-skyy-text hover:bg-white/5 transition-colors disabled:opacity-60"
    >
      <span className="flex-1 truncate">
        {id}
        {isRunning && (
          <span className="ml-2 text-[9px] text-emerald-400">CORRIENDO</span>
        )}
        {!isRunning && lastVersion === id && (
          <span className="ml-2 text-[9px] text-skyy-violet">ULTIMA</span>
        )}
      </span>
      {isLaunching ? (
        <span className="flex items-center gap-1.5 text-xs text-skyy-violet shrink-0">
          <Loader2 size={13} className="animate-spin" /> Descargando
        </span>
      ) : isRunning ? (
        <span className="flex items-center gap-1.5 text-xs text-emerald-300 shrink-0">
          <Square size={11} fill="currentColor" /> Corriendo
        </span>
      ) : installed ? (
        <span className="flex items-center gap-1.5 text-xs text-emerald-300 shrink-0">
          <Check size={13} /> Instalada
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-skyy-violet shrink-0">
          <Download size={13} /> Descargar
        </span>
      )}
    </button>
  )
}

function LoaderRow({
  id,
  lastVersion,
  gameRunning,
  onSelect,
}: {
  id: string
  lastVersion: string | null
  gameRunning: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      disabled={gameRunning}
      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left text-skyy-text hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="flex-1 truncate">
        {id}
        {lastVersion === id && (
          <span className="ml-2 text-[9px] text-skyy-violet">ULTIMA</span>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-skyy-violet shrink-0">
        <Download size={13} /> Descargar
      </span>
    </button>
  )
}
