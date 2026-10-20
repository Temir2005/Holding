import { useTranslation } from 'react-i18next'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GalleryGrid } from './gallery/GalleryGrid'
import { GalleryStrip } from './gallery/GalleryStrip'
import { headingId, type SectionProps } from './types'

/**
 * Photos of the office and production, two layouts the editor picks:
 * - `grid`: an editorial spread of frames in their own proportions, with crop marks;
 * - `strip`: a film strip scrolled sideways inside the block, with prev/next and a counter.
 * Captions are the alt texts of the CMS, numbered like figures.
 */
export function MediaGallerySection({ section }: SectionProps<'media_gallery'>) {
  const { data } = section
  const { t } = useTranslation()
  const title = data.title?.trim()
  const items = data.items
  if (!items.length && !title && !data.eyebrow) return null

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={title ? headingId(section.id) : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={title} />
      {!items.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('gallery.empty')}</p>
        </div>
      ) : data.layout === 'strip' ? (
        <GalleryStrip items={items} label={title || data.eyebrow || t('gallery.strip')} />
      ) : (
        <GalleryGrid items={items} />
      )}
    </Section>
  )
}
