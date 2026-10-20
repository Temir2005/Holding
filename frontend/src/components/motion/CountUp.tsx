import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { DUR, EASE_OUT } from '@/lib/motion'

type Props = {
  value: number
  /** Formats a number for display (locale separators); applied to every frame. */
  format: (n: number) => string
  className?: string
}

/**
 * A number that counts up when it enters the viewport.
 * - The final value is in the DOM from the start for screen readers and crawlers; only an
 *   aria-hidden copy animates.
 * - The final value also reserves the width (both share one grid cell), so the layout never
 *   shifts while digits change.
 * - Reduced motion: the final value, no counting.
 */
export function CountUp({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, value, {
      duration: DUR.draw * 1.2,
      ease: EASE_OUT,
      onUpdate: (n) => setShown(Math.round(n)),
      onComplete: () => setShown(null),
    })
    return () => controls.stop()
  }, [inView, reduce, value])

  const counting = shown !== null
  return (
    <span ref={ref} className={`tabular inline-grid ${className ?? ''}`}>
      <span className={counting ? 'invisible [grid-area:1/1]' : '[grid-area:1/1]'}>
        {format(value)}
      </span>
      {counting && (
        <span aria-hidden="true" className="[grid-area:1/1]">
          {format(shown)}
        </span>
      )}
    </span>
  )
}
