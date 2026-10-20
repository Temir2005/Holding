import type { TraceBranches } from '@/components/trace/paths'

/** Anchor of the row numbers of a register (team, vacancies): the line ticks every row. */
export const REGISTER_ROW = 'register-row'

/** A short tick across the line at every row number, drawn as the pen passes the row. */
export const rowTicks: TraceBranches = (box) =>
  (box.anchors[REGISTER_ROW] ?? [])
    .filter((p) => p.y > 0 && p.y < box.h)
    .map((p) => ({ d: `M ${box.x - 5} ${p.y} H ${box.x + 6}`, at: p.y }))
