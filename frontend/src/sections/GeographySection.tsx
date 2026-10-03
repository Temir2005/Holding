import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { headingId, type SectionProps } from './types'

/** Countries as tiles with their ISO codes: a shipping-label look instead of a map. */
export function GeographySection({ section }: SectionProps<'geography'>) {
  const { data } = section
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-8">
          {data.countries.map((c, i) => (
            <Reveal as="li" key={c.code} delay={stagger(i)} className="flex aspect-[4/3] flex-col justify-between rounded-tile bg-tile p-5">
              <span className="font-mono text-[clamp(2rem,4vw,3rem)] font-medium leading-none text-accent-ink">{c.code}</span>
              <span className="flex flex-col gap-0.5">
                <span className="font-display text-lg font-bold">{c.name}</span>
                {c.note && <span className="text-xs text-fg-mute">{c.note}</span>}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  )
}
