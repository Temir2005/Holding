import { useTranslation } from 'react-i18next'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { Station } from './timeline/Station'
import { headingId, type SectionProps } from './types'

/**
 * History as a drawing: the red line in the margin is the axis, every event is a station on it.
 * Rows sit on the 12-column grid (year 1–4, text 5–8, frame 9–12); a vertical dimension between
 * rows measures the years between events, and the frames widen from the first event to the last,
 * so the growth reads without reading the text. The last event is the current one (ring mark).
 */
export function TimelineSection({ section }: SectionProps<'timeline'>) {
  const { data } = section
  const { t } = useTranslation()
  const locale = useLocale()
  const events = data.events
  if (!events.length && !data.title) return null

  const id = headingId(section.id)
  const years = (count: number) => t('timeline.years', { count, n: formatNumber(count, locale) })
  const all = events.map((e) => e.year)
  const from = Math.min(...all)
  const to = Math.max(...all)

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? id : undefined}>
      <SectionHeader id={id} eyebrow={data.eyebrow} title={data.title} />
      {events.length === 0 ? (
        <p className="mono-label">{t('timeline.empty')}</p>
      ) : (
        <ol>
          {events.map((event, i) => {
            const next = events[i + 1]
            const gap = next ? Math.abs(next.year - event.year) : 0
            return (
              <Station
                key={event.id}
                event={event}
                index={i}
                count={events.length}
                interval={gap > 0 ? years(gap) : null}
              />
            )
          })}
        </ol>
      )}
      {events.length > 1 && to > from && (
        <DimensionLine
          className="mt-16 md:mt-24"
          label={t('timeline.span', { from, to, length: years(to - from) })}
        />
      )}
    </Section>
  )
}
