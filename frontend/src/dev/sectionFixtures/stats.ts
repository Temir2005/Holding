import { fid, many, registerFixture, text } from './index'

const VALUES = [20, 30000, 30, 6, 12, 100, 5, 2, 18500, 9200, 24000, 7]
const SUFFIX = ['+', 'м²', '+', '', '', '%', '', ' дня', 'м²', 'м²', 'м²', '']

registerFixture('stats', (o) => ({
  id: fid(),
  anchor: null,
  type: 'stats',
  tone: o.tone,
  data: {
    eyebrow: null,
    title: null,
    layout: 'chain',
    stats: many(o.n, (i) => ({
      id: fid(),
      value: VALUES[i - 1] ?? i,
      prefix: null,
      suffix: SUFFIX[i - 1] ?? '',
      label: text('подпись цифры', o.long),
    })),
  },
}))
