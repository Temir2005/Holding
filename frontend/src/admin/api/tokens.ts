/**
 * Access token lifecycle: the only place that calls `POST /admin/auth/refresh`.
 *
 * The refresh token is single-use: presenting a spent one revokes the whole session
 * (`REFRESH_TOKEN_REUSED`, docs/admin-api.md). So:
 * - inside a tab, parallel callers share one in-flight refresh;
 * - across tabs (they share the cookie), refreshes are serialized with `navigator.locks`;
 *   the new token is broadcast so other tabs do not refresh again;
 * - without `navigator.locks` (plain http on a LAN IP is not a secure context), tabs
 *   coordinate over `BroadcastChannel`: a tab announces a claim, waits a short window and
 *   steps back if a rival with a smaller id claimed too;
 * - without both, only the in-tab guarantee remains.
 *
 * The access token lives in memory only, never in storage.
 */
import type { components } from '@/api/schema'
import { AdminApiError, SESSION_ENDED_CODES } from './errors'

export type TokenResponse = components['schemas']['TokenResponse']
export type CurrentUser = components['schemas']['UserRead']

export type SessionEvent =
  { type: 'signed-in'; user: CurrentUser } | { type: 'signed-out'; reason: 'logout' | 'expired' }

/** The subset of `BroadcastChannel` the manager needs, so tests can pass a fake. */
export interface ChannelLike {
  postMessage(message: unknown): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  close(): void
}

/** The subset of `LockManager` the manager needs. */
export interface LocksLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

type Message =
  | { type: 'session'; from: string; response: TokenResponse }
  | { type: 'claim'; from: string }
  | { type: 'failed'; from: string }
  | { type: 'signed-out'; from: string; reason: 'logout' | 'expired' }

export interface TokenManagerOptions {
  /** Performs the refresh request; rejects with `AdminApiError`. */
  refresh: () => Promise<TokenResponse>
  locks?: LocksLike | null
  channel?: ChannelLike | null
  tabId?: string
  /** How long a tab waits for rival claims before refreshing (channel fallback). */
  claimWindowMs?: number
  /** How long a tab waits for another tab's result before refreshing itself. */
  peerTimeoutMs?: number
}

export const LOCK_NAME = 'ms-admin-refresh'
export const CHANNEL_NAME = 'ms-admin-session'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export class TokenManager {
  private token: string | null = null
  private user: CurrentUser | null = null
  private inflight: Promise<string> | null = null
  private listeners = new Set<(event: SessionEvent) => void>()
  private waiters = new Set<{ resolve: (t: string) => void; reject: (e: unknown) => void }>()
  private rivalClaims = new Set<string>()
  private peerClaimAt = 0
  private readonly tabId: string
  private readonly claimWindowMs: number
  private readonly peerTimeoutMs: number

  constructor(private readonly options: TokenManagerOptions) {
    this.tabId = options.tabId ?? Math.random().toString(36).slice(2)
    this.claimWindowMs = options.claimWindowMs ?? 80
    this.peerTimeoutMs = options.peerTimeoutMs ?? 10_000
    options.channel?.addEventListener('message', (event) => this.onMessage(event.data as Message))
  }

  get accessToken(): string | null {
    return this.token
  }

  get currentUser(): CurrentUser | null {
    return this.user
  }

  subscribe(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Stores a token from login or password change and shares it with other tabs. */
  signIn(response: TokenResponse): void {
    this.apply(response)
    this.post({ type: 'session', from: this.tabId, response })
  }

  /** Forgets the session in this and other tabs (after logout). */
  signOut(reason: 'logout' | 'expired' = 'logout'): void {
    this.clear(reason)
    this.post({ type: 'signed-out', from: this.tabId, reason })
  }

  /**
   * Returns a fresh access token. `stale` is the token that just failed: if another call
   * or tab has already replaced it, the new one is returned without a request.
   */
  refresh(stale: string | null = this.token): Promise<string> {
    if (this.token !== null && this.token !== stale) return Promise.resolve(this.token)
    if (!this.inflight) {
      this.inflight = this.coordinated(stale).finally(() => {
        this.inflight = null
      })
    }
    return this.inflight
  }

  private coordinated(stale: string | null): Promise<string> {
    const { locks, channel } = this.options
    if (locks) {
      return locks.request(LOCK_NAME, async () => {
        // Another tab may have refreshed while this one waited for the lock.
        if (this.token !== null && this.token !== stale) return this.token
        return this.performRefresh()
      })
    }
    if (channel) return this.refreshOverChannel()
    return this.performRefresh()
  }

  private async refreshOverChannel(): Promise<string> {
    if (Date.now() - this.peerClaimAt < this.peerTimeoutMs) {
      const fromPeer = await this.waitForPeer()
      if (fromPeer !== null) return fromPeer
    }
    this.rivalClaims.clear()
    this.post({ type: 'claim', from: this.tabId })
    await sleep(this.claimWindowMs)
    const outranked = [...this.rivalClaims].some((id) => id < this.tabId)
    if (outranked) {
      const fromPeer = await this.waitForPeer()
      if (fromPeer !== null) return fromPeer
    }
    return this.performRefresh()
  }

  /** Resolves with the token another tab obtains, or `null` if none arrives in time. */
  private waitForPeer(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      const waiter = {
        resolve: (token: string) => {
          clearTimeout(timer)
          resolve(token)
        },
        reject: (error: unknown) => {
          clearTimeout(timer)
          reject(error)
        },
      }
      const timer = setTimeout(() => {
        this.waiters.delete(waiter)
        resolve(null)
      }, this.peerTimeoutMs)
      this.waiters.add(waiter)
    })
  }

  private async performRefresh(): Promise<string> {
    try {
      const response = await this.options.refresh()
      this.signIn(response)
      return response.access_token
    } catch (error) {
      this.post({ type: 'failed', from: this.tabId })
      // The cookie is shared: a dead session is dead in every tab.
      if (error instanceof AdminApiError && SESSION_ENDED_CODES.has(error.code)) {
        this.signOut('expired')
      }
      throw error
    }
  }

  private onMessage(message: Message): void {
    if (message.from === this.tabId) return
    switch (message.type) {
      case 'session':
        this.peerClaimAt = 0
        this.apply(message.response)
        for (const waiter of this.waiters) waiter.resolve(message.response.access_token)
        this.waiters.clear()
        break
      case 'claim':
        this.peerClaimAt = Date.now()
        this.rivalClaims.add(message.from)
        break
      case 'failed': {
        this.peerClaimAt = 0
        const error = new AdminApiError(401, 'REFRESH_FAILED', 'Session refresh failed')
        for (const waiter of this.waiters) waiter.reject(error)
        this.waiters.clear()
        break
      }
      case 'signed-out':
        this.clear(message.reason)
        break
    }
  }

  private apply(response: TokenResponse): void {
    this.token = response.access_token
    this.user = response.user
    this.emit({ type: 'signed-in', user: response.user })
  }

  private clear(reason: 'logout' | 'expired'): void {
    const hadSession = this.token !== null || this.user !== null
    this.token = null
    this.user = null
    if (hadSession || reason === 'expired') this.emit({ type: 'signed-out', reason })
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  private post(message: Message): void {
    this.options.channel?.postMessage(message)
  }
}

/** Browser wiring: real `navigator.locks` and `BroadcastChannel` when available. */
export function browserCoordination(): Pick<TokenManagerOptions, 'locks' | 'channel'> {
  const locks = typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
  return { locks, channel }
}
