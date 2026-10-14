/**
 * The subset of JSON Schema the backend emits for forms (`GET /admin/section-types`,
 * pydantic `model_json_schema()`), plus the admin hints (`x-widget`, `x-ref`…),
 * see docs/admin-api.md, "Схема контента для форм".
 */
export type JsonType = 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean' | 'null'

export interface RefHint {
  kind: string
  many: boolean
  /** Media fields: kinds of files that fit (`image`, `svg`, `video`, `document`). */
  accept?: string[]
}

export interface JsonSchema {
  type?: JsonType
  title?: string
  description?: string
  default?: unknown
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean | JsonSchema
  items?: JsonSchema
  anyOf?: JsonSchema[]
  $ref?: string
  $defs?: Record<string, JsonSchema>
  enum?: (string | number)[]
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  minItems?: number
  maxItems?: number
  'x-widget'?: string
  'x-ref'?: RefHint
  'x-options'?: string
  'x-enum-labels'?: Record<string, string>
}

/** Field kinds the form knows how to render; anything else falls back to `json`. */
export type FieldKind =
  | 'localized'
  | 'ref'
  | 'options'
  | 'icon'
  | 'link'
  | 'color'
  | 'tags'
  | 'combobox'
  | 'enum'
  | 'enum-list'
  | 'array'
  | 'object'
  | 'boolean'
  | 'number'
  | 'string'
  | 'json'

/** Localized editors: one line, several lines, Markdown. */
export type LocalizedVariant = 'text' | 'textarea' | 'markdown'

/** A schema node with `$ref` and `anyOf [X, null]` resolved and annotations kept. */
export interface ResolvedNode {
  schema: JsonSchema
  /** `null` is an allowed value (an optional field). */
  nullable: boolean
}
