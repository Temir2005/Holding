import { joinPath, useSchemaFormContext } from './context'
import { FieldRenderer } from './Field'
import { resolveNode } from './resolve'
import type { JsonSchema } from './types'

/** Fields of an object node, in schema order. */
export function ObjectFields({ schema, prefix }: { schema: JsonSchema; prefix: string }) {
  const { root } = useSchemaFormContext()
  const required = new Set(schema.required ?? [])
  return (
    <>
      {Object.entries(schema.properties ?? {}).map(([key, prop]) => (
        <FieldRenderer
          key={key}
          name={joinPath(prefix, key)}
          node={resolveNode(prop, root)}
          required={required.has(key)}
          fallbackLabel={key}
        />
      ))}
    </>
  )
}
