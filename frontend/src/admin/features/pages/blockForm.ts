import type { SectionRead } from '../../api/pages'
import type { JsonSchema } from '../../forms/schema/types'
import { emptyForm, type Values } from '../../forms/schema/values'

/**
 * One form for a block: its data (schema of the block type) plus the settings around it
 * (anchor, tone, visibility; the `section` entity schema). The shape equals the body of
 * POST/PATCH, so server error paths (`data.steps.0.title.ru`, `anchor`) match the fields.
 */
export function blockFormSchema(
  data: JsonSchema,
  envelope: JsonSchema,
  contentTitle: string,
): JsonSchema {
  const { $defs: dataDefs, ...dataRoot } = data
  return {
    type: 'object',
    properties: {
      // The root of a data schema is named after a Python class; it gets a readable title.
      data: { ...dataRoot, title: contentTitle, description: undefined },
      ...envelope.properties,
    },
    required: ['data', ...(envelope.required ?? [])],
    $defs: { ...dataDefs, ...envelope.$defs },
  }
}

export function blockValues(section: SectionRead): Values {
  return {
    data: section.data,
    anchor: section.anchor,
    tone: section.tone,
    is_visible: section.is_visible,
  }
}

export function newBlockValues(schema: JsonSchema): Values {
  return emptyForm(schema)
}
