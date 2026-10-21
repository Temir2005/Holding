import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary'

/**
 * Square buttons with a 1px edge, like a stamp on a drawing. Primary is filled with the text
 * colour of the tone (never the accent: red is reserved for the line), secondary is outlined.
 */
export const buttonClass = (variant: ButtonVariant = 'primary', className?: string) =>
  cn(
    'group/btn inline-flex min-h-12 items-center justify-between gap-4 border py-2 pl-5 pr-4',
    'text-[0.9375rem] font-medium tracking-[-0.005em] transition-[color,background-color,transform] duration-2 ease-out',
    // pressed like a stamp: a pixel down and a shade deeper, transform only (no layout)
    'active:translate-y-px active:duration-1 motion-reduce:active:translate-y-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
    variant === 'primary'
      ? 'border-fg bg-fg text-surface hover:bg-fg/90 active:bg-fg/80'
      : 'border-fg text-fg hover:bg-fg hover:text-surface active:bg-fg/85',
    className,
  )
