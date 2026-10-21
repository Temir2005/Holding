import { matchPath } from 'react-router-dom'
import { pageQuery, projectQuery } from '@/api/queries'
import { whenIdle } from '@/lib/idle'
import { isLocale, type Locale } from '@/lib/locale'
import { loadProjectRest } from '@/pages/project/rest'
import { preloadSections } from '@/sections/registry'
import { queryClient } from './queryClient'

const noop = () => undefined

/**
 * The page data, then the chunks of the lazy sections it lists. Never rejects. `soon`: the
 * chunks right away (a hover on a link: the visitor is about to go there); otherwise when the
 * browser is idle, so the page being opened gets the network for its first screen first.
 */
export function prefetchPage(slug: string, locale: Locale, soon = false) {
  const query = pageQuery(slug, locale)
  return queryClient.prefetchQuery(query).then(async () => {
    const page = queryClient.getQueryData(query.queryKey)
    if (!page) return
    if (!soon) await whenIdle()
    void preloadSections(page.sections).catch(noop)
  })
}

/** The project data and the chunk of the sheets below its first screen (`soon`: see above). */
export function prefetchProject(slug: string, locale: Locale, soon = false) {
  void (soon ? Promise.resolve() : whenIdle()).then(() => loadProjectRest.preload()).catch(noop)
  return queryClient.prefetchQuery(projectQuery(slug, locale))
}

/** Warms up whatever a site path (as a link has it) opens. Unknown paths are ignored. */
export function prefetchPath(to: string) {
  const pathname = to.split(/[?#]/)[0] ?? ''
  const project = matchPath('/:locale/projects/:slug', pathname)?.params
  const page = matchPath('/:locale/:slug?', pathname)?.params
  const locale = (project ?? page)?.locale
  if (!isLocale(locale)) return
  if (project) void prefetchProject(project.slug ?? '', locale, true)
  else void prefetchPage(page?.slug ?? 'home', locale, true)
}
