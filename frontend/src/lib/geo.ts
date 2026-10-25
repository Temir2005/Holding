/** Web Mercator, the projection of the map images in the CMS (edges stored as `bounds`). */
export type Bounds = { west: number; east: number; south: number; north: number }

const mx = (lon: number) => (lon + 180) / 360
const my = (lat: number) => {
  const r = (lat * Math.PI) / 180
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2
}

/** Width / height of a map with these edges. */
export function aspectOf(b: Bounds) {
  return (mx(b.east) - mx(b.west)) / (my(b.south) - my(b.north))
}

/** A point in a viewBox of `width` × `width / aspect` that covers the map image exactly. */
export function projector(b: Bounds, width = 1000) {
  const sx = width / (mx(b.east) - mx(b.west))
  return {
    width,
    height: width / aspectOf(b),
    at: (lat: number, lon: number) =>
      [(mx(lon) - mx(b.west)) * sx, (my(lat) - my(b.north)) * sx] as const,
  }
}

/** Great-circle distance in km. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLon = (b[1] - a[1]) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
