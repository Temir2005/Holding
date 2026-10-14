import { get, useFormState } from 'react-hook-form'

/** The error message stored exactly at `name` (client check or server 422). */
export function useFieldError(name: string): string | undefined {
  const { errors } = useFormState({ name })
  const error: unknown = get(errors, name)
  const message = (error as { message?: unknown } | undefined)?.message
  return typeof message === 'string' ? message : undefined
}
