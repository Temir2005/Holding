import { createContext, useContext, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  /** Destructive actions get a red button and cannot be dismissed by an outside click. */
  danger?: boolean
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Confirm | null>(null)

/** `const confirm = useConfirm(); if (await confirm({...})) …` */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm outside ConfirmProvider')
  return confirm
}
