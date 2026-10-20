import { anchor, type TraceBranches } from '@/components/trace/paths'

/** The dispatch point: a node on the bus that leaves the line in the margin. */
export const ORIGIN_ANCHOR = 'geo-origin'
/** Left edge of the band the routes turn down in (desktop: between the origin and the table). */
export const LANES_ANCHOR = 'geo-lanes'
/** Start of every country row: each route ends there with an arrow. */
export const ROW_ANCHOR = 'geo-row'

/** Narrower lanes than this collapse into one shared riser (a bus). */
const MIN_LANE = 8

/**
 * Routes from the dispatch point to every country of the schedule, schematic like a piping
 * drawing: from the line in the margin along a bus to the origin, on to the route's own lane,
 * down with a 45° chamfer and into the row with an arrow. The first row turns furthest, the
 * last one nearest, so the routes fan out without crossing. No geography, no distances.
 * Each route is a branch of the line, drawn when the pen reaches its row.
 */
export const supplyRoutes: TraceBranches = (box) => {
  const origin = anchor(box, ORIGIN_ANCHOR)
  const rows = box.anchors[ROW_ANCHOR] ?? []
  if (!origin || !rows.length) return []
  const lanes = anchor(box, LANES_ANCHOR)
  const tip = Math.min(...rows.map((r) => r.x)) - 12
  const start = Math.max(origin.x + 6, lanes && lanes.x > 0 ? lanes.x : 0)
  const end = tip - 56
  const n = rows.length
  const step = n > 1 ? (end - start) / (n - 1) : 0
  const spread = step >= MIN_LANE && end > start
  const y0 = origin.y

  return rows.map((row, i) => {
    const lane = spread ? end - step * i : n === 1 ? Math.max(start, end) : start
    const dy = row.y - y0
    const c = Math.min(12, Math.abs(dy) / 2) * Math.sign(dy)
    const route =
      Math.abs(dy) < 1
        ? `M ${box.x} ${y0} H ${tip}`
        : `M ${box.x} ${y0} H ${lane} V ${row.y - c} L ${lane + Math.abs(c)} ${row.y} H ${tip}`
    const arrow = `M ${tip - 7} ${row.y - 4} L ${tip} ${row.y} L ${tip - 7} ${row.y + 4}`
    return { d: `${route} ${arrow}`, at: Math.max(row.y - 40, y0) }
  })
}
