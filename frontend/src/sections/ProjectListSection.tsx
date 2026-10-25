import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectCard } from '@/api/types'
import { Head, Sec } from '@/components/site/kit'
import { ProjectCardView } from '@/components/site/ProjectCard'
import { useFlip } from '@/components/site/useFlip'
import type { SectionProps } from './types'

type Filter = 'all' | ProjectCard['status'] | 'tokenized'

/** Every project in a grid; the filter fades out what goes and glides the rest into place. */
export function ProjectListSection({ section }: SectionProps<'project_list'>) {
  const { t } = useTranslation()
  const d = section.data
  const [filter, setFilter] = useState<Filter>('all')
  const flip = useFlip<HTMLDivElement>()
  const statuses = (['in_progress', 'completed', 'planned'] as const).filter((s) =>
    d.projects.some((p) => p.status === s),
  )
  const filters: Filter[] = [
    'all',
    ...statuses,
    ...(d.projects.some((p) => p.is_tokenized) ? (['tokenized'] as const) : []),
  ]
  const keep = (p: ProjectCard) =>
    filter === 'all' || (filter === 'tokenized' ? p.is_tokenized : p.status === filter)
  const shown = d.projects.filter(keep)

  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head
          eyebrow={d.eyebrow}
          title={d.title}
          aside={
            d.show_filter && filters.length > 2 ? (
              <div className="pills" role="group" aria-label={t('ui.filter')}>
                {filters.map((f) => (
                  <button
                    key={f}
                    className="pill"
                    aria-pressed={f === filter}
                    onClick={() => flip(() => setFilter(f))}
                  >
                    {f === 'all'
                      ? t('common.all')
                      : f === 'tokenized'
                        ? t('ui.withTokenization')
                        : t(`ui.statusMany.${f}`)}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        />
        {d.projects.length ? (
          <div className="grid3" ref={flip.ref}>
            {shown.map((p) => (
              <div key={p.id} data-flip={p.id}>
                <ProjectCardView project={p} />
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">{t('projectList.empty')}</p>
        )}
        <p className="count" aria-live="polite">
          {t('ui.shownProjects', { count: shown.length })}
        </p>
      </div>
    </Sec>
  )
}
