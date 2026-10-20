import type { Vacancy } from '@/api/types'
import { fid, many, registerFixture, text } from './index'

const TYPES: Vacancy['employment_type'][] = ['full_time', 'part_time', 'contract', 'internship']

// n=0 shows the empty state with the CMS text; every third vacancy has no description.
registerFixture('vacancies', (o) => ({
  id: fid(),
  anchor: null,
  type: 'vacancies',
  tone: o.tone,
  data: {
    eyebrow: 'Карьера',
    title: text('Открытые вакансии', o.long),
    intro: null,
    empty_text: text('Сейчас вакансий нет, но мы рады резюме — напишите нам.', o.long),
    vacancies: many(o.n, (i): Vacancy => ({
      id: fid(),
      title: text(`Вакансия ${i}`, o.long && i % 2 === 1),
      location: text('Город', o.long && i === 1),
      employment_type: TYPES[i % TYPES.length] ?? 'full_time',
      description:
        i % 3 === 0
          ? ''
          : `Описание вакансии — плейсхолдер.\n\n**Задачи**\n\n- первая задача\n- вторая задача\n\n${text('Условия — плейсхолдер.', o.long)}`,
      division:
        i % 4 === 0
          ? null
          : { slug: `division-${i % 2}`, name: text(`Направление ${i % 2 ? 'А' : 'Б'}`, o.long) },
    })),
  },
}))
