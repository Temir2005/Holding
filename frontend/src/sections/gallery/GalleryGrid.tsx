import type { Media } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { Caption } from './Caption'

/*
 * Editorial layout: frames keep the proportion of their media (never cropped to squares) and
 * vary in width, column and vertical alignment in a cycle of four, so two rows read like a
 * spread of a monograph: large and small, top and bottom. Phone: one column, alternately
 * inset from the left and from the right.
 */
const SLOTS = [
  'md:col-start-1 md:col-span-7 md:self-start',
  'md:col-start-8 md:col-span-5 md:self-end lg:col-start-9 lg:col-span-4',
  'md:col-start-1 md:col-span-5 md:self-start lg:col-start-2 lg:col-span-4',
  'md:col-start-7 md:col-span-6 md:self-start md:mt-16 lg:mt-24',
] as const
const PHONE = ['col-start-1 col-span-11', 'col-start-3 col-span-10'] as const
// an image alone in the last row stays large but off the axis
const LAST_ALONE = ['md:col-start-1 md:col-span-8', 'md:col-start-4 md:col-span-8'] as const

function slotOf(i: number, n: number) {
  if (n === 1) return 'col-span-12 lg:col-span-10'
  const alone = n % 2 === 1 && i === n - 1
  const desktop = alone ? LAST_ALONE[(i / 2) % 2 === 0 ? 0 : 1] : SLOTS[i % 4]
  return cn(PHONE[i % 2], desktop)
}

export function GalleryGrid({ items }: { items: Media[] }) {
  return (
    <ul role="list" className="grid grid-cols-12 gap-x-gap gap-y-14 md:gap-y-20 lg:gap-y-24">
      {items.map((m, i) => (
        <li key={m.id} className={slotOf(i, items.length)}>
          <Frame caption={<Caption index={i} media={m} />}>
            <ClipReveal from={i % 2 ? 'left' : 'bottom'} delay={stagger(i % 2)}>
              <SmartImage media={m} sizes="(min-width: 768px) 60vw, 92vw" />
            </ClipReveal>
          </Frame>
        </li>
      ))}
    </ul>
  )
}
