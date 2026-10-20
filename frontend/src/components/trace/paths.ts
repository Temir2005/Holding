/** A point inside the section, relative to its top-left corner. */
export type TracePoint = { x: number; y: number }

/**
 * Geometry a section path is drawn in: section size, the x of the line in the margin, and the
 * positions of elements marked with `data-trace-anchor="name"` (several elements with the same
 * name are listed in document order). Anchors let a block route the line through its own
 * details (the hero datum, the stations of a timeline) without hard-coded offsets.
 */
export type TraceBox = { w: number; h: number; x: number; anchors: Record<string, TracePoint[]> }

/**
 * Builds the SVG path of a section's part of the red line.
 * Contract: it starts at (x, 0) and ends at (x, h), so any order of sections keeps it continuous.
 * (The only exception is the first section of a page, which may start the line lower.)
 */
export type TracePath = (box: TraceBox) => string

/**
 * A side stroke off the main line (a branch to a figure, a tick at a row, the turn into the
 * stamp). Branches are separate short paths, drawn from where the pen reaches `at` (px from the
 * top of the section), so they never lengthen the main path and the line keeps pace with the pen.
 */
export type TraceBranch = { d: string; at: number }
export type TraceBranches = (box: TraceBox) => TraceBranch[]

/** Default: the line just passes through the section in the binding margin. */
export const straight: TracePath = ({ x, h }) => `M ${x} 0 V ${h}`

/** First point of an anchor, or null when the block did not render it. */
export const anchor = (box: TraceBox, name: string): TracePoint | null =>
  box.anchors[name]?.[0] ?? null
