import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

export function QuoteSection({ section }: SectionProps<'quote'>) {
  const { data } = section
  const photo = data.media ?? data.person?.photo
  return (
    <Section tone={section.tone} anchor={section.anchor}>
      <figure className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-14">
        {photo && (
          <Reveal className="md:col-span-4">
            <SmartImage media={photo} className="aspect-[4/5] rounded-tile" crop sizes="(min-width: 768px) 33vw, 100vw" />
          </Reveal>
        )}
        <Reveal delay={0.1} className={photo ? 'md:col-span-8' : 'md:col-span-12'}>
          <span aria-hidden="true" className="block font-display text-[5rem] font-extrabold leading-[0.6] text-accent-ink">
            “
          </span>
          <blockquote className="mt-4 font-display text-[clamp(1.5rem,2.8vw,2.5rem)] font-semibold leading-[1.2] tracking-[-0.02em]">
            {data.text}
          </blockquote>
          {data.person && (
            <figcaption className="mt-8 flex flex-col gap-1">
              <span className="font-display text-lg font-bold">{data.person.full_name}</span>
              <span className="text-sm text-fg-mute">{data.person.position}</span>
            </figcaption>
          )}
        </Reveal>
      </figure>
    </Section>
  )
}
