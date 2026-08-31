import React from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%] text-white shadow-glow hover:shadow-glow-violet',
  ghost: 'bg-white/5 hover:bg-white/10 text-skyy-text border border-black',
  outline: 'bg-transparent border border-skyy-violet/40 text-skyy-violet hover:border-skyy-violet hover:shadow-glow',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-skyy-violet/60',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:-translate-y-0.5 active:translate-y-0',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'lg' ? 20 : 16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
