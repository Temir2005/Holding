import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, ScrollRestoration, useParams } from 'react-router-dom'
import { useSettings } from '@/api/queries'
import { DEFAULT_LOCALE, isLocale } from '@/lib/locale'
import { Footer } from './Footer'
import { Header } from './Header'

/** Shell for every localized route: validates the locale and syncs i18n with the URL. */
export function SiteLayout() {
  const { locale } = useParams()
  const { t, i18n } = useTranslation()
  const valid = isLocale(locale)
  const settings = useSettings(valid ? locale : DEFAULT_LOCALE)

  useEffect(() => {
    if (!valid) return
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
    // Set synchronously too: Helmet applies attributes on the next frame.
    document.documentElement.lang = locale
  }, [valid, locale, i18n])

  if (!valid) return <Navigate to={`/${DEFAULT_LOCALE}`} replace />

  return (
    <>
      <Helmet htmlAttributes={{ lang: locale }} />
      <a
        href="#main"
        className="tone-light fixed left-4 top-4 z-50 -translate-y-24 rounded-full px-4 py-2 focus:translate-y-0"
      >
        {t('nav.skip')}
      </a>
      <Header settings={settings.data} />
      <main id="main">
        <Outlet />
      </main>
      <Footer settings={settings.data} />
      <ScrollRestoration />
    </>
  )
}
