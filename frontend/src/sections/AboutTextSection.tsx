import { Markdown } from '@/components/ui/Markdown'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

export function AboutTextSection({ section }: SectionProps<'about_text'>) {
  const { data } = section
  const withMedia = data.media && data.layout !== 'text_only'
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className={cn(withMedia ? 'lg:col-span-6' : 'lg:col-span-8', data.layout === 'media_left' && 'lg:order-2')}>
          <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
          <Reveal>
            <Markdown>{data.body}</Markdown>
          </Reveal>
        </div>
        {withMedia && (
          <Reveal delay={0.1} className="lg:col-span-6">
            <SmartImage media={data.media} className="aspect-[4/3] rounded-tile" crop sizes="(min-width: 1024px) 50vw, 100vw" />
          </Reveal>
        )}
      </div>
    </Section>
  )
}
