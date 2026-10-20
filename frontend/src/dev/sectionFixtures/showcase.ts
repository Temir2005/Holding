import type { ProjectCard, ProjectStatus } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

const STATUSES: ProjectStatus[] = ['planned', 'in_progress', 'completed']

// Bench only: ?layout=sheet switches the layout the editor can pick.
const layout = () =>
  new URLSearchParams(window.location.search).get('layout') === 'sheet' ? 'sheet' : 'register'

registerFixture('projects_showcase', (o) => ({
  id: fid(),
  anchor: null,
  type: 'projects_showcase',
  tone: o.tone,
  data: {
    eyebrow: 'Проекты',
    title: text('Избранные объекты', o.long),
    layout: layout(),
    link: { label: 'Все проекты', href: 'projects', variant: 'secondary' },
    projects: many(o.n, (i): ProjectCard => ({
      id: fid(),
      slug: `project-${i}`,
      title: text(`Объект ${i}`, o.long && i % 2 === 1),
      status: STATUSES[i % 3] ?? 'planned',
      location: text('Город, район', o.long && i === 1),
      // every third project has no figures yet: the register shows dashes, cards drop them
      year: i % 3 === 2 ? null : 2010 + i,
      area_m2: i % 3 === 1 ? 18500 + 1200 * i : null,
      short_description: text('Короткое описание объекта — плейсхолдер.', o.long),
      cover: media(o),
      tags: [],
      is_featured: true,
      is_tokenized: i % 2 === 1,
      division: null,
    })),
  },
}))
