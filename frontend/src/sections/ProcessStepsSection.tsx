import { motion, useReducedMotion, useScroll } from 'framer-motion'
import { useRef } from 'react'
import { CmsLink } from '@/components/ui/Button'
import { ArrowIcon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { headingId, type SectionProps } from './types'

/** The steps are a real sequence, so they are numbered; the line fills as you scroll. */
export function ProcessStepsSection({ section }: SectionProps<'process_steps'>) {
  const { data } = section
  const listRef = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 60%'] })

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} className="!mb-0" />
          </div>
        </div>
        <ol ref={listRef} className="relative flex flex-col gap-10 lg:col-span-7 lg:col-start-6">
          <span aria-hidden="true" className="absolute bottom-2 left-[1.375rem] top-2 w-px bg-line" />
          <motion.span
            aria-hidden="true"
            className="absolute bottom-2 left-[1.375rem] top-2 w-px origin-top bg-accent"
            style={{ scaleY: reduce ? 1 : scrollYProgress }}
          />
          {data.steps.map((step, i) => (
            <Reveal as="li" key={step.title} className="relative grid grid-cols-[2.75rem_1fr] gap-5">
              <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-accent bg-surface font-mono text-sm text-accent-ink">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-3 pt-2">
                <h3 className="text-h3">{step.title}</h3>
                <p className="max-w-prose text-fg-mute">{step.text}</p>
                {step.media && <SmartImage media={step.media} className="aspect-[16/9] rounded-tile" crop sizes="50vw" />}
                {step.division?.page_slug && (
                  <CmsLink href={step.division.page_slug} plain className="inline-flex min-h-11 w-fit items-center gap-2 font-display font-semibold text-accent-ink">
                    {step.division.name} <ArrowIcon />
                  </CmsLink>
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  )
}
