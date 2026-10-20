/*
 * Fixtures of the dev-only design page (/dev/design). Never imported by production code:
 * the route exists only when import.meta.env.DEV. Neutral placeholders, not site content.
 */
import type { Media, Tone } from '@/api/types'

export const TONES: Tone[] = ['light', 'dark', 'accent']

export const SAMPLE = {
  ru: 'Заголовок раздела в две строки',
  kk: 'Құрылыс материалдарының өндірісі',
  en: 'Section heading in two lines',
  lead: 'Вводный абзац блока: одна-две фразы о том, что в нём показано.',
  body: 'Основной текст. Абзац обычного кегля, интерлиньяж 1.5, длина строки ограничена, чтобы глаз не терялся.',
  kkLong: 'Әлеуметтік-экономикалық жауапкершілік · Ғимарат · Қала · Өндіріс · Ұжым · Үй · Шаһар',
  caption: 'RAL 7016 · подпись · 01 / 05',
} as const

export const LABELS = {
  tokens: 'Токены',
  type: 'Типографика',
  components: 'Компоненты',
  trace: 'Линия: контракт входа и выхода',
  shuffle: 'Перемешать секции',
  pinned: 'Закреплённая сцена',
  steps: 'Этапов',
  step: 'Этап',
  primary: 'Основная',
  secondary: 'Вторичная',
  more: 'Все проекты',
  tag: 'Токенизирован',
  count: 'Счётчик',
  frame: 'Кадр с метками обреза',
  noMedia: 'Без фото: плашка тона',
  dimension: 'S = 18 500 м²',
} as const

/** A drawn placeholder image (inline SVG), shaped like a CMS Media object. */
export const SAMPLE_MEDIA: Media = {
  id: '00000000-0000-0000-0000-000000000001',
  url:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">' +
        '<rect width="1600" height="1000" fill="#3a3a36"/>' +
        '<rect x="420" y="220" width="760" height="640" fill="#55554f"/>' +
        '<g fill="#8a8a82">' +
        Array.from(
          { length: 24 },
          (_, i) =>
            `<rect x="${470 + (i % 6) * 115}" y="${270 + Math.floor(i / 6) * 140}" width="70" height="90"/>`,
        ).join('') +
        '</g><rect y="860" width="1600" height="140" fill="#26261f"/></svg>',
    ),
  width: 1600,
  height: 1000,
  alt: 'Образец изображения',
  mime_type: 'image/svg+xml',
  placeholder: { dominant_color: '#3a3a36' },
  variants: [],
  focal_point: { x: 0.5, y: 0.4 },
}
