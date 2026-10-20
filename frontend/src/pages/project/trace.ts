import { anchor, type TracePath } from '@/components/trace/paths'

/** Anchor of the datum on the first screen of a project sheet. */
export const DATUM = 'project-datum'

/** The project page opens like the hero: the red line is born on the datum «±0,000». */
export const fromDatum: TracePath = (box) => {
  const datum = anchor(box, DATUM)
  return datum ? `M ${box.x} ${datum.y} V ${box.h}` : `M ${box.x} 0 V ${box.h}`
}
