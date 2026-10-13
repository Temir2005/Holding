import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { ButtonLink } from '../ui/Button'
import { EmptyState } from '../ui/feedback'
import { Spinner } from '../ui/Spinner'
import { hasRole, useCurrentUser, useSession, type Role } from './context'
import { LOGIN_PATH } from './redirect'

export function FullScreenLoader() {
  const t = useT()
  return (
    <div className="flex min-h-dvh items-center justify-center text-mute" role="status">
      <Spinner size={24} />
      <span className="sr-only">{t('app.loading')}</span>
    </div>
  )
}

/** Signed-out users go to the login page and come back here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <FullScreenLoader />
  if (session.status === 'signed-out') {
    const next = `${location.pathname}${location.search}${location.hash}`
    const params = new URLSearchParams({ next })
    if (session.expired) params.set('expired', '1')
    return <Navigate to={`${LOGIN_PATH}?${params.toString()}`} replace />
  }
  return <>{children}</>
}

/** Admin-only sections; the server enforces it too, this only explains it. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const t = useT()
  const user = useCurrentUser()
  if (hasRole(user, role)) return <>{children}</>
  return (
    <EmptyState
      icon={<Lock size={28} aria-hidden="true" />}
      title={t('errors.noAccessTitle')}
      text={t('errors.noAccessText')}
      action={
        <ButtonLink to="/admin" variant="secondary">
          {t('placeholder.toDashboard')}
        </ButtonLink>
      }
    />
  )
}
