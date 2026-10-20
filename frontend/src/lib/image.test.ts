import { describe, expect, it } from 'vitest'
import type { Media } from '@/api/types'
import { pinnedHeight } from '@/components/motion/usePinnedSteps'
import { straight } from '@/components/trace/paths'
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

describe('pinned scene height', () => {
  it('gives every step 65svh of scroll on top of the sticky screen', () => {
    expect(pinnedHeight(5)).toBe('calc(100svh + 5 * 65svh)')
    expect(pinnedHeight(0)).toBe('calc(100svh + 0 * 65svh)')
  })
})

describe('line contract', () => {
  it('the default segment enters at the top and leaves at the bottom in the margin', () => {
    expect(straight({ x: 20.5, w: 1440, h: 800 })).toBe('M 20.5 0 V 800')
  })
})
