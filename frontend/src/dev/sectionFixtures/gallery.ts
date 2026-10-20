import { fid, many, media, registerFixture, text } from './index'

// Bench only: ?layout=strip switches the layout the editor can pick.
const layout = () =>
  new URLSearchParams(window.location.search).get('layout') === 'strip' ? 'strip' : 'grid'

// Frames of different proportions: landscape, portrait, wide, square.
const SIZES = [
  [1600, 1000],
  [1000, 1250],
  [1600, 900],
  [1200, 1200],
  [1500, 1000],
] as const

registerFixture('media_gallery', (o) => ({
  id: fid(),
  anchor: null,
  type: 'media_gallery',
  tone: o.tone,
  data: {
    eyebrow: 'Офис и производство',
    title: o.long ? text('Фотографии', o.long) : null,
    layout: layout(),
    items: many(o.n, (i) => {
      const [width, height] = SIZES[(i - 1) % SIZES.length] ?? [1600, 1000]
      return media(o, { width, height, alt: text(`Подпись кадра ${i}`, o.long && i === 2) })
    }).flatMap((m) => (m ? [m] : [])),
  },
}))
