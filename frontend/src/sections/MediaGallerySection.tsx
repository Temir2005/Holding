import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Photos in a mosaic that open one after another; or a swipeable strip. */
export function MediaGallerySection({ section }: SectionProps<'media_gallery'>) {
  const { t } = useTranslation()
  const d = section.data
  if (!d.items.length) return null
  return (
    <Sec
      tone={section.tone}
      anchor={section.anchor}
      style={d.layout === 'strip' ? { overflow: 'hidden' } : undefined}
    >
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        {d.layout === 'grid' && (
          <div className="gal4">
            {d.items.map((m, i) => (
              <figure key={m.id} style={{ '--d': `${(i % 4) * 0.1}s` } as CSSProperties}>
                <SmartImage media={m} fill sizes="(max-width: 760px) 50vw, 33vw" />
              </figure>
            ))}
          </div>
        )}
      </div>
      {d.layout === 'strip' && (
        <div className="rail" aria-label={t('gallery.strip')}>
          {d.items.map((m) => (
            <div key={m.id} className="card" style={{ flexBasis: 'min(640px, 84vw)' }}>
              <div className="card__img">
                <SmartImage media={m} fill sizes="84vw" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Sec>
  )
}
