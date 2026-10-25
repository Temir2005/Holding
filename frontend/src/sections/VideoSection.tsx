import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import type { SectionProps } from './types'

/** An embedded video (YouTube/Vimeo) or an uploaded file. */
export function VideoSection({ section }: SectionProps<'video'>) {
  const { t } = useTranslation()
  const d = section.data
  if (!d.embed_url && !d.video) return null
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        <div className="video">
          {d.video ? (
            <video src={d.video.url} poster={d.poster?.url} controls preload="metadata" />
          ) : (
            <iframe
              src={d.embed_url ?? ''}
              title={d.title ?? t('video.title')}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </Sec>
  )
}
