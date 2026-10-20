import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

const NBSP = ' '

describe('formatNumber', () => {
  it('groups thousands with a no-break space in every locale, kk included', () => {
    for (const locale of ['ru', 'kk', 'en'] as const) {
      expect(formatNumber(30000, locale)).toBe(`30${NBSP}000`)
      expect(formatNumber(1250000, locale)).toBe(`1${NBSP}250${NBSP}000`)
    }
    expect(formatNumber(20, 'kk')).toBe('20')
  })

  it('keeps one decimal with the locale separator', () => {
    expect(formatNumber(2.5, 'ru')).toBe('2,5')
    expect(formatNumber(2.5, 'kk')).toBe('2,5')
    expect(formatNumber(2.5, 'en')).toBe('2.5')
    expect(formatNumber(18500.04, 'ru')).toBe(`18${NBSP}500`)
  })

  it('uses a real minus sign', () => {
    expect(formatNumber(-1200, 'ru')).toBe(`−1${NBSP}200`)
  })
})
