import { createContext, useContext } from 'react'

/** Position of a section on its page, for the sheet number "02 / 04" in the section meta. */
export type SectionNumber = { index: number; total: number }

export const SectionNumberContext = createContext<SectionNumber | null>(null)

/** Null outside PageRenderer (project page, dev page): the meta then shows no number. */
export const useSectionNumber = () => useContext(SectionNumberContext)

export const pad2 = (n: number) => String(n).padStart(2, '0')
