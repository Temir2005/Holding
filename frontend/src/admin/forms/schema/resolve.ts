import type { FieldKind, JsonSchema, LocalizedVariant, ResolvedNode } from './types'

/** Keywords that describe the field itself and stay with it when its type is a `$ref`. */
const ANNOTATIONS = [
  'title',
  'description',
  'default',
  'x-widget',
  'x-ref',
  'x-options',
  'x-enum-labels',
] as const

const LOCALIZED_WIDGETS: Record<string, LocalizedVariant> = {
  'localized-text': 'text',
  'localized-textarea': 'textarea',
  markdown: 'markdown',
}

/** Widgets with their own editor; others are known but rendered by type (e.g. `anchor`). */
const WIDGET_KINDS: Record<string, FieldKind> = {
  icon: 'icon',
  link: 'link',
  color: 'color',
  select: 'options',
}

/** Widgets whose value is a plain string: rendered as a text field until they get an editor. */
const PLAIN_WIDGETS = new Set(['anchor', 'page'])

function annotationsOf(node: JsonSchema): Partial<JsonSchema> {
  const out: Partial<JsonSchema> = {}
  for (const key of ANNOTATIONS) {
    if (node[key] !== undefined) (out as Record<string, unknown>)[key] = node[key]
  }
  return out
}

function deref(node: JsonSchema, root: JsonSchema, seen: Set<string>): JsonSchema {
  if (!node.$ref) return node
  const name = node.$ref.replace(/^#\/\$defs\//, '')
  const target = root.$defs?.[name]
  if (!target || seen.has(name)) return { ...node, $ref: undefined }
  seen.add(name)
  // The referencing node's own title, hints and default win over the definition's.
  const own: JsonSchema = { ...node }
  delete own.$ref
  // A definition's description is developer documentation (a class docstring), not a hint
  // for this field; its title stays as a fallback name (e.g. a list item "Этап").
  const definition: JsonSchema = { ...deref(target, root, seen) }
  delete definition.description
  return { ...definition, ...own }
}

/** Resolves `$ref` and nullable `anyOf`, keeping the field's annotations. */
export function resolveNode(node: JsonSchema, root: JsonSchema): ResolvedNode {
  let nullable = false
  let current: JsonSchema = node
  if (node.anyOf) {
    const branches = node.anyOf.filter((b) => b.type !== 'null')
    nullable = branches.length < node.anyOf.length
    if (branches.length === 1 && branches[0]) {
      current = { ...branches[0], ...annotationsOf(node) }
    }
  }
  const schema = deref(current, root, new Set())
  return { schema, nullable: nullable || schema.type === 'null' }
}

export function localizedVariant(schema: JsonSchema): LocalizedVariant | null {
  const widget = schema['x-widget']
  return widget ? (LOCALIZED_WIDGETS[widget] ?? null) : null
}

/** The child node of an array: items inherit the array's widget (e.g. a list of texts). */
export function itemNode(array: JsonSchema, root: JsonSchema): ResolvedNode {
  const items = array.items ?? {}
  const resolved = resolveNode(items, root)
  const widget = array['x-widget']
  if (widget && !resolved.schema['x-widget']) {
    resolved.schema = { ...resolved.schema, 'x-widget': widget }
  }
  const labels = array['x-enum-labels']
  if (labels && !resolved.schema['x-enum-labels']) {
    resolved.schema = { ...resolved.schema, 'x-enum-labels': labels }
  }
  return resolved
}

/** Picks the editor for a node from its hints and type. */
export function fieldKind(node: ResolvedNode, root: JsonSchema): FieldKind {
  const { schema } = node
  if (schema['x-ref']) return 'ref'
  const widget = schema['x-widget']
  if (widget) {
    if (LOCALIZED_WIDGETS[widget]) return schema.type === 'array' ? 'array' : 'localized'
    const kind = WIDGET_KINDS[widget]
    if (kind === 'options' && !schema['x-options']) return 'json'
    if (kind) return kind
    if (!PLAIN_WIDGETS.has(widget)) return 'json'
  }
  if (schema.type === 'array') {
    const item = itemNode(schema, root).schema
    return item.enum ? 'enum-list' : 'array'
  }
  if (schema.enum) return 'enum'
  if (schema.type === 'object' && schema.properties) return 'object'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'integer' || schema.type === 'number') return 'number'
  if (schema.type === 'string') return 'string'
  return 'json'
}

/** The `x-widget` value no editor handles (for the developer warning), or null. */
export function unknownWidget(schema: JsonSchema): string | null {
  const widget = schema['x-widget']
  if (!widget) return null
  if (LOCALIZED_WIDGETS[widget] || WIDGET_KINDS[widget] || PLAIN_WIDGETS.has(widget)) return null
  return widget
}

/** Languages of a localized field, from its schema (`ru`, `kk`, `en` with their titles). */
export function localesOf(
  schema: JsonSchema,
): { code: string; title: string; required: boolean }[] {
  const required = new Set(schema.required ?? [])
  return Object.entries(schema.properties ?? {}).map(([code, prop]) => ({
    code,
    title: prop.title ?? code,
    required: required.has(code),
  }))
}

/**
 * Whether `path` (`steps.0.title.ru`) names a field of the form, so a server error can be
 * shown next to it. Array indexes must exist in `value`.
 */
export function hasPath(root: JsonSchema, value: unknown, path: string): boolean {
  let node: ResolvedNode = { schema: root, nullable: false }
  let current: unknown = value
  for (const part of path.split('.')) {
    const { schema } = node
    if (schema.type === 'array') {
      const index = Number(part)
      if (!Number.isInteger(index) || !Array.isArray(current) || index >= current.length) {
        return false
      }
      node = itemNode(schema, root)
      current = current[index]
    } else if (schema.properties && part in schema.properties) {
      node = resolveNode(schema.properties[part] as JsonSchema, root)
      current = (current as Record<string, unknown> | null | undefined)?.[part]
    } else {
      return false
    }
  }
  return true
}
