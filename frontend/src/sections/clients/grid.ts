import type { TraceBranches } from '@/components/trace/paths'
import type { Breakpoint } from './useBreakpoint'

/** The column count that leaves the fewest empty cells in the last row (ties: the first). */
function bestCols(n: number, options: readonly number[]): number {
  const empty = (c: number) => (c - (n % c)) % c
  return options.reduce((best, c) => (empty(c) < empty(best) ? c : best))
}

/**
 * Columns of the client legend for `n` clients (the whole list, not the filtered part, so the
 * cells keep their width while the filter changes). A short list keeps one row: a single client
 * sits beside two hatched cells instead of alone. Long lists get a fifth column on wide screens.
 */
export function gridColumns(n: number, bp: Breakpoint): number {
  if (bp === 'sm') return n === 1 ? 1 : 2
  if (n <= 3) return n === 2 ? 2 : 3
  if (bp === 'md') return bestCols(n, [3, 2])
  if (bp === 'lg') return bestCols(n, [4, 3])
  return bestCols(n, n > 12 ? [5, 4] : [4, 3])
}

/** Empty cells that close the last row. */
export const fillCount = (n: number, cols: number) => (n ? (cols - (n % cols)) % cols : 0)

/** Anchor of the first cell of every row: the line marks each row of the legend with a tick. */
export const ROW_ANCHOR = 'clients-row'

export const rowTicks: TraceBranches = (box) =>
  (box.anchors[ROW_ANCHOR] ?? [])
    .filter((p) => p.y > 0 && p.y < box.h)
    .map((p) => ({ d: `M ${box.x - 5} ${p.y} H ${box.x + 6}`, at: p.y }))
