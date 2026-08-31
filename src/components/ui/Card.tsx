import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

export function Card({ title, subtitle, action, children, className = '', ...rest }: CardProps) {
  return (
    <div className={['glass rounded-2xl overflow-hidden', className].join(' ')} {...rest}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-skyy-text">{title}</h3>}
            {subtitle && <p className="text-xs text-skyy-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}
