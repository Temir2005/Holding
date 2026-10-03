import { useTranslation } from 'react-i18next'
import type { SiteSettings } from '@/api/types'
import { Container } from '@/components/ui/Container'
import { phoneHref, whatsappHref } from '@/lib/format'
import { Logo } from './Logo'
import { NavLinks } from './NavLinks'

export function Footer({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  if (!settings) return null
  const { contacts, footer, socials, navigation } = settings
  return (
    <footer className="tone-dark border-t border-line py-14">
      <Container className="grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-4">
          <Logo settings={settings} />
          <p className="max-w-sm text-sm text-fg-mute">{footer.text}</p>
        </div>
        <nav aria-label="footer" className="md:col-span-3">
          <NavLinks items={navigation} className="flex flex-col gap-2 text-sm" />
        </nav>
        <address className="flex flex-col gap-3 text-sm not-italic md:col-span-5">
          <p>{contacts.address}</p>
          {contacts.phones.map((p) => (
            <a key={p} href={phoneHref(p)} className="w-fit hover:text-accent-ink">
              {p}
            </a>
          ))}
          {contacts.email && (
            <a href={`mailto:${contacts.email}`} className="w-fit hover:text-accent-ink">
              {contacts.email}
            </a>
          )}
          {contacts.whatsapp && (
            <a href={whatsappHref(contacts.whatsapp)} target="_blank" rel="noopener noreferrer" className="w-fit hover:text-accent-ink">
              {t('contacts.whatsapp')}
            </a>
          )}
          {socials.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-4 font-mono text-xs uppercase text-fg-mute">
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-fg">
                    {s.type}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </address>
        <p className="border-t border-line pt-6 font-mono text-xs text-fg-mute md:col-span-12">
          {footer.legal}
        </p>
      </Container>
    </footer>
  )
}
