import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = { children: ReactNode; tone?: 'default' | 'accent' | 'overlay'; className?: string }

export function Tag({ children, tone = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.06em]',
        tone === 'default' && 'border border-line text-fg-mute',
        tone === 'accent' && 'bg-accent text-on-accent',
        tone === 'overlay' && 'bg-deep/75 text-[rgb(var(--ink))] backdrop-blur',
        className,
      )}
    >
      {children}
    </span>
  )
}
