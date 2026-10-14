import { describe, expect, it } from 'vitest'
import { blockTitle, canPublish, pageStatus, type PageDetail } from '../../api/pages'
import { fieldKind, itemNode, resolveNode } from '../../forms/schema/resolve'
import type { JsonSchema, ResolvedNode } from '../../forms/schema/types'
import { emptyForm } from '../../forms/schema/values'
import { allSectionTypes, entitySchema } from '../../test/renderForm'
import { blockFormSchema } from './blockForm'
import { groupProblems } from './publishProblems'
import { pageDetail, section } from './testData'

describe('block form schema', () => {
  it('combines every block type with the block settings without JSON fallbacks', () => {
    const envelope = entitySchema('section')
    for (const { type, schema } of allSectionTypes) {
      const root = blockFormSchema(schema, envelope, 'Содержимое')
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
      walk({ schema: root, nullable: false }, type)
      expect(fallbacks, type).toEqual([])
    }
  })

  it('names the data group and starts a new block with defaults', () => {
    const hero = allSectionTypes.find((s) => s.type === 'hero')?.schema as JsonSchema
    const root = blockFormSchema(hero, entitySchema('section'), 'Содержимое')
    expect(root.properties?.data?.title).toBe('Содержимое')
    const values = emptyForm(root)
    expect(values).toMatchObject({ anchor: null, tone: 'dark', is_visible: true })
    expect(values.data).toMatchObject({ ctas: [], swatches: [] })
  })
})

describe('publish problems', () => {
  it('groups errors by block and by page settings, with paths for their forms', () => {
    const a = section({ id: 'a' })
    const b = section({ id: 'b' })
    const page = pageDetail({ sections: [a, b] })
    const groups = groupProblems(page, [
      { loc: ['sections', 1, 'data', 'title', 'ru'], msg: 'Заполните', section_id: 'b' },
      { loc: ['sections', 1, 'data', 'ctas', 0, 'href'], msg: 'Нет страницы', section_id: 'b' },
      { loc: ['page', 'og_image_id'], msg: 'Файл не найден' },
    ])
    expect(groups).toEqual([
      {
        section: b,
        issues: [
          { loc: ['data', 'title', 'ru'], msg: 'Заполните', section_id: 'b' },
          { loc: ['data', 'ctas', 0, 'href'], msg: 'Нет страницы', section_id: 'b' },
        ],
      },
      { section: null, issues: [{ loc: ['og_image_id'], msg: 'Файл не найден' }] },
    ])
  })
})

describe('page status', () => {
  const base = pageDetail()
  it.each([
    [{ is_published: true, has_unpublished_changes: false }, 'live', false],
    [{ is_published: true, has_unpublished_changes: true }, 'changed', true],
    [{ is_published: false, published_revision_number: 3 }, 'down', true],
    [{ is_published: false, published_revision_number: null }, 'never', true],
  ] as const)('%o is %s', (patch, status, publishable) => {
    const page: PageDetail = { ...base, ...patch }
    expect(pageStatus(page)).toBe(status)
    expect(canPublish(page)).toBe(publishable)
  })

  it('names a block by its Russian title without Markdown marks', () => {
    expect(blockTitle({ title: { ru: '**Строим** города' } })).toBe('Строим города')
    expect(blockTitle({ body: { ru: '## О нас' } })).toBe('О нас')
    expect(blockTitle({ ctas: [] })).toBe('')
  })
})
