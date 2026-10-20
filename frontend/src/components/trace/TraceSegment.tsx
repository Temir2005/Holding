import { motion, useReducedMotion, useScroll, type MotionValue } from 'framer-motion'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { PEN_OFFSET } from '@/lib/motion'
import { straight, type TraceBox, type TracePath } from './paths'

type Props = {
  /** The section element the segment belongs to; its scroll progress draws the line. */
  target: RefObject<HTMLElement>
  path?: TracePath
}

/**
 * One segment of the red line that runs through the whole page.
 * Contract: every section enters at its top edge and leaves at its bottom edge at
 * x = var(--trace-x), so the line never breaks whatever the order of sections the editor sets.
 * Progress is the section's own scroll through the pen height (PEN_OFFSET), so the drawing
 * continues across section borders without a pause. Reduced motion: drawn at once.
 */
export function TraceSegment({ target, path = straight }: Props) {
  const reduce = useReducedMotion()
  const probe = useRef<HTMLSpanElement>(null)
  const box = useBox(target, probe)
  const { scrollYProgress } = useScroll({ target, offset: [...PEN_OFFSET] })

  return (
    <>
      {/* Measures var(--trace-x) in pixels: the variable is a clamp() expression. */}
      <span
        ref={probe}
        aria-hidden="true"
        className="pointer-events-none absolute left-[var(--trace-x)] top-0 h-0 w-0"
      />
      {box && (
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 z-trace h-full w-full overflow-visible"
          width={box.w}
          height={box.h}
        >
          <Path d={path(box)} progress={reduce ? null : scrollYProgress} />
        </svg>
      )}
    </>
  )
}

function Path({ d, progress }: { d: string; progress: MotionValue<number> | null }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="rgb(var(--trace))"
      strokeWidth={2}
      // A null progress (reduced motion) leaves the path fully drawn.
      style={progress ? { pathLength: progress } : undefined}
    />
  )
}

/** Section size and line x, re-measured only when the section resizes. */
function useBox(target: RefObject<HTMLElement>, probe: RefObject<HTMLElement>): TraceBox | null {
  const [box, setBox] = useState<TraceBox | null>(null)
  useLayoutEffect(() => {
    const el = target.current
    if (!el) return
    const measure = () => {
      const x = Math.round(probe.current?.offsetLeft ?? 0) + 0.5
      const next = { w: el.offsetWidth, h: el.offsetHeight, x }
      setBox((prev) =>
        prev && prev.w === next.w && prev.h === next.h && prev.x === next.x ? prev : next,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [target, probe])
  return box
}
