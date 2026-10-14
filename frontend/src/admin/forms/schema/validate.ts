import { fieldKind, itemNode, localesOf, resolveNode } from './resolve'
import type { JsonSchema, ResolvedNode } from './types'

/** Client-side checks mirror the schema constraints; the server checks everything again. */
export type IssueCode =
  | 'required'
  | 'requiredRu'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'enum'
  | 'number'
  | 'minItems'
  | 'maxItems'

export interface Issue {
  path: string
  code: IssueCode
  params?: Record<string, string | number>
}

const join = (path: string, part: string | number) => (path ? `${path}.${part}` : String(part))

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

function validateString(schema: JsonSchema, value: string, path: string, issues: Issue[]) {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    issues.push({ path, code: 'minLength', params: { min: schema.minLength } })
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    issues.push({ path, code: 'maxLength', params: { max: schema.maxLength } })
  }
  if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
    issues.push({ path, code: 'pattern' })
  }
}

function validateNode(
  node: ResolvedNode,
  value: unknown,
  path: string,
  required: boolean,
  root: JsonSchema,
  issues: Issue[],
) {
  const { schema, nullable } = node
  const kind = fieldKind(node, root)

  if (value === null || value === undefined) {
    if (required && !nullable) issues.push({ path, code: 'required' })
    return
  }

  switch (kind) {
    case 'localized': {
      const text = value as Record<string, unknown>
      // A required text (or a list item) must have Russian; optional ones may be all empty.
      const anyFilled = Object.values(text).some((v) => !isBlank(v))
      for (const locale of localesOf(schema)) {
        const localeText = text[locale.code]
        if (locale.required && (required || anyFilled) && isBlank(localeText)) {
          issues.push({ path: join(path, locale.code), code: 'requiredRu' })
        }
      }
      return
    }
    case 'object': {
      const object = value as Record<string, unknown>
      const requiredProps = new Set(schema.required ?? [])
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        validateNode(
          resolveNode(prop, root),
          object[key],
          join(path, key),
          requiredProps.has(key),
          root,
          issues,
        )
      }
      return
    }
    case 'array':
    case 'enum-list':
    case 'tags': {
      if (!Array.isArray(value)) return
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        issues.push({ path, code: 'minItems', params: { min: schema.minItems } })
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        issues.push({ path, code: 'maxItems', params: { max: schema.maxItems } })
      }
      const item = itemNode(schema, root)
      value.forEach((child, index) =>
        validateNode(item, child, join(path, index), true, root, issues),
      )
      return
    }
    case 'enum':
      if (schema.enum && !schema.enum.includes(value as string | number)) {
        issues.push({ path, code: 'enum' })
      }
      return
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        issues.push({ path, code: 'number' })
        return
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        issues.push({ path, code: 'minimum', params: { min: schema.minimum } })
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        issues.push({ path, code: 'maximum', params: { max: schema.maximum } })
      }
      return
    }
    case 'string':
    case 'link':
    case 'page':
    case 'color':
    case 'icon':
    case 'options':
    case 'combobox': {
      if (typeof value !== 'string') return
      if (value === '') {
        if (required && !nullable) issues.push({ path, code: 'required' })
        return
      }
      validateString(schema, value, path, issues)
      if (schema.enum && !schema.enum.includes(value)) issues.push({ path, code: 'enum' })
      return
    }
    default:
      return
  }
}

/** All problems of a form value against its root object schema. */
export function validate(root: JsonSchema, value: unknown): Issue[] {
  const issues: Issue[] = []
  validateNode({ schema: root, nullable: false }, value, '', true, root, issues)
  return issues
}
