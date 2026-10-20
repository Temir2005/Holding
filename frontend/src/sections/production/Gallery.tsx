import type { Media } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'

type Slot = { cell: string; aspect: string; sizes: string }

const WIDE = '(min-width: 768px) 55vw, 100vw'
const NARROW = '(min-width: 768px) 32vw, 75vw'

/**
 * Where frame i of n goes: pairs of a wide and a tall frame that swap sides every pair, so the
 * shots of the plant read as a contact sheet with a rhythm, not a uniform grid. An odd last
 * frame is a panorama shifted to the right; a single frame takes the whole sheet.
 */
function slot(i: number, n: number): Slot {
  if (n === 1)
    return { cell: 'col-span-12', aspect: 'aspect-[4/3] md:aspect-[21/9]', sizes: '100vw' }
  if (i === n - 1 && n % 2 === 1)
    return {
      cell: 'col-span-12 md:col-span-9 md:col-start-4',
      aspect: 'aspect-[4/3] md:aspect-[21/9]',
      sizes: WIDE,
    }
  const flip = Math.floor(i / 2) % 2 === 1
  const first = i % 2 === 0
  if (first !== flip)
    return {
      cell: cn('col-span-12 md:col-span-7', flip && 'md:col-start-6 md:mt-[clamp(48px,8vw,144px)]'),
      aspect: 'aspect-[16/10]',
      sizes: WIDE,
    }
  return {
    cell: flip
      ? 'col-span-9 md:col-span-4 md:col-start-1 md:self-start'
      : 'col-span-9 col-start-4 md:col-span-4 md:col-start-9 md:self-end',
    aspect: 'aspect-[4/5] md:aspect-[3/4]',
    sizes: NARROW,
  }
}

/** The plant on photos: framed with crop marks, opening like a sheet being uncovered. */
export function Gallery({ items }: { items: Media[] }) {
  return (
    <ul className="grid grid-cols-12 gap-x-gap gap-y-[clamp(32px,4vw,64px)]">
      {items.map((m, i) => {
        const s = slot(i, items.length)
        return (
          <li key={m.id} className={s.cell}>
            <Frame>
              <ClipReveal from={i % 2 ? 'bottom' : 'left'}>
                <SmartImage media={m} crop className={s.aspect} sizes={s.sizes} />
              </ClipReveal>
            </Frame>
          </li>
        )
      })}
    </ul>
  )
}
