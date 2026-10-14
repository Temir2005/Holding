import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { precheckFile, uploadMedia, type MediaItem, type MediaKind } from '../../api/media'
import { AdminApiError, ErrorCode } from '../../api/errors'
import { mediaKey, metaQuery } from '../../api/queries'
import { tAdmin } from '../../i18n'
import i18n from '@/i18n'

export type UploadStatus = 'preparing' | 'uploading' | 'processing' | 'done' | 'error'

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  /** 0…1 while sending. */
  progress: number
  error?: string
  warnings: string[]
  media?: MediaItem
}

let nextId = 1

/** A readable message for an upload error, by its code (media.errors.*). */
export function uploadErrorMessage(
  code: string,
  params?: Record<string, number>,
  fallback?: string,
) {
  const key = `media.errors.${code}`
  if (i18n.exists(key, { ns: 'admin', lng: 'ru' })) return tAdmin(key, params ?? {})
  if (code === ErrorCode.network) return tAdmin('errors.network')
  return fallback ?? tAdmin('errors.unknown')
}

interface Options {
  folder?: string | null
  /** Media kinds the target accepts (a picker for a video field takes only videos). */
  kinds?: readonly MediaKind[]
  onUploaded?: (media: MediaItem) => void
}

/** Upload queue: files go up in parallel, each with its progress, warnings and errors. */
export function useUploads({ folder, kinds, onUploaded }: Options = {}) {
  const queryClient = useQueryClient()
  const { data: meta } = useQuery(metaQuery())
  const [items, setItems] = useState<UploadItem[]>([])
  const callbacks = useRef({ onUploaded })
  callbacks.current = { onUploaded }

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const run = useCallback(
    async (item: UploadItem) => {
      const problem = precheckFile(item.file, meta, kinds)
      if (problem) {
        update(item.id, {
          status: 'error',
          error: uploadErrorMessage(problem.code, problem.params),
        })
        return
      }
      update(item.id, { status: 'preparing', progress: 0, error: undefined })
      try {
        const result = await uploadMedia(item.file, {
          folder,
          onProgress: ({ stage, fraction }) =>
            update(item.id, { status: stage, progress: fraction }),
        })
        update(item.id, {
          status: 'done',
          progress: 1,
          media: result.media,
          warnings: result.warnings,
        })
        void queryClient.invalidateQueries({ queryKey: mediaKey })
        callbacks.current.onUploaded?.(result.media)
      } catch (error) {
        update(item.id, { status: 'error', error: errorText(error) })
      }
    },
    [folder, kinds, meta, queryClient, update],
  )

  const add = useCallback(
    (files: Iterable<File>) => {
      const created = [...files].map<UploadItem>((file) => ({
        id: `upload-${nextId++}`,
        file,
        status: 'preparing',
        progress: 0,
        warnings: [],
      }))
      setItems((prev) => [...created, ...prev])
      created.forEach((item) => void run(item))
    },
    [run],
  )

  const retry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (item) void run(item)
    },
    [items, run],
  )

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearDone = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== 'done' || i.warnings.length > 0))
  }, [])

  return { items, add, retry, dismiss, clearDone }
}

/** Errors made on this side (storage PUT, network) get our text; the server's are readable. */
const CLIENT_CODES: ReadonlySet<string> = new Set(['UPLOAD_FAILED', ErrorCode.network])

function errorText(error: unknown): string {
  if (!(error instanceof AdminApiError)) return tAdmin('errors.unknown')
  return CLIENT_CODES.has(error.code) ? uploadErrorMessage(error.code) : error.message
}
