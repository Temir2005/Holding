import type { Client } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

// Placeholder wordmarks in colours a real logo set has, dark ones included (they vanish on a
// dark sheet unless the block handles it).
const COLORS = ['#8A6A4F', '#C77B4E', '#3B3F42', '#2F5D50', '#1D3557', '#7A1F1F']

const logo = (i: number) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64">` +
      `<rect x="8" y="14" width="36" height="36" fill="${COLORS[i % COLORS.length]}"/>` +
      `<text x="58" y="41" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${COLORS[i % COLORS.length]}">LOGO ${String(i).padStart(2, '0')}</text></svg>`,
  )

registerFixture('clients_marquee', (o) => ({
  id: fid(),
  anchor: null,
  type: 'clients_marquee',
  tone: o.tone,
  data: {
    eyebrow: 'Нам доверяют',
    title: text('Клиенты и партнёры', o.long),
    clients: many(o.n, (i): Client => ({
      id: fid(),
      name: text(`Компания ${i} (плейсхолдер)`, o.long && i % 2 === 1),
      logo: media(o, {
        url: logo(i),
        width: 280,
        height: 64,
        alt: `Логотип: компания ${i}`,
        mime_type: 'image/svg+xml',
      }),
      industry: '',
      industry_label: '',
      description: '',
      testimonial: null,
      website_url: i % 3 === 0 ? 'https://example.com' : null,
    })),
  },
}))
