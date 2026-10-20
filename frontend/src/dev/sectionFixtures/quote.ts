import { fid, media, registerFixture, text } from './index'

// n=0: no author at all (a plate, no signature); n≥1: an author with a photo.
registerFixture('quote', (o) => ({
  id: fid(),
  anchor: null,
  type: 'quote',
  tone: o.tone,
  data: {
    eyebrow: o.long ? text('Слово основателя', o.long) : null,
    title: null,
    text: o.long
      ? text(
          'Цитата — плейсхолдер. Длинная мысль в несколько предложений, чтобы проверить, как блок держит объём: зачем мы строим, что для нас значит качество и почему мы делаем материалы сами.',
          o.long,
        )
      : 'Цитата — плейсхолдер. Короткая мысль о том, зачем мы строим и что значит качество.',
    person:
      o.n === 0
        ? null
        : {
            id: fid(),
            full_name: text('Имя Фамилия', o.long),
            position: text('Основатель холдинга', o.long),
            bio: '',
            photo: media(o, { width: 1200, height: 1500 }),
            linkedin_url: null,
            is_key: true,
            is_founder: true,
            division: null,
          },
    media: null,
  },
}))
