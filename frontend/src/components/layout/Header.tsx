import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { matchPath, useLocation } from 'react-router-dom'
import type { SiteSettings } from '@/api/types'
import { Arrow, CmsLink } from '@/components/site/kit'
import { SiteLink } from '@/components/ui/SiteLink'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { LangSwitch } from './LangSwitch'
import { LogoMark } from './Logo'
import { NavLinks } from './NavLinks'

/**
 * Transparent over the hero, solid with blur once the page scrolls. A project page has no
 * full-bleed photo on top, so there it is solid from the start.
 */
export function Header({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const burger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // a page change closes the menu
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    menu.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        burger.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = settings?.site_name ?? 'MegaSmart'
  const solid = scrolled || !!matchPath('/:locale/projects/:slug', pathname)
  const close = () => setOpen(false)

  return (
    <>
      <header className={cn('hdr', solid && 'is-solid')}>
        <div className="wrap">
          <SiteLink to={`/${locale}`} className="logo" aria-label={`${name} — ${t('nav.home')}`}>
            <LogoMark />
            {name.toUpperCase()}
          </SiteLink>
          <nav className="nav" aria-label={t('nav.main')}>
            {settings && <NavLinks items={settings.navigation} />}
          </nav>
          <LangSwitch />
          {settings?.header_cta && (
            <CmsLink href={settings.header_cta.href} className="btn btn--accent">
              {settings.header_cta.label}
            </CmsLink>
          )}
          <button
            ref={burger}
            className="burger"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </header>
      <div
        ref={menu}
        id="site-menu"
        className={cn('menu', open && 'open')}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        aria-hidden={!open}
        {...(open ? {} : { inert: '' })}
      >
        <button className="close" aria-label={t('nav.close')} onClick={close}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <nav aria-label={t('nav.main')}>
          {settings && <NavLinks items={settings.navigation} onNavigate={close} />}
        </nav>
        <LangSwitch onNavigate={close} />
        {settings?.header_cta && (
          <CmsLink href={settings.header_cta.href} className="btn btn--accent" onClick={close}>
            {settings.header_cta.label}
            <Arrow />
          </CmsLink>
        )}
      </div>
    </>
  )
}
