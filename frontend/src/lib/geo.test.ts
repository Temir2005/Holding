import { describe, expect, it } from 'vitest'
import { distanceKm, projector } from './geo'

describe('map projection', () => {
  const b = { west: 76.58, east: 77.52, south: 43.05, north: 43.97 }

  it('puts the corners of the map at the corners of the viewBox', () => {
    const p = projector(b)
    expect(p.at(b.north, b.west)).toEqual([0, 0])
    const [x, y] = p.at(b.south, b.east)
    expect(x).toBeCloseTo(p.width)
    expect(y).toBeCloseTo(p.height)
  })

  it('keeps the aspect of the map image (2000 × 2699 for this region)', () => {
    const p = projector(b)
    expect(p.width / p.height).toBeCloseTo(2000 / 2699, 2)
  })
})

describe('distanceKm', () => {
  it('Golden District to the Financial Center is about 50 km', () => {
    expect(distanceKm([43.676667, 77.109167], [43.23889, 76.94532])).toBeCloseTo(50.4, 0)
  })
})
