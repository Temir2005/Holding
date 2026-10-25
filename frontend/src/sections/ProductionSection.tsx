import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eyebrow, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Production: a full-bleed photo that opens from a card to the whole screen, with figures. */
export function ProductionSection({ section }: SectionProps<'production'>) {
  const { t } = useTranslation()
  const d = section.data
  const [cur, setCur] = useState(0)
  const photo = d.gallery[cur] ?? null
  return (
    <Sec tone="dark" anchor={section.anchor} bare className="bleed" label={d.title}>
      <div className="bleed__bg">
        <SmartImage key={photo?.id} media={photo} fill sizes="100vw" />
      </div>
      <div className="wrap">
        <div className="bleed__txt">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          {d.title && <h2 className="h2">{d.title}</h2>}
          <p className="lead">{d.body}</p>
          {d.gallery.length > 1 && (
            <div className="thumbs" role="group" aria-label={t('gallery.strip')}>
              {d.gallery.map((m, i) => (
                <button
                  key={m.id}
                  aria-pressed={i === cur}
                  aria-label={m.alt}
                  onClick={() => setCur(i)}
                >
                  <SmartImage media={m} fill sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>
        {d.facts.length > 0 && (
          <div className="facts" style={{ '--n': d.facts.length } as CSSProperties}>
            {d.facts.map((f) => (
              <div key={f.label} className="fact rv">
                <b>{f.value}</b>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sec>
  )
}
