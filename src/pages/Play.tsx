import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play as PlayIcon, User, Layers, Coffee, FolderCog, ChevronRight, ArrowLeft, Square } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toast'
import type { MinecraftProfile } from '@/types'

export default function Play() {
  const navigate = useNavigate()
  const account = useSkyyStore((s) => s.account)
  const profiles = useSkyyStore((s) => s.profiles)
  const installedVersions = useSkyyStore((s) => s.installedVersions)
  const java = useSkyyStore((s) => s.java)
  const setAccount = useSkyyStore((s) => s.setAccount)
  const gameRunning = useSkyyStore((s) => s.gameRunning)

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles[0]?.id ?? null
  )
  const [launching, setLaunching] = useState(false)

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0]
  const isInstalled = selectedProfile
    ? installedVersions.some(
        (v) => v.id === selectedProfile.version && v.installed
      )
    : false

  const handlePlay = async () => {
    if (!account) {
      toast.info('Inicia sesion', 'Necesitas una cuenta de Microsoft para jugar.')
      navigate('/account')
      return
    }
    // If the game is already running, stop it
    if (gameRunning) {
      await window.skyy.stopGame()
      return
    }
    if (!selectedProfile) {
      toast.warning('Sin perfil', 'Crea un perfil para jugar.')
      navigate('/installations')
      return
    }
    if (!isInstalled) {
      toast.warning('Version no instalada', `Instala ${selectedProfile.version} primero.`)
      navigate('/versions')
      return
    }

    setLaunching(true)
    try {
      const res = await window.skyy.launchGame(selectedProfile.id)
      if (res.success) {
        toast.success('Lanzando Minecraft', selectedProfile.name)
        navigate('/console')
      } else {
        toast.error('No se pudo iniciar', res.error)
      }
    } catch (error) {
      toast.error(
        'Error',
        error instanceof Error ? error.message : 'Error lanzando el juego'
      )
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-skyy-muted hover:text-skyy-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
          PLAY
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left: profiles list */}
        <GlassPanel className="p-5 lg:row-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-skyy-text">PERFILES</h3>
            <button
              onClick={() => navigate('/installations')}
              className="text-xs text-skyy-violet hover:text-skyy-text flex items-center gap-1 transition-colors"
            >
              Gestionar <ChevronRight size={14} />
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="text-center py-10 text-skyy-muted text-sm">
              No tienes perfiles. Crea uno para jugar.
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  selected={selectedProfile?.id === profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                />
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Right: detail */}
        <GlassPanel className="p-6 lg:col-span-2">
          {!selectedProfile ? (
            <div className="text-center py-16">
              <p className="text-skyy-muted">Selecciona un perfil para jugar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl font-bold text-skyy-text font-display">
                  {selectedProfile.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={selectedProfile.modLoader === 'vanilla' ? 'success' : 'violet'}>
                    {selectedProfile.modLoader}
                  </Badge>
                  <span className="text-xs text-skyy-muted">Minecraft {selectedProfile.version}</span>
                  {selectedProfile.modLoaderVersion && (
                    <span className="text-[10px] text-skyy-muted">
                      {selectedProfile.modLoaderVersion}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={<Layers size={16} />} label="VERSION" value={selectedProfile.version} />
                <InfoRow
                  icon={<Coffee size={16} />}
                  label="RAM"
                  value={`${selectedProfile.memory} GB`}
                />
                <InfoRow
                  icon={<FolderCog size={16} />}
                  label="RESOLUCION"
                  value={`${selectedProfile.resolution.width}×${selectedProfile.resolution.height}`}
                />
                <InfoRow
                  icon={<User size={16} />}
                  label="JUGADOR"
                  value={account?.username ?? 'No iniciado'}
                />
              </div>

              <div className="rounded-xl bg-white/[0.03] p-4">
                <div className="text-[10px] tracking-wider text-skyy-muted mb-2">
                  ESTADO DE LA INSTALACION
                </div>
                {isInstalled ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {selectedProfile.version} esta instalado
                  </div>
                ) : (
                  <div className="text-sm text-amber-300">
                    {selectedProfile.version} no esta instalado. Ve a VERSIONES.
                  </div>
                )}
              </div>

              <button
                onClick={() => void handlePlay()}
                disabled={launching}
                className={[
                  'group w-full flex items-center justify-center gap-4 px-10 py-7 rounded-3xl',
                  'bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%]',
                  'text-white font-extrabold text-4xl tracking-[0.18em] transition-all duration-300',
                  isInstalled && account && !gameRunning
                    ? 'shadow-glow hover:shadow-glow-violet hover:-translate-y-1'
                    : gameRunning
                      ? 'shadow-glow hover:shadow-glow-violet hover:-translate-y-1'
                      : 'opacity-40 cursor-not-allowed',
                  launching ? 'animate-pulse' : '',
                ].join(' ')}
              >
                {launching ? (
                  <>
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    DESCARGANDO...
                  </>
                ) : gameRunning ? (
                  <>
                    <Square size={28} fill="currentColor" />
                    DETENER
                  </>
                ) : (
                  <>
                  <PlayIcon size={28} fill="currentColor" />
                    JUGAR
                  </>
                )}
              </button>

              {!account && (
                <p className="text-center text-xs text-skyy-muted">
                  Inicia sesion para jugar
                </p>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}

function ProfileCard({
  profile,
  selected,
  onClick,
}: {
  profile: MinecraftProfile
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left p-3 rounded-xl border transition-all duration-200',
        selected
          ? 'border-skyy-violet/60 bg-skyy-violet/10 shadow-glow'
          : 'border-black bg-white/[0.02] hover:bg-white/[0.05]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-skyy-text">{profile.name}</span>
        <Badge variant={profile.modLoader === 'vanilla' ? 'success' : 'violet'}>
          {profile.modLoader}
        </Badge>
      </div>
      <div className="text-xs text-skyy-muted mt-1">Minecraft {profile.version}</div>
    </button>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 flex items-center gap-3">
      <div className="text-skyy-violet">{icon}</div>
      <div>
        <div className="text-[10px] tracking-wider text-skyy-muted">{label}</div>
        <div className="text-sm font-medium text-skyy-text">{value}</div>
      </div>
    </div>
  )
}
