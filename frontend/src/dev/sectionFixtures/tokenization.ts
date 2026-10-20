import type { ProjectCard, ProjectStatus } from '@/api/types'
import { fid, many, media, registerFixture, text } from './index'

const STATUSES: ProjectStatus[] = ['planned', 'in_progress', 'completed']

// Placeholders only: no yields, figures or jurisdictions (CLAUDE.md, tokenization).
registerFixture('tokenization_explainer', (o) => ({
  id: fid(),
  anchor: null,
  type: 'tokenization_explainer',
  tone: o.tone,
  data: {
    eyebrow: 'Токенизация',
    title: text('Доля в объекте в цифровом виде', o.long),
    intro: text('Вводный абзац о механике — плейсхолдер.', o.long),
    steps: many(o.n, (i) => ({
      icon: 'building',
      title: text(`Шаг ${i}`, o.long && i === 2),
      text: text('Короткое описание шага — плейсхолдер.', o.long),
      media: null,
    })),
    benefits: many(Math.min(o.n, 5), (i) =>
      text(`Преимущество ${i} — плейсхолдер`, o.long && i === 1),
    ),
    disclaimer: text(
      'Текст дисклеймера — плейсхолдер. Редактируется из CMS: условия, риски и юрисдикция публикуются после согласования.',
      o.long,
    ),
    projects: many(Math.min(o.n, 3), (i): ProjectCard => ({
      id: fid(),
      slug: `project-${i}`,
      title: text(`Объект ${i}`, o.long && i === 1),
      status: STATUSES[i % 3] ?? 'planned',
      location: 'Город, район',
      year: null,
      area_m2: null,
      short_description: '',
      cover: media(o),
      tags: [],
      is_featured: false,
      is_tokenized: true,
      division: null,
    })),
  },
}))
