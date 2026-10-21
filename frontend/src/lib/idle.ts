import { useEffect, useState } from 'react'

/**
 * Resolves when the browser is idle (or after `timeout` ms at the latest): for work that should
 * not compete with the first screen — chunks of what is below it, animation features.
 */
export function whenIdle(timeout = 1500): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function')
      window.requestIdleCallback(() => resolve(), { timeout })
    else window.setTimeout(resolve, 200)
  })
}

/** True once the browser has been idle after mount (see whenIdle). */
export function useIdle(timeout?: number) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let live = true
    void whenIdle(timeout).then(() => live && setIdle(true))
    return () => {
      live = false
    }
  }, [timeout])
  return idle
}
