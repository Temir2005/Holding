import { fid, many, media, registerFixture, text } from './index'

// Uneven gaps on purpose (1, 2, 3, 5 years...), so the interval dimensions differ.
const YEARS = [2004, 2007, 2009, 2011, 2015, 2016, 2017, 2019, 2020, 2022, 2023, 2024]

registerFixture('timeline', (o) => ({
  id: fid(),
  anchor: null,
  type: 'timeline',
  tone: o.tone,
  data: {
    eyebrow: text('История', o.long),
    title: text('Заголовок истории в две строки', o.long),
    events: many(o.n, (i) => ({
      id: fid(),
      // With one event it is the last (current) one.
      year: YEARS[o.n === 1 ? YEARS.length - 1 : i - 1] ?? 2024,
      title: text(`Событие ${i}: название этапа`, o.long),
      description: text(
        'Описание события — плейсхолдер: одна-две фразы о том, что изменилось.',
        o.long,
      ),
      image: media(o),
    })),
  },
}))
