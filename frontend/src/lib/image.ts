import type { Media } from '@/api/types'

/**
 * Single place that builds image URLs. Today it returns the storage URL as is;
 * later it can point at an image proxy (imgproxy/thumbor) with width and format.
 */
export function buildImageUrl(media: Media, _opts: { width?: number } = {}): string {
  return media.url
}
