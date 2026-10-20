import { useMotionValueEvent, useReducedMotion, useScroll, type MotionValue } from 'framer-motion'
import { useState, type RefObject } from 'react'

/** Scroll length of one step, in small-viewport heights (svh does not jump with the iOS bar). */
export const STEP_SVH = 65

/**
 * Mechanics of a pinned scene (the full cycle): the section is 100svh + N·65svh tall, its
 * stage is `position: sticky` for 100svh, and the active step follows the scroll position only.
 * Native scrolling: no snapping, no wheel interception, scrolling up steps back.
 * Returns `pinned: false` when the scene must be a plain list (reduced motion or N ≤ 1).
 */
export function usePinnedSteps(
  target: RefObject<HTMLElement>,
  count: number,
): { pinned: boolean; active: number; progress: MotionValue<number> } {
  const reduce = useReducedMotion()
  const pinned = !reduce && count > 1
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end end'] })
  const [active, setActive] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (!pinned) return
    const next = Math.min(count - 1, Math.max(0, Math.floor(p * count)))
    setActive((prev) => (prev === next ? prev : next))
  })

  return { pinned, active: pinned ? active : 0, progress: scrollYProgress }
}

/** Height of a pinned section: every step gets 65svh of scroll, the last one included. */
export const pinnedHeight = (count: number) =>
  `calc(100svh + ${Math.max(0, count)} * ${STEP_SVH}svh)`
