import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { SiteSettings } from '@/api/types'
import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'
import { LangSwitch } from './LangSwitch'
import { Logo } from './Logo'
import { NavLinks } from './NavLinks'

/** Transparent over the hero; gains a blurred background once the page scrolls. */
export function Header({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const items = settings?.navigation ?? []

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={cn(
        'tone-dark fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300',
        scrolled || open
          ? 'border-b border-line bg-surface/85 backdrop-blur-md'
          : 'border-b border-transparent !bg-transparent',
      )}
    >
      <Container className="flex h-[var(--header-h)] items-center justify-between gap-6">
        <Logo settings={settings} />
        <nav aria-label="primary" className="hidden lg:block">
          <NavLinks items={items} className="flex items-center gap-6 text-sm" linkClassName="transition-colors" />
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch className="hidden sm:flex" />
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t('nav.close') : t('nav.menu')}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="tone-dark fixed inset-x-0 bottom-0 top-[var(--header-h)] overflow-y-auto bg-surface lg:hidden"
          >
            <Container className="flex min-h-full flex-col justify-between gap-10 py-10">
              <NavLinks
                items={items}
                onNavigate={() => setOpen(false)}
                className="flex flex-col gap-2"
                linkClassName="block py-2 font-display text-3xl font-extrabold tracking-tight"
              />
              <LangSwitch className="text-sm" />
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
