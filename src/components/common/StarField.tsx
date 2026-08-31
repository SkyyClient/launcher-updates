import React, { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  speed: number
  twinkleSpeed: number
  opacity: number
  color: string
  vx: number
  vy: number
}

const COLORS = ['#38BDF8', '#2563EB', '#7C3AED', '#D946EF', '#94A3B8']

function makeStar(width: number, height: number): Star {
  const x = Math.random() * width
  const angle = Math.random() * Math.PI * 2
  const speed = 0.02 + Math.random() * 0.08
  return {
    x,
    y: Math.random() * height,
    r: Math.random() * 1.6 + 0.3,
    speed,
    twinkleSpeed: 0.5 + Math.random() * 1.5,
    opacity: Math.random() * 0.7 + 0.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

export function StarField({ density = 90 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId = 0
    let stars: Star[] = []
    let width = 0
    let height = 0

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      width = rect.width
      height = rect.height
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      stars = Array.from({ length: density }, () => makeStar(width, height))
    }

    let time = 0
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      time += 0.016
      for (const star of stars) {
        star.x += star.vx
        star.y += star.vy

        // wrap around edges
        if (star.x < -5) star.x = width + 5
        if (star.x > width + 5) star.x = -5
        if (star.y < -5) star.y = height + 5
        if (star.y > height + 5) star.y = -5

        const twinkle = 0.6 + 0.4 * Math.sin(time * star.twinkleSpeed + star.x)
        ctx.globalAlpha = star.opacity * twinkle
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    />
  )
}
