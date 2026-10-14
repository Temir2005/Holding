import type { FieldErrors, FieldValues, Resolver, UseFormReturn } from 'react-hook-form'
import { locToPath, type FieldIssue, type LocPart } from '../../api/errors'
import { tAdmin } from '../../i18n'
import { hasPath } from './resolve'
import type { JsonSchema } from './types'
import { validate, type Issue } from './validate'

export function issueMessage(issue: Issue): string {
  return tAdmin(`form.errors.${issue.code}`, issue.params ?? {})
}

/** Nested RHF errors object from flat issues (`steps.0.title.ru`). */
function toFieldErrors(issues: Issue[]): FieldErrors {
  const errors: Record<string, unknown> = {}
  for (const issue of issues) {
    const parts = issue.path.split('.')
    let target = errors
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        // The first problem of a field is enough to show.
        target[part] ??= { type: issue.code, message: issueMessage(issue) }
      } else {
        target[part] ??= {}
        target = target[part] as Record<string, unknown>
      }
    })
  }
  return errors as FieldErrors
}

/** react-hook-form resolver that checks values against the block schema. */
export function schemaResolver(root: JsonSchema): Resolver<FieldValues> {
  return async (values) => {
    const issues = validate(root, values).filter((i) => i.path !== '')
    return issues.length === 0
      ? { values, errors: {} }
      : { values: {}, errors: toFieldErrors(issues) }
  }
}

export interface ServerErrorOptions {
  /** Request part before the form values, e.g. `["data"]` for a section's `data`. */
  strip?: readonly LocPart[]
}

/**
 * Shows 422 problems next to their fields. Returns the messages that belong to no field
 * of this form; the caller shows them above the form.
 */
export function applyServerErrors(
  form: UseFormReturn<FieldValues>,
  root: JsonSchema,
  issues: FieldIssue[],
  options: ServerErrorOptions = {},
): string[] {
  const unmapped: string[] = []
  const values = form.getValues()
  let focused = false
  for (const issue of issues) {
    const path = locToPath(issue.loc, options.strip)
    if (path && hasPath(root, values, path)) {
      form.setError(path, { type: 'server', message: issue.msg }, { shouldFocus: !focused })
      focused = true
    } else {
      unmapped.push(issue.msg)
    }
  }
  return unmapped
}
