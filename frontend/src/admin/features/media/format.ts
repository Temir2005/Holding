import { mediaKindOf, type MediaItem } from '../../api/media'

const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: digits })} ${SIZE_UNITS[unit]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}

/** The smallest WebP copy at least `width` px wide, or the original. */
export function previewUrl(item: Pick<MediaItem, 'url' | 'variants' | 'mime_type'>, width = 480) {
  if (mediaKindOf(item.mime_type) !== 'image') return item.url
  const fit = [...item.variants].sort((a, b) => a.width - b.width).find((v) => v.width >= width)
  return fit?.url ?? item.url
}

export function displayName(item: Pick<MediaItem, 'original_filename' | 'url'>): string {
  return item.original_filename || item.url.split('/').pop() || ''
}

export function extensionOf(item: Pick<MediaItem, 'original_filename' | 'mime_type'>): string {
  const fromName = item.original_filename?.split('.').pop()
  return (fromName || item.mime_type.split('/').pop() || '').toUpperCase()
}
