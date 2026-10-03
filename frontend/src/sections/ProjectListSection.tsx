import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectStatus } from '@/api/types'
import { ProjectCard } from '@/components/cards/ProjectCard'
import { Filter } from '@/components/ui/Filter'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { headingId, type SectionProps } from './types'

const STATUS_ORDER: ProjectStatus[] = ['completed', 'in_progress', 'planned']

export function ProjectListSection({ section }: SectionProps<'project_list'>) {
  const { data } = section
  const { t } = useTranslation()
  const [status, setStatus] = useState<string>('all')

  const statuses = useMemo(
    () => STATUS_ORDER.filter((s) => data.projects.some((p) => p.status === s)),
    [data.projects],
  )
  const visible = status === 'all' ? data.projects : data.projects.filter((p) => p.status === status)

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        aside={
          data.show_filter &&
          statuses.length > 1 && (
            <Filter
              label={t('project.status')}
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: t('common.all') },
                ...statuses.map((s) => ({ value: s, label: t(`status.${s}`) })),
              ]}
            />
          )
        }
      />
      <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <Reveal as="li" key={p.id} delay={stagger(i % 3)}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
