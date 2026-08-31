import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          'relative glass-strong rounded-2xl w-full',
          maxWidth,
          'animate-fade-in-up shadow-glow',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black">
          {title && <h2 className="text-base font-semibold text-skyy-text">{title}</h2>}
          <button
            onClick={onClose}
            className="text-skyy-muted hover:text-skyy-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
