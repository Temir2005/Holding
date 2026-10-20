import type { Media } from '@/api/types'

/**
 * Single place that builds image URLs. Today it returns the storage URL as is;
 * later it can point at an image proxy (imgproxy/thumbor) with width and format.
 */
export function buildImageUrl(media: Media, _opts: { width?: number } = {}): string {
  return media.url
}

/**
 * CSS object-position for the editor's focal point (0–1 on both axes): the point that stays in
 * the frame whatever the crop. Centre when the media has none.
 */
export function focalPosition(media: Media): string {
  const point = media.focal_point
  if (!point) return '50% 50%'
  return `${Math.round(point.x * 1000) / 10}% ${Math.round(point.y * 1000) / 10}%`
}
