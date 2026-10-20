import { useSyncExternalStore } from 'react'

/** Tailwind breakpoints the client grid lays out by (same values as the default theme). */
const QUERIES = [
  ['xl', '(min-width: 1280px)'],
  ['lg', '(min-width: 1024px)'],
  ['md', '(min-width: 768px)'],
] as const

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

const lists = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? QUERIES.map(([name, q]) => [name, window.matchMedia(q)] as const)
    : []

function snapshot(): Breakpoint {
  return lists().find(([, m]) => m.matches)?.[0] ?? (lists().length ? 'sm' : 'lg')
}

function subscribe(onChange: () => void) {
  const all = lists()
  all.forEach(([, m]) => m.addEventListener('change', onChange))
  return () => all.forEach(([, m]) => m.removeEventListener('change', onChange))
}

/**
 * Current breakpoint, for layouts whose structure (not only style) depends on the width: the
 * client grid needs its column count to place the detail strip under the right row.
 * Without matchMedia (tests) it reports `lg`.
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, snapshot, () => 'lg')
}
