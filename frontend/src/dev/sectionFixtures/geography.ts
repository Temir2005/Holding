import { fid, many, registerFixture, text } from './index'

// Placeholder codes and names (not a claim about real deliveries): two letters, as ISO codes are.
const code = (i: number) =>
  String.fromCharCode(64 + ((i * 5) % 26 || 26), 64 + ((i * 11) % 26 || 26))

registerFixture('geography', (o) => ({
  id: fid(),
  anchor: null,
  type: 'geography',
  tone: o.tone,
  data: {
    eyebrow: 'География',
    title: text('Поставляем в несколько стран', o.long),
    intro: text(
      'Вводный текст блока — плейсхолдер: где работают партнёры и как идут поставки.',
      o.long,
    ),
    countries: many(o.n, (i) => ({
      code: code(i),
      name: text(`Страна ${i}`, o.long && i % 2 === 1),
      note: i % 3 === 1 ? text('Примечание — плейсхолдер', o.long) : null,
    })),
  },
}))
