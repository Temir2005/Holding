import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/auth'
import { AdminApiError, locToPath } from '../api/errors'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Alert } from '../ui/feedback'
import { PasswordInput } from '../ui/Input'
import { useToast } from '../ui/toast-context'

/** Mirrors MIN_PASSWORD_LENGTH in backend/app/schemas/admin/auth.py; the server re-checks. */
const MIN_LENGTH = 10

type FieldName = 'current_password' | 'new_password' | 'repeat'
type Errors = Partial<Record<FieldName, string>>

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const toast = useToast()
  const [values, setValues] = useState({ current_password: '', new_password: '', repeat: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setValues({ current_password: '', new_password: '', repeat: '' })
    setErrors({})
    setFormError(null)
  }

  const validate = (): Errors => {
    const found: Errors = {}
    if (!values.current_password) found.current_password = t('common.required')
    if (values.new_password.length < MIN_LENGTH)
      found.new_password = t('password.tooShort', { min: MIN_LENGTH })
    if (values.repeat !== values.new_password) found.repeat = t('password.mismatch')
    return found
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      toast.success(t('password.done'))
      reset()
      onOpenChange(false)
    } catch (error) {
      if (!(error instanceof AdminApiError)) throw error
      if (error.fieldIssues.length > 0) {
        // Field `msg` may be technical English; the top-level `message` is for people.
        const single = error.fieldIssues.length === 1
        const mapped: Errors = {}
        const unmapped: string[] = []
        for (const issue of error.fieldIssues) {
          const path = locToPath(issue.loc)
          if (path === 'current_password') mapped[path] = t('password.wrongCurrent')
          else if (path === 'new_password') mapped[path] = single ? error.message : issue.msg
          else unmapped.push(single ? error.message : issue.msg)
        }
        setErrors(mapped)
        if (unmapped.length > 0) setFormError(unmapped.join('. '))
      } else {
        setFormError(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const field = (name: FieldName) => ({
    value: values[name],
    onChange: (e: { target: { value: string } }) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value })),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title={t('password.title')}
      description={t('password.description')}
      size="sm"
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label={t('password.current')} error={errors.current_password} required>
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              {...field('current_password')}
            />
          )}
        </Field>
        <Field
          label={t('password.new')}
          hint={t('password.newHint', { min: MIN_LENGTH })}
          error={errors.new_password}
          required
        >
          {(control) => (
            <PasswordInput {...control} autoComplete="new-password" {...field('new_password')} />
          )}
        </Field>
        <Field label={t('password.repeat')} error={errors.repeat} required>
          {(control) => (
            <PasswordInput {...control} autoComplete="new-password" {...field('repeat')} />
          )}
        </Field>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" loading={saving}>
            {t('password.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
