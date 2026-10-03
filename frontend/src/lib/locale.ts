import { useParams } from 'react-router-dom'

export const LOCALES = ['ru', 'kk', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'ru'

/** Label shown in the switcher. Kazakh uses the country code customers expect. */
export const LOCALE_LABELS: Record<Locale, string> = { ru: 'RU', kk: 'KZ', en: 'EN' }

/** BCP 47 tags for Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function useLocale(): Locale {
  const { locale } = useParams()
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

/** Path to a CMS page. The home page lives at the locale root. */
export function pagePath(locale: Locale, slug: string): string {
  return slug === 'home' ? `/${locale}` : `/${locale}/${slug}`
}

/** Same path in another locale: /ru/team → /en/team. */
export function swapLocale(pathname: string, next: Locale): string {
  const parts = pathname.split('/')
  if (isLocale(parts[1])) parts[1] = next
  else parts.splice(1, 0, next)
  return parts.join('/') || `/${next}`
}
