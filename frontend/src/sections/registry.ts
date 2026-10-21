import type { ComponentType } from 'react'
import type { Section, SectionOf, SectionType } from '@/api/types'
import { isPreloadable, lazyWithPreload, type Preloadable } from '@/lib/lazy'
import { HeroSection } from './HeroSection'
import { StatsSection } from './StatsSection'

type Renderer<T extends SectionType> = ComponentType<{ section: SectionOf<T> }>

/** A section loaded on demand: its own chunk, fetched by `preload` before it is rendered. */
type LazyRenderer<T extends SectionType> = Preloadable<{ section: SectionOf<T> }>

export type SectionRegistry = {
  [T in SectionType]: Renderer<T> | LazyRenderer<T>
}

const lazySection = <T extends SectionType>(load: () => Promise<Renderer<T>>) =>
  lazyWithPreload(load)

/**
 * One component per section type. The mapped type makes TypeScript fail the build
 * when the backend adds a section type (after `make gen-types`) and it is not registered here.
 *
 * Only what opens a page ships in the main bundle (every page starts with the hero, the stats
 * follow it on the home page). The rest are lazy chunks, fetched once the page data says
 * which are needed (the route loader, or a hover on a menu link, starts them before the page
 * renders); PageRenderer waits for them below the first screen, so nothing moves.
 */
export const sectionRegistry: SectionRegistry = {
  hero: HeroSection,
  stats: StatsSection,
  about_text: lazySection(() => import('./AboutTextSection').then((m) => m.AboutTextSection)),
  timeline: lazySection(() => import('./TimelineSection').then((m) => m.TimelineSection)),
  divisions_grid: lazySection(() =>
    import('./DivisionsGridSection').then((m) => m.DivisionsGridSection),
  ),
  projects_showcase: lazySection(() =>
    import('./ProjectsShowcaseSection').then((m) => m.ProjectsShowcaseSection),
  ),
  project_list: lazySection(() => import('./ProjectListSection').then((m) => m.ProjectListSection)),
  capabilities: lazySection(() =>
    import('./CapabilitiesSection').then((m) => m.CapabilitiesSection),
  ),
  process_steps: lazySection(() =>
    import('./ProcessStepsSection').then((m) => m.ProcessStepsSection),
  ),
  production: lazySection(() => import('./ProductionSection').then((m) => m.ProductionSection)),
  tokenization_explainer: lazySection(() =>
    import('./TokenizationSection').then((m) => m.TokenizationSection),
  ),
  team_grid: lazySection(() => import('./TeamGridSection').then((m) => m.TeamGridSection)),
  clients_marquee: lazySection(() =>
    import('./ClientsMarqueeSection').then((m) => m.ClientsMarqueeSection),
  ),
  clients_grid: lazySection(() => import('./ClientsGridSection').then((m) => m.ClientsGridSection)),
  testimonials: lazySection(() =>
    import('./TestimonialsSection').then((m) => m.TestimonialsSection),
  ),
  quote: lazySection(() => import('./QuoteSection').then((m) => m.QuoteSection)),
  cta: lazySection(() => import('./CtaSection').then((m) => m.CtaSection)),
  contact_form: lazySection(() => import('./ContactFormSection').then((m) => m.ContactFormSection)),
  media_gallery: lazySection(() =>
    import('./MediaGallerySection').then((m) => m.MediaGallerySection),
  ),
  video: lazySection(() => import('./VideoSection').then((m) => m.VideoSection)),
  vacancies: lazySection(() => import('./VacanciesSection').then((m) => m.VacanciesSection)),
  geography: lazySection(() => import('./GeographySection').then((m) => m.GeographySection)),
}

/** The renderer of a section type, widened once (TS cannot link a union `type` to its entry). */
export const rendererOf = (type: string) =>
  (sectionRegistry as Record<string, Renderer<SectionType> | LazyRenderer<SectionType>>)[type] as
    ComponentType<{ section: Section }> | undefined

export const isLazySection = (type: string) => isPreloadable(rendererOf(type))

/** Starts fetching the chunks of the page's lazy sections. Safe to call any number of times. */
export function preloadSections(sections: readonly Pick<Section, 'type'>[]) {
  return Promise.all(
    sections.map(({ type }) => {
      const r = rendererOf(type)
      return isPreloadable(r) ? r.preload() : undefined
    }),
  )
}
