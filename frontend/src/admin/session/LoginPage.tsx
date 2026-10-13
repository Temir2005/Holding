import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../api/auth'
import { AdminApiError, ErrorCode } from '../api/errors'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Alert } from '../ui/feedback'
import { Input, PasswordInput } from '../ui/Input'
import { FullScreenLoader } from './guards'
import { safeNext } from './redirect'
import { useSession } from './context'

const MESSAGE_KEYS: Record<string, string> = {
  BAD_CREDENTIALS: 'login.badCredentials',
  USER_INACTIVE: 'login.inactive',
  [ErrorCode.rateLimited]: 'login.rateLimited',
  [ErrorCode.network]: 'errors.network',
}

export function LoginPage() {
  const t = useT()
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session.status === 'loading') return <FullScreenLoader />
  if (session.status === 'signed-in' && !submitting) return <Navigate to={next} replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ email: email.trim(), password })
      navigate(next, { replace: true })
    } catch (err) {
      const key = err instanceof AdminApiError ? MESSAGE_KEYS[err.code] : undefined
      setError(key ? t(key) : err instanceof AdminApiError ? err.message : t('errors.unknown'))
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded bg-accent font-mono font-bold text-on-accent"
          >
            M
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{t('app.brand')}</span>
            <span className="text-sm text-mute">{t('app.brandSub')}</span>
          </div>
        </div>
        <h1 className="mb-4 text-xl">{t('login.title')}</h1>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {params.get('expired') && !error && (
            <Alert tone="info">{t('login.sessionExpired')}</Alert>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label={t('login.email')} required>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('login.password')} required>
            {(control) => (
              <PasswordInput
                {...control}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!email.trim() || !password}
          >
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </main>
  )
}
