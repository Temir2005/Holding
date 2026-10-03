import { useTranslation } from 'react-i18next'
import { CmsLink } from '@/components/ui/Button'
import { ArrowIcon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { headingId, type SectionProps } from './types'

export function DivisionsGridSection({ section }: SectionProps<'divisions_grid'>) {
  const { data } = section
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {data.divisions.map((d, i) => {
          const href = d.page_slug ?? d.website_url
          return (
            <Reveal as="li" key={d.id} delay={stagger(i)} className="flex flex-col gap-5 rounded-tile bg-tile p-5">
              <SmartImage media={d.cover} className="aspect-[4/3] rounded-tile" crop sizes="(min-width: 768px) 33vw, 100vw" />
              <div className="flex flex-col gap-2">
                <h3 className="text-h3">{d.name}</h3>
                <p className="text-fg-mute">{d.tagline}</p>
              </div>
              {d.stats.length > 0 && (
                <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
                  {d.stats.map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <dd className="tabular font-display text-2xl font-extrabold">
                        {formatNumber(s.value, locale)}
                        <span className="ml-0.5 text-base text-accent-ink">{s.suffix}</span>
                      </dd>
                      <dt className="text-xs text-fg-mute">{s.label}</dt>
                    </div>
                  ))}
                </dl>
              )}
              {href && (
                <CmsLink href={href} plain className="mt-auto inline-flex min-h-11 items-center gap-2 font-display font-semibold text-accent-ink">
                  {t('common.more')} <ArrowIcon />
                </CmsLink>
              )}
            </Reveal>
          )
        })}
      </ul>
    </Section>
  )
}
