import React from 'react'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'w-8 h-8 rounded-full border-2 border-black border-t-skyy-violet animate-spin',
        className,
      ].join(' ')}
    />
  )
}
