import { fid, many, media, registerFixture, text } from './index'

const ICONS = ['factory', 'ruler', 'shield', 'clock', 'map', 'key', 'layers', 'palette']

registerFixture('capabilities', (o) => ({
  id: fid(),
  anchor: null,
  type: 'capabilities',
  tone: o.tone,
  data: {
    eyebrow: text('Преимущества', o.long),
    title: text('Заголовок преимуществ в две строки', o.long),
    intro: null,
    items: many(o.n, (i) => ({
      icon: ICONS[(i - 1) % ICONS.length] ?? 'square',
      title: text(`Пункт ${i}: название`, o.long),
      text: text('Описание пункта — плейсхолдер: одна фраза.', o.long),
      // ?media=1 (default): every item has a frame, so the block becomes a grid of frames.
      media: media(o),
    })),
    // 12 items check the widest table (4 columns), the rest the usual 3.
    columns: o.n === 12 ? 4 : 3,
  },
}))
