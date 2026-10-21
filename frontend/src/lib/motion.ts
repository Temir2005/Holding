/**
 * Motion tokens shared by every animated component. Mirror the CSS ones in styles/tokens.css.
 * Rule of the design: motion explains structure; with prefers-reduced-motion only opacity is left.
 */
export const EASE_OUT = [0.2, 0.7, 0.2, 1] as const
export const EASE_IN_OUT = [0.6, 0, 0.2, 1] as const

/** Durations in seconds (framer-motion units). */
export const DUR = { fast: 0.15, base: 0.3, step: 0.45, reveal: 0.7, draw: 1.1 } as const

/** Where the pen crosses the viewport: each section draws its part of the line at this height. */
export const PEN = '78%'

/** useScroll offset for a section whose line is drawn by the pen. */
export const PEN_OFFSET = [`start ${PEN}`, `end ${PEN}`] as const

/** Stagger step for items in a row or grid (60 ms per item, capped). */
export const stagger = (index: number) => Math.min(index, 6) * 0.06

/**
 * The easing curve of a cubic-bezier(x1, y1, x2, y2) as a function of progress 0–1, for the
 * few values animated by hand (CountUp) instead of through Framer Motion's animation engine.
 */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1
  const x = (t: number) => ((ax * t + bx) * t + cx) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  const y = (t: number) => ((ay * t + by) * t + cy) * t
  return (p: number) => {
    if (p <= 0) return 0
    if (p >= 1) return 1
    // Newton steps from t = p, then bisection if the slope is too flat to trust
    let t = p
    for (let i = 0; i < 6; i++) {
      const err = x(t) - p
      if (Math.abs(err) < 1e-5) return y(t)
      const slope = dx(t)
      if (Math.abs(slope) < 1e-6) break
      t -= err / slope
    }
    let lo = 0
    let hi = 1
    t = p
    for (let i = 0; i < 30 && hi - lo > 1e-5; i++) {
      if (x(t) < p) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return y(t)
  }
}
