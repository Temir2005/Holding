import type { Media } from '@/api/types'
import { pad2 } from '../sectionNumber'

/**
 * Figure caption: number and the alt text of the CMS. Hidden from assistive tech, which already
 * reads the same text as the image alt.
 */
export function Caption({ index, media }: { index: number; media: Media }) {
  const alt = media.alt.trim()
  return (
    <span aria-hidden="true" className="flex gap-4">
      <span className="tabular text-accent-ink">{pad2(index + 1)}</span>
      {alt && <span className="[overflow-wrap:break-word]">{alt}</span>}
    </span>
  )
}
