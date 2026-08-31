import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  title: string
  message?: string
  type: ToastType
}

interface ToastState {
  toasts: Toast[]
  push: (title: string, message?: string, type?: ToastType) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (title, message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((state) => ({ toasts: [...state.toasts, { id, title, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4500)
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push(title, message, 'success'),
  error: (title: string, message?: string) =>
    useToastStore.getState().push(title, message, 'error'),
  info: (title: string, message?: string) =>
    useToastStore.getState().push(title, message, 'info'),
  warning: (title: string, message?: string) =>
    useToastStore.getState().push(title, message, 'warning'),
}
