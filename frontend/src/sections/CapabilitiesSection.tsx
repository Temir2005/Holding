import type { CSSProperties } from 'react'
import { Head, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Numbered points; an illustration (a drawing) opens above them when there is one. */
export function CapabilitiesSection({ section }: SectionProps<'capabilities'>) {
  const d = section.data
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} />
        {d.media && (
          <div className="why__media">
            <SmartImage media={d.media} sizes="(max-width: 1440px) 100vw, 1312px" />
          </div>
        )}
        <div className="why__grid" style={{ '--cols': d.columns } as CSSProperties}>
          {d.items.map((it, i) => (
            <div
              key={i}
              className="why__it rv"
              style={{ '--d': `${(i % d.columns) * 0.1}s` } as CSSProperties}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              <h3 className="h3">{it.title}</h3>
              <p>{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Sec>
  )
}
