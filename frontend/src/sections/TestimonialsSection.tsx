import { useTranslation } from 'react-i18next'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/cn'
import { Testimonial } from './clients/Testimonial'
import { calloutsToMarks } from './clients/trace'
import { headingId, type SectionProps } from './types'

/** From this many quotes on the sheets get compact. */
const DENSE_FROM = 5

/**
 * Testimonials as large quotes, not a carousel of cards: a vertical run of sheets, each with its
 * own callout from the line in the margin to the opening mark (as the founder's quote on the
 * home page). Sheets alternate their stand-off, so the callouts alternate in length; many quotes
 * get smaller type and the signature beside the quote.
 */
export function TestimonialsSection({ section }: SectionProps<'testimonials'>) {
  const { data } = section
  const { t } = useTranslation()
  const items = data.clients.filter((c) => c.testimonial?.quote.trim())
  if (!items.length && !data.title) return null
  const dense = items.length >= DENSE_FROM

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={items.length ? calloutsToMarks : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      {!items.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('testimonials.empty')}</p>
        </div>
      ) : (
        <ol
          role="list"
          className={cn('flex flex-col', dense ? 'gap-14 md:gap-20' : 'gap-20 md:gap-32')}
        >
          {items.map((c, i) => (
            <Testimonial
              key={c.id}
              client={c}
              index={i}
              tone={section.tone}
              dense={dense}
              flip={!dense && i % 2 === 1}
            />
          ))}
        </ol>
      )}
    </Section>
  )
}
