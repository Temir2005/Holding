import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SectionOf } from '@/api/types'
import { AboutTextSection } from './AboutTextSection'

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

const section = (body: string): SectionOf<'about_text'> => ({
  id: 'about',
  anchor: null,
  type: 'about_text',
  tone: 'light',
  data: { eyebrow: '', title: 'Block title', body, layout: 'text_only', media: null },
})

describe('AboutTextSection', () => {
  it('renders Markdown h1/h2 as h3 under the block h2, lower levels as written', () => {
    render(<AboutTextSection section={section('# Top\n\n## Sub\n\n### Small\n\n#### Tiny')} />)
    const names = (level: number) =>
      screen.queryAllByRole('heading', { level }).map((h) => h.textContent)
    expect(names(1)).toEqual([])
    expect(names(2)).toEqual(['Block title'])
    expect(names(3)).toEqual(['Top', 'Sub', 'Small'])
    expect(names(4)).toEqual(['Tiny'])
  })
})
