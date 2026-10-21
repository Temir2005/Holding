import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// The history entry on which the visitor last scrolled or pressed something. If it is the
// current page, a late landing must not take the scroll away from them. The click on the link
// that opened the page belongs to the previous entry. React Router keeps `idx` (and `key`,
// except on the first entry) in history.state.
let inputKey: string | null = null
const historyKey = () => {
  const state = window.history.state as { key?: string; idx?: number } | null
  return `${state?.key ?? ''}:${state?.idx ?? ''}`
}
if (typeof window !== 'undefined')
  for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const)
    window.addEventListener(type, () => (inputKey = historyKey()), { passive: true, capture: true })

/**
 * Lands on `#anchor` of a page opened from another page or a link from outside. Rendered last
 * inside the lazy part of a page: its layout effect runs in the commit that brings the lazy
 * sections in, so the target exists and everything above it is in place (they arrive in one
 * commit). One instant scroll, `scroll-margin-top` keeps it under the header. ScrollRestoration
 * alone cannot do it: it looks for the element when the URL changes, before the chunks arrive.
 * Anchors within the open page are left to the browser (smooth scrolling).
 */
export function HashLanding() {
  const { hash } = useLocation()
  useLayoutEffect(() => {
    if (!hash || inputKey === historyKey()) return
    let id = hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // a malformed escape: try the raw id
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    // mount only: a later #anchor on the same page is a scroll within it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
