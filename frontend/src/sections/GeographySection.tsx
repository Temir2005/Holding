import { useTranslation } from 'react-i18next'
import { useSettings } from '@/api/queries'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useLocale } from '@/lib/locale'
import { LanesStart, Origin, Schedule } from './geography/Schedule'
import { supplyRoutes } from './geography/routes'
import { headingId, type SectionProps } from './types'

/**
 * Geography as a schedule of deliveries, not a map: a table of countries (ISO code, name, note)
 * and, from the dispatch point (the address in the site settings), schematic routes that branch
 * off the line in the margin and fan out to every row, each drawn as the pen reaches it.
 * No real map, no distances: only what the CMS says.
 */
export function GeographySection({ section }: SectionProps<'geography'>) {
  const { data } = section
  const { t } = useTranslation()
  const locale = useLocale()
  const address = useSettings(locale).data?.contacts.address
  const { countries } = data
  if (!countries.length && !data.title) return null

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={countries.length ? supplyRoutes : undefined}
    >
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        intro={data.intro}
      />
      {!countries.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('geography.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-x-gap gap-y-6">
          <Origin address={address} className="col-span-12 lg:col-span-3 lg:row-start-1" />
          <LanesStart className="hidden lg:col-start-4 lg:row-start-1 lg:block" />
          <div className="col-span-12 pl-12 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:pl-0">
            <Schedule countries={countries} />
          </div>
        </div>
      )}
    </Section>
  )
}
