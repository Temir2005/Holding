/**
 * Friendly aliases over the generated OpenAPI types (schema.d.ts, `make gen-types`).
 * Never write response types by hand: change the backend schema and regenerate.
 */
import type { components } from './schema'

type S = components['schemas']

export type SiteSettings = S['SiteSettingsRead']
export type NavItem = S['NavItemRead']
export type Page = S['PageRead']
export type Section = Page['sections'][number]
export type SectionType = Section['type']
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>
export type Tone = S['Tone']

export type Media = S['MediaRead']
export type Cta = S['CtaRead']
export type Stat = S['StatRead']
export type TimelineEvent = S['TimelineEventRead']
export type Division = S['DivisionRead']
export type ProjectCard = S['ProjectCard']
export type Project = S['ProjectRead']
export type ProjectStatus = S['ProjectStatus']
export type Person = S['PersonRead']
export type Client = S['ClientRead']
export type Vacancy = S['VacancyRead']
export type LeadType = S['LeadType']
export type LeadCreate = S['LeadCreate']
export type LeadCreated = S['LeadCreated']
