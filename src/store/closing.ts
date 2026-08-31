import { create } from 'zustand'

/**
 * Estado del cierre del launcher. Al pulsar la X no cerramos de golpe:
 * mostramos una pantalla de despedida (ClosingScreen) durante un momento
 * y recién después llamamos al cierre real de la ventana.
 */
const CLOSE_DELAY_MS = 1150

interface ClosingState {
  closing: boolean
  startClose: () => void
}

export const useClosingStore = create<ClosingState>((set, get) => ({
  closing: false,
  startClose: () => {
    if (get().closing) return
    set({ closing: true })
    window.setTimeout(() => {
      void window.skyy.close()
    }, CLOSE_DELAY_MS)
  },
}))
