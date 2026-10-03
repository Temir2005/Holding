import { ProjectCard } from '@/components/cards/ProjectCard'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { headingId, type SectionProps } from './types'

export function TokenizationSection({ section }: SectionProps<'tokenization_explainer'>) {
  const { data } = section
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {data.steps.map((step, i) => (
          <Reveal as="li" key={step.title} delay={stagger(i)} className="flex flex-col gap-4 rounded-tile bg-tile p-6">
            <div className="flex items-center justify-between">
              <Icon name={step.icon} className="h-8 w-8 text-accent-ink" />
              <span className="font-mono text-xs text-fg-mute">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="text-h3">{step.title}</h3>
            <p className="text-sm text-fg-mute">{step.text}</p>
          </Reveal>
        ))}
      </ol>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {data.benefits.length > 0 && (
          <ul className="flex flex-col gap-4 lg:col-span-5">
            {data.benefits.map((b) => (
              <li key={b} className="flex gap-3 text-lead">
                <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-accent-ink" />
                {b}
              </li>
            ))}
          </ul>
        )}
        {data.projects.length > 0 && (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
            {data.projects.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p role="note" className="mt-14 max-w-4xl border-l-2 border-accent pl-5 text-sm leading-relaxed text-fg-mute">
        {data.disclaimer}
      </p>
    </Section>
  )
}
