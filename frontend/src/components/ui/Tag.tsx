import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = { children: ReactNode; tone?: 'default' | 'accent' | 'overlay'; className?: string }

/** Mono label in a hairline box: «Токенизирован», tags of a project. */
export function Tag({ children, tone = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-[3px] font-mono text-caption font-medium uppercase',
        tone === 'default' && 'border-fg text-fg',
        tone === 'accent' && 'border-accent bg-accent text-on-accent',
        // On top of a photo: a solid graphite chip, never translucent glass.
        tone === 'overlay' && 'border-graphite bg-graphite text-chalk',
        className,
      )}
    >
      {children}
    </span>
  )
}
