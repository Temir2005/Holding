import { FileText, Film } from 'lucide-react'
import { cn } from '@/lib/cn'
import { mediaKindOf, type MediaItem } from '../../api/media'
import { extensionOf, previewUrl } from './format'

type ThumbSource = Pick<
  MediaItem,
  'url' | 'variants' | 'mime_type' | 'original_filename' | 'dominant_color'
> & { alt?: Record<string, string> }

/** Square preview of any media file: the picture itself, or an icon for video and PDF. */
export function MediaThumb({
  item,
  className,
  width = 480,
}: {
  item: ThumbSource
  className?: string
  width?: number
}) {
  const kind = mediaKindOf(item.mime_type)
  const base = cn(
    'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-sunken',
    className,
  )
  if (kind === 'image' || kind === 'svg') {
    return (
      <div className={base} style={{ backgroundColor: item.dominant_color ?? undefined }}>
        <img
          src={previewUrl(item, width)}
          alt={item.alt?.ru ?? ''}
          loading="lazy"
          decoding="async"
          className={cn('h-full w-full', kind === 'svg' ? 'object-contain p-3' : 'object-cover')}
        />
      </div>
    )
  }
  const Icon = kind === 'video' ? Film : FileText
  return (
    <div className={cn(base, 'flex-col gap-1 text-mute')}>
      <Icon size={28} aria-hidden="true" />
      <span className="font-mono text-xs">{extensionOf(item)}</span>
    </div>
  )
}
