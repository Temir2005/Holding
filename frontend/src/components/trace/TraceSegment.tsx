import {
  motion,
  motionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { PEN_OFFSET } from '@/lib/motion'
import { straight, type TraceBox, type TraceBranches, type TracePath } from './paths'

type Props = {
  /** The section element the segment belongs to; its scroll progress draws the line. */
  target: RefObject<HTMLElement>
  path?: TracePath
  /** Side strokes, each drawn when the pen reaches its height. */
  branches?: TraceBranches
}

/**
 * One segment of the red line that runs through the whole page.
 * Contract: every section enters at its top edge and leaves at its bottom edge at
 * x = var(--trace-x), so the line never breaks whatever the order of sections the editor sets.
 * Progress is the section's own scroll through the pen height (PEN_OFFSET), so the drawing
 * continues across section borders without a pause. Reduced motion: drawn at once.
 */
export function TraceSegment({ target, path = straight, branches }: Props) {
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
          {branches?.(box).map((b) => (
            <Branch
              key={b.d}
              d={b.d}
              at={box.h > 0 ? b.at / box.h : 0}
              progress={reduce ? null : scrollYProgress}
            />
          ))}
        </svg>
      )}
    </>
  )
}

/** Stand-in progress for reduced motion: hooks must run either way, the stroke is just drawn. */
const FULL = motionValue(1)

/** A branch is drawn over the next ~6% of the section once the pen reaches its start. */
function Branch({
  d,
  at,
  progress,
}: {
  d: string
  at: number
  progress: MotionValue<number> | null
}) {
  // Never a zero-width range: a branch at the very bottom still gets the last 6% to draw.
  const start = Math.min(Math.max(at, 0), 0.94)
  const drawn = useTransform(progress ?? FULL, [start, start + 0.06], [0, 1], { clamp: true })
  return <Path d={d} progress={progress ? drawn : null} />
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

/**
 * Section size, line x and anchors, re-measured only when the section resizes (a reflow that
 * moves anchors also changes the section height, so it is caught too). Never per frame.
 */
function useBox(target: RefObject<HTMLElement>, probe: RefObject<HTMLElement>): TraceBox | null {
  const [box, setBox] = useState<TraceBox | null>(null)
  useLayoutEffect(() => {
    const el = target.current
    if (!el) return
    const measure = () => {
      const anchors: TraceBox['anchors'] = {}
      el.querySelectorAll<HTMLElement>('[data-trace-anchor]').forEach((node) => {
        const name = node.dataset.traceAnchor ?? ''
        const p = layoutOffset(node, el)
        ;(anchors[name] ??= []).push({
          x: Math.round(p.x),
          y: Math.round(p.y + node.offsetHeight / 2),
        })
      })
      const next: TraceBox = {
        w: el.offsetWidth,
        h: el.offsetHeight,
        x: Math.round(probe.current?.offsetLeft ?? 0) + 0.5,
        anchors,
      }
      setBox((prev) => (prev && sameBox(prev, next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Web fonts change line breaks without always resizing the section: measure once more.
    void document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [target, probe])
  return box
}

/**
 * Position of a node inside the section from layout offsets, not getBoundingClientRect: reveal
 * animations move elements with transforms, and the line must follow where they land.
 * The section is `position: relative` (.sheet), so the offsetParent chain reaches it.
 */
function layoutOffset(node: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let current: HTMLElement | null = node
  while (current && current !== root) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return { x, y }
}

const sameBox = (a: TraceBox, b: TraceBox) =>
  a.w === b.w &&
  a.h === b.h &&
  a.x === b.x &&
  JSON.stringify(a.anchors) === JSON.stringify(b.anchors)
