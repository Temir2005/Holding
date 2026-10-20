import { fid, many, media, registerFixture, text } from './index'

const STATS = [
  [{ value: 12, suffix: '', label: 'объектов в работе' }],
  [
    { value: 30000, suffix: 'м²', label: 'производственных мощностей' },
    { value: 30, suffix: '+', label: 'дилеров' },
  ],
  [],
]

registerFixture('divisions_grid', (o) => ({
  id: fid(),
  anchor: null,
  type: 'divisions_grid',
  tone: o.tone,
  data: {
    eyebrow: text('Направления', o.long),
    title: text('Заголовок направлений в две строки', o.long),
    divisions: many(o.n, (i) => ({
      id: fid(),
      slug: `division-${i}`,
      name: text(`Направление ${i}`, o.long),
      tagline: text('Короткое описание направления — плейсхолдер.', o.long),
      description: '',
      logo: null,
      cover: media(o),
      stats: (STATS[(i - 1) % STATS.length] ?? []).map((s) => ({
        ...s,
        label: text(s.label, o.long),
      })),
      website_url: i % 3 === 2 ? 'https://example.com' : null,
      page_slug: i % 3 === 0 ? null : `division-${i}`,
    })),
  },
}))
