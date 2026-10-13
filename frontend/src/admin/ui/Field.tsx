import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '../i18n'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  /** Renders the control with the ids that tie it to its label, hint and error. */
  children: (control: FieldControlProps) => ReactNode
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const t = useT()
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-1 text-danger" title={t('common.requiredMark')} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-mute">
          {hint}
        </p>
      )}
    </div>
  )
}
