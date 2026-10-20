import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { DUR, EASE_OUT } from '@/lib/motion'

type Props = {
  children: ReactNode
  className?: string
  /** Direction the frame opens from. */
  from?: 'bottom' | 'left'
  delay?: number
}

const closed = { bottom: 'inset(100% 0 0 0)', left: 'inset(0 100% 0 0)' } as const

/**
 * A frame opens like a sheet being uncovered (clip-path only, no layout shift).
 * Reduced motion: a plain fade. Never for the first-screen image: it must show at once (LCP).
 */
export function ClipReveal({ children, className, from = 'bottom', delay = 0 }: Props) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { clipPath: closed[from] }}
      whileInView={reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0 0 0)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: reduce ? DUR.base : DUR.draw,
        ease: EASE_OUT,
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  )
}
