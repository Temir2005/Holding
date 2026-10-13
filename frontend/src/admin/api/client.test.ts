import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUser, TokenResponse } from './tokens'

const user: CurrentUser = {
  id: 'u1',
  email: 'editor@example.com',
  full_name: 'Редактор',
  role: 'editor',
  is_active: true,
  last_login_at: null,
  created_at: '2026-10-01T00:00:00Z',
  version: 1,
}

const session = (token: string): TokenResponse => ({
  access_token: token,
  token_type: 'bearer',
  expires_in: 900,
  user,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const errorBody = (code: string) => ({ error: { code, message: code } })

/**
 * Fake backend: `/auth/refresh` issues `fresh`; other endpoints accept only the current
 * token and answer `TOKEN_EXPIRED` for an older one.
 */
function backend(options: { otherUnauthorized?: string } = {}) {
  let current = 'fresh'
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const auth = new Headers(init?.headers).get('Authorization')
    calls.push(`${init?.method ?? 'GET'} ${url} ${auth ?? '-'}`)
    if (url.endsWith('/auth/refresh')) {
      await new Promise((r) => setTimeout(r, 5))
      current = 'fresh'
      return json(200, session(current))
    }
    if (options.otherUnauthorized) return json(401, errorBody(options.otherUnauthorized))
    if (auth !== `Bearer ${current}`) return json(401, errorBody('TOKEN_EXPIRED'))
    if (init?.method === 'DELETE') return new Response(null, { status: 204 })
    return json(200, { items: [], total: 3, page: 1, page_size: 1 })
  })
  return { fetchMock, calls }
}

async function freshClient() {
  vi.resetModules()
  return import('./client')
}

describe('admin API client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores the session first when there is no token, then sends it', async () => {
    const { fetchMock, calls } = backend()
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await freshClient()
    const page = await api.get('/api/v1/admin/leads', { query: { status: 'new', page_size: 1 } })
    expect(page.total).toBe(3)
    expect(calls).toEqual([
      'POST /api/v1/admin/auth/refresh -',
      'GET /api/v1/admin/leads?status=new&page_size=1 Bearer fresh',
    ])
  })

  it('refreshes once for parallel requests with an expired token and repeats each once', async () => {
    const { fetchMock, calls } = backend()
    vi.stubGlobal('fetch', fetchMock)
    const { api, tokens } = await freshClient()
    tokens.signIn(session('old'))

    await Promise.all([
      api.get('/api/v1/admin/leads'),
      api.get('/api/v1/admin/auth/me'),
      api.get('/api/v1/admin/media/folders'),
    ])
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1)
    expect(calls.filter((c) => c.endsWith('Bearer old'))).toHaveLength(3)
    expect(calls.filter((c) => c.endsWith('Bearer fresh'))).toHaveLength(3)
  })

  it('refreshes and repeats once on any 401, e.g. a token rejected by a clock step', async () => {
    let rejectNext = true
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        calls.push(`${init?.method ?? 'GET'} ${url}`)
        if (url.endsWith('/auth/refresh')) return json(200, session('fresh'))
        if (rejectNext) {
          rejectNext = false
          return json(401, errorBody('UNAUTHORIZED'))
        }
        return json(200, user)
      }),
    )
    const { api, tokens } = await freshClient()
    tokens.signIn(session('issued-before-clock-step'))
    await expect(api.get('/api/v1/admin/auth/me')).resolves.toEqual(user)
    expect(calls).toEqual([
      'GET /api/v1/admin/auth/me',
      'POST /api/v1/admin/auth/refresh',
      'GET /api/v1/admin/auth/me',
    ])
    expect(tokens.accessToken).toBe('fresh')
  })

  it('signs out when the request is still rejected after a refresh', async () => {
    const { fetchMock, calls } = backend({ otherUnauthorized: 'USER_INACTIVE' })
    vi.stubGlobal('fetch', fetchMock)
    const { api, tokens } = await freshClient()
    tokens.signIn(session('fresh'))
    const events: unknown[] = []
    tokens.subscribe((e) => events.push(e))

    await expect(api.get('/api/v1/admin/auth/me')).rejects.toMatchObject({
      status: 401,
      code: 'USER_INACTIVE',
    })
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1)
    expect(tokens.accessToken).toBeNull()
    expect(events.at(-1)).toEqual({ type: 'signed-out', reason: 'expired' })
  })

  it('signs out when the refresh itself is rejected (revoked session)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith('/auth/refresh')
          ? json(401, errorBody('REFRESH_TOKEN_REUSED'))
          : json(401, errorBody('TOKEN_REVOKED')),
      ),
    )
    const { api, tokens } = await freshClient()
    tokens.signIn(session('fresh'))
    await expect(api.get('/api/v1/admin/auth/me')).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_REUSED',
    })
    expect(tokens.accessToken).toBeNull()
  })

  it('resolves 204 responses to undefined and fills path parameters', async () => {
    const { fetchMock, calls } = backend()
    vi.stubGlobal('fetch', fetchMock)
    const { api, tokens } = await freshClient()
    tokens.signIn(session('fresh'))
    const result = await api.delete('/api/v1/admin/media/{media_id}', {
      path: { media_id: 'a b' },
      query: { version: 2 },
    })
    expect(result).toBeUndefined()
    expect(calls.at(-1)).toBe('DELETE /api/v1/admin/media/a%20b?version=2 Bearer fresh')
  })

  it('turns a failed fetch into a NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const { api, tokens } = await freshClient()
    tokens.signIn(session('fresh'))
    await expect(api.get('/api/v1/admin/auth/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    })
    expect(tokens.accessToken).toBe('fresh')
  })
})
