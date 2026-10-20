import type { Person } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

// Bench only: ?mode=founder|key|rest|all switches what the editor picks (default: all).
const MODES = ['founder', 'key', 'rest', 'all'] as const
const mode = () => {
  const value = new URLSearchParams(window.location.search).get('mode')
  return MODES.find((m) => m === value) ?? 'all'
}

const DIVISIONS = [
  { slug: 'division-a', name: 'Направление А' },
  { slug: 'division-b', name: 'Направление Б' },
]
const POSITIONS = ['Руководитель', 'Инженер', 'Архитектор', 'Менеджер проектов', 'Технолог']

// In `all` mode: the first person is the founder, the next five are key, the rest the team.
// Every fourth has no bio, every third no division; photos follow ?media.
registerFixture('team_grid', (o) => {
  const m = mode()
  return {
    id: fid(),
    anchor: null,
    type: 'team_grid',
    tone: o.tone,
    data: {
      eyebrow: text('Команда', o.long),
      title: m === 'founder' ? null : text('Люди направления', o.long),
      intro: o.long ? text('Вступление к блоку — плейсхолдер.', o.long) : null,
      mode: m,
      show_division_filter: true,
      people: many(o.n, (i): Person => ({
        id: fid(),
        full_name: text(i === 1 ? 'Имя Фамилия' : `Имя Фамилия ${i}`, o.long && i % 2 === 1),
        position: text(POSITIONS[i % POSITIONS.length] ?? 'Специалист', o.long),
        bio:
          i % 4 === 0
            ? ''
            : text('Короткая биография — плейсхолдер: опыт, зона ответственности.', o.long),
        photo: media(o, { width: 1200, height: 1500, alt: `Портрет ${i}` }),
        linkedin_url: i === 1 ? 'https://www.linkedin.com/' : null,
        is_founder: m === 'all' ? i === 1 : m === 'founder',
        is_key: m === 'all' ? i <= 6 : m !== 'rest',
        division: i % 3 === 0 ? null : (DIVISIONS[i % 2] ?? null),
      })),
    },
  }
})
