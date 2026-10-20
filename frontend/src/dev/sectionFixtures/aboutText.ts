import { fid, media, registerFixture, text } from './index'

type Layout = 'text_only' | 'media_left' | 'media_right'
const LAYOUTS: Layout[] = ['text_only', 'media_left', 'media_right']

// Bench only: ?layout=text_only|media_left|media_right (default media_right).
const layout = (): Layout =>
  LAYOUTS.find((l) => l === new URLSearchParams(window.location.search).get('layout')) ??
  'media_right'

const paragraph =
  'Абзац основного текста — плейсхолдер. Длина строки держится в пределах 60–70 знаков.'

/** Markdown body; n sets how much of it there is (0 = empty body, 12 = every element). */
const body = (n: number, long: boolean) => {
  if (n === 0) return ''
  const lead = text('Первый абзац — вводный, крупнее. Плейсхолдер.', long)
  if (n === 1) return lead
  const parts = [lead, paragraph, '## Подзаголовок', `${paragraph} [Ссылка в тексте](#).`]
  if (n >= 3)
    parts.push('- Пункт списка один', '- Пункт списка два, **с выделением**', '- Пункт три')
  if (n >= 12)
    parts.push(
      '### Малый подзаголовок',
      '1. Первый',
      '2. Второй',
      '> Цитата — плейсхолдер.',
      paragraph,
    )
  return parts.join('\n\n')
}

registerFixture('about_text', (o) => ({
  id: fid(),
  anchor: null,
  type: 'about_text',
  tone: o.tone,
  data: {
    eyebrow: 'О компании',
    title: text('Девелопер и производитель материалов', o.long),
    body: body(o.n, o.long),
    media: media(o),
    layout: layout(),
  },
}))
