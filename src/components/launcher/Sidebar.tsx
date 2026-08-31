import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Package,
  Settings,
  User,
  LogOut,
  Sparkles,
  Store,
  MessageCircle,
} from 'lucide-react'
import { useSkyyStore } from '@/store'
import { toast } from '@/store/toast'
import type { Page } from '@/types'
import defaultHead from '@/img/default-head.png'

interface NavItem {
  key: Page
  label: string
  icon: React.ReactNode
  href?: string
}

const NAV: NavItem[] = [
  { key: 'home', label: 'Inicio', icon: <Home size={24} /> },
  { key: 'mods', label: 'Mods', icon: <Package size={24} /> },
  { key: 'novedades', label: 'Novedades', icon: <Sparkles size={24} /> },
  { key: 'shop', label: 'Tienda', icon: <Store size={24} />, href: 'https://skyyclient.vercel.app/' },
  { key: 'forum', label: 'Foro', icon: <MessageCircle size={24} />, href: 'https://discord.gg/VrETNfpeRC' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const account = useSkyyStore((s) => s.account)
  const loginOffline = useSkyyStore((s) => s.loginOffline)
  const loginDiscord = useSkyyStore((s) => s.loginDiscord)
  const logout = useSkyyStore((s) => s.logout)

  const currentPage = (location.pathname.slice(1) || 'home') as Page
  const go = (page: Page) => navigate(`/${page === 'home' ? '' : page}`)

  const handleNav = (item: NavItem) => {
    if (item.href) {
      void window.skyy.openExternal(item.href)
      return
    }
    go(item.key)
  }

  const [showMenu, setShowMenu] = useState(false)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar el popup al hacer click afuera
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-[#000000] border-r border-black overflow-hidden">
      <nav className="flex-1 px-3 pt-4 pb-4 space-y-4">
        {NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNav(item)}
            className={[
              'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-lg font-bold tracking-[0.20em] transition-all duration-150',
              currentPage === item.key && !item.href
                ? 'bg-skyy-violet/15 text-skyy-violet'
                : 'text-white hover:bg-white/5',
            ].join(' ')}
          >
            <span className={currentPage === item.key ? 'text-skyy-violet' : 'text-white'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Zona de configuracion (justo arriba de la cuenta) */}
      <div className="px-3 pb-3 border-t border-black pt-3">
        <button
          onClick={() => go('settings')}
          className={[
            'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-lg font-bold tracking-[0.20em] transition-all duration-150',
            currentPage === 'settings'
              ? 'bg-skyy-violet/15 text-skyy-violet'
              : 'text-white hover:bg-white/5',
          ].join(' ')}
        >
          <span className={currentPage === 'settings' ? 'text-skyy-violet' : 'text-white'}>
            <Settings size={24} />
          </span>
          <span>Opciones</span>
        </button>
      </div>

      {/* Zona de cuenta */}
      <div className="px-3 pb-3 border-t border-black pt-3 relative" ref={menuRef}>
        {account ? (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors w-full">
            <button
              onClick={() => go('settings')}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center shrink-0">
                {account.avatar ? (
                  <img src={account.avatar} alt="" className="w-full h-full object-cover [image-rendering:pixelated]" />
                ) : (
                  <img src={defaultHead} alt="" className="w-full h-full object-cover [image-rendering:pixelated]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-skyy-text truncate">{account.username}</div>
                <div className="text-xs flex items-center gap-1.5">
                  {account.accessToken === 'offline' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      <span className="text-skyy-muted">Offline</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400">Conectado</span>
                    </>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => void logout()}
              className="text-skyy-muted hover:text-skyy-pink transition-colors p-2"
              title="Cerrar sesion"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors w-full"
            >
              <div className="w-10 h-10 rounded-lg bg-skyy-surface border border-black flex items-center justify-center text-skyy-muted shrink-0">
                <User size={20} />
              </div>
              <div className="text-sm font-semibold text-skyy-muted">Iniciar sesion</div>
            </button>

            {/* Popup menu */}
            {showMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#111111] border border-black rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowOfflineModal(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-skyy-text hover:bg-white/5 transition-colors text-left"
                >
                  <span className="w-4 h-4 rounded-full bg-zinc-500 border border-black shrink-0" />
                  <div>
                    <div className="font-semibold">Cuenta offline</div>
                    <div className="text-[10px] text-skyy-muted">Jugar sin iniciar sesion</div>
                  </div>
                </button>
                <div className="border-t border-black" />
                <button
                  onClick={() => {
                    setShowMenu(false)
                    void loginDiscord()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-skyy-text hover:bg-white/5 transition-colors text-left"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#5865F2] shrink-0">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
                  </svg>
                  <div>
                    <div className="font-semibold">Unirse al Discord</div>
                    <div className="text-[10px] text-skyy-muted">Abrir invitacion al servidor</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal cuenta offline */}
      {showOfflineModal && (
        <OfflineModal
          onLogin={(name) => {
            loginOffline(name)
            setShowOfflineModal(false)
            toast.success('Sesion offline activa', `Jugando como ${name}`)
          }}
          onClose={() => setShowOfflineModal(false)}
        />
      )}
    </aside>
  )
}

function OfflineModal({
  onLogin,
  onClose,
}: {
  onLogin: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed.length < 3 || trimmed.length > 16) {
      toast.warning('Nombre invalido', 'El nombre debe tener entre 3 y 16 caracteres.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      toast.warning('Nombre invalido', 'Solo letras, numeros y guion bajo.')
      return
    }
    onLogin(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111111] border border-black rounded-2xl w-[380px] shadow-2xl animate-fade-in-up">
        <div className="p-6">
          <h2 className="font-minecraft text-base text-skyy-text mb-1">Cuenta offline</h2>
          <p className="text-xs text-skyy-muted mb-5">
            Ingresa un nombre para jugar sin conexion.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre de jugador"
              maxLength={16}
              className="w-full bg-skyy-surface border border-black rounded-lg px-4 py-3 text-sm text-skyy-text placeholder-skyy-muted focus:outline-none focus:border-skyy-violet/50 transition-colors mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm text-skyy-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%] text-white text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-glow"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
