import { useTranslation } from 'react-i18next'
import { Eyebrow, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Founder's quote: the portrait opens from the bottom, the quote and signature beside it. */
export function QuoteSection({ section }: SectionProps<'quote'>) {
  const { t } = useTranslation()
  const d = section.data
  const photo = d.media ?? d.person?.photo ?? null
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap founder">
        {photo && (
          <div className="founder__ph">
            <SmartImage media={photo} fill sizes="(max-width: 860px) 100vw, 40vw" />
          </div>
        )}
        <figure>
          <Eyebrow>{d.eyebrow}</Eyebrow>
          {d.title && <h2 className="h2">{d.title}</h2>}
          <blockquote className="quote">
            {t('quote.open')}
            {d.text}
            {t('quote.close')}
          </blockquote>
          {d.person && (
            <figcaption className="sign">
              <b>{d.person.full_name}</b>
              <span>{d.person.position}</span>
            </figcaption>
          )}
        </figure>
      </div>
    </Sec>
  )
}
