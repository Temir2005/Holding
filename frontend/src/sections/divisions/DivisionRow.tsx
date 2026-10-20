import { useTranslation } from 'react-i18next'
import type { Division } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { CmsLink, MoreLink } from '@/components/ui/Button'
import { Frame } from '@/components/ui/Frame'
import { Heading } from '@/components/ui/Heading'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { StatChain } from './StatChain'

type Props = {
  division: Division
  index: number
  active: boolean
  dense: boolean
  onActivate: () => void
}

/** "https://www.smartpanels.kz/ru" → "smartpanels.kz": a short label for the site link. */
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * A row of the register. Hover or keyboard focus makes it active: the sticky frame shows its
 * cover, the row lifts on the second surface and the line in the margin reaches out to it.
 */
export function DivisionRow({ division: d, index, active, dense, onActivate }: Props) {
  const { t } = useTranslation()
  const site = d.website_url
  const page = d.page_slug
  return (
    <Reveal
      as="li"
      delay={stagger(index)}
      className={cn('relative border-b border-line py-8', dense ? 'lg:py-6' : 'lg:py-10')}
    >
      <div
        className="relative md:grid md:grid-cols-12 md:grid-rows-[auto_1fr] md:gap-x-gap lg:grid-cols-[4rem_minmax(0,1fr)] lg:grid-rows-1"
        onMouseEnter={onActivate}
        onFocus={onActivate}
      >
        {/* The row lifted on the second surface while active (desktop register only). */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -inset-x-4 -z-10 hidden bg-surface-2 transition-opacity duration-2 lg:block',
            dense ? '-inset-y-6' : '-inset-y-10',
            active ? 'opacity-100' : 'opacity-0',
          )}
        />
        {/* Tablet: the number moves beside the frame, so the tick sits at the top of the card. */}
        <span
          aria-hidden="true"
          className="absolute left-[calc(var(--trace-x)-var(--pad-l)-4px)] top-0 hidden h-px w-[9px] bg-trace md:block lg:hidden"
        />
        <div className="mb-6 md:col-span-5 md:row-span-2 md:mb-0 lg:hidden">
          <Frame>
            <ClipReveal>
              <SmartImage media={d.cover} crop className="aspect-[16/10]" sizes="100vw" />
            </ClipReveal>
          </Frame>
        </div>

        <p
          aria-hidden="true"
          className={cn(
            'relative self-start tabular font-mono text-caption font-medium text-fg-mute md:col-span-7 md:col-start-6 lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:mt-[0.2rem]',
            active && 'lg:text-accent',
          )}
        >
          {/* A tick on the line at every row; the active one reaches out to the row. */}
          <span
            aria-hidden="true"
            className="absolute left-[calc(var(--trace-x)-var(--pad-l)-4px)] top-1/2 h-px w-[9px] bg-trace md:hidden lg:block"
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-[calc(var(--trace-x)-var(--pad-l))] top-1/2 hidden h-px w-[calc(var(--pad-l)-var(--trace-x)-16px)] origin-left bg-trace transition-transform duration-3 ease-out lg:block',
              active ? 'scale-x-100' : 'scale-x-0',
            )}
          />
          {pad2(index + 1)}
        </p>

        <div className="mt-3 flex min-w-0 flex-col gap-3 md:col-span-7 md:col-start-6 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mt-0">
          <Heading
            level={3}
            className={cn(
              'font-heading',
              dense
                ? 'text-subtitle'
                : 'text-[clamp(1.75rem,1.1rem+1.7vw,3rem)] leading-[1.02] tracking-[-0.03em]',
            )}
          >
            {d.name}
          </Heading>
          {d.tagline && (
            <p className={cn('max-w-[44ch] text-fg-mute', dense ? 'text-body' : 'text-lead')}>
              {d.tagline}
            </p>
          )}
          {d.stats.length > 0 && <StatChain stats={d.stats} className="mt-5" />}
          {(page || site) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-1">
              <MoreLink href={page ?? site ?? ''}>
                {page ? t('common.more') : t('common.visitSite')}
                <span className="sr-only">: {d.name}</span>
              </MoreLink>
              {page && site && (
                <CmsLink
                  href={site}
                  plain
                  className="inline-flex min-h-11 items-center gap-2 font-mono text-caption font-medium uppercase text-fg-mute hover:text-fg focus-visible:text-fg"
                >
                  <span className="link-draw">{hostname(site)}</span>
                  <span aria-hidden="true">↗</span>
                </CmsLink>
              )}
            </div>
          )}
        </div>
      </div>
    </Reveal>
  )
}
