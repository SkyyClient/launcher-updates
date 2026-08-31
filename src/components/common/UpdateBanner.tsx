import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

type Phase = 'idle' | 'available' | 'downloading' | 'ready'

interface UpdateState {
  phase: Phase
  version: string
  percent: number
}

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle', version: '', percent: 0 })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubs = [
      window.skyy.onUpdateAvailable(({ version }) => {
        setState({ phase: 'available', version, percent: 0 })
        setDismissed(false)
      }),
      window.skyy.onUpdateProgress(({ percent }) => {
        setState((s) => ({ ...s, phase: 'downloading', percent }))
      }),
      window.skyy.onUpdateReady(({ version }) => {
        setState({ phase: 'ready', version, percent: 100 })
      }),
      window.skyy.onUpdateError(() => {
        setState({ phase: 'idle', version: '', percent: 0 })
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const handleDownload = async () => {
    setState((s) => ({ ...s, phase: 'downloading', percent: 0 }))
    await window.skyy.downloadUpdate()
  }

  const handleInstall = () => {
    void window.skyy.installUpdate()
  }

  const visible = !dismissed && state.phase !== 'idle'
  if (!visible) return null

  return (
    <div className="skyy-update-banner">
      <style>{`
        .skyy-update-banner {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9000;
          width: 320px;
          background: linear-gradient(135deg, #12003a 0%, #0a0018 100%);
          border: 1px solid rgba(192, 0, 240, 0.35);
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 8px 40px rgba(128, 0, 240, 0.35), 0 2px 8px rgba(0,0,0,0.5);
          animation: skyy-banner-in 0.35s cubic-bezier(.22,1,.36,1) both;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @keyframes skyy-banner-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .skyy-update-banner__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .skyy-update-banner__title {
          font-family: 'BBH Bogle', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #F0F0F0;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .skyy-update-banner__title svg { color: #C000F0; flex-shrink: 0; }
        .skyy-update-banner__version {
          font-size: 11px;
          color: #A78BFA;
          letter-spacing: 0.06em;
        }
        .skyy-update-banner__dismiss {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .skyy-update-banner__dismiss:hover { color: #E9D5FF; }
        .skyy-update-banner__progress-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .skyy-update-banner__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8000F0, #F000F0);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .skyy-update-banner__percent {
          font-size: 11px;
          color: #C000F0;
          text-align: right;
          font-weight: 600;
        }
        .skyy-update-banner__btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border: none;
          border-radius: 9px;
          font-family: 'BBH Bogle', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.12s;
        }
        .skyy-update-banner__btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .skyy-update-banner__btn:active { transform: scale(0.98); }
        .skyy-update-banner__btn--download {
          background: linear-gradient(135deg, #8000F0, #C000F0, #F000F0);
          color: #fff;
          box-shadow: 0 0 20px -4px rgba(240,0,240,0.6);
        }
        .skyy-update-banner__btn--install {
          background: linear-gradient(135deg, #059669, #10B981);
          color: #fff;
          box-shadow: 0 0 20px -4px rgba(16,185,129,0.5);
        }
      `}</style>

      <div className="skyy-update-banner__header">
        <div className="skyy-update-banner__title">
          <Download size={15} />
          {state.phase === 'ready' ? 'Actualización lista' : 'Nueva versión disponible'}
        </div>
        {state.phase !== 'downloading' && (
          <button className="skyy-update-banner__dismiss" onClick={() => setDismissed(true)}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="skyy-update-banner__version">v{state.version}</div>

      {state.phase === 'available' && (
        <button className="skyy-update-banner__btn skyy-update-banner__btn--download" onClick={handleDownload}>
          <Download size={14} />
          Descargar actualización
        </button>
      )}

      {state.phase === 'downloading' && (
        <>
          <div className="skyy-update-banner__progress-track">
            <div
              className="skyy-update-banner__progress-fill"
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <div className="skyy-update-banner__percent">{state.percent}%</div>
        </>
      )}

      {state.phase === 'ready' && (
        <button className="skyy-update-banner__btn skyy-update-banner__btn--install" onClick={handleInstall}>
          <RefreshCw size={14} />
          Instalar y reiniciar
        </button>
      )}
    </div>
  )
}

export default UpdateBanner
