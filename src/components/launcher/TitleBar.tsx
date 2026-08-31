import React, { useEffect, useState } from 'react'
import { Minus, Square, X, Bell, Folder, Headset } from 'lucide-react'
import { toast } from '@/store/toast'
import { useClosingStore } from '@/store/closing'

import logoImage from '../../img/logo.png'

const SUPPORT_EMAIL = 'soporte@skyyclient.com'
const SUPPORT_DISCORD_URL = 'https://discord.gg/T6GuUQYmhJ'

function SupportIcon({ size = 18 }: { size?: number }) {
  return <Headset size={size} strokeWidth={2} />
}

function OnlineIndicator() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const unsub = window.skyy.onOnlineCount(setCount)
    return unsub
  }, [])

  if (count <= 0) return null

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-2.5 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mr-1 select-none"
      title={`${count} usuario${count !== 1 ? 's' : ''} online`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        className="w-3.5 h-3.5 text-emerald-400 shrink-0 block"
        style={{ animation: 'pulse-earth 2s ease-in-out infinite' }}
        fill="currentColor"
      >
        <path d="M50 284.8c4.2 2.1 9 3.2 14 3.2l50.7 0c8.5 0 16.6 3.4 22.6 9.4l13.3 13.3c6 6 14.1 9.4 22.6 9.4l18.7 0c17.7 0 32-14.3 32-32l0-40c0-13.3 10.7-24 24-24s24-10.7 24-24l0-42.7c0-8.5 3.4-16.6 9.4-22.6l13.3-13.3c6-6 9.4-14.1 9.4-22.6L304 57c0-1.2-.1-2.3-.2-3.5-15.4-3.6-31.4-5.5-47.8-5.5-114.9 0-208 93.1-208 208 0 9.8 .7 19.4 2 28.8zm403.3 37.3c-3.2-1.4-6.7-2.1-10.5-2.1L432 320c-8.8 0-16-7.2-16-16s-7.2-16-16-16l-34.7 0c-8.5 0-16.6 3.4-22.6 9.4l-45.3 45.3c-6 6-9.4 14.1-9.4 22.6l0 18.7c0 17.7 14.3 32 32 32l18.7 0c8.5 0 16.6 3.4 22.6 9.4 2.2 2.2 4.7 4.1 7.3 5.5 39.3-25.4 69.5-63.6 84.6-108.8zM0 256a256 256 0 1 1 512 0 256 256 0 1 1 -512 0zM128 368c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zM272 256c-8.8 0-16 7.2-16 16l0 32c0 8.8 7.2 16 16 16s16-7.2 16-16l0-32c0-8.8-7.2-16-16-16zm48-112l0 32c0 8.8 7.2 16 16 16s16-7.2 16-16l0-32c0-8.8-7.2-16-16-16s-16 7.2-16 16z"/>
      </svg>
      <span className="text-[11px] font-bold text-emerald-400 tabular-nums whitespace-nowrap leading-none flex items-center" style={{ animation: 'pulse-earth 2s ease-in-out infinite' }}>
        {count} en linea
      </span>
      <style>{`@keyframes pulse-earth { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  )
}

export function TitleBar() {
  const handleSupportClick = () => {
    window.open(SUPPORT_DISCORD_URL, '_blank')
  }

  const handleSupportContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent('Soporte SKYY Client')
    const body = encodeURIComponent('Hola, necesito ayuda con:\n\n')
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div
      className="h-12 flex items-center justify-between bg-[#000000] border-b border-black select-none shrink-0 overflow-visible"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo y nombre */}
      <div
        className="flex items-center gap-3 px-4 h-full"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Logo grande */}
        <div className="relative z-10 w-12 h-12 flex items-center justify-center shrink-0">
          <img
            src={logoImage}
            alt="Skyy Client Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Nombre */}
        <span className="text-[27px] font-bold tracking-[0.22em] text-skyy-text font-minecraft leading-none">
          SKYYCLIENT
        </span>
      </div>

      {/* Botones de ventana */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="flex items-center mr-1">
          <OnlineIndicator />
        </div>

        <TitleBtn
          onClick={handleSupportClick}
          onContextMenu={handleSupportContextMenu}
          title="Soporte (Discord) — click derecho para enviar correo"
        >
          <SupportIcon size={17} />
        </TitleBtn>

        <TitleBtn
          onClick={() => window.skyy.openAppFolder()}
          title="Abrir carpeta de SKYY Client (.skyyclient)"
        >
          <Folder size={18} strokeWidth={2} />
        </TitleBtn>

        <TitleBtn onClick={() => toast.info('Notificaciones', 'No tienes notificaciones nuevas')}>
          <div className="relative">
            <Bell size={18} strokeWidth={2} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-black" />
          </div>
        </TitleBtn>

        <TitleBtn onClick={() => window.skyy.minimize()}>
          <Minus size={16} strokeWidth={2} />
        </TitleBtn>

        <TitleBtn onClick={() => window.skyy.maximize()}>
          <Square size={13} strokeWidth={2} />
        </TitleBtn>

        <TitleBtn
          onClick={() => useClosingStore.getState().startClose()}
          className="hover:bg-rose-500 hover:text-white"
        >
          <X size={16} strokeWidth={2} />
        </TitleBtn>
      </div>
    </div>
  )
}

function TitleBtn({
  children,
  onClick,
  onContextMenu,
  className = '',
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      className={[
        'h-12 w-10 flex items-center justify-center transition-colors',
        'text-white hover:bg-white/10',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}