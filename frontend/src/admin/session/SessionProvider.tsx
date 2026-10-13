import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { restoreSession } from '../api/auth'
import { tokens } from '../api/client'
import { SessionContext, type SessionState } from './context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SessionState>(() => {
    const user = tokens.currentUser
    return user ? { status: 'signed-in', user } : { status: 'loading' }
  })

  useEffect(() => {
    const unsubscribe = tokens.subscribe((event) => {
      if (event.type === 'signed-in') {
        setState({ status: 'signed-in', user: event.user })
        return
      }
      // Cached data belongs to the previous user: never show it to the next one.
      queryClient.clear()
      setState((prev) => ({
        status: 'signed-out',
        expired: event.reason === 'expired' && prev.status === 'signed-in',
      }))
    })
    let active = true
    void restoreSession().then((ok) => {
      if (!active) return
      const user = tokens.currentUser
      setState(
        ok && user ? { status: 'signed-in', user } : { status: 'signed-out', expired: false },
      )
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [queryClient])

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
}
