import React from 'react'

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  barClassName?: string
  gradient?: boolean
}

export function ProgressBar({ value, className = '', barClassName = '', gradient = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={['w-full h-2 rounded-full bg-white/5 overflow-hidden', className].join(' ')}>
      <div
        className={[
          'h-full rounded-full transition-all duration-300',
          gradient
            ? 'bg-skyy-gradient'
            : 'bg-skyy-violet',
          barClassName,
        ].join(' ')}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
