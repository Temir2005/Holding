import type { Client, Media } from '@/api/types'
import { type FixtureOptions, fid, many, media, registerFixture, text } from './index'

// Placeholder wordmarks in colours a real logo set has, dark ones included.
const COLORS = ['#8A6A4F', '#C77B4E', '#3B3F42', '#2F5D50', '#1D3557', '#7A1F1F']

const logo = (i: number) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64">` +
      `<rect x="8" y="14" width="36" height="36" fill="${COLORS[i % COLORS.length]}"/>` +
      `<text x="58" y="41" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${COLORS[i % COLORS.length]}">LOGO ${String(i).padStart(2, '0')}</text></svg>`,
  )

/** Placeholder industries (keys and labels), not facts about anyone. */
const INDUSTRIES = [
  ['industry-a', 'Отрасль А'],
  ['industry-b', 'Отрасль Б'],
  ['industry-c', 'Отрасль В'],
  ['industry-d', 'Отрасль Г'],
] as const

export const fixtureLogo = (o: FixtureOptions, i: number): Media | null =>
  media(o, {
    url: logo(i),
    width: 280,
    height: 64,
    alt: `Логотип: компания ${i}`,
    mime_type: 'image/svg+xml',
  })

/** A placeholder client; every fourth has no description, every third a website. */
export const fixtureClient = (o: FixtureOptions, i: number): Client => {
  const [industry, label] = INDUSTRIES[(i * 7) % INDUSTRIES.length] ?? INDUSTRIES[0]
  return {
    id: fid(),
    name: text(`Компания ${i} (плейсхолдер)`, o.long && i % 2 === 1),
    logo: i % 5 === 0 ? null : fixtureLogo(o, i),
    industry,
    industry_label: text(label, o.long && i % 3 === 0),
    description:
      i % 4 === 0
        ? ''
        : text(
            'Описание клиента — плейсхолдер: чем занимается компания и что мы для неё делаем.',
            o.long,
          ),
    testimonial: null,
    website_url: i % 3 === 0 ? 'https://example.com' : null,
  }
}

// The bench caps n at 12; `&count=30` stretches the legend further (dev only).
const count = (o: FixtureOptions) => {
  const extra = Number(new URLSearchParams(window.location.search).get('count'))
  return Number.isFinite(extra) && extra > 0 ? Math.min(extra, 60) : o.n
}

registerFixture('clients_grid', (o) => ({
  id: fid(),
  anchor: null,
  type: 'clients_grid',
  tone: o.tone,
  data: {
    eyebrow: 'Клиенты',
    title: text('Кто с нами работает', o.long),
    show_industry_filter: true,
    clients: many(count(o), (i) => fixtureClient(o, i)),
  },
}))
