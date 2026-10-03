import type { ComponentType } from 'react'
import type { SectionOf, SectionType } from '@/api/types'
import { AboutTextSection } from './AboutTextSection'
import { CapabilitiesSection } from './CapabilitiesSection'
import { ClientsGridSection } from './ClientsGridSection'
import { ClientsMarqueeSection } from './ClientsMarqueeSection'
import { ContactFormSection } from './ContactFormSection'
import { CtaSection } from './CtaSection'
import { DivisionsGridSection } from './DivisionsGridSection'
import { GeographySection } from './GeographySection'
import { HeroSection } from './HeroSection'
import { MediaGallerySection } from './MediaGallerySection'
import { ProcessStepsSection } from './ProcessStepsSection'
import { ProductionSection } from './ProductionSection'
import { ProjectListSection } from './ProjectListSection'
import { ProjectsShowcaseSection } from './ProjectsShowcaseSection'
import { QuoteSection } from './QuoteSection'
import { StatsSection } from './StatsSection'
import { TeamGridSection } from './TeamGridSection'
import { TestimonialsSection } from './TestimonialsSection'
import { TimelineSection } from './TimelineSection'
import { TokenizationSection } from './TokenizationSection'
import { VacanciesSection } from './VacanciesSection'
import { VideoSection } from './VideoSection'

export type SectionRegistry = {
  [T in SectionType]: ComponentType<{ section: SectionOf<T> }>
}

/**
 * One component per section type. The mapped type makes TypeScript fail the build
 * when the backend adds a section type (after `make gen-types`) and it is not registered here.
 */
export const sectionRegistry: SectionRegistry = {
  hero: HeroSection,
  stats: StatsSection,
  about_text: AboutTextSection,
  timeline: TimelineSection,
  divisions_grid: DivisionsGridSection,
  projects_showcase: ProjectsShowcaseSection,
  project_list: ProjectListSection,
  capabilities: CapabilitiesSection,
  process_steps: ProcessStepsSection,
  production: ProductionSection,
  tokenization_explainer: TokenizationSection,
  team_grid: TeamGridSection,
  clients_marquee: ClientsMarqueeSection,
  clients_grid: ClientsGridSection,
  testimonials: TestimonialsSection,
  quote: QuoteSection,
  cta: CtaSection,
  contact_form: ContactFormSection,
  media_gallery: MediaGallerySection,
  video: VideoSection,
  vacancies: VacanciesSection,
  geography: GeographySection,
}
