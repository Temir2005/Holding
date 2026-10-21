import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'

type Props = {
  /** Mono label in the middle of the line (a number, a range, "S = 18 500 м²"). */
  label?: ReactNode
  className?: string
  /** The line stretches from its start when it enters the viewport. */
  grow?: boolean
}

/** Dimension line of a drawing: |←—— label ——→|. Decorative unless it carries a label. */
export function DimensionLine({ label, className, grow = true }: Props) {
  const reduce = useReducedMotion()
  const animate = grow && !reduce
  return (
    <m.div
      className={cn('flex items-center gap-2 text-fg-mute', className)}
      // Drawn from the start like a pen stroke; clip-path keeps the label from squeezing.
      initial={animate ? { clipPath: 'inset(0 100% 0 0)' } : false}
      whileInView={animate ? { clipPath: 'inset(0 0% 0 0)' } : undefined}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: DUR.reveal, ease: EASE_OUT }}
    >
      <End side="start" />
      <span aria-hidden="true" className="h-px flex-1 bg-current" />
      {label != null && (
        <span className="mono-label whitespace-nowrap px-1 text-current">{label}</span>
      )}
      {label != null && <span aria-hidden="true" className="h-px flex-1 bg-current" />}
      <End side="end" />
    </m.div>
  )
}

function End({ side }: { side: 'start' | 'end' }) {
  return (
    <svg
      aria-hidden="true"
      width="7"
      height="11"
      viewBox="0 0 7 11"
      className="flex-none overflow-visible"
    >
      {side === 'start' ? (
        <path d="M0.5 0V11M6 2.5L0.5 5.5L6 8.5" fill="none" stroke="currentColor" />
      ) : (
        <path d="M6.5 0V11M1 2.5L6.5 5.5L1 8.5" fill="none" stroke="currentColor" />
      )}
    </svg>
  )
}
