/** UI strings only. Content always comes from the API. */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, isLocale } from '@/lib/locale'
import en from './en.json'
import kk from './kk.json'
import ru from './ru.json'

/**
 * Start in the language of the URL (/kk/…): SiteLayout syncs it on navigation, but only in an
 * effect, so starting in ru would paint the first frame of a /kk page in Russian.
 */
const fromUrl = typeof window === 'undefined' ? undefined : window.location.pathname.split('/')[1]

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, kk: { translation: kk }, en: { translation: en } },
  lng: isLocale(fromUrl) ? fromUrl : DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
})

export default i18n
