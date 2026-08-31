import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Loader de SKYY Client — sobrevuelo en primera persona.
 *
 * La imagen del orbe (public/loader-orb.png) se coloca gigante y desplazada
 * hacia abajo: solo se ve su casquete superior, que forma el HORIZONTE CURVO
 * de un planeta. El disco rota de forma continua (360°) sobre su centro, así la
 * superficie "pasa" por debajo como si estuvieras sobrevolándolo. Detrás, un
 * campo de estrellas neón en dos capas (parallax) refuerza la profundidad.
 *
 * - Auto-rotación continua 360° de la superficie (rotateZ, sin fin).
 * - Se puede arrastrar para girar el planeta en cualquier momento (con inercia).
 * - Botón "Continuar al launcher" que hace un fundido a negro antes de entrar.
 * - Respeta prefers-reduced-motion.
 *
 * Dejá el archivo en: skyy-client/public/loader-orb.png
 */

const ORB_URL = `${import.meta.env.BASE_URL}loader-orb.png`
const FADE_MS = 820

interface SkyyLoaderProps {
  label?: string
  tagline?: string
  /** true cuando la carga terminó: muestra el botón "Continuar al launcher". */
  ready?: boolean
  /** Se llama tras el fundido a negro, al entrar al launcher. */
  onContinue?: () => void
}

interface Star {
  left: number
  top: number
  size: number
  delay: number
  duration: number
  hue: string
}

function makeStars(count: number, maxSize: number, topRange: number): Star[] {
  const hues = ['#ffffff', '#ffffff', '#F0A6FF', '#F000F0', '#C000F0', '#8000F0', '#FF0080']
  const arr: Star[] = []
  for (let i = 0; i < count; i++) {
    arr.push({
      left: Math.random() * 100,
      top: Math.random() * topRange,
      size: Math.random() * (maxSize - 1) + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 2.5 + 2.5,
      hue: hues[Math.floor(Math.random() * hues.length)],
    })
  }
  return arr
}

export function SkyyLoader({
  label = 'SKYYCLIENT',
  tagline = '',
  ready = false,
  onContinue,
}: SkyyLoaderProps) {
  const moonRef = useRef<HTMLDivElement>(null)
  const [exiting, setExiting] = useState(false)
  const state = useRef({
    rot: 0,
    vel: 0,
    dragging: false,
    lastX: 0,
    autoSpeed: 0.12, // grados por frame → ~50s por vuelta completa (360°)
  })

  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Dos capas de estrellas para dar parallax (lejanas + cercanas).
  const starsFar = useMemo(() => makeStars(110, 2, 82), [])
  const starsNear = useMemo(() => makeStars(36, 3.4, 70), [])

  useEffect(() => {
    const s = state.current
    let raf = 0

    const apply = () => {
      if (moonRef.current) {
        moonRef.current.style.transform = `translateX(-50%) rotate(${s.rot.toFixed(2)}deg)`
      }
    }

    const tick = () => {
      if (!s.dragging) {
        if (Math.abs(s.vel) > 0.02) {
          s.rot += s.vel
          s.vel *= 0.95
        } else if (!reduced) {
          s.rot += s.autoSpeed
        }
      }
      // Mantiene el ángulo acotado para evitar números enormes con el tiempo.
      if (s.rot >= 360 || s.rot <= -360) s.rot %= 360
      apply()
      raf = requestAnimationFrame(tick)
    }

    apply()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current
    s.dragging = true
    s.lastX = e.clientX
    s.vel = 0
    if (moonRef.current) moonRef.current.style.cursor = 'grabbing'
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current
    if (!s.dragging) return
    const dx = e.clientX - s.lastX
    s.lastX = e.clientX
    s.rot += dx * 0.25
    s.vel = dx * 0.25
  }

  const endDrag = () => {
    state.current.dragging = false
    if (moonRef.current) moonRef.current.style.cursor = 'grab'
  }

  const handleContinue = () => {
    if (exiting) return
    setExiting(true)
    window.setTimeout(() => onContinue?.(), FADE_MS)
  }

  return (
    <div className="skyy-loader">
      <style>{`
        .skyy-loader {
          position: relative;
          height: 100vh;
          width: 100%;
          background: radial-gradient(120% 92% at 50% 6%, #17012f 0%, #0a0018 40%, #04000c 70%, #000000 100%);
          overflow: hidden;
          user-select: none;
        }
        .skyy-loader__stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .skyy-loader__stars--far { animation: skyy-drift 26s linear infinite; }
        .skyy-loader__stars--near { animation: skyy-drift 15s linear infinite; }
        .skyy-loader__star {
          position: absolute;
          border-radius: 50%;
          animation: skyy-twinkle var(--dur, 3.4s) ease-in-out infinite;
        }
        .skyy-loader__moon {
          position: absolute;
          left: 50%;
          bottom: -126vw;
          width: 160vw;
          height: 160vw;
          border-radius: 50%;
          transform: translateX(-50%);
          background-image: url("${ORB_URL}");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          cursor: grab;
          touch-action: none;
          will-change: transform;
          filter: saturate(1.14) contrast(1.07) brightness(1.03);
          box-shadow:
            inset 0 10px 70px 8px rgba(240,0,240,0.5),
            0 -8px 110px 16px rgba(255,0,128,0.4),
            0 -3px 46px 6px rgba(128,0,240,0.55);
        }
        /* atmósfera neón sobre la línea del horizonte (doble capa) */
        .skyy-loader__atmos {
          position: absolute;
          left: 50%;
          bottom: 30vw;
          width: 140vw;
          height: 150px;
          transform: translateX(-50%);
          background:
            radial-gradient(58% 100% at 50% 100%, rgba(255,120,220,0.5), transparent 60%),
            radial-gradient(72% 100% at 50% 100%, rgba(255,0,128,0.32), rgba(192,0,240,0.14) 42%, transparent 74%);
          filter: blur(9px);
          pointer-events: none;
        }
        /* viñeta cinematográfica para dar profundidad y foco */
        .skyy-loader__vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(122% 100% at 50% 40%, transparent 52%, rgba(0,0,0,0.5) 100%);
        }
        .skyy-loader__text {
          position: absolute;
          top: 11%;
          left: 0;
          right: 0;
          text-align: center;
          animation: skyy-fade 0.6s ease-out both;
          pointer-events: none;
          z-index: 4;
        }
        .skyy-loader__title {
          font-family: 'BBH Bogle', system-ui, sans-serif;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #F0F0F0;
          text-shadow: 0 0 20px rgba(240,0,240,0.6), 0 0 40px rgba(128,0,240,0.35);
        }
        .skyy-loader__tagline {
          margin-top: 8px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.46em;
          text-transform: uppercase;
          color: #C000F0;
        }
        .skyy-loader__dots {
          margin-top: 22px;
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .skyy-loader__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8000F0, #F000F0);
          animation: skyy-dots 1.2s ease-in-out infinite;
        }
        .skyy-loader__continue {
          margin-top: 26px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'BBH Bogle', system-ui, sans-serif;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #ffffff;
          background: linear-gradient(135deg, #8000F0, #C000F0, #F000F0);
          border: none;
          border-radius: 12px;
          padding: 16px 38px;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 0 26px -6px rgba(240, 0, 240, 0.7);
          animation: skyy-fade 0.45s ease-out both;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .skyy-loader__continue:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 0 36px -4px rgba(240, 0, 240, 0.95);
        }
        .skyy-loader__continue:active { transform: scale(0.98); }
        .skyy-loader__continue:disabled { opacity: 0.7; cursor: default; }
        .skyy-loader__continue:focus-visible {
          outline: 2px solid #F000F0;
          outline-offset: 3px;
        }
        .skyy-loader__continue .arrow {
          font-size: 16px;
          line-height: 1;
          transition: transform 0.15s ease;
        }
        .skyy-loader__continue:hover .arrow { transform: translateX(3px); }
        .skyy-loader__version {
          position: absolute;
          bottom: 16px;
          right: 18px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #ffffff;
          z-index: 4;
        }
        /* fundido a negro al continuar */
        .skyy-loader__fade {
          position: absolute;
          inset: 0;
          background: #000000;
          opacity: 0;
          pointer-events: none;
          transition: opacity ${FADE_MS}ms ease;
          z-index: 50;
        }
        .skyy-loader__fade.is-on { opacity: 1; pointer-events: all; }
        @keyframes skyy-twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes skyy-drift {
          from { transform: translateY(0); }
          to { transform: translateY(46px); }
        }
        @keyframes skyy-dots {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes skyy-fade {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .skyy-loader__stars--far,
          .skyy-loader__stars--near { animation: none; }
          .skyy-loader__star { animation: none; opacity: 0.7; }
          .skyy-loader__dot { animation: none; opacity: 0.7; }
        }
      `}</style>

      <div className="skyy-loader__stars skyy-loader__stars--far">
        {starsFar.map((st, i) => (
          <span
            key={`f${i}`}
            className="skyy-loader__star"
            style={{
              left: `${st.left}%`,
              top: `${st.top}%`,
              width: `${st.size}px`,
              height: `${st.size}px`,
              background: st.hue,
              boxShadow: `0 0 ${st.size * 2}px ${st.hue}`,
              animationDelay: `${st.delay}s`,
              ['--dur' as string]: `${st.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="skyy-loader__stars skyy-loader__stars--near">
        {starsNear.map((st, i) => (
          <span
            key={`n${i}`}
            className="skyy-loader__star"
            style={{
              left: `${st.left}%`,
              top: `${st.top}%`,
              width: `${st.size}px`,
              height: `${st.size}px`,
              background: st.hue,
              boxShadow: `0 0 ${st.size * 2.4}px ${st.hue}`,
              animationDelay: `${st.delay}s`,
              ['--dur' as string]: `${st.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="skyy-loader__atmos" />

      <div
        ref={moonRef}
        className="skyy-loader__moon"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label="SKYY Client cargando"
      />

      <div className="skyy-loader__vignette" />

      <div className="skyy-loader__text">
        <div className="skyy-loader__title">{label}</div>
        {tagline && <div className="skyy-loader__tagline">{tagline}</div>}
        {ready ? (
          <button
            type="button"
            className="skyy-loader__continue"
            onClick={handleContinue}
            disabled={exiting}
          >
            Continuar launcher
            <span className="arrow" aria-hidden="true">&#8594;</span>
          </button>
        ) : (
          <div className="skyy-loader__dots">
            <span className="skyy-loader__dot" style={{ animationDelay: '0s' }} />
            <span className="skyy-loader__dot" style={{ animationDelay: '0.16s' }} />
            <span className="skyy-loader__dot" style={{ animationDelay: '0.32s' }} />
          </div>
        )}
      </div>

      <div className="skyy-loader__version">v1.0.19</div>

      <div className={`skyy-loader__fade${exiting ? ' is-on' : ''}`} />
    </div>
  )
}

export default SkyyLoader
