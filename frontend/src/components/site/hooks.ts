import { createContext, useEffect, useRef, useState } from 'react'

export const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Becomes true once the element has been on screen (never false again). */
export function useInView<T extends Element>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, seen])
  return [ref, seen] as const
}

/** Light sections that follow each other alternate between grey and white (PageRenderer). */
export const AltContext = createContext(false)

/** True from the second frame after mount: first-screen animations start from their first state. */
export function useReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let b = 0
    const a = requestAnimationFrame(() => (b = requestAnimationFrame(() => setReady(true))))
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [])
  return ready
}
