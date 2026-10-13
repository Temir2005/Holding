import type { components } from '@/api/schema'
import { api, request, tokens } from './client'
import type { TokenResponse } from './tokens'

type S = components['schemas']

export async function login(body: S['LoginRequest']): Promise<TokenResponse> {
  const res = await request('/api/v1/admin/auth/login', { method: 'POST', body, anonymous: true })
  const response = (await res.json()) as TokenResponse
  tokens.signIn(response)
  return response
}

/** Ends the session of this browser (all tabs share the cookie, so all of them sign out). */
export async function logout(): Promise<void> {
  try {
    await request('/api/v1/admin/auth/logout', { method: 'POST', anonymous: true })
  } finally {
    tokens.signOut('logout')
  }
}

/** Other sessions are revoked; this one gets new tokens, which other tabs receive too. */
export async function changePassword(body: S['ChangePasswordRequest']): Promise<void> {
  const response = await api.post('/api/v1/admin/auth/password', { body })
  tokens.signIn(response)
}

/** Restores the session from the refresh cookie on page load; `false` if there is none. */
export async function restoreSession(): Promise<boolean> {
  if (tokens.accessToken) return true
  try {
    await tokens.refresh(null)
    return true
  } catch {
    return false
  }
}
