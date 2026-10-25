import {
  Component,
  startTransition,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import type { Section } from '@/api/types'
import { HashLanding } from '@/components/layout/HashLanding'
import { AltContext } from '@/components/site/hooks'
import { isLazySection, rendererOf } from './registry'

/**
 * Renders CMS sections in order. Unknown or crashing sections are skipped, never fatal.
 *
 * The sections before the first lazy one render at once (the first screen). Everything from
 * the first lazy section on is mounted afterwards, one section per idle moment: small
 * renders instead of one long task right when the first screen should respond.
 * They only ever append at the bottom, in order, and wait for their chunks behind a Suspense
 * boundary, so a section never pops in above one already on screen. Until the last one is in,
 * a screen of empty sheet holds the place, so the footer does not flash up under the hero.
 */
export function PageRenderer({ sections }: { sections: Section[] }) {
  const known = sections.filter((section) => {
    if (rendererOf(section.type)) return true
    if (import.meta.env.DEV)
      console.warn(`[PageRenderer] no component for section type "${section.type}"`)
    return false
  })
  const split = known.findIndex((section) => isLazySection(section.type))
  const shown = useMountedCount(split < 0 ? 0 : known.length - split)
  usePageTheme(known)
  // light sections that follow each other alternate between grey and white
  let lightRun = 0
  const rendered = known.map((section) => {
    const Renderer = rendererOf(section.type) as ComponentType<{ section: Section }>
    lightRun = section.tone === 'light' && !FULL_BLEED.has(section.type) ? lightRun + 1 : 0
    return (
      <AltContext.Provider key={section.id} value={lightRun % 2 === 0 && lightRun > 0}>
        <SectionBoundary type={section.type}>
          <Renderer section={section} />
        </SectionBoundary>
      </AltContext.Provider>
    )
  })
  if (split < 0)
    return (
      <>
        {rendered}
        <HashLanding />
      </>
    )
  const tail = rendered.slice(split)
  return (
    <>
      {rendered.slice(0, split)}
      <Suspense fallback={RESERVE}>
        {tail.slice(0, shown)}
        {/* after the last lazy section: lands on #anchor once they are all in */}
        {shown < tail.length ? RESERVE : <HashLanding />}
      </Suspense>
    </>
  )
}

const RESERVE = <div aria-hidden="true" className="min-h-[100svh]" />

// sections that ignore their tone and always sit on a photo or a dark map
const FULL_BLEED = new Set([
  'hero',
  'contact_form',
  'production',
  'geography',
  'air_routes',
  'projects_map',
])

/** The page's palette (holding, Smart Panels, AAAG) comes from its hero; header and footer follow. */
function usePageTheme(sections: Section[]) {
  const hero = sections.find((s) => s.type === 'hero')
  const theme = hero?.type === 'hero' ? hero.data.theme : 'holding'
  useEffect(() => {
    if (theme === 'holding') delete document.body.dataset.theme
    else document.body.dataset.theme = theme
    return () => {
      delete document.body.dataset.theme
    }
  }, [theme])
}

/**
 * How many of `total` sections are mounted: one more each time the browser is idle (with a
 * short timeout, so they always come), inside a transition. The first screen gets the main
 * thread first; the sheets below arrive while the visitor looks at it.
 */
function useMountedCount(total: number) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (count >= total) return
    const next = () => startTransition(() => setCount((c) => c + 1))
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(next, { timeout: 400 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(next, 16)
    return () => window.clearTimeout(id)
  }, [count, total])
  return Math.min(count, total)
}

class SectionBoundary extends Component<
  { type: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[PageRenderer] section "${this.props.type}" failed to render`, error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return import.meta.env.DEV ? (
      <div className="p-6 text-sm">Section “{this.props.type}” failed to render. See console.</div>
    ) : null
  }
}
