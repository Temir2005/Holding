import { describe, expect, it } from 'vitest'
import type { NavItem } from '@/api/types'
import { sheetOf, slugOfPath } from './sheets'

const nav = (...slugs: (string | null)[]): NavItem[] =>
  slugs.map((page_slug, i) => ({
    label: `item ${i}`,
    page_slug,
    anchor: page_slug ? null : 'contacts',
    url: null,
  }))

describe('sheet register', () => {
  const register = nav('home', 'development', 'smart-panels', 'projects', 'team', 'clients', null)

  it('counts every navigation item, anchors included', () => {
    expect(sheetOf(register, '/ru').total).toBe(7)
  })

  it('numbers the current page by its place in the navigation', () => {
    expect(sheetOf(register, '/ru').number).toBe(1)
    expect(sheetOf(register, '/kk/team').number).toBe(5)
    expect(sheetOf(register, '/en/projects/zhk-proekt-a').number).toBe(4)
  })

  it('has no sheet number for pages outside the register', () => {
    expect(sheetOf(register, '/ru/no-such-page').number).toBeNull()
    expect(sheetOf([], '/ru')).toEqual({ number: null, total: 0 })
  })

  it('reads the slug from a localized path', () => {
    expect(slugOfPath('/ru')).toBe('home')
    expect(slugOfPath('/ru/')).toBe('home')
    expect(slugOfPath('/ru/smart-panels')).toBe('smart-panels')
  })
})
