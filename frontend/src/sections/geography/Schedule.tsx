import { useTranslation } from 'react-i18next'
import type { SectionOf } from '@/api/types'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { LANES_ANCHOR, ORIGIN_ANCHOR, ROW_ANCHOR } from './routes'

type Country = SectionOf<'geography'>['data']['countries'][number]

/** Height of the head row: the origin node sits level with it. */
const HEAD = 'h-12'

/**
 * The dispatch point: a node on the bus and, under it, the address from the site settings
 * (city first). Without an address only the label stays.
 */
export function Origin({ address, className }: { address?: string | null; className?: string }) {
  const { t } = useTranslation()
  const [city, ...rest] = (address ?? '').split(',').map((s) => s.trim())
  return (
    <div className={cn('relative', className)}>
      {/* the node is level with the head row of the schedule (h-12 → centre at 24px) */}
      <span
        data-trace-anchor={ORIGIN_ANCHOR}
        aria-hidden="true"
        className="absolute left-0 top-[18px] z-trace block h-3 w-3 rounded-full border-2 border-trace bg-surface"
      />
      <div className="flex flex-col gap-2 pl-8 pt-9 lg:pt-12">
        <p className="mono-label">{t('geography.origin')}</p>
        {city && <p className="text-subtitle font-semibold [overflow-wrap:break-word]">{city}</p>}
        {rest.length > 0 && (
          <p className="mono-label max-w-[28ch] [overflow-wrap:break-word]">{rest.join(', ')}</p>
        )}
      </div>
    </div>
  )
}

/** Marks where the routes may start turning down (desktop only: the band left of the table). */
export function LanesStart({ className }: { className?: string }) {
  return <span aria-hidden="true" data-trace-anchor={LANES_ANCHOR} className={className} />
}

/**
 * The schedule of deliveries: ISO code in mono, the country, its note. A real table (a
 * schedule is tabular data); an empty note leaves an empty cell so the columns stay aligned.
 */
export function Schedule({ countries, className }: { countries: Country[]; className?: string }) {
  const { t } = useTranslation()
  const dense = countries.length > 8
  const row = dense ? 'py-3 md:py-4' : 'py-4 md:py-6'
  return (
    <table className={cn('w-full border-collapse text-left', className)}>
      <caption className="sr-only">{t('geography.caption')}</caption>
      <thead>
        <tr className={cn('mono-label border-b border-fg', HEAD)}>
          <th scope="col" className="w-[4.5rem] pr-4 align-middle font-medium md:w-28">
            {t('geography.code')}
          </th>
          <th scope="col" className="pr-4 align-middle font-medium">
            {t('geography.country')}
          </th>
          <th scope="col" className="hidden w-[40%] align-middle font-medium md:table-cell">
            {t('geography.note')}
          </th>
        </tr>
      </thead>
      <tbody>
        {countries.map((c, i) => (
          <tr key={`${c.code}-${i}`} className="border-b border-line">
            <td className={cn(row, 'pr-4 align-middle')}>
              <Reveal delay={stagger(i)} className="flex items-center">
                <span
                  data-trace-anchor={ROW_ANCHOR}
                  aria-hidden="true"
                  className="inline-block h-4 w-0"
                />
                <span className="tabular font-mono text-[1.375rem] font-medium leading-none tracking-[0.02em] md:text-[1.75rem]">
                  {c.code}
                </span>
              </Reveal>
            </td>
            <td className={cn(row, 'pr-4 align-middle')}>
              <Reveal delay={stagger(i) + 0.05} className="flex flex-col gap-1">
                <span className="text-subtitle font-semibold [overflow-wrap:break-word]">
                  {c.name}
                </span>
                {/* on a phone the note goes under the name: the note column is hidden there */}
                {c.note && (
                  <span className="text-[0.9375rem] leading-snug text-fg-mute [overflow-wrap:break-word] md:hidden">
                    {c.note}
                  </span>
                )}
              </Reveal>
            </td>
            <td className={cn(row, 'hidden align-middle md:table-cell')}>
              {c.note && (
                <Reveal delay={stagger(i) + 0.1}>
                  <span className="text-[0.9375rem] leading-snug text-fg-mute [overflow-wrap:anywhere]">
                    {c.note}
                  </span>
                </Reveal>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
