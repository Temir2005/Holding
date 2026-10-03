import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

export function ProductionSection({ section }: SectionProps<'production'>) {
  const { data } = section
  // A wide lead image only when the rest pair up evenly in two columns.
  const wideLead = data.gallery.length % 2 === 1
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} className="!mb-0" />
          <Reveal>
            <p className="max-w-prose text-lead text-fg-mute">{data.body}</p>
          </Reveal>
          {data.facts.length > 0 && (
            <dl className="grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
              {data.facts.map((f) => (
                <div key={f.label} className="flex flex-col gap-1 py-4 sm:px-4 sm:first:pl-0 lg:px-0">
                  <dd className="tabular font-display text-2xl font-extrabold">{f.value}</dd>
                  <dt className="text-sm text-fg-mute">{f.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:col-span-7">
          {data.gallery.map((m, i) => (
            <Reveal as="li" key={m.id} delay={stagger(i)} className={cn(i === 0 && wideLead && 'col-span-2')}>
              <SmartImage
                media={m}
                className={cn('rounded-tile', i === 0 && wideLead ? 'aspect-[16/9]' : 'aspect-[4/3]')}
                crop
                sizes={i === 0 ? '(min-width: 1024px) 55vw, 100vw' : '(min-width: 1024px) 27vw, 50vw'}
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  )
}
