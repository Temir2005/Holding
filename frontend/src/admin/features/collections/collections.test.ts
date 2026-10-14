import { describe, expect, it } from 'vitest'
import { fieldKind, itemNode, resolveNode } from '../../forms/schema/resolve'
import type { ResolvedNode } from '../../forms/schema/types'
import { usageHref } from '../../forms/usage'
import { COLLECTIONS } from '../../layout/nav'
import { entitySchema } from '../../test/renderForm'
import { COLLECTION_CONFIGS } from './config'
import { itemValues, separateIssues, splitValues } from './itemForm'
import { project } from './testData'

describe('collection declarations', () => {
  it('cover every collection of the menu, each with a form from the backend', () => {
    expect(Object.keys(COLLECTION_CONFIGS).sort()).toEqual(COLLECTIONS.map((c) => c.slug).sort())
    for (const config of Object.values(COLLECTION_CONFIGS)) {
      const root = entitySchema(config.entity)
      const fallbacks: string[] = []
      const walk = (node: ResolvedNode, path: string) => {
        const kind = fieldKind(node, root)
        if (kind === 'json') fallbacks.push(path)
        if (kind === 'object') {
          for (const [key, child] of Object.entries(node.schema.properties ?? {})) {
            walk(resolveNode(child, root), `${path}.${key}`)
          }
        }
        if (kind === 'array') walk(itemNode(node.schema, root), `${path}[]`)
      }
      walk({ schema: root, nullable: false }, config.entity)
      expect(fallbacks, config.slug).toEqual([])
      if (config.separate) expect(root.properties).toHaveProperty(config.separate.field)
    }
  })
})

describe('project form values', () => {
  const config = COLLECTION_CONFIGS.projects
  const schema = entitySchema('project')

  it('take the form fields from the record, with the gallery as ids', () => {
    const values = itemValues(config, schema, project())
    expect(Object.keys(values).sort()).toEqual(Object.keys(schema.properties ?? {}).sort())
    expect(values).toMatchObject({
      title: { ru: 'Alatau City' },
      gallery: ['m1', 'm2'],
      division_id: 'd1',
      // Stored as {} when empty: an optional text shows as not set.
      location: null,
      short_description: { ru: 'Жилой квартал' },
    })
    expect(values).not.toHaveProperty('division')
  })

  it('save the gallery by its own request and show its errors on the field', () => {
    const { own, separate } = splitValues(config, { title: { ru: 'x' }, gallery: ['m2'] })
    expect(own).toEqual({ title: { ru: 'x' } })
    expect(separate).toEqual(['m2'])
    expect(
      separateIssues(config, [
        { loc: ['body', 'media_ids', 1], msg: 'сюда подходит: фото; выбран файл: видео' },
      ]),
    ).toEqual([
      { loc: ['body', 'gallery'], msg: 'Файл № 2: сюда подходит: фото; выбран файл: видео' },
    ])
  })
})

describe('where a usage opens', () => {
  const usage = { field: 'data', label: 'Страница «home», блок «Проекты»' }
  it.each([
    [{ entity_type: 'project', entity_id: 'pr1' }, '/admin/collections/projects/pr1'],
    [{ entity_type: 'section', entity_id: 's1', page_id: 'p1' }, '/admin/pages/p1?block=s1'],
    [{ entity_type: 'page_revision', entity_id: 'r1', page_id: 'p1' }, '/admin/pages/p1'],
    [{ entity_type: 'section', entity_id: 's1' }, null],
  ])('%o → %s', (place, href) => {
    expect(usageHref({ ...usage, ...place })).toBe(href)
  })
})
