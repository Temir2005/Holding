import type { ProjectCard, ProjectStatus } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

const STATUSES: ProjectStatus[] = ['completed', 'in_progress', 'planned']
const DIVISIONS = [
  { slug: 'division-a', name: 'Направление А' },
  { slug: 'division-b', name: 'Направление Б' },
  { slug: 'division-c', name: 'Длинное название направления' },
]

// Bench only: ?count=30 overrides n (the register is meant for many projects), ?filter=0 hides it.
const param = (key: string) => new URLSearchParams(window.location.search).get(key)

registerFixture('project_list', (o) => ({
  id: fid(),
  anchor: null,
  type: 'project_list',
  tone: o.tone,
  data: {
    eyebrow: 'Портфолио',
    title: text('Все объекты', o.long),
    show_filter: param('filter') !== '0',
    projects: many(Number(param('count') ?? o.n), (i): ProjectCard => ({
      id: fid(),
      slug: `project-${i}`,
      title: text(`Объект ${i}`, o.long && i % 2 === 1),
      status: STATUSES[i % 3] ?? 'planned',
      location: text('Город, район', o.long && i === 1),
      // gaps on purpose: some projects have no year or area yet, they are left out, not dashed
      year: i % 3 === 2 ? null : 2010 + i,
      area_m2: i % 4 === 1 ? null : 9000 + 1500 * i,
      short_description: text('Короткое описание объекта — плейсхолдер.', o.long),
      cover: media(o),
      tags: [],
      is_featured: false,
      is_tokenized: i % 4 === 1,
      division: i % 5 === 4 ? null : (DIVISIONS[i % 3] ?? null),
    })),
  },
}))
