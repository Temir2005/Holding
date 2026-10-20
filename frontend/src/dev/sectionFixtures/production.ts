import type { Media } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

// Value strings as the CMS stores them: figure + unit, a bare figure, a symbol, plain words.
const FACTS = ['30 000 м²', '50 листов', '2 дня', '12', '30+', 'по запросу']
const FINISHES = ['matte', 'gloss', 'texture'] as const
const COLORS = ['#3B3F42', '#C77B4E', '#D9D0C1', '#F1EEE8', '#56624F', '#2A2B2D']

registerFixture('production', (o) => ({
  id: fid(),
  anchor: null,
  type: 'production',
  tone: o.tone,
  data: {
    eyebrow: text('Производство', o.long),
    title: text('Заголовок производства в две строки', o.long),
    body: text(
      'Вводный абзац о производстве — плейсхолдер: технология, контроль качества, минимальный заказ.',
      o.long,
    ),
    facts: many(Math.min(o.n, 6), (i) => ({
      value: FACTS[(i - 1) % FACTS.length] ?? '1',
      label: text(`Подпись факта ${i}`, o.long),
    })),
    gallery: many(o.n, () => media(o)).filter((m): m is Media => m !== null),
    swatches: many(o.n, (i) => ({
      code: `RAL ${String(7000 + i * 3)}`,
      label: text(`Образец ${i}`, o.long),
      color: COLORS[(i - 1) % COLORS.length] ?? '#888888',
      finish: FINISHES[(i - 1) % FINISHES.length] ?? 'matte',
    })),
  },
}))
