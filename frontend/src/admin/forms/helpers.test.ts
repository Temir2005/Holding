import { describe, expect, it } from 'vitest'
import { buildHref, linkMode, linkTarget } from './link'
import { applyMarkdown } from './markdown'

describe('applyMarkdown', () => {
  it('wraps the selection in bold and keeps it selected', () => {
    const edit = applyMarkdown('bold', 'make this strong', 10, 16, 'текст')
    expect(edit.text).toBe('make this **strong**')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('strong')
  })

  it('inserts a selected placeholder when nothing is selected', () => {
    const edit = applyMarkdown('italic', 'ab', 1, 1, 'текст')
    expect(edit.text).toBe('a_текст_b')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('текст')
  })

  it('prefixes every selected line for lists and headings', () => {
    expect(applyMarkdown('list', 'one\ntwo\nthree', 1, 6, '').text).toBe('- one\n- two\nthree')
    expect(applyMarkdown('ordered', 'one\ntwo', 0, 7, '').text).toBe('1. one\n2. two')
    expect(applyMarkdown('heading', 'intro\ntitle', 8, 8, '').text).toBe('intro\n## title')
  })

  it('makes a link and selects its address', () => {
    const edit = applyMarkdown('link', 'see docs', 4, 8, 'ссылка')
    expect(edit.text).toBe('see [docs](https://)')
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://')
  })
})

describe('link targets', () => {
  it.each([
    ['about', 'page', 'about'],
    ['projects/alatau', 'project', 'alatau'],
    ['#contacts', 'anchor', 'contacts'],
    ['https://megasmart.kz', 'external', 'https://megasmart.kz'],
    ['mailto:a@b.kz', 'external', 'mailto:a@b.kz'],
    ['tel:+77000000000', 'external', 'tel:+77000000000'],
  ] as const)('%s is a %s link', (href, mode, target) => {
    expect(linkMode(href)).toBe(mode)
    expect(linkTarget(href, mode)).toBe(target)
    expect(buildHref(mode, target)).toBe(href)
  })

  it('builds nothing from an empty target', () => {
    expect(buildHref('anchor', '')).toBe('')
  })
})
