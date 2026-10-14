import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiError, fakeFetch, fakeXhr, json, mediaItem, signedIn } from '../test/fakeApi'
import { acceptAttribute, contentTypeOf, precheckFile, uploadMedia } from './media'
import type { Meta } from './queries'

const meta = {
  media: {
    image_mb: 20,
    video_mb: 200,
    types: [
      'application/pdf',
      'image/avif',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'video/mp4',
    ],
  },
} as Meta

const file = (name: string, type: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type })

const ticket = {
  media: mediaItem({ id: 'new', status: 'pending' }),
  upload: {
    url: 'http://storage/megasmart-media/media/new.jpg?X-Amz-Signature=x',
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    expires_in: 900,
  },
}

describe('file checks before upload', () => {
  it('guesses the type from the extension when the browser gives none', () => {
    expect(contentTypeOf(file('photo.AVIF', ''))).toBe('image/avif')
    expect(contentTypeOf(file('notes.txt', ''))).toBe('')
  })

  it('refuses unknown types, wrong kinds and oversized files with a code', () => {
    expect(precheckFile(file('a.txt', 'text/plain'), meta)).toEqual({
      code: 'MEDIA_TYPE_NOT_ALLOWED',
    })
    expect(precheckFile(file('a.jpg', 'image/jpeg'), meta, ['video'])).toEqual({
      code: 'MEDIA_KIND_NOT_ACCEPTED',
    })
    expect(precheckFile(file('big.jpg', 'image/jpeg', 21 * 1024 * 1024), meta)).toEqual({
      code: 'MEDIA_TOO_LARGE',
      params: { mb: 20 },
    })
    expect(precheckFile(file('clip.mp4', 'video/mp4', 21 * 1024 * 1024), meta)).toBeNull()
  })

  it('limits the file dialog to the kinds a field accepts', () => {
    expect(acceptAttribute(meta, ['image', 'svg'])).toBe(
      'image/avif,image/jpeg,image/png,image/svg+xml,image/webp',
    )
    expect(acceptAttribute(meta, ['video'])).toBe('video/mp4')
  })
})

describe('upload in three steps', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('asks for a link, PUTs the file with exactly the signed headers, then completes', async () => {
    const storage = fakeXhr()
    const { calls } = fakeFetch({
      'POST /api/v1/admin/media/upload-url': ({ body }) => {
        expect(body).toMatchObject({
          filename: 'facade.jpg',
          content_type: 'image/jpeg',
          folder: 'projects',
        })
        return json(201, ticket)
      },
      'POST /api/v1/admin/media/{id}/complete': () =>
        json(200, {
          media: mediaItem({ id: 'new' }),
          warnings: ['Из SVG удалены небезопасные части'],
        }),
    })
    const stages: string[] = []
    const result = await uploadMedia(file('facade.jpg', 'image/jpeg'), {
      folder: 'projects',
      onProgress: (p) => stages.push(p.stage),
    })
    expect(calls).toEqual([
      'POST /api/v1/admin/media/upload-url',
      'POST /api/v1/admin/media/new/complete',
    ])
    expect(storage.puts).toEqual([
      { url: ticket.upload.url, headers: { 'Content-Type': 'image/jpeg' } },
    ])
    expect(stages).toEqual(['preparing', 'uploading', 'processing'])
    expect(result.warnings).toEqual(['Из SVG удалены небезопасные части'])
  })

  it('retries complete while the file has not reached the storage yet', async () => {
    fakeXhr()
    let attempts = 0
    fakeFetch({
      'POST /api/v1/admin/media/upload-url': () => json(201, ticket),
      'POST /api/v1/admin/media/{id}/complete': () => {
        attempts += 1
        return attempts === 1
          ? apiError(409, 'UPLOAD_MISSING', 'Файл ещё не загружен')
          : json(200, { media: mediaItem({ id: 'new' }), warnings: [] })
      },
    })
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const done = uploadMedia(file('facade.jpg', 'image/jpeg'), {})
    await vi.runAllTimersAsync()
    await expect(done).resolves.toMatchObject({ media: { id: 'new' } })
    vi.useRealTimers()
    expect(attempts).toBe(2)
  })

  it('reports a storage failure and a content mismatch', async () => {
    const storage = fakeXhr()
    storage.status = 403
    fakeFetch({
      'POST /api/v1/admin/media/upload-url': () => json(201, ticket),
      'POST /api/v1/admin/media/{id}/complete': () =>
        apiError(422, 'MEDIA_TYPE_MISMATCH', 'Файл не того типа'),
    })
    await expect(uploadMedia(file('facade.jpg', 'image/jpeg'), {})).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
    })
    storage.status = 200
    await expect(uploadMedia(file('facade.jpg', 'image/jpeg'), {})).rejects.toMatchObject({
      code: 'MEDIA_TYPE_MISMATCH',
      message: 'Файл не того типа',
    })
  })
})
