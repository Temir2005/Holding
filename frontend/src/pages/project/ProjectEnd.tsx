import { useTranslation } from 'react-i18next'
import { SiteLink } from '@/components/ui/SiteLink'
import type { Project } from '@/api/types'
import { DimArrow } from '@/components/ui/DimArrow'
import { Section } from '@/components/ui/Section'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'

type Neighbor = NonNullable<Project['next']>

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--accent-ink))]'

/**
 * End of the project sheet: the neighbouring projects in the editors' order (none past the
 * first or the last, no wrap-around), then the way back to the register, set large with the
 * dimension arrow.
 */
export function ProjectEnd({ project: p }: { project: Project }) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Section tone="light" space="tight">
      {(p.prev || p.next) && (
        <nav
          aria-label={t('projectPage.neighbors')}
          className="mb-14 grid grid-cols-1 border-t border-line-strong md:mb-20 md:grid-cols-2"
        >
          {p.prev && <NeighborLink item={p.prev} dir="prev" />}
          {p.next && <NeighborLink item={p.next} dir="next" />}
        </nav>
      )}
      <div className="flex flex-col gap-6 border-t border-fg pt-6 md:flex-row md:items-end md:justify-between">
        <p className="mono-label">{t('projectPage.register')}</p>
        <SiteLink
          to={`/${locale}/projects`}
          className={cn(
            'group/more inline-flex items-center gap-6 self-start text-title font-heading md:self-auto',
            FOCUS,
          )}
        >
          <span className="link-draw">{t('project.backToProjects')}</span>
          <DimArrow className="mt-[0.15em] scale-[1.4]" />
        </SiteLink>
      </div>
    </Section>
  )
}

/** One neighbour: the mono caption with the arrow pointing its way, the title below. */
function NeighborLink({ item, dir }: { item: Neighbor; dir: 'prev' | 'next' }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const next = dir === 'next'
  return (
    <SiteLink
      to={`/${locale}/projects/${item.slug}`}
      rel={dir}
      className={cn(
        'group/more flex min-w-0 flex-col gap-4 border-b border-line py-6 md:py-8',
        next ? 'md:col-start-2 md:items-end md:border-l md:pl-gap md:text-right' : 'md:pr-gap',
        FOCUS,
      )}
    >
      <span className="mono-label inline-flex w-fit items-center gap-4">
        {!next && <DimArrow className="-scale-x-100" />}
        {t(`projectPage.${dir}`)}
        {next && <DimArrow />}
      </span>
      <span className="text-subtitle font-semibold [overflow-wrap:break-word]">
        {/* two levels below the link: draw it on the link's hover and focus */}
        <span className="link-draw group-hover/more:[background-size:100%_1px,100%_1px] group-focus-visible/more:[background-size:100%_1px,100%_1px]">
          {item.title}
        </span>
      </span>
    </SiteLink>
  )
}
