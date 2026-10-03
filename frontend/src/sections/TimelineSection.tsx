import { motion, useReducedMotion } from 'framer-motion'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { headingId, type SectionProps } from './types'

export function TimelineSection({ section }: SectionProps<'timeline'>) {
  const { data } = section
  const reduce = useReducedMotion()
  if (!data.events.length) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      <div className="relative">
        {/* The rail draws itself once, left to right, as the timeline enters the view. */}
        <motion.div
          aria-hidden="true"
          className="absolute left-0 right-0 top-[0.4rem] hidden h-px origin-left bg-accent md:block"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '0px 0px -20% 0px' }}
          transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
        />
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
          {data.events.map((e, i) => (
            <Reveal as="li" key={e.id} delay={stagger(i)} className="flex flex-col gap-4">
              <span aria-hidden="true" className="relative z-10 hidden h-3.5 w-3.5 rounded-full border border-accent bg-surface md:block" />
              <article className="flex h-full flex-col gap-4 rounded-tile bg-tile p-5">
                <p className="tabular font-display text-[2.5rem] font-extrabold leading-none tracking-tight text-accent-ink">
                  {e.year}
                </p>
                <div className="flex flex-col gap-2">
                  <h3 className="text-h3">{e.title}</h3>
                  <p className="text-sm leading-relaxed text-fg-mute">{e.description}</p>
                </div>
                {e.image && (
                  <SmartImage media={e.image} className="mt-auto hidden aspect-[4/3] rounded-tile md:block" crop sizes="(min-width: 768px) 20vw, 100vw" />
                )}
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  )
}
