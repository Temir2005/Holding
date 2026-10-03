import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

const COLS = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' } as const

export function CapabilitiesSection({ section }: SectionProps<'capabilities'>) {
  const { data } = section
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      <ul className={cn("grid grid-cols-1 gap-2", COLS[data.columns])}>
        {data.items.map((item, i) => (
          <Reveal as="li" key={item.title} delay={stagger(i)} className="flex flex-col gap-4 rounded-tile bg-tile p-6">
            {item.media ? (
              <SmartImage media={item.media} className="aspect-[16/10] rounded-tile" crop sizes="(min-width: 1024px) 30vw, 100vw" />
            ) : (
              <Icon name={item.icon} className="h-8 w-8 text-accent-ink" />
            )}
            <h3 className="text-h3">{item.title}</h3>
            <p className="text-fg-mute">{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
