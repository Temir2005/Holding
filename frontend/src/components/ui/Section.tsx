import type { ReactNode } from 'react'
import type { Tone } from '@/api/types'
import { cn } from '@/lib/cn'
import { Container } from './Container'

type Props = {
  tone: Tone
  anchor?: string | null
  children: ReactNode
  className?: string
  /** Full-bleed content skips the inner container. */
  bleed?: boolean
  labelledBy?: string
}

/** Every CMS section renders inside this: tone, anchor and vertical rhythm. */
export function Section({ tone, anchor, children, className, bleed, labelledBy }: Props) {
  return (
    <section
      id={anchor ?? undefined}
      aria-labelledby={labelledBy}
      className={cn(`tone-${tone}`, 'py-16 md:py-24', className)}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  )
}
