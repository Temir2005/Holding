/** Component test setup (vitest + Testing Library in jsdom). */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import i18n from '@/i18n'
import '../i18n'

afterEach(() => cleanup())

// jsdom lacks these browser APIs used by Radix and dnd-kit.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= () => undefined
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => undefined

if (!i18n.isInitialized) {
  await new Promise<void>((resolve) => i18n.on('initialized', () => resolve()))
}
