import type { ComponentType } from 'react'
import type { FieldKind, ResolvedNode } from './types'

export interface WidgetProps {
  /** react-hook-form path of the value, e.g. `steps.0.title`. */
  name: string
  node: ResolvedNode
  /** Listed in the parent's `required`. */
  required: boolean
  label: string
  description?: string
}

/**
 * Editors by field kind. Widgets register themselves (widgets/index.ts), so adding one is:
 * map the hint to a kind in `resolve.ts`, write the component, call `registerWidget`.
 */
const widgets = new Map<FieldKind, ComponentType<WidgetProps>>()

export function registerWidget(kind: FieldKind, component: ComponentType<WidgetProps>) {
  widgets.set(kind, component)
}

export function widgetFor(kind: FieldKind): ComponentType<WidgetProps> | undefined {
  return widgets.get(kind)
}
