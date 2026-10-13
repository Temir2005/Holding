import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export const TooltipProvider = RadixTooltip.Provider

interface TooltipProps {
  label: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** When false the trigger renders without a tooltip (e.g. labels already visible). */
  enabled?: boolean
  children: ReactNode
}

export function Tooltip({ label, side = 'top', enabled = true, children }: TooltipProps) {
  if (!enabled) return <>{children}</>
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-toast rounded bg-fg px-2 py-1 text-xs text-canvas shadow-sm"
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
