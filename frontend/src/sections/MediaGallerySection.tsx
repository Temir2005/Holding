import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

// Lead image 2×2, the second spans two columns, the rest fill single cells:
// four images close a full 4×2 block with no gaps.
const gridSpan = (i: number) => (i === 0 ? 'col-span-2 row-span-2' : i === 1 ? 'col-span-2' : '')

export function MediaGallerySection({ section }: SectionProps<'media_gallery'>) {
  const { data } = section
  if (!data.items.length) return null
  const strip = data.layout === 'strip'
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? headingId(section.id) : undefined}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      <ul
        className={cn(
          strip
            ? 'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [&>li]:w-[80%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[40%]'
            : 'grid auto-rows-[9rem] grid-cols-2 gap-2 sm:auto-rows-[12rem] md:grid-cols-4 lg:auto-rows-[15rem]',
        )}
      >
        {data.items.map((m, i) => (
          <Reveal as="li" key={m.id} delay={stagger(i)} className={cn(!strip && gridSpan(i))}>
            {strip ? (
              <SmartImage media={m} className="aspect-[4/3] rounded-tile" crop sizes="(min-width: 640px) 40vw, 80vw" />
            ) : (
              <SmartImage media={m} className="rounded-tile" fill sizes="(min-width: 768px) 50vw, 100vw" />
            )}
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
