import { createContext, useContext, type ReactNode } from 'react'

export type ToastTone = 'success' | 'danger' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  title: ReactNode
  description?: ReactNode
}

export interface ToastApi {
  show: (toast: Omit<ToastItem, 'id'>) => void
  success: (title: ReactNode, description?: ReactNode) => void
  /** Shows an error; `AdminApiError` messages come from the server and are readable. */
  error: (error: unknown, fallbackTitle?: ReactNode) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast outside ToastProvider')
  return api
}
