import { describe, expect, it } from 'vitest'
import type { Media } from '@/api/types'
import { focalPosition } from './image'

const media = (focal_point: Media['focal_point']): Media => ({
  id: '00000000-0000-0000-0000-000000000001',
  url: '/x.jpg',
  width: 1600,
  height: 1000,
  alt: '',
  mime_type: 'image/jpeg',
  placeholder: {},
  variants: [],
  focal_point,
})

describe('focalPosition', () => {
  it('centres the crop when the editor set no focal point', () => {
    expect(focalPosition(media(null))).toBe('50% 50%')
    expect(focalPosition(media(undefined))).toBe('50% 50%')
  })

  it('turns the 0–1 point into object-position percentages', () => {
    expect(focalPosition(media({ x: 0.25, y: 0.755 }))).toBe('25% 75.5%')
    expect(focalPosition(media({ x: 0, y: 1 }))).toBe('0% 100%')
  })
})
