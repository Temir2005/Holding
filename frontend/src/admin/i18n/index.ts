/**
 * Admin UI strings: a separate i18next namespace, Russian only, loaded with the admin chunk
 * so the site bundle never carries it. The language is fixed to `ru` regardless of the
 * site locale the user visited last.
 */
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import ru from './ru.json'

export const ADMIN_NS = 'admin'

if (!i18n.hasResourceBundle('ru', ADMIN_NS)) {
  i18n.addResourceBundle('ru', ADMIN_NS, ru, true, true)
}

export function useT() {
  return useTranslation(ADMIN_NS, { lng: 'ru' }).t
}

/** For code outside components (toasts from mutation callbacks, tests). */
export const tAdmin = i18n.getFixedT('ru', ADMIN_NS)
