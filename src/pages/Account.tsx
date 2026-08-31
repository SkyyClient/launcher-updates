import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, KeyRound, LogOut, Sparkles, ArrowRight } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toast'
import defaultHead from '@/img/default-head.png'

export default function Account() {
  const navigate = useNavigate()
  const account = useSkyyStore((s) => s.account)
  const logout = useSkyyStore((s) => s.logout)
  const loginOffline = useSkyyStore((s) => s.loginOffline)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleOfflineLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    setError(null)
    if (trimmed.length < 3 || trimmed.length > 16) {
      setError('El nombre debe tener entre 3 y 16 caracteres.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Solo letras, numeros y guion bajo.')
      return
    }
    loginOffline(trimmed)
    toast.success('Sesion offline activa', `Jugando como ${trimmed}`)
    navigate('/')
  }

  const handleLogout = async () => {
    await logout()
    toast.info('Sesion cerrada')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
          CUENTA
        </h1>
        <p className="text-sm text-skyy-muted mt-1">Tu perfil de juego offline</p>
      </div>

      {account ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <GlassPanel className="p-6 flex flex-col items-center text-center lg:col-span-1">
            <div className="w-24 h-24 rounded-md overflow-hidden flex items-center justify-center mb-4">
              {account.avatar ? (
                <img src={account.avatar} alt="" className="w-full h-full object-cover [image-rendering:pixelated]" />
              ) : (
                <img src={defaultHead} alt="" className="w-full h-full object-cover [image-rendering:pixelated]" />
              )}
            </div>
            <h2 className="text-xl font-bold text-skyy-text font-display">{account.username}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <Badge variant="success">Modo offline</Badge>
            </div>
            <p className="text-xs text-skyy-muted mt-3 font-mono break-all">
              UUID: {account.uuid}
            </p>
            <div className="flex gap-2 mt-5">
              <Button size="sm" variant="danger" icon={<LogOut size={14} />} onClick={() => void handleLogout()}>
                Cerrar sesion
              </Button>
            </div>
          </GlassPanel>

          {/* Details */}
          <GlassPanel className="p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-skyy-text mb-4">Detalles de la cuenta</h3>
            <div className="space-y-3">
              <DetailRow icon={<User size={16} />} label="Nombre de jugador" value={account.username} />
              <DetailRow icon={<KeyRound size={16} />} label="UUID" value={account.uuid} mono />
              <DetailRow
                icon={<span className="w-4 h-4 rounded-full bg-zinc-500 block" />}
                label="Autenticacion"
                value="Offline (sin cuenta Microsoft)"
              />
            </div>

            <div className="mt-6 rounded-xl bg-skyy-gradient/10 border border-skyy-violet/20 p-4 flex items-start gap-3">
              <Sparkles size={18} className="text-skyy-violet shrink-0 mt-0.5" />
              <p className="text-xs text-skyy-muted leading-relaxed">
                El modo offline (como TLauncher) te deja jugar sin necesidad de una cuenta
                de Microsoft. Podes usar cualquier nombre valido y tu progreso se guarda
                localmente en tu PC.
              </p>
            </div>
          </GlassPanel>
        </div>
      ) : (
        <GlassPanel className="p-12 max-w-xl mx-auto w-full">
          <div className="w-20 h-20 mx-auto rounded-full bg-skyy-gradient/20 border border-skyy-violet/30 flex items-center justify-center mb-5">
            <User size={36} className="text-skyy-violet" />
          </div>
          <h2 className="text-2xl font-bold text-skyy-text font-display text-center">CREAR CUENTA OFFLINE</h2>
          <p className="text-sm text-skyy-muted mt-3 text-center leading-relaxed">
            Ingresa un nombre de jugador para empezar a jugar
            sin necesidad de una cuenta de Microsoft.
          </p>

          <form onSubmit={handleOfflineLogin} className="mt-8">
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              placeholder="Tu nombre de jugador"
              maxLength={16}
              className="w-full bg-skyy-surface border border-black rounded-lg px-4 py-3 text-sm text-skyy-text placeholder-skyy-muted focus:outline-none focus:border-skyy-violet/50 transition-colors"
            />
            {error && <p className="text-xs text-skyy-pink mt-2">{error}</p>}

            <Button className="mt-5 w-full" size="lg" icon={<ArrowRight size={18} />} type="submit">
              ENTRAR
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-skyy-muted">
            <span className="w-3 h-3 rounded-full bg-zinc-500" />
            Sin cuenta · Sin conexion · 100% gratis
          </div>
        </GlassPanel>
      )}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
      <div className="text-skyy-violet shrink-0">{icon}</div>
      <div className="text-xs text-skyy-muted w-44 shrink-0">{label}</div>
      <div className={`text-sm font-medium text-skyy-text ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </div>
    </div>
  )
}
