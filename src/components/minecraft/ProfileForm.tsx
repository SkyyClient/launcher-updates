import React, { useState } from 'react'
import type { MinecraftProfile, ModLoader, GameVersion } from '@/types'

interface ProfileFormProps {
  initial?: MinecraftProfile
  versions: GameVersion[]
  installedVersions: string[]
  defaultMemory: number
  onSubmit: (profile: MinecraftProfile) => void
  onCancel: () => void
}

const LOADERS: Array<{ value: ModLoader; label: string }> = [
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
]

export function ProfileForm({
  initial,
  versions,
  installedVersions,
  defaultMemory,
  onSubmit,
  onCancel,
}: ProfileFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [version, setVersion] = useState(initial?.version ?? versions[0]?.id ?? '')
  const [loader, setLoader] = useState<ModLoader>(initial?.modLoader ?? 'vanilla')
  const [memory, setMemory] = useState(initial?.memory ?? defaultMemory)
  const [resolutionW, setResolutionW] = useState(initial?.resolution.width ?? 1366)
  const [resolutionH, setResolutionH] = useState(initial?.resolution.height ?? 768)
  const [jvmArgs, setJvmArgs] = useState((initial?.jvmArgs ?? []).join(' '))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!version) {
      setError('Selecciona una version.')
      return
    }

    const profile: MinecraftProfile = {
      id: initial?.id ?? `profile-${Date.now()}`,
      name: name.trim(),
      version,
      modLoader: loader,
      modLoaderVersion: loader === 'vanilla' ? undefined : undefined,
      gameDir: initial?.gameDir ?? '',
      memory,
      jvmArgs: jvmArgs.split(/\s+/).filter(Boolean),
      resolution: { width: resolutionW, height: resolutionH },
      mods: initial?.mods ?? [],
      javaPath: initial?.javaPath,
      created: initial?.created ?? new Date().toISOString(),
    }
    onSubmit(profile)
  }

  const availableVersions = versions.filter(
    (v) => installedVersions.includes(v.id) || v.type === 'release' || v.type === 'snapshot'
  ).slice(0, 30)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
          Nombre del perfil
        </label>
        <Input value={name} onChange={setName} placeholder="SKYY Survival" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
          Version de Minecraft
        </label>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="w-full bg-white/[0.03] border border-black rounded-lg px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50"
        >
          {availableVersions.length === 0 ? (
            <option value="">No hay versiones disponibles</option>
          ) : (
            availableVersions.map((v) => (
              <option key={v.id} value={v.id}>
                Minecraft {v.id} {installedVersions.includes(v.id) ? '(instalado)' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
          Mod loader
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {LOADERS.map((l) => (
            <button
              type="button"
              key={l.value}
              onClick={() => setLoader(l.value)}
              className={[
                'px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                loader === l.value
                  ? 'bg-skyy-gradient text-white border-transparent shadow-glow'
                  : 'bg-white/[0.02] border-black text-skyy-muted hover:text-skyy-text',
              ].join(' ')}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-skyy-muted uppercase tracking-wider">
            Memoria RAM
          </label>
          <span className="text-sm font-bold text-skyy-violet">{memory} GB</span>
        </div>
        <RamSlider value={memory} onChange={setMemory} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
            Resolucion
          </label>
          <select
            value={`${resolutionW}x${resolutionH}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number)
              setResolutionW(w)
              setResolutionH(h)
            }}
            className="w-full bg-white/[0.03] border border-black rounded-lg px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50"
          >
            <option value="854x480">854 × 480</option>
            <option value="1280x720">1280 × 720</option>
            <option value="1366x768">1366 × 768</option>
            <option value="1600x900">1600 × 900</option>
            <option value="1920x1080">1920 × 1080</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
            RAM maxima
          </label>
          <select
            value={memory}
            onChange={(e) => setMemory(Number(e.target.value))}
            className="w-full bg-white/[0.03] border border-black rounded-lg px-3 py-2.5 text-sm text-skyy-text focus:outline-none focus:border-skyy-violet/50"
          >
            {[2, 4, 6, 8, 12, 16].map((g) => (
              <option key={g} value={g}>{g} GB</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-skyy-muted mb-1.5 uppercase tracking-wider">
          Argumentos JVM (opcional)
        </label>
        <Input value={jvmArgs} onChange={setJvmArgs} placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=50" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
        <ButtonGhost onClick={onCancel}>Cancelar</ButtonGhost>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%] text-white text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-glow"
        >
          {initial ? 'Guardar cambios' : 'Crear perfil'}
        </button>
      </div>
    </form>
  )
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-black rounded-lg px-3 py-2.5 text-sm text-skyy-text placeholder-skyy-muted focus:outline-none focus:border-skyy-violet/50"
    />
  )
}

function ButtonGhost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 rounded-lg text-sm text-skyy-muted hover:text-skyy-text hover:bg-white/5 transition-colors"
    >
      {children}
    </button>
  )
}

export function RamSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const MIN = 2
  const MAX = 16
  return (
    <div>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-skyy-violet"
      />
      <div className="flex justify-between text-[10px] text-skyy-muted mt-1">
        <span>Minimo: {MIN} GB</span>
        <span>Recomendado: 8 GB</span>
        <span>Maximo: {MAX} GB</span>
      </div>
    </div>
  )
}
