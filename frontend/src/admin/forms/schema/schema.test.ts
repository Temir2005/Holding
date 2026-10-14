import { describe, expect, it } from 'vitest'
import { allSectionTypes, entitySchema, schemaOf } from '../../test/renderForm'
import { findLocales } from './context'
import { fieldKind, hasPath, itemNode, resolveNode } from './resolve'
import type { FieldKind, JsonSchema, ResolvedNode } from './types'
import { validate } from './validate'
import { emptyForm, formToStored, previewText } from './values'

const prop = (schema: JsonSchema, name: string): ResolvedNode =>
  resolveNode(schema.properties?.[name] as JsonSchema, schema)

const kindOf = (schema: JsonSchema, name: string): FieldKind =>
  fieldKind(prop(schema, name), schema)

describe('schema resolution on the real section types', () => {
  it('finds an editor for every field of every block type (no JSON fallback)', () => {
    const fallbacks: string[] = []
    const walk = (node: ResolvedNode, root: JsonSchema, path: string) => {
      const kind = fieldKind(node, root)
      if (kind === 'json') fallbacks.push(path)
      if (kind === 'object') {
        for (const [key, child] of Object.entries(node.schema.properties ?? {})) {
          walk(resolveNode(child, root), root, `${path}.${key}`)
        }
      }
      if (kind === 'array') walk(itemNode(node.schema, root), root, `${path}[]`)
    }
    for (const { type, schema } of allSectionTypes) {
      walk({ schema, nullable: false }, schema, type)
    }
    expect(allSectionTypes).toHaveLength(22)
    expect(fallbacks).toEqual([])
  })

  it('keeps the field title and hints when the type is a $ref or nullable', () => {
    const hero = schemaOf('hero')
    const eyebrow = prop(hero, 'eyebrow')
    expect(eyebrow.nullable).toBe(true)
    expect(eyebrow.schema.title).toBe('Надзаголовок')
    expect(eyebrow.schema['x-widget']).toBe('localized-text')
    expect(eyebrow.schema.properties?.ru).toBeDefined()
    // Not the LocalizedText docstring.
    expect(eyebrow.schema.description).toBeUndefined()
    expect(prop(schemaOf('stats'), 'context').schema.description).toContain('home')
  })

  it('maps hints to editors', () => {
    expect(kindOf(schemaOf('hero'), 'title')).toBe('localized')
    expect(kindOf(schemaOf('about_text'), 'body')).toBe('localized')
    expect(kindOf(schemaOf('about_text'), 'layout')).toBe('enum')
    expect(kindOf(schemaOf('hero'), 'background_media_id')).toBe('ref')
    expect(kindOf(schemaOf('stats'), 'stat_ids')).toBe('ref')
    expect(kindOf(schemaOf('stats'), 'context')).toBe('options')
    expect(kindOf(schemaOf('hero'), 'ctas')).toBe('array')
    expect(kindOf(schemaOf('contact_form'), 'lead_types')).toBe('enum-list')
    expect(kindOf(schemaOf('contact_form'), 'default_type')).toBe('enum')
    expect(kindOf(schemaOf('projects_showcase'), 'link')).toBe('object')
    expect(kindOf(schemaOf('projects_showcase'), 'featured')).toBe('boolean')
    expect(kindOf(schemaOf('capabilities'), 'columns')).toBe('enum')
    expect(kindOf(schemaOf('video'), 'embed_url')).toBe('string')
  })

  it('maps entity form hints (tags, combobox) and media accept', () => {
    const media = entitySchema('media')
    expect(kindOf(media, 'tags')).toBe('tags')
    expect(kindOf(media, 'folder')).toBe('combobox')
    expect(kindOf(media, 'alt')).toBe('localized')
    expect(prop(schemaOf('video'), 'video_media_id').schema['x-ref']?.accept).toEqual(['video'])
  })

  it('lets list items inherit the list widget (a list of texts)', () => {
    const schema = schemaOf('tokenization_explainer')
    const item = itemNode(prop(schema, 'benefits').schema, schema)
    expect(fieldKind(item, schema)).toBe('localized')
  })

  it('maps unknown widgets to the JSON fallback', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { x: { type: 'string', 'x-widget': 'something-new' } },
    }
    expect(kindOf(schema, 'x')).toBe('json')
  })

  it('reads the languages from the schema', () => {
    expect(findLocales(schemaOf('hero'))).toEqual([
      { code: 'ru', title: 'Русский', required: true },
      { code: 'kk', title: 'Қазақша', required: false },
      { code: 'en', title: 'English', required: false },
    ])
  })

  it('tells which server paths exist in the form', () => {
    const schema = schemaOf('process_steps')
    const values = { steps: [{ title: { ru: 'a' }, text: { ru: 'b' } }] }
    expect(hasPath(schema, values, 'steps.0.title.ru')).toBe(true)
    expect(hasPath(schema, values, 'steps.0.title')).toBe(true)
    expect(hasPath(schema, values, 'steps.1.title')).toBe(false)
    expect(hasPath(schema, values, 'nope')).toBe(false)
  })
})

describe('values', () => {
  it('builds an empty block with defaults and required texts', () => {
    const values = emptyForm(schemaOf('contact_form'))
    expect(values.consent_text).toEqual({ ru: '' })
    expect(values.title).toBeNull()
    expect(values.lead_types).toEqual(expect.any(Array))
    expect(values.default_type).toBe('partner')
  })

  it('stores optional texts with no language as null and drops empty languages', () => {
    const schema = schemaOf('hero')
    const stored = formToStored(schema, {
      ...emptyForm(schema),
      eyebrow: { ru: '', kk: '', en: '' },
      title: { ru: 'Строим', kk: '', en: 'We build' },
    })
    expect(stored.eyebrow).toBeNull()
    expect(stored.title).toEqual({ ru: 'Строим', en: 'We build' })
  })

  it('names a list item by its first text', () => {
    const schema = schemaOf('hero')
    const item = itemNode(prop(schema, 'ctas').schema, schema)
    expect(previewText(item, { label: { ru: 'Связаться' }, href: '#c' }, schema)).toBe('Связаться')
  })
})

describe('validate', () => {
  it('requires Russian in required texts and in list items', () => {
    const schema = schemaOf('process_steps')
    const issues = validate(schema, {
      ...emptyForm(schema),
      steps: [{ title: { ru: '' }, text: { ru: 'ok' }, media_id: null, division_id: null }],
    })
    expect(issues).toEqual([{ path: 'steps.0.title.ru', code: 'requiredRu' }])
  })

  it('accepts an empty optional text but not a translation without Russian', () => {
    const schema = schemaOf('hero')
    expect(validate(schema, { ...emptyForm(schema), eyebrow: { ru: '', en: '' } })).toEqual([])
    expect(validate(schema, { ...emptyForm(schema), eyebrow: { ru: '', en: 'Hi' } })).toEqual([
      { path: 'eyebrow.ru', code: 'requiredRu' },
    ])
  })

  it('checks patterns, lengths and enums', () => {
    const hero = schemaOf('hero')
    const swatch = { code: 'RAL 7016', label: { ru: 'Антрацит' }, color: 'red', finish: 'matte' }
    expect(validate(hero, { ...emptyForm(hero), swatches: [swatch] })).toEqual([
      { path: 'swatches.0.color', code: 'pattern' },
    ])

    const geo = schemaOf('geography')
    const country = { code: 'KAZ', name: { ru: 'Казахстан' }, note: null }
    expect(validate(geo, { ...emptyForm(geo), countries: [country] })).toEqual([
      { path: 'countries.0.code', code: 'maxLength', params: { max: 2 } },
    ])

    const about = schemaOf('about_text')
    expect(validate(about, { ...emptyForm(about), body: { ru: 'x' }, layout: 'sideways' })).toEqual(
      [{ path: 'layout', code: 'enum' }],
    )
  })

  it('flags empty required strings', () => {
    const hero = schemaOf('hero')
    const cta = { label: { ru: 'Кнопка' }, href: '', variant: 'primary' }
    expect(validate(hero, { ...emptyForm(hero), ctas: [cta] })).toEqual([
      { path: 'ctas.0.href', code: 'required' },
    ])
  })
})
