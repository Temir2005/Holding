import { fid, media, registerFixture, text } from './index'

// n = number of buttons (0, 1, 2+); the image only with ?media=1 (the default).
registerFixture('cta', (o) => ({
  id: fid(),
  anchor: null,
  type: 'cta',
  tone: o.tone,
  data: {
    eyebrow: null,
    title: text('Заголовок призыва к действию', o.long),
    text: text('Одна-две фразы о том, что будет после заявки. Плейсхолдер.', o.long),
    ctas: [
      { label: 'Оставить заявку', href: '#contacts', variant: 'primary' as const },
      { label: 'Все проекты', href: 'projects', variant: 'secondary' as const },
    ].slice(0, Math.min(o.n, 2)),
    media: media(o),
  },
}))
