import { useLocation } from 'react-router-dom'
import { useSettings } from '@/api/queries'
import { useLocale } from '@/lib/locale'
import { sheetOf, type SheetInfo } from '@/lib/sheets'

/**
 * «Лист NN / Листов NN» of every stamp on the site (hero, cta, footer): the page's place in
 * the navigation and the number of pages in it. Not the block number — blocks are numbered
 * in their eyebrow («03 / 09») only. Null until the settings are loaded.
 */
export function usePageSheet(): SheetInfo | null {
  const locale = useLocale()
  const { pathname } = useLocation()
  const navigation = useSettings(locale).data?.navigation
  return navigation ? sheetOf(navigation, pathname) : null
}
