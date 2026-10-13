import { createContext, useContext } from 'react'
import type { CurrentUser } from '../api/client'

export type Role = CurrentUser['role']

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-in'; user: CurrentUser }
  | { status: 'signed-out'; expired: boolean }

export const SessionContext = createContext<SessionState>({ status: 'loading' })

export function useSession(): SessionState {
  return useContext(SessionContext)
}

/** The signed-in user; only for components rendered inside `RequireAuth`. */
export function useCurrentUser(): CurrentUser {
  const session = useSession()
  if (session.status !== 'signed-in') throw new Error('useCurrentUser outside RequireAuth')
  return session.user
}

/** `editor` covers content; `admin` also has users, audit log and site settings. */
export function hasRole(user: CurrentUser, role: Role): boolean {
  return role === 'editor' || user.role === 'admin'
}
