import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ProjectCard as Project } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { type Locale, useLocale } from '@/lib/locale'
import { stagger } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { Area, Fade, ProjectMarks } from './parts'
import { ROW_ANCHOR, projectHref } from './trace'

/** Number | title | year | area: shared by the head row and every row on desktop. */
const COLS = 'lg:grid-cols-[3rem_minmax(0,1fr)_4.5rem_8rem]'

/**
 * The register: a drawing's schedule of objects. Desktop: rows on seven columns and a sticky
 * square preview that follows hover and focus. Below lg: dense cards, frame first.
 */
export function Register({ projects }: { projects: Project[] }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [active, setActive] = useState(0)
  const dense = projects.length > 6
  const current = projects[active] ?? projects[0]

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-gap">
      <div className="lg:col-span-7">
        <div
          aria-hidden="true"
          className={cn('mono-label hidden gap-x-4 border-b border-fg pb-2 lg:grid', COLS)}
        >
          <span className="font-sans normal-case tracking-normal">{t('showcase.no')}</span>
          <span />
          <span className="text-right">{t('project.year')}</span>
          <span className="text-right">{t('project.area')}</span>
        </div>
        <ol role="list">
          {projects.map((p, i) => (
            <Row
              key={p.id}
              project={p}
              index={i}
              active={i === active}
              dense={dense}
              locale={locale}
              onActivate={() => setActive(i)}
            />
          ))}
        </ol>
      </div>

      {/* Duplicate of the row covers, for sighted pointer users: hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="sticky top-[calc(var(--header-h)+2rem)] hidden self-start pl-6 lg:col-span-5 lg:block"
      >
        <Frame>
          <ClipReveal from="left">
            <div className="relative aspect-square max-h-[calc(100svh-var(--header-h)-9rem)] w-full">
              {projects.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    'absolute inset-0 motion-reduce:[clip-path:none]',
                    i === active
                      ? 'opacity-100 [clip-path:inset(0)] [transition:opacity_400ms_linear,clip-path_700ms_cubic-bezier(.2,.7,.2,1)]'
                      : 'opacity-0 [clip-path:inset(0_100%_0_0)] [transition:opacity_400ms_linear,clip-path_0s_linear_400ms]',
                  )}
                >
                  <SmartImage media={p.cover} fill sizes="(min-width: 1024px) 38vw, 1px" />
                </div>
              ))}
            </div>
          </ClipReveal>
        </Frame>
        {current && (
          <p className="mono-label mt-5 flex gap-4 text-fg">
            <span className="text-accent-ink">{pad2(active + 1)}</span>
            <span>{current.title}</span>
          </p>
        )}
      </div>
    </div>
  )
}

type RowProps = {
  project: Project
  index: number
  active: boolean
  dense: boolean
  locale: Locale
  onActivate: () => void
}

function Row({ project: p, index, active, dense, locale, onActivate }: RowProps) {
  const { t } = useTranslation()
  const hasNums = p.year != null || p.area_m2 != null
  return (
    <li
      onPointerEnter={onActivate}
      onFocus={onActivate}
      className={cn(
        'relative border-b border-line py-8 first:pt-0 lg:first:pt-6',
        dense ? 'lg:py-4 lg:first:pt-4' : 'lg:py-6',
        // the row is lifted on the second paper tone while it drives the preview
        'before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:hidden before:bg-surface-2 before:opacity-0 before:transition-opacity before:duration-2 lg:before:block',
        active && 'before:opacity-100',
        'has-[a:focus-visible]:outline has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[rgb(var(--accent-ink))]',
      )}
    >
      <Fade
        delay={stagger(index)}
        className={cn('flex flex-col gap-2 lg:grid lg:gap-x-4 lg:gap-y-2', COLS)}
      >
        <Frame className="mb-4 lg:hidden">
          <SmartImage
            media={p.cover}
            crop
            className="aspect-[16/10] max-w-[45rem]"
            sizes="(min-width: 768px) 90vw, 100vw"
          />
        </Frame>

        <span
          aria-hidden="true"
          data-trace-anchor={ROW_ANCHOR}
          className={cn(
            'tabular font-mono text-caption font-medium transition-colors duration-2 self-start lg:col-start-1 lg:row-start-1 lg:mt-[0.55em]',
            active ? 'lg:text-accent-ink' : 'text-fg-mute',
          )}
        >
          {pad2(index + 1)}
        </span>

        <h3 className="text-subtitle font-semibold [overflow-wrap:anywhere] lg:col-start-2 lg:row-start-1">
          <Link
            to={projectHref(locale, p.slug)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {/* the pen underlines the row that drives the preview */}
            <span
              className={cn(
                'bg-[linear-gradient(rgb(var(--trace)),rgb(var(--trace)))] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-3 ease-out',
                'bg-[length:0_1px]',
                active && 'lg:bg-[length:100%_1px]',
              )}
            >
              {p.title}
            </span>
          </Link>
        </h3>

        <div className="flex flex-col gap-2 lg:col-span-3 lg:col-start-2 lg:row-start-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-6">
          {p.location && <p className="mono-label">{p.location}</p>}
          <ProjectMarks project={p} className="lg:ml-auto lg:justify-end" />
        </div>

        {p.short_description && (
          <p className="max-w-[56ch] text-[0.9375rem] leading-normal text-fg-mute lg:col-span-3 lg:col-start-2 lg:row-start-3">
            {p.short_description}
          </p>
        )}

        <dl
          className={cn(
            'mt-2 grid grid-cols-2 gap-x-4 border-t border-line pt-3 lg:col-span-2 lg:col-start-3 lg:row-start-1 lg:mt-0 lg:grid-cols-[4.5rem_8rem] lg:border-0 lg:pt-[0.3em]',
            !hasNums && 'max-lg:hidden',
          )}
        >
          <Num label={t('project.year')} value={p.year == null ? null : String(p.year)} />
          <Num
            label={t('project.area')}
            value={p.area_m2 == null ? null : <Area value={p.area_m2} locale={locale} />}
          />
        </dl>
      </Fade>
    </li>
  )
}

/**
 * A figure of the row. An empty one is not shown at all: left out on cards, an empty cell in the
 * table (it only keeps the column so the other rows stay aligned).
 */
function Num({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null) return <div aria-hidden="true" className="hidden lg:block" />

  return (
    <div className="flex flex-col gap-1 lg:text-right">
      <dt className="mono-label lg:sr-only">{label}</dt>
      <dd className="tabular text-lg font-medium lg:text-base">{value}</dd>
    </div>
  )
}
