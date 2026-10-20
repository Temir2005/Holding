import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Size = 'display' | 'h2' | 'h3'

const sizeClass: Record<Size, string> = {
  display: 'text-display font-heading',
  h2: 'text-title font-heading',
  h3: 'text-subtitle font-semibold',
}

type Props = {
  /** Document level, independent of the visual size (the hero h1 is `display`). */
  level: 1 | 2 | 3
  size?: Size
  id?: string
  className?: string
  children: ReactNode
}

/** Headings of the type scale. Long words break instead of overflowing a phone screen. */
export function Heading({ level, size, id, className, children }: Props) {
  const Tag = `h${level}` as const
  const visual = size ?? (level === 1 ? 'display' : level === 2 ? 'h2' : 'h3')
  return (
    <Tag id={id} className={cn(sizeClass[visual], '[overflow-wrap:break-word]', className)}>
      {children}
    </Tag>
  )
}
