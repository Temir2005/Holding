import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-95 border border-transparent',
  secondary: 'bg-panel text-fg border border-line-strong hover:bg-sunken',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-sunken',
  danger: 'bg-danger text-white border border-transparent hover:brightness-95',
}

// Phones get 44px targets; denser 36px controls from tablet up.
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-touch md:min-h-8 px-3 text-sm gap-1.5',
  md: 'min-h-touch md:min-h-9 px-4 text-sm gap-2',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center rounded font-medium',
    'transition-colors disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
  )
}

export const controlClass = cn(
  'w-full rounded border border-line-strong bg-panel px-3 text-fg placeholder:text-mute',
  'min-h-touch md:min-h-9 text-base md:text-sm',
  'aria-[invalid=true]:border-danger disabled:opacity-60',
)
