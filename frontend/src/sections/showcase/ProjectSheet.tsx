import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SiteLink } from '@/components/ui/SiteLink'
import type { ProjectCard as Project } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { StatusMark } from '@/components/ui/StatusMark'
import { Tag } from '@/components/ui/Tag'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { pad2 } from '../sectionNumber'
import { Fade } from './parts'
import { ROW_ANCHOR, projectHref } from './trace'

type Props = { project: Project; index: number; flip?: boolean }

/**
 * "Project sheet": one large frame with the area as its dimension line, and the specification
 * set like the title block of a drawing (status, location, year) in hairline cells.
 */
export function ProjectSheet({ project: p, index, flip }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const area =
    p.area_m2 == null
      ? null
      : t('showcase.area', { value: formatNumber(p.area_m2, locale), unit: t('project.sqm') })

  return (
    <article className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-gap">
      <div className={cn('lg:col-span-7', flip && 'lg:order-2 lg:col-start-6')}>
        <Frame>
          <ClipReveal from="left">
            <SmartImage
              media={p.cover}
              crop
              className="aspect-[16/10]"
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </ClipReveal>
        </Frame>
        {area && (
          <div className="mt-6">
            <span className="sr-only">{t('project.area')}</span>
            <DimensionLine label={<span className="normal-case">{area}</span>} />
          </div>
        )}
      </div>

      <Fade
        className={cn('flex flex-col gap-6 lg:col-span-5', flip ? 'lg:order-1 lg:pr-8' : 'lg:pl-8')}
      >
        <p
          data-trace-anchor={ROW_ANCHOR}
          className="tabular font-mono text-caption font-medium text-accent-ink"
        >
          <span aria-hidden="true">
            <span className="font-sans">{t('showcase.no')}</span> {pad2(index + 1)}
          </span>
        </p>
        <h3 className="text-[clamp(2rem,1.2rem+2.4vw,3.5rem)] font-heading leading-none tracking-[-0.035em] [overflow-wrap:anywhere]">
          <SiteLink to={projectHref(locale, p.slug)} className="link-draw">
            {p.title}
          </SiteLink>
        </h3>
        {p.short_description && <p className="max-w-[46ch] text-fg-mute">{p.short_description}</p>}

        {/* Title block: hairline cells, a strong rule on top like a drawing stamp. */}
        <div>
          <dl className="grid grid-cols-2 border-t border-fg">
            <Cell label={t('project.status')} wide={p.year == null}>
              <StatusMark status={p.status} />
            </Cell>
            {p.year != null && (
              <Cell label={t('project.year')} end>
                <span className="tabular">{p.year}</span>
              </Cell>
            )}
            {p.location && (
              <Cell label={t('project.location')} wide>
                {p.location}
              </Cell>
            )}
          </dl>
          {p.is_tokenized && (
            <p className="border-b border-line py-3">
              <Tag>{t('project.tokenized')}</Tag>
            </p>
          )}
        </div>
      </Fade>
    </article>
  )
}

type CellProps = { label: string; children: ReactNode; wide?: boolean; end?: boolean }

function Cell({ label, children, wide, end }: CellProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 border-b border-line py-3',
        wide && 'col-span-2',
        end && 'border-l pl-4',
      )}
    >
      <dt className="mono-label">{label}</dt>
      <dd className="text-lg font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
