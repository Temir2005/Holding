import type { LeadType } from '@/api/types'
import { fid, registerFixture, text } from './index'

const TYPES: LeadType[] = ['investor', 'partner', 'client', 'candidate']

// n = number of topics (0 and 1 hide the switch). Contacts come from the live site settings.
registerFixture('contact_form', (o) => ({
  id: fid(),
  anchor: null,
  type: 'contact_form',
  tone: o.tone,
  data: {
    eyebrow: 'Контакты',
    title: text('Заголовок формы', o.long),
    text: text('Короткий текст над формой. Плейсхолдер.', o.long),
    lead_types: TYPES.slice(0, Math.min(o.n, TYPES.length)),
    default_type: 'investor',
    consent_text: text('Текст согласия на обработку данных — плейсхолдер.', o.long),
    success_text: text('Текст после успешной отправки — плейсхолдер.', o.long),
  },
}))
