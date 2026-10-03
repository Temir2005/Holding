import { CtaGroup } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { headingId, type SectionProps } from './types'

export function CtaSection({ section }: SectionProps<'cta'>) {
  const { data } = section
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <Reveal className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {data.eyebrow && <p className="eyebrow">{data.eyebrow}</p>}
          {data.title && (
            <h2 id={headingId(section.id)} className="text-[clamp(2rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.03em]">
              {data.title}
            </h2>
          )}
          {data.text && <p className="max-w-prose text-lead text-fg-mute">{data.text}</p>}
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <CtaGroup ctas={data.ctas} />
        </div>
        {data.media && (
          <SmartImage media={data.media} className="aspect-[21/9] rounded-tile lg:col-span-12" crop sizes="100vw" />
        )}
      </Reveal>
    </Section>
  )
}
