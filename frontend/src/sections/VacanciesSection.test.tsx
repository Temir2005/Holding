import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SectionOf } from '@/api/types'
import { VacanciesSection } from './VacanciesSection'

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver

const section = (description: string): SectionOf<'vacancies'> => ({
  id: 'jobs',
  anchor: null,
  type: 'vacancies',
  tone: 'light',
  data: {
    eyebrow: '',
    title: 'Open positions',
    intro: null,
    empty_text: null,
    vacancies: [
      {
        id: 'v1',
        title: 'Engineer',
        location: 'Shymkent',
        employment_type: 'full_time',
        description,
        division: null,
      },
    ],
  },
})

describe('VacanciesSection', () => {
  it('starts the description headings at h4, under the h3 of the vacancy', () => {
    const { container } = render(
      <VacanciesSection section={section('# Role\n\n## Duties\n\n### Terms\n\n#### Extra')} />,
    )
    const tags = (selector: string) =>
      [...container.querySelectorAll(selector)].map((h) => h.textContent)
    expect(tags('h2')).toEqual(['Open positions'])
    expect(tags('h3')).toEqual(['Engineer'])
    expect(tags('h4')).toEqual(['Role', 'Duties', 'Terms', 'Extra'])
    expect(container.querySelector('h1, h5, h6')).toBeNull()
  })
})
