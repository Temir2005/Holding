import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { DUR, EASE_OUT } from '@/lib/motion'

type Props = {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li'
}

/**
 * Fade and rise on first entry into the viewport. With reduced motion only the fade is left.
 * Not for the hero heading or the first-screen image: those are visible from the first frame (LCP).
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: Props) {
  const reduce = useReducedMotion()
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: reduce ? DUR.base : DUR.reveal,
        ease: EASE_OUT,
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </Tag>
  )
}
