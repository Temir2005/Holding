import { useTranslation } from 'react-i18next'
import type { SiteSettings } from '@/api/types'
import { SiteLink } from '@/components/ui/SiteLink'
import { phoneHref, whatsappHref } from '@/lib/format'
import { LOCALE_LABELS, LOCALES, useLocale } from '@/lib/locale'
import { LogoMark } from './Logo'
import { NavLinks } from './NavLinks'

export function Footer({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (!settings) return null
  const { contacts, footer, socials, navigation, site_name: name } = settings
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="top">
          <div>
            <SiteLink to={`/${locale}`} className="logo" aria-label={name}>
              <LogoMark />
              {name.toUpperCase()}
            </SiteLink>
            <p>{footer.text}</p>
            <p>{contacts.address}</p>
          </div>
          <div>
            <h4>{t('footer.sections')}</h4>
            <ul>
              <NavItems items={navigation} />
            </ul>
          </div>
          <div>
            <h4>{t('footer.contacts')}</h4>
            <ul>
              {contacts.phones.map((p) => (
                <li key={p}>
                  <a href={phoneHref(p)}>{p}</a>
                </li>
              ))}
              {contacts.email && (
                <li>
                  <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
                </li>
              )}
              {contacts.whatsapp && (
                <li>
                  <a
                    href={whatsappHref(contacts.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              {contacts.hours && <li className="muted">{contacts.hours}</li>}
            </ul>
          </div>
          <div>
            <h4>{t('footer.socials')}</h4>
            <ul>
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.type.charAt(0).toUpperCase() + s.type.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="bot">
          <span>{footer.legal}</span>
          <span>{LOCALES.map((l) => LOCALE_LABELS[l]).join(' · ')}</span>
        </div>
      </div>
    </footer>
  )
}

function NavItems({ items }: { items: SiteSettings['navigation'] }) {
  return (
    <>
      {items.map((item, i) => (
        <li key={i}>
          <NavLinks items={[item]} />
        </li>
      ))}
    </>
  )
}
