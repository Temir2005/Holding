import type { QueryClient } from '@tanstack/react-query'
import type { FieldIssue } from '../../api/errors'
import type { CollectionItem } from '../../api/collections'
import type { RefCard } from '../../api/queries'
import { rememberCards } from '../../api/refCards'
import { tAdmin } from '../../i18n'
import type { JsonSchema } from '../../forms/schema/types'
import { emptyForm, valuesFromRecord, type Values } from '../../forms/schema/values'
import type { CollectionConfig } from './config'

/** Form values of a record; the separately saved field (the gallery) from the record too. */
export function itemValues(
  config: CollectionConfig,
  schema: JsonSchema,
  item: CollectionItem,
): Values {
  const values = valuesFromRecord(schema, item as unknown as Record<string, unknown>)
  if (config.separate) values[config.separate.field] = config.separate.value(item)
  return values
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
