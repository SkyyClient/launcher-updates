import React from 'react'

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANTS: Record<BadgeVariant, string> = {
  info: 'bg-skyy-violet/15 text-skyy-violet border-skyy-violet/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  violet: 'bg-skyy-violet/15 text-violet-300 border-skyy-violet/40',
  neutral: 'bg-white/5 text-skyy-muted border-black',
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border',
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
