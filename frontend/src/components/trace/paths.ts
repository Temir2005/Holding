/** Geometry a section path is drawn in: section size and the x of the line in the margin. */
export type TraceBox = { w: number; h: number; x: number }

/**
 * Builds the SVG path of a section's part of the red line.
 * Contract: it starts at (x, 0) and ends at (x, h), so any order of sections keeps it continuous.
 */
export type TracePath = (box: TraceBox) => string

/** Default: the line just passes through the section in the binding margin. */
export const straight: TracePath = ({ x, h }) => `M ${x} 0 V ${h}`
