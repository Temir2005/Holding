import { buildImageUrl } from '@/lib/image'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { headingId, type SectionProps } from './types'

export function VideoSection({ section }: SectionProps<'video'>) {
  const { data } = section
  if (!data.embed_url && !data.video) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? headingId(section.id) : undefined}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      <div className="aspect-video overflow-hidden rounded-tile bg-tile">
        {data.embed_url ? (
          <iframe
            src={data.embed_url}
            title={data.title ?? 'video'}
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            className="h-full w-full"
          />
        ) : (
          data.video && (
            <video
              controls
              preload="none"
              poster={data.poster ? buildImageUrl(data.poster, { width: 1600 }) : undefined}
              className="h-full w-full object-cover"
            >
              <source src={data.video.url} type={data.video.mime_type} />
            </video>
          )
        )}
      </div>
    </Section>
  )
}
