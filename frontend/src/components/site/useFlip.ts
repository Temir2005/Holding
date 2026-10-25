import { useCallback, useLayoutEffect, useRef } from 'react'
import { reduceMotion } from './hooks'

const EASE = 'cubic-bezier(.23,1,.32,1)'

/**
 * Filtering with FLIP: items (children with `data-flip`) that stay glide from where they were
 * to where they are now, new ones fade in. Call `flip(() => setState(...))` around the change.
 */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const before = useRef<Map<string, DOMRect> | null>(null)

  const measure = () => {
    const map = new Map<string, DOMRect>()
    ref.current
      ?.querySelectorAll<HTMLElement>('[data-flip]')
      .forEach((el) => map.set(el.dataset.flip ?? '', el.getBoundingClientRect()))
    return map
  }

  useLayoutEffect(() => {
    const first = before.current
    before.current = null
    if (!first || reduceMotion()) return
    ref.current?.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
      const a = first.get(el.dataset.flip ?? '')
      const b = el.getBoundingClientRect()
      if (!a)
        el.animate(
          [
            { opacity: 0, transform: 'scale(.96)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 320, easing: EASE },
        )
      else if (a.left !== b.left || a.top !== b.top)
        el.animate(
          [
            { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` },
            { transform: 'none' },
          ],
          { duration: 480, easing: EASE },
        )
    })
  })

  const flip = useCallback((change: () => void) => {
    before.current = measure()
    change()
  }, [])
  return Object.assign(flip, { ref })
}
