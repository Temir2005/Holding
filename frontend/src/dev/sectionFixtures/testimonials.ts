import { fixtureClient } from './clientsGrid'
import { fid, many, registerFixture, text } from './index'

const SHORT = 'Отзыв клиента — плейсхолдер. Короткая история сотрудничества.'
const MID =
  'Отзыв клиента — плейсхолдер. Здесь будет история сотрудничества: какая была задача, как её решили и какой получился результат.'

// Lengths alternate so the sheets show every step of the quote size; long=1 stretches them.
registerFixture('testimonials', (o) => ({
  id: fid(),
  anchor: null,
  type: 'testimonials',
  tone: o.tone,
  data: {
    eyebrow: 'Отзывы',
    title: text('Что говорят клиенты', o.long),
    clients: many(o.n, (i) => ({
      ...fixtureClient(o, i),
      testimonial: {
        quote: text(i % 2 === 1 ? MID : SHORT, o.long),
        author: text(`Имя Фамилия ${i}`, o.long && i % 2 === 0),
        position: i % 3 === 0 ? '' : text('Должность, компания (плейсхолдер)', o.long),
      },
    })),
  },
}))
