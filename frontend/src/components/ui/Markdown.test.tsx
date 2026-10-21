import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

const TEXT = '# One\n\n## Two\n\n### Three\n\n#### Four\n\nBody'

const levels = (root: HTMLElement) =>
  [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => [h.tagName, h.textContent])

describe('Markdown', () => {
  it('keeps heading levels as written by default', () => {
    const { container } = render(<Markdown>{TEXT}</Markdown>)
    expect(levels(container)).toEqual([
      ['H1', 'One'],
      ['H2', 'Two'],
      ['H3', 'Three'],
      ['H4', 'Four'],
    ])
  })

  it('demotes h1 and h2 to h3 under a section heading, lower levels stay', () => {
    const { container } = render(<Markdown demoteHeadings>{TEXT}</Markdown>)
    expect(levels(container)).toEqual([
      ['H3', 'One'],
      ['H3', 'Two'],
      ['H3', 'Three'],
      ['H4', 'Four'],
    ])
  })
})
