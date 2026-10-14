/**
 * A fake admin backend for component tests: `fetch` routed by method and path, and an
 * `XMLHttpRequest` stand-in for presigned uploads to S3.
 */
import { vi } from 'vitest'
import { tokens } from '../api/client'
import type { MediaItem } from '../api/media'

type Handler = (request: {
  url: URL
  body: unknown
  method: string
}) => Response | Promise<Response>

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export const apiError = (status: number, code: string, message = code, details: unknown = null) =>
  json(status, { error: { code, message, details } })

export function signedIn() {
  tokens.signIn({
    access_token: 'test-token',
    token_type: 'bearer',
    expires_in: 900,
    user: {
      id: 'u1',
      email: 'editor@example.com',
      full_name: 'Редактор',
      role: 'editor',
      is_active: true,
      last_login_at: null,
      created_at: '2026-10-01T00:00:00Z',
      version: 1,
    },
  })
}

/** Routes: `"GET /api/v1/admin/media"` → handler. Unmatched requests fail the test loudly. */
export function fakeFetch(routes: Record<string, Handler>) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${url.pathname}${url.search}`)
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const exact = routes[`${method} ${url.pathname}`]
    const pattern = Object.entries(routes).find(([key]) => {
      const [m, path] = key.split(' ')
      return (
        m === method &&
        path &&
        new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(url.pathname)
      )
    })?.[1]
    const handler = exact ?? pattern
    if (!handler) throw new Error(`Unexpected request ${method} ${url.pathname}`)
    return handler({ url, body, method })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

export interface FakeXhrControl {
  /** Requests sent to storage: `PUT url` with headers. */
  puts: { url: string; headers: Record<string, string> }[]
  /** Status the next PUT answers with (0 = network error). */
  status: number
}

/** XMLHttpRequest that reports progress and answers PUTs with `control.status`. */
export function fakeXhr(): FakeXhrControl {
  const control: FakeXhrControl = { puts: [], status: 200 }
  class FakeXhr {
    status = 0
    upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    onabort: (() => void) | null = null
    private url = ''
    private headers: Record<string, string> = {}
    open(_method: string, url: string) {
      this.url = url
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value
    }
    abort() {
      this.onabort?.()
    }
    send(body: Blob) {
      control.puts.push({ url: this.url, headers: this.headers })
      setTimeout(() => {
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: body.size / 2,
          total: body.size,
        } as ProgressEvent)
        this.status = control.status
        if (control.status === 0) this.onerror?.()
        else this.onload?.()
      }, 0)
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  return control
}

export function mediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'm1',
    url: 'http://storage/media/2026/10/m1.jpg',
    status: 'ready',
    original_filename: 'facade.jpg',
    folder: 'projects',
    tags: [],
    mime_type: 'image/jpeg',
    size_bytes: 25_312,
    width: 1200,
    height: 800,
    alt: { ru: 'Фасад' },
    dominant_color: '#5a5248',
    variants: [{ width: 480, height: 320, url: 'http://storage/media/2026/10/m1_w480.webp' }],
    uploaded_by: null,
    created_at: '2026-10-10T10:00:00Z',
    updated_at: '2026-10-10T10:00:00Z',
    version: 1,
    ...overrides,
  }
}

export const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, page_size: 40 })
