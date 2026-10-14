import { fieldKind, itemNode, localesOf, resolveNode } from './resolve'
import type { JsonSchema, ResolvedNode } from './types'

export type Values = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const clone = <T>(value: T): T => structuredClone(value)

/**
 * The value of a new, empty field: the schema default, otherwise an empty value of the
 * right shape (required fields get one, optional ones are null). Used for new list items
 * and new blocks.
 */
export function emptyValue(node: ResolvedNode, root: JsonSchema, required = true): unknown {
  const { schema, nullable } = node
  if (schema.default !== undefined) return clone(schema.default)
  if (nullable && !required) return null
  switch (fieldKind(node, root)) {
    case 'localized':
      return Object.fromEntries(
        localesOf(schema)
          .filter((l) => l.required)
          .map((l) => [l.code, '']),
      )
    case 'object': {
      const requiredProps = new Set(schema.required ?? [])
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, prop]) => [
          key,
          emptyValue(resolveNode(prop, root), root, requiredProps.has(key)),
        ]),
      )
    }
    case 'array':
    case 'enum-list':
    case 'tags':
      return []
    case 'enum':
      return schema.enum?.[0] ?? null
    case 'boolean':
      return false
    case 'number':
      return schema.minimum ?? 0
    case 'ref':
      return schema.type === 'array' ? [] : null
    case 'json':
      return null
    default:
      return ''
  }
}

/** A localized value with every language empty. */
function isBlankLocalized(value: unknown): boolean {
  return (
    !isRecord(value) || Object.values(value).every((v) => typeof v !== 'string' || v.trim() === '')
  )
}

/**
 * Converts form values into the stored shape of the data: empty languages are dropped,
 * an optional text with no language at all becomes null. Everything else is kept as is,
 * so saving unchanged data changes nothing on the server.
 */
export function toStored(node: ResolvedNode, value: unknown, root: JsonSchema): unknown {
  const { schema, nullable } = node
  if (value === null || value === undefined) return value
  switch (fieldKind(node, root)) {
    case 'localized': {
      if (!isRecord(value)) return value
      if (nullable && isBlankLocalized(value)) return null
      return Object.fromEntries(
        Object.entries(value).filter(
          ([code, text]) => code === 'ru' || (typeof text === 'string' && text !== ''),
        ),
      )
    }
    case 'object':
      if (!isRecord(value)) return value
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => {
          const prop = schema.properties?.[key]
          return [key, prop ? toStored(resolveNode(prop, root), child, root) : child]
        }),
      )
    case 'array': {
      if (!Array.isArray(value)) return value
      const item = itemNode(schema, root)
      return value.map((child) => toStored(item, child, root))
    }
    default:
      return value
  }
}

/** Stored values of the whole form (root is an object schema). */
export function formToStored(root: JsonSchema, values: Values): Values {
  return toStored({ schema: root, nullable: false }, values, root) as Values
}

/** Default values for a new block of this type. */
export function emptyForm(root: JsonSchema): Values {
  return emptyValue({ schema: root, nullable: false }, root) as Values
}

/** A short text that names a list item in its collapsed card (first text, Russian). */
export function previewText(node: ResolvedNode, value: unknown, root: JsonSchema): string {
  const kind = fieldKind(node, root)
  if (kind === 'localized' && isRecord(value)) {
    const ru = value.ru
    return typeof ru === 'string' ? ru : ''
  }
  if (
    (kind === 'string' || kind === 'link' || kind === 'page' || kind === 'icon') &&
    typeof value === 'string'
  ) {
    return value
  }
  if (kind === 'object' && isRecord(value)) {
    // Texts name an item better than codes (an icon name, a link), so they come first.
    const props = Object.entries(node.schema.properties ?? {}).map(
      ([key, prop]) => [key, resolveNode(prop, root)] as const,
    )
    const texts = props.filter(([, child]) => fieldKind(child, root) === 'localized')
    const others = props.filter(([, child]) => fieldKind(child, root) !== 'localized')
    for (const [key, child] of [...texts, ...others]) {
      const text = previewText(child, value[key], root)
      if (text.trim()) return text
    }
  }
  return ''
}
