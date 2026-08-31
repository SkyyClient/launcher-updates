import React from 'react'

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  strong?: boolean
}

export function GlassPanel({ strong, className = '', ...rest }: GlassPanelProps) {
  return (
    <div
      className={[
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
