import { createContext, useContext } from 'react'
import { fieldKind, itemNode, localesOf, resolveNode } from './resolve'
import type { JsonSchema, ResolvedNode } from './types'

/** react-hook-form path of a child: `steps` + `0` → `steps.0`. */
export const joinPath = (prefix: string, key: string | number) =>
  prefix ? `${prefix}.${key}` : String(key)

export interface FormLocale {
  code: string
  title: string
  required: boolean
}

export interface SchemaFormContextValue {
  root: JsonSchema
  /** Languages of localized fields, taken from the schema itself. */
  locales: FormLocale[]
  /** The language shown in every localized field of the form. */
  locale: string
  setLocale: (code: string) => void
}

export const SchemaFormContext = createContext<SchemaFormContextValue | null>(null)

export function useSchemaFormContext(): SchemaFormContextValue {
  const context = useContext(SchemaFormContext)
  if (!context) throw new Error('Schema form fields must be rendered inside <SchemaForm>')
  return context
}

/** Finds the languages of the first localized field (all of them share one definition). */
export function findLocales(root: JsonSchema): FormLocale[] {
  const visit = (node: ResolvedNode, depth: number): FormLocale[] | null => {
    if (depth > 8) return null
    const kind = fieldKind(node, root)
    if (kind === 'localized') return localesOf(node.schema)
    if (kind === 'array') return visit(itemNode(node.schema, root), depth + 1)
    if (kind === 'object') {
      for (const prop of Object.values(node.schema.properties ?? {})) {
        const found = visit(resolveNode(prop, root), depth + 1)
        if (found) return found
      }
    }
    return null
  }
  return visit({ schema: root, nullable: false }, 0) ?? []
}
