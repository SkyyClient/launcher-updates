import React, { useState } from 'react'
import { Copy, Pencil, Trash2, Play } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ProfileForm } from '@/components/minecraft/ProfileForm'
import { toast } from '@/store/toast'
import type { MinecraftProfile } from '@/types'

export default function Installations() {
  const profiles = useSkyyStore((s) => s.profiles)
  const setProfiles = useSkyyStore((s) => s.setProfiles)
  const versions = useSkyyStore((s) => s.versions)
  const installedVersions = useSkyyStore((s) => s.installedVersions)
  const settings = useSkyyStore((s) => s.settings)
  const account = useSkyyStore((s) => s.account)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MinecraftProfile | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const defaultMemory = settings?.memory ?? 4

  const handleSubmit = async (profile: MinecraftProfile) => {
    try {
      const updated = await window.skyy.saveProfile(profile)
      setProfiles(updated)
      setModalOpen(false)
      setEditing(undefined)
      toast.success(editing ? 'Perfil actualizado' : 'Perfil creado', profile.name)
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'No se pudo guardar el perfil')
    }
  }

  const handleDelete = async (id: string) => {
    await window.skyy.deleteProfile(id)
    const updated = await window.skyy.getProfiles()
    setProfiles(updated)
    setConfirmDelete(null)
    toast.info('Perfil eliminado')
  }

  const handleDuplicate = async (profile: MinecraftProfile) => {
    const copy: MinecraftProfile = {
      ...profile,
      id: `profile-${Date.now()}`,
      name: `${profile.name} (copia)`,
      created: new Date().toISOString(),
    }
    const updated = await window.skyy.saveProfile(copy)
    setProfiles(updated)
    toast.success('Perfil duplicado', copy.name)
  }

  const openEdit = (profile: MinecraftProfile) => {
    setEditing(profile)
    setModalOpen(true)
  }

  const handlePlay = async (profile: MinecraftProfile) => {
    if (!account) {
      toast.info('Inicia sesion', 'Necesitas una cuenta Microsoft para jugar.')
      return
    }
    const res = await window.skyy.launchGame(profile.id)
    if (res.success) toast.success('Lanzando', profile.name)
    else toast.error('Error', res.error)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
            INSTALACIONES
          </h1>
          <p className="text-sm text-skyy-muted mt-1">
            Gestiona tus perfiles de juego
          </p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-lg font-semibold text-skyy-text">No tienes perfiles</h2>
          <p className="text-sm text-skyy-muted mt-2 max-w-md mx-auto">
            No hay perfiles configurados en este momento.
          </p>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const installed = installedVersions.some(
              (v) => v.id === profile.version && v.installed
            )
            return (
              <GlassPanel key={profile.id} className="p-5 flex flex-col hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-skyy-text font-display">
                    {profile.name}
                  </h3>
                  <Badge variant={profile.modLoader === 'vanilla' ? 'success' : 'violet'}>
                    {profile.modLoader}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-skyy-muted mb-4 flex-1">
                  <div>Minecraft <span className="text-skyy-text font-medium">{profile.version}</span></div>
                  <div>RAM: <span className="text-skyy-text font-medium">{profile.memory} GB</span></div>
                  <div>Resolucion: <span className="text-skyy-text font-medium">
                    {profile.resolution.width}×{profile.resolution.height}
                  </span></div>
                  <div className="flex items-center gap-1.5">
                    Estado:
                    {installed ? (
                      <span className="text-emerald-300 font-medium">Instalado</span>
                    ) : (
                      <span className="text-amber-300 font-medium">No instalado</span>
                    )}
                  </div>
                  <div className="text-[10px] text-skyy-muted/60">
                    Creado el {new Date(profile.created).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    icon={<Play size={13} fill="currentColor" />}
                    onClick={() => void handlePlay(profile)}
                    disabled={!installed}
                  >
                    Jugar
                  </Button>
                  <IconBtn title="Duplicar" onClick={() => void handleDuplicate(profile)}>
                    <Copy size={14} />
                  </IconBtn>
                  <IconBtn title="Editar" onClick={() => openEdit(profile)}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn title="Eliminar" danger onClick={() => setConfirmDelete(profile.id)}>
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </GlassPanel>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(undefined)
        }}
        title={editing ? 'Editar perfil' : 'Nuevo perfil'}
        maxWidth="max-w-xl"
      >
        <ProfileForm
          key={editing?.id ?? 'new'}
          initial={editing}
          versions={versions}
          installedVersions={installedVersions.map((v) => v.id)}
          defaultMemory={defaultMemory}
          onSubmit={(p) => void handleSubmit(p)}
          onCancel={() => {
            setModalOpen(false)
            setEditing(undefined)
          }}
        />
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar perfil"
        maxWidth="max-w-md"
      >
        <p className="text-sm text-skyy-muted mb-4">
          ¿Eliminar este perfil? Esta accion no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => confirmDelete && void handleDelete(confirmDelete)}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors',
        danger
          ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          : 'border-black text-skyy-muted hover:text-skyy-text hover:bg-white/5',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
