import { describe, expect, it, vi } from 'vitest'
import { AdminApiError } from './errors'
import {
  TokenManager,
  type ChannelLike,
  type LocksLike,
  type SessionEvent,
  type TokenResponse,
} from './tokens'

const user: TokenResponse['user'] = {
  id: 'u1',
  email: 'editor@example.com',
  full_name: 'Редактор',
  role: 'editor',
  is_active: true,
  last_login_at: null,
  created_at: '2026-10-01T00:00:00Z',
  version: 1,
}

const tokenResponse = (token: string): TokenResponse => ({
  access_token: token,
  token_type: 'bearer',
  expires_in: 900,
  user,
})

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A fake backend: each refresh issues the next token after a short delay. */
function fakeRefresh() {
  let n = 0
  return vi.fn(async () => {
    n += 1
    const token = `t${n}`
    await delay(10)
    return tokenResponse(token)
  })
}

/** Channels of one "browser": messages reach every other member asynchronously. */
function channelHub() {
  const members = new Set<FakeChannel>()
  class FakeChannel implements ChannelLike {
    private listeners: ((event: MessageEvent) => void)[] = []
    postMessage(message: unknown) {
      for (const other of members) {
        if (other === this) continue
        const data = structuredClone(message)
        queueMicrotask(() => other.listeners.forEach((l) => l({ data } as MessageEvent)))
      }
    }
    addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
      this.listeners.push(listener)
    }
    close() {
      members.delete(this)
    }
  }
  return () => {
    const channel = new FakeChannel()
    members.add(channel)
    return channel
  }
}

/** Serializes callbacks like `navigator.locks.request` with one lock name. */
class FakeLocks implements LocksLike {
  private tail: Promise<unknown> = Promise.resolve()
  request<T>(_name: string, callback: () => Promise<T>): Promise<T> {
    const run = this.tail.then(callback)
    this.tail = run.catch(() => undefined)
    return run
  }
}

describe('TokenManager inside one tab', () => {
  it('shares one refresh between parallel callers (no locks, no channel)', async () => {
    const refresh = fakeRefresh()
    const tokens = new TokenManager({ refresh, locks: null, channel: null })
    const results = await Promise.all([tokens.refresh(), tokens.refresh(), tokens.refresh()])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['t1', 't1', 't1'])
    expect(tokens.accessToken).toBe('t1')
  })

  it('returns the current token without a request when the stale one was already replaced', async () => {
    const refresh = fakeRefresh()
    const tokens = new TokenManager({ refresh })
    tokens.signIn(tokenResponse('fresh'))
    await expect(tokens.refresh('old')).resolves.toBe('fresh')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes again for a new expiry after the first refresh finished', async () => {
    const refresh = fakeRefresh()
    const tokens = new TokenManager({ refresh })
    await tokens.refresh(null)
    await tokens.refresh('t1')
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(tokens.accessToken).toBe('t2')
  })

  it('ends the session when the refresh token is rejected', async () => {
    const refresh = vi.fn(async () => {
      throw new AdminApiError(401, 'REFRESH_TOKEN_REUSED', 'reused')
    })
    const tokens = new TokenManager({ refresh })
    tokens.signIn(tokenResponse('t0'))
    const events: SessionEvent[] = []
    tokens.subscribe((e) => events.push(e))
    await expect(tokens.refresh('t0')).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED' })
    expect(tokens.accessToken).toBeNull()
    expect(events).toEqual([{ type: 'signed-out', reason: 'expired' }])
  })

  it('keeps the session on a network failure', async () => {
    const refresh = vi.fn(async () => {
      throw new AdminApiError(0, 'NETWORK_ERROR', 'offline')
    })
    const tokens = new TokenManager({ refresh })
    tokens.signIn(tokenResponse('t0'))
    await expect(tokens.refresh('t0')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(tokens.currentUser).toEqual(user)
  })
})

describe('TokenManager across tabs with navigator.locks', () => {
  it('refreshes once when two tabs hit an expired token together', async () => {
    const refresh = fakeRefresh()
    const locks = new FakeLocks()
    const connect = channelHub()
    const a = new TokenManager({ refresh, locks, channel: connect(), tabId: 'a' })
    const b = new TokenManager({ refresh, locks, channel: connect(), tabId: 'b' })
    a.signIn(tokenResponse('t0'))
    await delay(0)
    expect(b.accessToken).toBe('t0')

    const results = await Promise.all([a.refresh('t0'), b.refresh('t0')])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['t1', 't1'])
  })
})

describe('TokenManager across tabs without navigator.locks (BroadcastChannel only)', () => {
  it('lets only one of two simultaneous tabs refresh; the other receives its token', async () => {
    const refresh = fakeRefresh()
    const connect = channelHub()
    const options = { refresh, locks: null, claimWindowMs: 20, peerTimeoutMs: 500 }
    const a = new TokenManager({ ...options, channel: connect(), tabId: 'a' })
    const b = new TokenManager({ ...options, channel: connect(), tabId: 'b' })

    const results = await Promise.all([b.refresh(null), a.refresh(null)])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['t1', 't1'])
    expect(a.accessToken).toBe('t1')
    expect(b.accessToken).toBe('t1')
  })

  it('waits for a tab that is already refreshing instead of claiming', async () => {
    const refresh = fakeRefresh()
    const connect = channelHub()
    const options = { refresh, locks: null, claimWindowMs: 20, peerTimeoutMs: 500 }
    const a = new TokenManager({ ...options, channel: connect(), tabId: 'z' })
    const b = new TokenManager({ ...options, channel: connect(), tabId: 'b' })

    const first = a.refresh(null)
    await delay(1) // b has seen a's claim
    const second = b.refresh(null)
    await expect(Promise.all([first, second])).resolves.toEqual(['t1', 't1'])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes itself when the other tab never answers', async () => {
    const refresh = fakeRefresh()
    const connect = channelHub()
    const silent = connect() // a tab that claimed and then went away
    const b = new TokenManager({
      refresh,
      locks: null,
      channel: connect(),
      tabId: 'b',
      claimWindowMs: 5,
      peerTimeoutMs: 30,
    })
    silent.postMessage({ type: 'claim', from: 'a' })
    await delay(1)
    await expect(b.refresh(null)).resolves.toBe('t1')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('fails waiting tabs and signs them out when the session is dead', async () => {
    const connect = channelHub()
    const options = { locks: null, claimWindowMs: 20, peerTimeoutMs: 500 }
    const a = new TokenManager({
      ...options,
      channel: connect(),
      tabId: 'a',
      refresh: async () => {
        await delay(5)
        throw new AdminApiError(401, 'REFRESH_TOKEN_EXPIRED', 'expired')
      },
    })
    const bRefresh = vi.fn(fakeRefresh())
    const b = new TokenManager({ ...options, channel: connect(), tabId: 'b', refresh: bRefresh })

    b.signIn(tokenResponse('t0'))
    await delay(0)
    const events: SessionEvent[] = []
    b.subscribe((e) => events.push(e))

    const results = await Promise.allSettled([a.refresh('t0'), b.refresh('t0')])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(bRefresh).not.toHaveBeenCalled()
    expect(b.accessToken).toBeNull()
    expect(events).toEqual([{ type: 'signed-out', reason: 'expired' }])
  })

  it('signs other tabs out on logout', async () => {
    const connect = channelHub()
    const a = new TokenManager({ refresh: fakeRefresh(), channel: connect(), tabId: 'a' })
    const b = new TokenManager({ refresh: fakeRefresh(), channel: connect(), tabId: 'b' })
    a.signIn(tokenResponse('t0'))
    await delay(0)
    const events: SessionEvent[] = []
    b.subscribe((e) => events.push(e))
    a.signOut('logout')
    await delay(0)
    expect(b.accessToken).toBeNull()
    expect(events).toEqual([{ type: 'signed-out', reason: 'logout' }])
  })
})
