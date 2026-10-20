import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary'

/**
 * Square buttons with a 1px edge, like a stamp on a drawing. Primary is filled with the text
 * colour of the tone (never the accent: red is reserved for the line), secondary is outlined.
 */
export const buttonClass = (variant: ButtonVariant = 'primary', className?: string) =>
  cn(
    'group/btn inline-flex min-h-12 items-center justify-between gap-4 border py-2 pl-5 pr-4',
    'text-[0.9375rem] font-medium tracking-[-0.005em] transition-colors duration-2 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary'
      ? 'border-fg bg-fg text-surface hover:bg-fg/90'
      : 'border-fg text-fg hover:bg-fg hover:text-surface',
    className,
  )
