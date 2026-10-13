import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown as a tooltip. */
  label: string
  icon: ReactNode
  tooltip?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, tooltip = true, className, type = 'button', ...rest },
  ref,
) {
  return (
    <Tooltip label={label} enabled={tooltip}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          'inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute',
          'transition-colors hover:bg-sunken hover:text-fg disabled:opacity-50',
          'md:min-h-9 md:min-w-9',
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    </Tooltip>
  )
})
