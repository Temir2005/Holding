import { useSchemaFormContext } from './context'
import { widgetFor, type WidgetProps } from './registry'
import { fieldKind, unknownWidget } from './resolve'
import type { ResolvedNode } from './types'

const warned = new Set<string>()

/** Renders the editor that fits a schema node. */
export function FieldRenderer({
  name,
  node,
  required,
  fallbackLabel,
}: {
  name: string
  node: ResolvedNode
  required: boolean
  fallbackLabel: string
}) {
  const { root } = useSchemaFormContext()
  const kind = fieldKind(node, root)
  const Widget = widgetFor(kind) ?? widgetFor('json')

  if (import.meta.env.DEV && kind === 'json') {
    const widget = unknownWidget(node.schema) ?? node.schema.type ?? 'unknown'
    const key = `${name}:${widget}`
    if (!warned.has(key)) {
      warned.add(key)
      console.warn(
        `[SchemaForm] No editor for "${name}" (${widget}); showing a JSON field. ` +
          'Add a widget or a hint on the backend.',
      )
    }
  }
  if (!Widget) return null

  const props: WidgetProps = {
    name,
    node,
    required,
    label: node.schema.title ?? fallbackLabel,
    description: node.schema.description,
  }
  return <Widget {...props} />
}
