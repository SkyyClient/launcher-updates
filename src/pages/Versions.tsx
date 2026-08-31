import React, { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Download, XCircle, Trash2, Check, Play } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/store/toast'
import type { InstalledVersion } from '@/types'

type Filter = 'all' | 'release'

export default function Versions() {
  const versions = useSkyyStore((s) => s.versions)
  const setVersions = useSkyyStore((s) => s.setVersions)
  const installedVersions = useSkyyStore((s) => s.installedVersions)
  const setInstalledVersions = useSkyyStore((s) => s.setInstalledVersions)
  const tasks = useSkyyStore((s) => s.tasks)

  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null)

  const latestRelease = versions.find((v) => v.type === 'release')

  const filtered = useMemo(() => {
    if (filter === 'all') return versions
    return versions.filter((v) => v.type === filter)
  }, [versions, filter])

  const isInstalled = (id: string) =>
    installedVersions.some((v) => v.id === id && v.installed)

  const getTaskFor = (id: string) =>
    tasks.find((t) => t.id.includes(`version-${id}`) || t.name.includes(id))

  const loadInstalled = async () => {
    const installed = await window.skyy.getInstalledVersions()
    setInstalledVersions(installed)
  }

  useEffect(() => {
    void loadInstalled()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const fresh = await window.skyy.getVersions()
      setVersions(fresh)
      toast.success('Versiones actualizadas')
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'No se pudieron cargar las versiones')
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (id: string) => {
    setInstalling(id)
    toast.info('Descargando version', id)
    try {
      const res = await window.skyy.installVersion(id)
      await loadInstalled()
      if (res.status === 'installed') {
        toast.success('Instalado', `${id} instalado correctamente`)
      } else if (res.status === 'error') {
        toast.error('Error de instalacion', `No se pudo instalar ${id}`)
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error instalando')
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstall = async (id: string) => {
    await window.skyy.uninstallVersion(id)
    await loadInstalled()
    setConfirmUninstall(null)
    toast.info('Desinstalado', `${id} eliminado`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
            VERSIONES
          </h1>
          <p className="text-sm text-skyy-muted mt-1">
            Versiones oficiales de Minecraft Java Edition
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
          onClick={() => void handleRefresh()}
        >
          Actualizar
        </Button>
      </div>

      {/* Latest highlights */}
      <div className="grid grid-cols-1 gap-4">
        {latestRelease && (
          <HighlightVersion
            version={latestRelease}
            label="ULTIMA VERSION ESTABLE"
            installed={isInstalled(latestRelease.id)}
            installing={installing === latestRelease.id}
            task={getTaskFor(latestRelease.id)}
            onInstall={() => void handleInstall(latestRelease.id)}
          />
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'release'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
              filter === f
                ? 'bg-skyy-violet/30 text-skyy-violet border border-skyy-violet/40'
                : 'text-skyy-muted hover:text-skyy-text border border-transparent',
            ].join(' ')}
          >
            {f === 'all' ? 'Todas' : 'Release'}
          </button>
        ))}
      </div>

      {/* List */}
      <GlassPanel className="p-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-skyy-muted text-sm">
            Cargando versiones...
          </div>
        ) : (
          <div className="max-h-[42vh] overflow-y-auto">
            {filtered.map((v) => {
              const installed = isInstalled(v.id)
              const installingNow = installing === v.id
              const task = getTaskFor(v.id)
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-skyy-text">
                        Minecraft {v.id}
                      </span>
                      <Badge variant={v.type === 'release' ? 'success' : 'warning'}>
                        {v.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-skyy-muted mt-0.5">
                      {new Date(v.releaseTime).toLocaleDateString()}
                    </div>
                  </div>

                  {installingNow || (task && (task.status === 'downloading' || task.status === 'queued')) ? (
                    <div className="w-52">
                      <ProgressBar
                        value={task && task.total > 0 ? (task.current / task.total) * 100 : 5}
                      />
                      <div className="text-[10px] text-skyy-muted mt-1 text-right">
                        {task ? `Descargando version ${Math.round((task.current / task.total) * 100)}%` : 'Descargando version...'}
                      </div>
                    </div>
                  ) : installed ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success"><Check size={11} /> Instalado</Badge>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmUninstall(v.id)}>
                        Desinstalar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Download size={14} />}
                      loading={installingNow}
                      onClick={() => void handleInstall(v.id)}
                    >
                      Instalar
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </GlassPanel>

      <Modal
        open={!!confirmUninstall}
        onClose={() => setConfirmUninstall(null)}
        title="Desinstalar version"
        maxWidth="max-w-md"
      >
        <p className="text-sm text-skyy-muted mb-4">
          ¿Seguro que quieres eliminar la version{' '}
          <span className="text-skyy-text font-semibold">{confirmUninstall}</span>?
          Los archivos descargados se eliminaran.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmUninstall(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => confirmUninstall && void handleUninstall(confirmUninstall)}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function HighlightVersion({
  version,
  label,
  installed,
  installing,
  task,
  onInstall,
}: {
  version: { id: string; type: string; releaseTime: string }
  label: string
  installed: boolean
  installing: boolean
  task?: { status: string; current: number; total: number }
  onInstall: () => void
}) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.1))',
        }}
      />
      <div className="relative z-10">
        <div className="text-[10px] tracking-[0.25em] text-skyy-violet font-semibold mb-2">
          {label}
        </div>
        <div className="text-xl font-bold text-skyy-text">Minecraft {version.id}</div>
        <div className="flex items-center gap-2 mt-2">
          {installed ? (
            <Badge variant="success"><Check size={11} /> Instalado</Badge>
          ) : (
            <Badge variant="warning">No instalado</Badge>
          )}
        </div>
        {installing || (task && task.status === 'downloading') ? (
          <div className="mt-3">
            <ProgressBar value={task && task.total > 0 ? (task.current / task.total) * 100 : 5} />
            <div className="text-[10px] text-skyy-muted mt-1">
              {task ? `Descargando version ${Math.round((task.current / task.total) * 100)}%` : 'Descargando version...'}
            </div>
          </div>
        ) : !installed ? (
          <Button
            className="mt-3"
            icon={<Download size={15} />}
            onClick={onInstall}
            loading={installing}
          >
            Instalar
          </Button>
        ) : (
          <PlayButton />
        )}
      </div>
    </div>
  )
}

function PlayButton() {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-skyy-violet mt-2">
      <Play size={13} fill="currentColor" /> Usa este perfil en PLAY
    </div>
  )
}
