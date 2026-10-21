import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

const levels = (root: HTMLElement) =>
  [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => [h.tagName, h.textContent])

describe('Markdown heading floor', () => {
  it('starts at the floor: h1–h3 become h4 under an h3 title, lower levels stay', () => {
    const { container } = render(
      <Markdown headingFloor={4}>{'# A\n\n## B\n\n### C\n\n#### D\n\n##### E'}</Markdown>,
    )
    expect(levels(container)).toEqual([
      ['H4', 'A'],
      ['H4', 'B'],
      ['H4', 'C'],
      ['H4', 'D'],
      ['H5', 'E'],
    ])
  })

  it('keeps the look of the written level and repeats no ids', () => {
    const { container } = render(<Markdown headingFloor={4}>{'## Duties\n\n### Duties'}</Markdown>)
    const [a, b] = [...container.querySelectorAll('h4')]
    expect(a?.className).toBe('md-h2')
    expect(b?.className).toBe('md-h3')
    expect(container.querySelector('[id]')).toBeNull()
  })
})

describe('Markdown safety', () => {
  it('shows raw HTML as text instead of rendering it', () => {
    const { container } = render(
      <Markdown>
        {'Hello <b>bold</b> <script>alert(1)</script> <img src=x onerror=alert(1)>'}
      </Markdown>,
    )
    expect(container.querySelector('b, script, img')).toBeNull()
    expect(container.textContent).toContain('<b>bold</b>')
  })

  it('opens external links in a new tab without access to the opener', () => {
    const { container } = render(
      <Markdown>{'[Out](https://example.com/x) and [In](/ru/projects)'}</Markdown>,
    )
    const [out, inner] = [...container.querySelectorAll('a')]
    expect(out?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(out?.getAttribute('target')).toBe('_blank')
    expect(inner?.getAttribute('rel')).toBeNull()
    expect(inner?.getAttribute('target')).toBeNull()
  })

  it('drops script URLs from links', () => {
    const { container } = render(<Markdown>{'[x](javascript:alert(1))'}</Markdown>)
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/javascript/i)
  })

  it('wraps a single line in a paragraph, a direct child of the sheet', () => {
    const { container } = render(<Markdown>{'Just one line'}</Markdown>)
    expect(container.firstElementChild?.firstElementChild?.tagName).toBe('P')
  })
})
