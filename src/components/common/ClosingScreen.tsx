import { useClosingStore } from '@/store/closing'
import logoImage from '../../img/logo.png'

/**
 * Pantalla de despedida al cerrar el launcher.
 *
 * Se monta siempre, pero solo se vuelve visible cuando `closing` pasa a true
 * (al pulsar la X). Hace un fundido cósmico con el logo y un spinner neón,
 * mientras el store espera el delay antes del cierre real de la ventana.
 */
export function ClosingScreen() {
  const closing = useClosingStore((s) => s.closing)

  return (
    <div className={`skyy-closing${closing ? ' is-on' : ''}`} aria-hidden={!closing}>
      <style>{`
        .skyy-closing {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 26px;
          background: radial-gradient(120% 92% at 50% 40%, #17012f 0%, #0a0018 42%, #04000c 72%, #000000 100%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 320ms ease;
        }
        .skyy-closing.is-on {
          opacity: 1;
          pointer-events: all;
        }
        .skyy-closing__logo {
          width: 96px;
          height: 96px;
          object-fit: contain;
          filter: drop-shadow(0 0 24px rgba(240, 0, 240, 0.55));
          animation: skyy-closing-pulse 1.6s ease-in-out infinite;
        }
        .skyy-closing__spinner {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 3px solid rgba(240, 0, 240, 0.18);
          border-top-color: #F000F0;
          border-right-color: #C000F0;
          animation: skyy-closing-spin 0.9s linear infinite;
        }
        .skyy-closing__text {
          font-family: 'BBH Bogle', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #E9D5FF;
          text-shadow: 0 0 16px rgba(128, 0, 240, 0.5);
        }
        @keyframes skyy-closing-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes skyy-closing-pulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .skyy-closing__logo,
          .skyy-closing__spinner { animation: none; }
        }
      `}</style>

      <img src={logoImage} alt="SKYY Client" className="skyy-closing__logo" />
      <div className="skyy-closing__spinner" />
      <div className="skyy-closing__text">Cerrando SKYY Client…</div>
    </div>
  )
}

export default ClosingScreen
