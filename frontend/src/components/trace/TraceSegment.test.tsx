import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Section } from '@/components/ui/Section'

// Like the browser: an observer reports the initial size once it starts observing.
class FiringResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }
  unobserve() {}
  disconnect() {}
}

describe('TraceSegment', () => {
  // Rendered without StrictMode, as in a production build: effects run once, so a ref of the
  // parent section that is still empty in the segment's layout effect would leave it unmeasured.
  it('measures its section and subscribes to its scroll on the first mount', () => {
    vi.stubGlobal('ResizeObserver', FiringResizeObserver)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { container } = render(<Section tone="light">Sheet</Section>)
    expect(container.querySelector('section > svg path')).not.toBeNull()
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/not yet hydrated/)
    vi.unstubAllGlobals()
  })
})
