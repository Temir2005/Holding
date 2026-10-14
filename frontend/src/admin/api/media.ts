/**
 * Media library API. Uploads go straight to S3 in three steps (docs/admin-api.md,
 * "Медиатека"): `upload-url` → `PUT` the file to the signed URL → `complete`.
 */
import type { components } from '@/api/schema'
import { api } from './client'
import { AdminApiError, ErrorCode } from './errors'
import type { Meta } from './queries'

type S = components['schemas']
export type MediaItem = S['MediaAdminRead']
export type MediaKind = S['MediaKind']
export type Usage = S['Usage']
export type MediaPatch = S['MediaUpdate']

/** File extensions the backend accepts, for browsers that leave `File.type` empty. */
const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
}

export function contentTypeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? ''
}

export function mediaKindOf(mime: string): MediaKind {
  if (mime === 'image/svg+xml') return 'svg'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'document'
}

/** Value for `<input accept>` from the allowed MIME types and, optionally, media kinds. */
export function acceptAttribute(meta: Meta | undefined, kinds?: readonly MediaKind[]): string {
  const types = meta?.media.types ?? Object.values(EXTENSION_TYPES)
  return [...new Set(types)].filter((mime) => !kinds || kinds.includes(mediaKindOf(mime))).join(',')
}

/**
 * Checks a file before uploading, with the limits from meta: a clear message right away
 * instead of a failed request. The server checks again (and by content).
 */
export function precheckFile(
  file: File,
  meta: Meta | undefined,
  kinds?: readonly MediaKind[],
): { code: string; params?: Record<string, number> } | null {
  const mime = contentTypeOf(file)
  if (!mime || (meta && !meta.media.types.includes(mime))) return { code: 'MEDIA_TYPE_NOT_ALLOWED' }
  if (kinds && !kinds.includes(mediaKindOf(mime))) return { code: 'MEDIA_KIND_NOT_ACCEPTED' }
  if (meta) {
    const limitMb = mediaKindOf(mime) === 'video' ? meta.media.video_mb : meta.media.image_mb
    if (file.size > limitMb * 1024 * 1024)
      return { code: 'MEDIA_TOO_LARGE', params: { mb: limitMb } }
  }
  return null
}

export interface UploadProgress {
  stage: 'preparing' | 'uploading' | 'processing'
  /** 0…1 while the file is being sent. */
  fraction: number
}

/** `PUT` to the signed URL with progress; `XMLHttpRequest` because fetch has no upload progress. */
export function putToStorage(
  url: string,
  headers: Record<string, string>,
  file: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new AdminApiError(xhr.status, 'UPLOAD_FAILED', `Storage answered ${xhr.status}`))
    xhr.onerror = () => reject(new AdminApiError(0, 'UPLOAD_FAILED', 'Storage is unreachable'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface UploadResult {
  media: MediaItem
  warnings: string[]
}

/** The three upload steps. `UPLOAD_MISSING` right after the PUT is retried a few times. */
export async function uploadMedia(
  file: File,
  options: {
    folder?: string | null
    onProgress?: (p: UploadProgress) => void
    signal?: AbortSignal
  },
): Promise<UploadResult> {
  const progress = options.onProgress ?? (() => undefined)
  progress({ stage: 'preparing', fraction: 0 })
  const ticket = await api.post('/api/v1/admin/media/upload-url', {
    body: {
      filename: file.name,
      content_type: contentTypeOf(file),
      size_bytes: file.size,
      folder: options.folder ?? null,
    },
    signal: options.signal,
  })
  await putToStorage(
    ticket.upload.url,
    ticket.upload.headers,
    file,
    (fraction) => progress({ stage: 'uploading', fraction }),
    options.signal,
  )
  progress({ stage: 'processing', fraction: 1 })
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await api.post('/api/v1/admin/media/{media_id}/complete', {
        path: { media_id: ticket.media.id },
        signal: options.signal,
      })
    } catch (error) {
      if (attempt < 3 && error instanceof AdminApiError && error.code === 'UPLOAD_MISSING') {
        await sleep(800 * (attempt + 1))
        continue
      }
      throw error
    }
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof AdminApiError && error.code === ErrorCode.network
}
