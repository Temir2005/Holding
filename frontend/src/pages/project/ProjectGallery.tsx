import { useTranslation } from 'react-i18next'
import type { Media } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { pad2 } from '@/sections/sectionNumber'

const GALLERY_TITLE_ID = 'project-gallery'

/**
 * Placement of one frame. Rows repeat as 1 · 2 · 2: a wide frame on the whole sheet, a pair of a
 * landscape and a narrow portrait, a pair of a square and a landscape set lower. A pair left
 * with one frame becomes a single landscape on nine columns, so the rhythm never ends on a gap.
 */
type Slot = { className: string; aspect: string; sizes: string }

const WIDE: Slot = {
  className: 'lg:col-span-12',
  aspect: 'aspect-[16/9] lg:aspect-[21/9]',
  sizes: '(min-width: 1024px) 90vw, 100vw',
}
const PAIRS: [Slot, Slot][] = [
  [
    {
      className: 'lg:col-span-7',
      aspect: 'aspect-[4/3]',
      sizes: '(min-width: 1024px) 55vw, 100vw',
    },
    {
      className: 'ml-auto w-4/5 lg:col-span-4 lg:col-start-9 lg:ml-0 lg:w-full lg:self-end',
      aspect: 'aspect-[4/5]',
      sizes: '(min-width: 1024px) 30vw, 80vw',
    },
  ],
  [
    {
      className: 'w-4/5 lg:col-span-5 lg:col-start-2 lg:w-full',
      aspect: 'aspect-square',
      sizes: '(min-width: 1024px) 40vw, 80vw',
    },
    {
      className: 'lg:col-span-6 lg:col-start-7 lg:mt-32',
      aspect: 'aspect-[3/2]',
      sizes: '(min-width: 1024px) 48vw, 100vw',
    },
  ],
]
const SINGLE: Slot = {
  className: 'lg:col-span-9 lg:col-start-4',
  aspect: 'aspect-[3/2]',
  sizes: '(min-width: 1024px) 70vw, 100vw',
}

function layout(count: number): Slot[] {
  const slots: Slot[] = []
  let row = 0
  while (slots.length < count) {
    const left = count - slots.length
    if (row % 3 === 0) slots.push(WIDE)
    else {
      const pair = PAIRS[(row % 3) - 1] ?? PAIRS[0]
      if (left === 1) slots.push(SINGLE)
      else if (pair) slots.push(...pair)
    }
    row += 1
  }
  return slots
}

/** The gallery as a rhythm of frames of different proportions, each with its crop marks. */
export function ProjectGallery({ media }: { media: Media[] }) {
  const { t } = useTranslation()
  if (!media.length) return null
  const slots = layout(media.length)

  return (
    <Section tone="light" labelledBy={GALLERY_TITLE_ID}>
      <div className="relative mb-12 flex items-baseline justify-between gap-6 border-b border-line pb-4 md:mb-20">
        {/* station tick from the line, as in every sheet's meta row */}
        <span
          aria-hidden="true"
          className="absolute left-[calc(var(--trace-x)-var(--pad-l))] top-[0.7em] h-px w-[calc(var(--pad-l)-var(--trace-x)-12px)] bg-trace"
        />
        <h2 id={GALLERY_TITLE_ID} className="eyebrow">
          {t('project.gallery')}
        </h2>
        <p aria-hidden="true" className="mono-label tabular">
          {pad2(media.length)}
        </p>
      </div>
      <ul
        role="list"
        className="grid grid-cols-1 gap-y-12 md:gap-y-20 lg:grid-cols-12 lg:gap-x-gap"
      >
        {media.map((m, i) => {
          const slot = slots[i] ?? WIDE
          return (
            <li key={m.id} className={cn('min-w-0', slot.className)}>
              <Frame
                caption={
                  <span aria-hidden="true" className="tabular">
                    {pad2(i + 1)} / {pad2(media.length)}
                  </span>
                }
              >
                <ClipReveal from={i % 2 ? 'bottom' : 'left'}>
                  <SmartImage media={m} crop className={slot.aspect} sizes={slot.sizes} />
                </ClipReveal>
              </Frame>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
