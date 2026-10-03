import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import type { Media } from '@/api/types'
import { LOCALES, swapLocale, useLocale } from '@/lib/locale'

type Props = { title: string; description?: string | null; image?: Media | null }

/** Title, description, Open Graph and hreflang alternates, all from CMS data. */
export function Seo({ title, description, image }: Props) {
  const locale = useLocale()
  const { pathname } = useLocation()
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image.url} />}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={locale} />
      {LOCALES.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={origin + swapLocale(pathname, l)} />
      ))}
    </Helmet>
  )
}
