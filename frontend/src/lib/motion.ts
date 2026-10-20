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
