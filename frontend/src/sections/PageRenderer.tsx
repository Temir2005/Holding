import { Component, type ComponentType, type ReactNode } from 'react'
import type { Section } from '@/api/types'
import { sectionRegistry } from './registry'

/** Renders CMS sections in order. Unknown or crashing sections are skipped, never fatal. */
export function PageRenderer({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section) => {
        // The registry is keyed by type, but TS cannot link section.type to the matching
        // component through a union, so we widen once here.
        const Renderer = (sectionRegistry as Record<string, ComponentType<{ section: Section }> | undefined>)[section.type]
        if (!Renderer) {
          if (import.meta.env.DEV) console.warn(`[PageRenderer] no component for section type "${section.type}"`)
          return null
        }
        return (
          <SectionBoundary key={section.id} type={section.type}>
            <Renderer section={section} />
          </SectionBoundary>
        )
      })}
    </>
  )
}

class SectionBoundary extends Component<{ type: string; children: ReactNode }, { failed: boolean }> {
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
      <div className="tone-accent p-6 font-mono text-sm">Section “{this.props.type}” failed to render. See console.</div>
    ) : null
  }
}
