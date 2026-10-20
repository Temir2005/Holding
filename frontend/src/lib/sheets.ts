import type { NavItem } from '@/api/types'
import { isLocale } from './locale'

/**
 * The site as a set of drawings: the navigation from the CMS settings is the sheet register
 * («ведомость листов»), each item one sheet. Nothing is hard-coded: an editor adding a menu item
 * changes the count everywhere.
 *   total  — number of sheets in the register (all navigation items)
 *   number — 1-based sheet of the current page, or null when the page is not in the register
 */
export type SheetInfo = { number: number | null; total: number }

/** Page slug of a site path: /ru → home, /ru/team → team, /ru/projects/zhk-a → projects. */
export function slugOfPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  const rest = isLocale(parts[0]) ? parts.slice(1) : parts
  return rest[0] ?? 'home'
}

export function sheetOf(navigation: NavItem[], pathname: string): SheetInfo {
  const slug = slugOfPath(pathname)
  const index = navigation.findIndex((item) => item.page_slug === slug)
  return { number: index >= 0 ? index + 1 : null, total: navigation.length }
}
