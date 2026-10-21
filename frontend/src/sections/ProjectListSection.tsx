import { m, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectCard as Project, ProjectStatus } from '@/api/types'
import { ProjectCard } from '@/components/cards/ProjectCard'
import type { TraceBranches } from '@/components/trace/paths'
import { Filter } from '@/components/ui/Filter'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { buttonClass } from '@/lib/button'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT, stagger } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { Fade } from './showcase/parts'
import { ProjectSheet } from './showcase/ProjectSheet'
import { ROW_ANCHOR } from './showcase/trace'
import { headingId, type SectionProps } from './types'

const STATUS_ORDER: ProjectStatus[] = ['completed', 'in_progress', 'planned']
const ALL = 'all'
/** Below this many projects a filter is noise: everything is visible at a glance. */
const FILTER_MIN = 4
/** From this many projects the register is set denser: four entries to a row from xl. */
const DENSE_FROM = 12

/** Ticks across the line at the numbers of the first column (every row of the register). */
const firstColumnTicks: TraceBranches = (box) => {
  const points = (box.anchors[ROW_ANCHOR] ?? []).filter((p) => p.y > 0 && p.y < box.h)
  if (!points.length) return []
  const minX = Math.min(...points.map((p) => p.x))
  return points
    .filter((p) => p.x <= minX + 4)
    .map((p) => ({ d: `M ${box.x - 5} ${p.y} H ${box.x + 6}`, at: p.y }))
}

/** Divisions of the projects in order of first appearance, with the slug as the filter value. */
function divisionsOf(projects: Project[]) {
  const seen = new Map<string, string>()
  projects.forEach(
    (p) => p.division && !seen.has(p.division.slug) && seen.set(p.division.slug, p.division.name),
  )
  return [...seen]
}

/**
 * The full register of projects. A grid of framed entries (number, shot, title, figures), dense
 * rows on a phone; a single project becomes a project sheet. The instant filter by status and
 * division shows how many projects every option holds, given the other filter.
 */
export function ProjectListSection({ section }: SectionProps<'project_list'>) {
  const { data } = section
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [status, setStatus] = useState<string>(ALL)
  const [division, setDivision] = useState<string>(ALL)
  const { projects } = data
  if (!projects.length && !data.title) return null

  const statuses = STATUS_ORDER.filter((s) => projects.some((p) => p.status === s))
  const divisions = divisionsOf(projects)
  const filterable =
    data.show_filter &&
    projects.length >= FILTER_MIN &&
    (statuses.length > 1 || divisions.length > 1)

  const byStatus = (p: Project) => status === ALL || p.status === status
  const byDivision = (p: Project) => division === ALL || p.division?.slug === division
  const visible = filterable ? projects.filter((p) => byStatus(p) && byDivision(p)) : projects
  const filtered = filterable && (status !== ALL || division !== ALL)
  const reset = () => {
    setStatus(ALL)
    setDivision(ALL)
  }
  // a long register sets four to a row on wide screens
  const dense = projects.length > DENSE_FROM
  const number = new Map(projects.map((p, i) => [p.id, i]))
  const count = (pred: (p: Project) => boolean) => projects.filter(pred).length

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={firstColumnTicks}
    >
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        aside={
          projects.length > 1 && (
            <p className="flex items-end gap-4">
              <span className="tabular font-heading text-[clamp(2.5rem,1.6rem+2.4vw,4.25rem)] leading-[0.8] tracking-[-0.05em]">
                {pad2(projects.length)}
              </span>
              <span className="mono-label max-w-[14ch]">{t('projectList.total')}</span>
            </p>
          )
        }
      />

      {filterable && (
        <div className="mb-10 md:mb-16">
          <div className="grid gap-6">
            {statuses.length > 1 && (
              <Filter
                showLabel
                label={t('project.status')}
                value={status}
                onChange={setStatus}
                options={[
                  { value: ALL, label: t('common.all'), count: count(byDivision) },
                  ...statuses.map((s) => ({
                    value: s,
                    label: t(`status.${s}`),
                    count: count((p) => p.status === s && byDivision(p)),
                  })),
                ]}
              />
            )}
            {divisions.length > 1 && (
              <Filter
                showLabel
                label={t('project.division')}
                value={division}
                onChange={setDivision}
                options={[
                  { value: ALL, label: t('common.all'), count: count(byStatus) },
                  ...divisions.map(([slug, name]) => ({
                    value: slug,
                    label: name,
                    count: count((p) => p.division?.slug === slug && byStatus(p)),
                  })),
                ]}
              />
            )}
          </div>
          <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-x-6">
            <p aria-live="polite" aria-atomic="true" className="mono-label tabular">
              {t('projectList.shown', {
                shown: pad2(visible.length),
                total: pad2(projects.length),
              })}
            </p>
            {filtered && visible.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="mono-label min-h-11 text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent-ink))]"
              >
                <span className="link-draw">{t('projectList.reset')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!projects.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('showcase.empty')}</p>
        </div>
      ) : projects.length === 1 && projects[0] ? (
        <ProjectSheet project={projects[0]} index={0} />
      ) : !visible.length ? (
        <div className="plate flex min-h-40 flex-col items-center justify-center gap-5 border-y border-line p-6 text-center">
          <p className="mono-label text-fg">{t('projectList.empty')}</p>
          <button type="button" onClick={reset} className={buttonClass('secondary')}>
            {t('projectList.reset')}
          </button>
        </div>
      ) : (
        <ul
          role="list"
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 md:gap-x-gap md:gap-y-20',
            projects.length > 2 && 'lg:grid-cols-3',
            dense && 'xl:grid-cols-4 xl:gap-y-16',
          )}
        >
          {visible.map((p, i) => {
            // one entry alone in the last row of three becomes a sheet across the row
            const wide =
              !dense && projects.length > 2 && i > 0 && i === visible.length - 1 && i % 3 === 0
            return (
              <m.li
                key={p.id}
                layout={reduce ? false : 'position'}
                transition={{ layout: { duration: DUR.step, ease: EASE_OUT } }}
                className={cn(
                  'border-b border-line py-6 first:pt-0 md:border-0 md:py-0',
                  wide && 'lg:col-span-3',
                )}
              >
                <Fade delay={stagger(i % 3)} className="h-full">
                  <ProjectCard project={p} index={number.get(p.id) ?? i} wide={wide} />
                </Fade>
              </m.li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
