import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { headingId, type SectionProps } from './types'

export function TestimonialsSection({ section }: SectionProps<'testimonials'>) {
  const { data } = section
  const items = data.clients.filter((c) => c.testimonial)
  if (!items.length) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {items.map((c, i) => (
          <Reveal as="li" key={c.id} delay={stagger(i)}>
            <figure className="flex h-full flex-col justify-between gap-8 rounded-tile bg-tile p-6 md:p-8">
              <blockquote className="text-lead">«{c.testimonial?.quote}»</blockquote>
              <figcaption className="flex items-center justify-between gap-4 border-t border-line pt-5">
                <div className="flex flex-col">
                  <span className="font-display font-bold">{c.testimonial?.author}</span>
                  <span className="text-sm text-fg-mute">{c.testimonial?.position}</span>
                </div>
                {c.logo && (
                  <span className="tone-light rounded-tile px-3 py-2">
                    <SmartImage media={c.logo} className="h-6 w-auto max-w-[7rem]" fit="contain" />
                  </span>
                )}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
