import { useEffect, useLayoutEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, ScrollRestoration, useLocation, useParams } from 'react-router-dom'
import { useSettings } from '@/api/queries'
import { prefetchPath } from '@/app/prefetch'
import { DEFAULT_LOCALE, isLocale } from '@/lib/locale'
import { PrefetchContext } from '@/lib/prefetch'
import { Footer } from './Footer'
import { Header } from './Header'

/** Shell for every localized route: validates the locale and syncs i18n with the URL. */
export function SiteLayout() {
  const { locale } = useParams()
  const { t, i18n } = useTranslation()
  const valid = isLocale(locale)
  const settings = useSettings(valid ? locale : DEFAULT_LOCALE)

  // site styles are scoped to body.site: the admin shares the document
  useEffect(() => {
    document.body.classList.add('site')
    return () => document.body.classList.remove('site')
  }, [])

  useEffect(() => {
    if (!valid) return
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
    // Set synchronously too: Helmet applies attributes on the next frame.
    document.documentElement.lang = locale
  }, [valid, locale, i18n])

  if (!valid) return <Navigate to={`/${DEFAULT_LOCALE}`} replace />

  return (
    <>
      <PrefetchContext.Provider value={prefetchPath}>
        <Helmet htmlAttributes={{ lang: locale }} />
        <a href="#main" className="skip">
          {t('nav.skip')}
        </a>
        <Header settings={settings.data} />
        <main id="main">
          <Outlet />
        </main>
        <Footer settings={settings.data} />
        <InstantPageScroll />
        <ScrollRestoration />
      </PrefetchContext.Provider>
    </>
  )
}

/**
 * `scroll-behavior: smooth` (globals.css) is for anchors within a page. When the page changes,
 * ScrollRestoration's jump to the top (or the saved position) must be instant, or the new page
 * would glide up under the view transition. Runs as the earlier sibling, so its layout effect
 * comes first; smooth scrolling is back on the next frame.
 */
function InstantPageScroll() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useLayoutEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const root = document.documentElement
    root.style.scrollBehavior = 'auto'
    const frame = requestAnimationFrame(() => root.style.removeProperty('scroll-behavior'))
    return () => {
      cancelAnimationFrame(frame)
      root.style.removeProperty('scroll-behavior')
    }
  }, [pathname])
  return null
}
