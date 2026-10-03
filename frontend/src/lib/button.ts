import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary'

export const buttonClass = (variant: ButtonVariant = 'primary', className?: string) =>
  cn(
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3',
    'font-display text-[0.95rem] font-semibold transition duration-200 ease-out',
    'motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary'
      ? 'bg-accent text-on-accent hover:brightness-110'
      : 'border border-fg/25 text-fg hover:border-fg/60',
    className,
  )
