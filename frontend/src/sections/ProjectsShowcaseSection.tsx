import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectCard as Project } from '@/api/types'
import { ProjectCard } from '@/components/cards/ProjectCard'
import { CmsLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { useLocale } from '@/lib/locale'
import { headingId, type SectionProps } from './types'

/** One large lead project, the rest as a compact list beside it. */
export function ProjectsShowcaseSection({ section }: SectionProps<'projects_showcase'>) {
  const { data } = section
  const [lead, ...rest] = data.projects
  if (!lead) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        aside={data.link && <CmsLink href={data.link.href} variant={data.link.variant}>{data.link.label}</CmsLink>}
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <ProjectCard project={lead} large />
        </Reveal>
        <ul className="flex flex-col divide-y divide-line lg:col-span-5">
          {rest.slice(0, 4).map((p, i) => (
            <Reveal as="li" key={p.id} delay={stagger(i + 1)} className="py-4 first:pt-0">
              <CompactProject project={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function CompactProject({ project }: { project: Project }) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Link to={`/${locale}/projects/${project.slug}`} className="group grid grid-cols-[40%_1fr] items-center gap-5">
      <SmartImage media={project.cover} className="aspect-[4/3] rounded-tile" crop sizes="(min-width: 1024px) 15vw, 40vw" />
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-xs text-accent-ink">{t(`status.${project.status}`)}</p>
        <h3 className="text-h3 transition-colors group-hover:text-accent-ink">{project.title}</h3>
        <p className="text-sm text-fg-mute">{project.location}</p>
      </div>
    </Link>
  )
}
