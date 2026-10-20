import { useTranslation } from 'react-i18next'
import { MoreLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProjectSheet } from './showcase/ProjectSheet'
import { Register } from './showcase/Register'
import { registerTicks } from './showcase/trace'
import { headingId, type SectionProps } from './types'

/**
 * Featured projects, two layouts:
 * - `register`: a schedule of objects with a sticky preview (one project falls back to a sheet);
 * - `sheet`: every project as its own "project sheet", frames alternating sides.
 * The line ticks every row number as it passes.
 */
export function ProjectsShowcaseSection({ section }: SectionProps<'projects_showcase'>) {
  const { data } = section
  const { t } = useTranslation()
  const { projects } = data
  if (!projects.length && !data.title) return null
  const sheets = data.layout === 'sheet' || projects.length === 1
  const link = data.link && <MoreLink href={data.link.href}>{data.link.label}</MoreLink>

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={registerTicks}
    >
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        aside={link}
      />
      {!projects.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('showcase.empty')}</p>
        </div>
      ) : sheets ? (
        <div className="flex flex-col gap-24 md:gap-32">
          {projects.map((p, i) => (
            <ProjectSheet key={p.id} project={p} index={i} flip={i % 2 === 1} />
          ))}
        </div>
      ) : (
        <Register projects={projects} />
      )}
      {link && projects.length > 3 && <div className="mt-10 flex justify-end">{link}</div>}
    </Section>
  )
}
