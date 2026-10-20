import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SiteSettings } from '@/api/types'
import { phoneHref } from '@/lib/format'
import { pad2 } from '@/sections/sectionNumber'
import { LangSwitch } from './LangSwitch'
import { NavLinks } from './NavLinks'

type Props = { settings: SiteSettings | undefined; onClose: () => void }

/**
 * Full-screen menu below 1080px: the navigation as the sheet register (numbered, large),
 * languages and contacts. Focus stays inside it and the menu button; Esc closes it; the page
 * underneath does not scroll.
 */
export function MobileMenu({ settings, onClose }: Props) {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)
  const items = settings?.navigation ?? []
  const contacts = settings?.contacts

  useEffect(() => {
    const el = root.current
    el?.querySelector<HTMLElement>('a, button')?.focus()
    const html = document.documentElement
    html.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !el) return
      // The header's menu button belongs to the cycle too: it closes the menu.
      const toggle = document.querySelector<HTMLElement>('[aria-controls="mobile-menu"]')
      const focusable = [
        ...(toggle ? [toggle] : []),
        ...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={root}
      id="mobile-menu"
      className="tone-dark fixed inset-x-0 bottom-0 top-header overflow-y-auto bg-surface min-[1081px]:hidden"
    >
      <div className="flex min-h-full flex-col gap-12 pb-10 pl-pad-l pr-pad-r pt-2">
        <NavLinks
          items={items}
          onNavigate={onClose}
          className="flex flex-col"
          linkClassName="grid grid-cols-[3.5rem_1fr] items-baseline border-b border-line py-3 text-[clamp(1.75rem,7vw,2.75rem)] font-heading leading-tight tracking-[-0.03em]"
          renderPrefix={(i) => (
            <span aria-hidden="true" className="mono-label">
              {pad2(i + 1)}
            </span>
          )}
        />
        <div className="mt-auto grid gap-8">
          <div className="grid gap-3">
            <p className="mono-label">{t('sheet.language')}</p>
            <LangSwitch variant="boxed" />
          </div>
          {contacts && (
            <address className="grid gap-2 not-italic">
              <p className="mono-label">{t('sheet.contacts')}</p>
              <p>{contacts.address}</p>
              {contacts.phones.map((p) => (
                <a key={p} href={phoneHref(p)} className="link-draw w-fit">
                  {p}
                </a>
              ))}
              {contacts.email && (
                <a href={`mailto:${contacts.email}`} className="link-draw w-fit">
                  {contacts.email}
                </a>
              )}
            </address>
          )}
        </div>
      </div>
    </div>
  )
}
