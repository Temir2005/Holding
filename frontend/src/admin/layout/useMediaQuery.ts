import { useSyncExternalStore } from 'react'

/** Breakpoints of tailwind.admin.config.ts, for layout decisions made in code. */
export const BREAKPOINTS = { md: '(min-width: 768px)', xl: '(min-width: 1280px)' } as const

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}
