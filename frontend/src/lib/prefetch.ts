import { createContext, useContext } from 'react'

/** Warms up a site path: its data and its chunks. Provided by the site layout. */
export const PrefetchContext = createContext<(path: string) => void>(() => undefined)

/**
 * Handlers that warm up a route on intent: the pointer over the link (on touch, right before
 * the tap) or keyboard focus. By the click the page is usually cached and opens in one frame.
 */
export function usePrefetchIntent(path: string) {
  const prefetch = useContext(PrefetchContext)
  const warm = () => prefetch(path)
  return { onPointerEnter: warm, onFocus: warm }
}
