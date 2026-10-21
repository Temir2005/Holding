import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SiteLink } from '@/components/ui/SiteLink'
import type { ProjectCard as Project } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { StatusMark } from '@/components/ui/StatusMark'
import { Tag } from '@/components/ui/Tag'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { pad2 } from '@/sections/sectionNumber'
import { Area } from '@/sections/showcase/parts'
import { ROW_ANCHOR, projectHref } from '@/sections/showcase/trace'

type Props = {
  project: Project
  /** Position in the register (0-based): the number stays with the project when filtered. */
  index: number
  /**
   * Desktop: the entry spans the whole row as a sheet (frame on seven columns, data beside it).
   * The register uses it for a single project left in the last row, so the grid ends on purpose.
   */
  wide?: boolean
  className?: string
}

/**
 * A project as an entry of the register: number, framed shot, title, location and a strip of
 * the figures that are filled in (status, year, area). From md: a frame with the data under it.
 * On a phone: a dense row, a square thumbnail on the left and the same data beside it.
 * The whole card is one link (the title stretches over it).
 */
export function ProjectCard({ project: p, index, wide, className }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <article
      className={cn(
        'group relative grid h-full grid-cols-[6.5rem_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5',
        'md:grid-cols-1 md:grid-rows-[auto_auto_1fr_auto] md:content-stretch md:gap-y-0',
        wide && 'lg:grid-cols-12 lg:grid-rows-[auto_auto_1fr] lg:gap-x-gap',
        'has-[a:focus-visible]:outline has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-[rgb(var(--accent-ink))]',
        className,
      )}
    >
      <div
        className={cn(
          'col-start-2 flex min-h-6 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 md:col-start-1 md:mb-4',
          wide && 'lg:col-span-4 lg:col-start-9 lg:row-start-1',
        )}
      >
        <span
          aria-hidden="true"
          data-trace-anchor={ROW_ANCHOR}
          className="tabular font-mono text-caption font-medium text-accent-ink"
        >
          {pad2(index + 1)}
        </span>
        {p.is_tokenized && <Tag>{t('project.tokenized')}</Tag>}
      </div>

      <Frame
        className={cn(
          'col-start-1 row-span-4 row-start-1 self-start md:row-span-1 md:row-start-2',
          wide && 'lg:col-span-7 lg:row-span-3 lg:row-start-1',
        )}
      >
        <ClipReveal from="left">
          <SmartImage
            media={p.cover}
            crop
            className="aspect-square md:aspect-[4/3]"
            sizes={
              wide
                ? '(min-width: 1024px) 55vw, (min-width: 768px) 45vw, 104px'
                : '(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 104px'
            }
            imgClassName="motion-safe:transition-transform motion-safe:duration-4 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
          />
        </ClipReveal>
      </Frame>

      <div
        className={cn(
          'col-start-2 min-w-0 md:col-start-1 md:mt-6',
          wide && 'lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:mt-2',
        )}
      >
        <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere] md:text-subtitle">
          <SiteLink
            to={projectHref(locale, p.slug)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {/* the pen underlines the title while the card is hovered or focused */}
            <span className="bg-[linear-gradient(rgb(var(--trace)),rgb(var(--trace)))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-3 ease-out group-hover:bg-[length:100%_1px] group-has-[a:focus-visible]:bg-[length:100%_1px]">
              {p.title}
            </span>
          </SiteLink>
        </h3>
        {p.location && <p className="mono-label mt-1.5 md:mt-2">{p.location}</p>}
        {wide && p.short_description && (
          <p className="mt-6 hidden max-w-[40ch] text-fg-mute lg:block">{p.short_description}</p>
        )}
      </div>

      <Figures
        project={p}
        className={cn(
          'col-start-2 mt-1 md:col-start-1 md:mt-6',
          wide && 'lg:col-span-4 lg:col-start-9 lg:row-start-3 lg:self-end',
        )}
      />
    </article>
  )
}

/**
 * Status, year and area — only the filled ones. Phone: one inline run of values. From md: the
 * title block of the card, hairline cells under a strong rule, labels on top.
 */
function Figures({ project: p, className }: { project: Project; className?: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const cells: { key: string; label: string; value: ReactNode }[] = [
    { key: 'status', label: t('project.status'), value: <StatusMark status={p.status} /> },
  ]
  if (p.year != null)
    cells.push({
      key: 'year',
      label: t('project.year'),
      value: <span className="tabular">{p.year}</span>,
    })
  if (p.area_m2 != null)
    cells.push({
      key: 'area',
      label: t('project.area'),
      value: (
        <span className="tabular whitespace-nowrap">
          <Area value={p.area_m2} locale={locale} />
        </span>
      ),
    })

  return (
    <dl
      className={cn(
        'flex flex-wrap items-baseline gap-x-4 gap-y-1',
        'md:grid md:auto-cols-fr md:grid-flow-col md:items-stretch md:gap-0 md:border-t md:border-fg',
        className,
      )}
    >
      {cells.map((c, i) => (
        <div
          key={c.key}
          className={cn(
            'flex min-w-0 flex-col md:gap-1.5 md:pb-1 md:pt-3',
            i > 0 && 'md:border-l md:border-line md:pl-3',
          )}
        >
          <dt className="mono-label max-md:sr-only">{c.label}</dt>
          <dd className="text-[0.9375rem] font-medium">{c.value}</dd>
        </div>
      ))}
    </dl>
  )
}
