import type { TraceBranches } from '@/components/trace/paths'
import type { Locale } from '@/lib/locale'

/** Route of a project page. */
export const projectHref = (locale: Locale, slug: string) => `/${locale}/projects/${slug}`

/** Anchor name of the row numbers: the line marks every row with a tick. */
export const ROW_ANCHOR = 'showcase-row'

/** A short tick across the line at every row number, drawn as the pen passes the row. */
export const registerTicks: TraceBranches = (box) =>
  (box.anchors[ROW_ANCHOR] ?? [])
    .filter((p) => p.y > 0 && p.y < box.h)
    .map((p) => ({ d: `M ${box.x - 5} ${p.y} H ${box.x + 6}`, at: p.y }))
