import type { Division } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

/** A placeholder division the key stage links to (the block's callout). */
const division = (long: boolean): Division => ({
  id: fid(),
  slug: 'division-1',
  name: text('Направление 1', long),
  tagline: '',
  description: '',
  logo: null,
  cover: null,
  stats: [],
  website_url: null,
  page_slug: 'division-1',
})

registerFixture('process_steps', (o) => ({
  id: fid(),
  anchor: null,
  type: 'process_steps',
  tone: o.tone,
  data: {
    eyebrow: text('Полный цикл', o.long),
    title: text('Заголовок цикла в две строки', o.long),
    intro: null,
    steps: many(o.n, (i) => ({
      title: text(`Этап ${i}: название`, o.long),
      text: text(
        'Описание этапа — плейсхолдер: одна-две фразы о том, что на нём происходит.',
        o.long,
      ),
      // Odd stages have a photo, even ones fall back to the drawing: both kinds of shot and the
      // crossfade between them are on the bench. ?media=0 gives the drawing on every stage.
      media: i % 2 === 1 ? media(o) : null,
      division: i === 3 || (o.n < 3 && i === 1) ? division(o.long) : null,
    })),
  },
}))
