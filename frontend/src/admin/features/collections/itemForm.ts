import type { QueryClient } from '@tanstack/react-query'
import type { FieldIssue } from '../../api/errors'
import type { CollectionItem } from '../../api/collections'
import type { RefCard } from '../../api/queries'
import { rememberCards } from '../../api/refCards'
import { tAdmin } from '../../i18n'
import { fieldKind, resolveNode } from '../../forms/schema/resolve'
import type { JsonSchema } from '../../forms/schema/types'
import { emptyForm, emptyValue, type Values } from '../../forms/schema/values'
import type { CollectionConfig } from './config'

const isEmptyObject = (value: unknown) =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 0

/**
 * Form values of a record: the fields of its form schema, taken from the read model.
 * Localized texts are stored as `{}` when empty; an optional one shows as "not set".
 */
export function itemValues(
  config: CollectionConfig,
  schema: JsonSchema,
  item: CollectionItem,
): Values {
  const record = item as unknown as Record<string, unknown>
  const required = new Set(schema.required ?? [])
  return Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([key, prop]) => {
      if (config.separate?.field === key) return [key, config.separate.value(item)]
      const node = resolveNode(prop, schema)
      const value = record[key]
      if (value === undefined) return [key, emptyValue(node, schema, required.has(key))]
      if (node.nullable && fieldKind(node, schema) === 'localized' && isEmptyObject(value)) {
        return [key, null]
      }
      return [key, value]
    }),
  )
}

export function newItemValues(schema: JsonSchema): Values {
  return emptyForm(schema)
}

/** The record's own fields, and the value saved by a request of its own (the gallery). */
export function splitValues(
  config: CollectionConfig,
  values: Values,
): { own: Values; separate: unknown } {
  const field = config.separate?.field
  if (!field) return { own: values, separate: undefined }
  const { [field]: separate, ...own } = values
  return { own, separate }
}

/**
 * Errors of the separate request on the form field: `media_ids.1` becomes one message on
 * `gallery` ("Файл № 2: …"), since a list shows the problems of the whole field.
 */
export function separateIssues(config: CollectionConfig, issues: FieldIssue[]): FieldIssue[] {
  const separate = config.separate
  if (!separate) return issues
  const own: FieldIssue[] = []
  const messages: string[] = []
  for (const issue of issues) {
    const at = issue.loc.indexOf(separate.requestField)
    if (at === -1) {
      own.push(issue)
      continue
    }
    const index = issue.loc[at + 1]
    messages.push(
      typeof index === 'number'
        ? tAdmin('collection.itemProblem', { n: index + 1, message: issue.msg })
        : issue.msg,
    )
  }
  return messages.length > 0
    ? [...own, { loc: ['body', separate.field], msg: messages.join('; ') }]
    : own
}

const isCard = (value: unknown): value is RefCard =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RefCard).id === 'string' &&
  typeof (value as RefCard).kind === 'string' &&
  typeof (value as RefCard).title === 'string'

/** Cards in the read model (cover, division, gallery…): reference fields show them at once. */
export function rememberItemCards(queryClient: QueryClient, item: CollectionItem) {
  for (const value of Object.values(item as unknown as Record<string, unknown>)) {
    const cards = (Array.isArray(value) ? value : [value]).filter(isCard)
    for (const card of cards) rememberCards(queryClient, card.kind, [card])
  }
}

/** Whether two stored values are the same (form values are plain JSON). */
export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
