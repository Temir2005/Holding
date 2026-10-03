import type { SectionOf, SectionType } from '@/api/types'

export type SectionProps<T extends SectionType> = { section: SectionOf<T> }

/** Id for the section heading, used by aria-labelledby. */
export const headingId = (sectionId: string) => `h-${sectionId}`
