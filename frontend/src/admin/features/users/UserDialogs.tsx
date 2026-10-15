import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode, locToPath } from '../../api/errors'
import { metaOptions, metaQuery } from '../../api/queries'
import { MIN_PASSWORD_LENGTH, usersKey, type AdminUser, type UserRole } from '../../api/users'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Field } from '../../ui/Field'
import { Alert } from '../../ui/feedback'
import { Input, PasswordInput } from '../../ui/Input'
import { Switch } from '../../ui/Switch'
import { useToast } from '../../ui/toast-context'

type Errors = Partial<Record<'email' | 'full_name' | 'password' | 'repeat', string>>

/** Field problems of a 422 by field name; the rest as one message for the form. */
function splitIssues(error: AdminApiError): { fields: Errors; form: string | null } {
  const fields: Errors = {}
  const rest: string[] = []
  for (const issue of error.fieldIssues) {
    const path = locToPath(issue.loc)
    const name = path === 'new_password' ? 'password' : path
    if (name === 'email' || name === 'full_name' || name === 'password') fields[name] = issue.msg
    else rest.push(issue.msg)
  }
  return { fields, form: rest.length > 0 ? rest.join('. ') : null }
}

function RoleChoice({
  value,
  onChange,
  disabled,
  hint,
}: {
  value: UserRole
  onChange: (role: UserRole) => void
  disabled?: boolean
  hint?: string
}) {
  const t = useT()
  const name = useId()
  const { data: meta } = useQuery(metaQuery())
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{t('users.role')}</legend>
      <div className="flex flex-col gap-1">
        {metaOptions(meta, 'user_roles').map((option) => (
          <label
            key={option.value}
            className="flex min-h-touch items-start gap-2 rounded px-1 py-1 text-sm md:min-h-9"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value as UserRole)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-mute">{t(`users.roleHint.${option.value}`)}</span>
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-mute">{hint}</p>}
    </fieldset>
  )
}

/** A new user (`user` null) or changes to one: name, role, access. */
export function UserDialog({
  open,
  onOpenChange,
  user,
  isSelf,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | null
  isSelf: boolean
}) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [values, setValues] = useState({
    email: user?.email ?? '',
    full_name: user?.full_name ?? '',
    role: user?.role ?? ('editor' as UserRole),
    is_active: user?.is_active ?? true,
    password: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      user
        ? api.patch('/api/v1/admin/users/{user_id}', {
            path: { user_id: user.id },
            body: {
              version: user.version,
              full_name: values.full_name.trim(),
              role: values.role,
              is_active: values.is_active,
            },
          })
        : api.post('/api/v1/admin/users', {
            body: {
              email: values.email.trim(),
              full_name: values.full_name.trim(),
              role: values.role,
              password: values.password,
            },
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKey })
      toast.success(user ? t('users.saved') : t('users.created'))
      onOpenChange(false)
    },
    onError: (error) => {
      if (!(error instanceof AdminApiError)) return toast.error(error)
      if (error.code === ErrorCode.alreadyExists) setErrors({ email: error.message })
      else if (error.fieldIssues.length > 0) {
        const split = splitIssues(error)
        setErrors(split.fields)
        setFormError(split.form)
      } else {
        // SELF_LOCKOUT, LAST_ADMIN, VERSION_CONFLICT: the server explains in plain words.
        setFormError(error.message)
        if (error.code === ErrorCode.versionConflict) {
          void queryClient.invalidateQueries({ queryKey: usersKey })
        }
      }
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found: Errors = {}
    if (!user && !values.email.trim()) found.email = t('common.required')
    if (!values.full_name.trim()) found.full_name = t('common.required')
    if (!user && values.password.length < MIN_PASSWORD_LENGTH)
      found.password = t('password.tooShort', { min: MIN_PASSWORD_LENGTH })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length === 0) save.mutate()
  }

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))
  const activeId = useId()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? t('users.editTitle', { name: user.full_name }) : t('users.new')}
      size="sm"
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {isSelf && <Alert tone="info">{t('users.selfNote')}</Alert>}
        {user ? (
          <p className="text-sm text-mute">{user.email}</p>
        ) : (
          <Field label={t('users.email')} error={errors.email} required>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="off"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}
          </Field>
        )}
        <Field label={t('users.name')} error={errors.full_name} required>
          {(control) => (
            <Input
              {...control}
              autoComplete="off"
              value={values.full_name}
              onChange={(e) => set('full_name', e.target.value)}
            />
          )}
        </Field>
        <RoleChoice value={values.role} onChange={(role) => set('role', role)} disabled={isSelf} />
        {!user && (
          <Field
            label={t('users.password')}
            hint={t('users.passwordHint', { min: MIN_PASSWORD_LENGTH })}
            error={errors.password}
            required
          >
            {(control) => (
              <PasswordInput
                {...control}
                autoComplete="new-password"
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
              />
            )}
          </Field>
        )}
        {user && (
          <div className="flex flex-col gap-1">
            <div className="flex min-h-touch items-center gap-3 md:min-h-9">
              <Switch
                id={activeId}
                checked={values.is_active}
                disabled={isSelf}
                onCheckedChange={(checked) => set('is_active', checked)}
              />
              <label htmlFor={activeId} className="text-sm">
                {t('users.active')}
              </label>
            </div>
            <p className="text-xs text-mute">{t('users.activeHint')}</p>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {user ? t('common.save') : t('users.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** An admin sets a new password for someone; their sessions end. */
export function PasswordDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const close = () => {
    setPassword('')
    setRepeat('')
    setErrors({})
    setFormError(null)
    onClose()
  }

  const save = useMutation({
    mutationFn: (target: AdminUser) =>
      api.post('/api/v1/admin/users/{user_id}/password', {
        path: { user_id: target.id },
        body: { new_password: password },
      }),
    onSuccess: (_saved, target) => {
      void queryClient.invalidateQueries({ queryKey: usersKey })
      toast.success(t('users.passwordSet', { name: target.full_name }))
      close()
    },
    onError: (error) => {
      if (!(error instanceof AdminApiError)) return toast.error(error)
      const split = splitIssues(error)
      setErrors(split.fields)
      setFormError(split.form ?? (error.fieldIssues.length ? null : error.message))
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found: Errors = {}
    if (password.length < MIN_PASSWORD_LENGTH)
      found.password = t('password.tooShort', { min: MIN_PASSWORD_LENGTH })
    if (repeat !== password) found.repeat = t('password.mismatch')
    setErrors(found)
    if (user && Object.keys(found).length === 0) save.mutate(user)
  }

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(next) => !next && close()}
      title={t('users.passwordTitle', { name: user?.full_name ?? '' })}
      description={t('users.passwordText')}
      size="sm"
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field
          label={t('password.new')}
          hint={t('password.newHint', { min: MIN_PASSWORD_LENGTH })}
          error={errors.password}
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('password.repeat')} error={errors.repeat} required>
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {t('users.setPassword')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
