import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Reveal } from './Reveal'

type Props = {
  id?: string
  eyebrow?: string | null
  title?: string | null
  intro?: string | null
  aside?: ReactNode
  className?: string
}

export function SectionHeader({ id, eyebrow, title, intro, aside, className }: Props) {
  if (!eyebrow && !title && !intro && !aside) return null
  return (
    <Reveal
      className={cn(
        'mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex max-w-3xl flex-col gap-4">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && (
          <h2 id={id} className="text-h2">
            {title}
          </h2>
        )}
        {intro && <p className="max-w-prose text-lead text-fg-mute">{intro}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </Reveal>
  )
}
