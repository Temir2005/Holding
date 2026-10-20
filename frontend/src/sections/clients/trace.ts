import type { TraceBranches } from '@/components/trace/paths'

/** Anchor of every opening quote mark: the line reaches out to it with a callout. */
export const MARK_ANCHOR = 'testimonial-mark'

/**
 * A callout from the line in the margin to every opening mark: a node on the line, then a
 * hairline to the mark, drawn when the pen reaches the quote. Only where the quote stands off
 * the margin (from lg); on a phone the mark sits right at the line.
 */
export const calloutsToMarks: TraceBranches = (box) =>
  (box.anchors[MARK_ANCHOR] ?? [])
    .filter((p) => p.x - box.x > 48 && p.y > 0 && p.y < box.h)
    .flatMap((p) => [
      {
        d: `M ${box.x + 3.5} ${p.y} A 3.5 3.5 0 1 1 ${box.x - 3.5} ${p.y} A 3.5 3.5 0 1 1 ${box.x + 3.5} ${p.y}`,
        at: p.y,
      },
      { d: `M ${box.x + 3.5} ${p.y} H ${p.x - 10}`, at: p.y },
    ])
