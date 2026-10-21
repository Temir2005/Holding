import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { SiteLink } from '@/components/ui/SiteLink'
import type { ProjectCard as Project, SectionOf } from '@/api/types'
import { usePageSheet } from '@/components/layout/usePageSheet'
import type { TraceBranches } from '@/components/trace/paths'
import { DimArrow } from '@/components/ui/DimArrow'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatusMark } from '@/components/ui/StatusMark'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { stagger } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { Fade } from './showcase/parts'
import { projectHref } from './showcase/trace'
import { headingId, type SectionProps } from './types'

/** Up to this many steps the scheme is one horizontal pipeline on desktop. */
const ROW_MAX = 5
const NODE = 'token-node'
const NOTE = 'token-note'

type Step = SectionOf<'tokenization_explainer'>['data']['steps'][number]

/**
 * The line works the scheme: when the step nodes stand in one row (desktop), it turns off the
 * margin and runs through them as the pipeline; when they stand in a column, every node gets a
 * short branch. The last branch turns into the stamp of the note.
 */
const schemeBranches: TraceBranches = (box) => {
  const inside = (p: { y: number }) => p.y > 0 && p.y < box.h
  const nodes = (box.anchors[NODE] ?? []).filter(inside)
  const note = (box.anchors[NOTE] ?? []).filter(inside)[0]
  const out: { d: string; at: number }[] = []
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (first && last && nodes.length > 1 && nodes.every((n) => Math.abs(n.y - first.y) < 4)) {
    out.push({ d: `M ${box.x} ${first.y} H ${last.x + 5}`, at: first.y })
  } else {
    nodes.forEach((n) => out.push({ d: `M ${box.x} ${n.y} H ${n.x}`, at: n.y }))
  }
  if (note) out.push({ d: `M ${box.x} ${note.y} H ${note.x}`, at: note.y })
  return out
}

/**
 * Tokenization explained as a calm scheme: the steps as a pipeline with nodes on the line, the
 * benefits as a specification, the projects as short register rows, and the disclaimer as the
 * note stamp of the drawing — part of the sheet, not small print. No figures are made up: the
 * block shows only what the editor wrote.
 */
export function TokenizationSection({ section }: SectionProps<'tokenization_explainer'>) {
  const { data } = section
  const { steps, benefits, projects } = data
  const disclaimer = data.disclaimer.trim()

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={schemeBranches}
    >
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        intro={data.intro}
      />

      {steps.length > 0 && <Scheme steps={steps} />}

      {(benefits.length > 0 || projects.length > 0) && (
        <div className="mt-16 grid grid-cols-1 gap-y-14 md:mt-24 lg:grid-cols-12 lg:gap-x-gap">
          {benefits.length > 0 && (
            <Benefits
              items={benefits}
              className={projects.length ? 'lg:col-span-6' : 'lg:col-span-8'}
            />
          )}
          {projects.length > 0 && (
            <Projects
              items={projects}
              className={benefits.length ? 'lg:col-span-5 lg:col-start-8' : 'lg:col-span-8'}
            />
          )}
        </div>
      )}

      {disclaimer && (
        <div className="mt-16 grid grid-cols-1 md:mt-24 lg:grid-cols-12 lg:gap-x-gap">
          <Note text={disclaimer} className="lg:col-span-7 lg:col-start-6" />
        </div>
      )}
    </Section>
  )
}

/** The steps: one row of nodes on desktop (up to ROW_MAX), a column of nodes otherwise. */
function Scheme({ steps }: { steps: Step[] }) {
  const { t } = useTranslation()
  const row = steps.length <= ROW_MAX
  return (
    <div>
      <p className={cn('mono-label border-b border-fg pb-3', row && 'lg:border-0 lg:pb-0')}>
        {t('tokenization.steps')}
        <span className="tabular"> · {pad2(steps.length)}</span>
      </p>
      <ol
        role="list"
        style={{ '--n': steps.length } as CSSProperties}
        className={cn(
          'grid grid-cols-1',
          row && 'lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-x-gap lg:pt-10',
        )}
      >
        {steps.map((s, i) => (
          <li
            key={`${i}-${s.title}`}
            className={cn(
              'grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 border-b border-line py-6',
              row && 'lg:block lg:border-0 lg:py-0',
            )}
          >
            {/* the node: a filled legend square the line runs through */}
            <span
              aria-hidden="true"
              data-trace-anchor={NODE}
              className={cn('mt-[0.3em] block h-2.5 w-2.5 bg-trace', row && 'lg:mt-0')}
            />
            <Fade
              delay={stagger(i)}
              className={cn(
                'min-w-0',
                row ? 'lg:mt-8 lg:pr-4' : 'lg:grid lg:grid-cols-12 lg:items-baseline lg:gap-x-gap',
              )}
            >
              <p className={cn('mono-label tabular', !row && 'lg:col-span-2')}>
                {t('tokenization.step')} {pad2(i + 1)}
              </p>
              <h3
                className={cn(
                  'mt-3 text-subtitle font-semibold [overflow-wrap:anywhere]',
                  !row && 'lg:col-span-4 lg:mt-0',
                )}
              >
                {s.title}
              </h3>
              {s.text && (
                <p
                  className={cn(
                    'mt-3 max-w-[38ch] text-fg-mute',
                    !row && 'lg:col-span-6 lg:mt-0 lg:max-w-[56ch]',
                  )}
                >
                  {s.text}
                </p>
              )}
            </Fade>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Benefits as the specification of the scheme: numbered hairline rows. */
function Benefits({ items, className }: { items: string[]; className?: string }) {
  const { t } = useTranslation()
  return (
    <Reveal className={className}>
      <p className="mono-label border-b border-fg pb-3">{t('tokenization.benefits')}</p>
      <ul role="list">
        {items.map((b, i) => (
          <li
            key={`${i}-${b}`}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-4 md:py-5"
          >
            <span aria-hidden="true" className="tabular mono-label pt-[0.45em]">
              {pad2(i + 1)}
            </span>
            <span className="text-lead [overflow-wrap:anywhere]">{b}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/** Projects open to tokenization: compact register rows, each one link. */
function Projects({ items, className }: { items: Project[]; className?: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Reveal className={className} delay={0.1}>
      <p className="mono-label border-b border-fg pb-3">{t('tokenization.projects')}</p>
      <ul role="list">
        {items.map((p) => (
          <li key={p.id} className="border-b border-line">
            <SiteLink
              to={projectHref(locale, p.slug)}
              className="group/more grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-4 transition-colors duration-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[rgb(var(--accent-ink))] md:-mx-3 md:px-3"
            >
              <span className="link-draw justify-self-start text-lg font-semibold [overflow-wrap:anywhere]">
                {p.title}
              </span>
              <DimArrow className="col-start-2 row-span-2 row-start-1" />
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <StatusMark status={p.status} />
                {p.location && <span className="mono-label">{p.location}</span>}
              </span>
            </SiteLink>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/**
 * The disclaimer as the note stamp of the drawing: a hairline title block with the sheet cells,
 * the text at reading size. The line turns into it at the top strip.
 */
function Note({ text, className }: { text: string; className?: string }) {
  const { t } = useTranslation()
  const sheet = usePageSheet()
  const cell =
    'flex min-w-[4.5rem] flex-col justify-center gap-1 border-l border-line-strong px-3 py-2'
  return (
    <Reveal className={className}>
      <aside role="note" aria-label={t('tokenization.note')} className="border border-line-strong">
        <div className="flex border-b border-line-strong">
          <p
            data-trace-anchor={NOTE}
            className="mono-label flex flex-1 items-center gap-3 px-4 py-3 text-fg md:px-5"
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 flex-none bg-trace" />
            {t('tokenization.note')}
          </p>
          {sheet && (
            <dl className="flex">
              <div className={cell}>
                <dt className="mono-label">{t('sheet.sheet')}</dt>
                <dd className="tabular font-mono text-[0.8125rem] font-medium">
                  {sheet.number ? pad2(sheet.number) : t('sheet.noNumber')}
                </dd>
              </div>
              <div className={cell}>
                <dt className="mono-label">{t('sheet.sheets')}</dt>
                <dd className="tabular font-mono text-[0.8125rem] font-medium">
                  {pad2(sheet.total)}
                </dd>
              </div>
            </dl>
          )}
        </div>
        <p className="max-w-[68ch] px-4 py-5 text-[0.9375rem] leading-relaxed text-fg md:px-5 md:py-6">
          {text}
        </p>
      </aside>
    </Reveal>
  )
}
