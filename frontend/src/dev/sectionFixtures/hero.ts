import { fid, many, media, registerFixture, text } from './index'

registerFixture('hero', (o) => ({
  id: fid(),
  anchor: null,
  type: 'hero',
  tone: 'dark',
  data: {
    eyebrow: text('Холдинг · Город · с 2004 года', o.long),
    title: text('Заголовок первого экрана в две строки', o.long),
    subtitle: text('Подзаголовок: одна-две фразы о холдинге, производстве и проектах.', o.long),
    background: media(o, { width: 2400, height: 1600 }),
    video: null,
    ctas: [
      { label: 'Основная кнопка', href: '#contacts', variant: 'primary' },
      { label: 'Вторичная', href: '#projects', variant: 'secondary' },
    ],
    swatches: [],
    stats: many(Math.min(o.n, 3), (i) => ({
      id: fid(),
      value: [20, 30000, 30][i - 1] ?? i,
      prefix: null,
      suffix: ['+', 'м²', '+'][i - 1] ?? '',
      label: text('подпись цифры', o.long),
    })),
  },
}))
