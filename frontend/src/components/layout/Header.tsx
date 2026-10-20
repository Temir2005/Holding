import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { SiteSettings } from '@/api/types'
import { CmsLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { LangSwitch } from './LangSwitch'
import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'

/**
 * Site header: a solid graphite strip that hides while scrolling down and comes back on the way
 * up (and whenever something inside it has keyboard focus). Below 1080px the navigation moves
 * into a full-screen menu. Reduced motion: the header simply stays.
 */
export function Header({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { scrolled, hidden } = useHideOnScroll(open)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const menuButton = useRef<HTMLButtonElement>(null)
  const items = settings?.navigation ?? []

  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={cn(
        'tone-dark fixed inset-x-0 top-0 z-header border-b transition-[transform,border-color] duration-3 ease-out focus-within:translate-y-0',
        scrolled || open ? 'border-line-strong' : 'border-transparent',
        hidden && !reduce && '-translate-y-[101%]',
      )}
    >
      <div className="mx-auto flex h-header max-w-sheet items-center gap-[clamp(16px,2.4vw,40px)] pl-pad-l pr-pad-r">
        <Logo settings={settings} />
        <nav aria-label="primary" className="ml-auto hidden min-[1081px]:block">
          <NavLinks
            items={items}
            className="flex items-center gap-[clamp(16px,1.7vw,32px)]"
            linkClassName="block pb-1 pt-1.5 text-sm font-medium"
          />
        </nav>
        <LangSwitch className="hidden min-[1081px]:flex" />
        {settings?.header_cta && (
          <CmsLink
            href={settings.header_cta.href}
            variant="secondary"
            className="hidden min-h-10 py-1 min-[1081px]:inline-flex"
          >
            {settings.header_cta.label}
          </CmsLink>
        )}
        <button
          ref={menuButton}
          type="button"
          className="ml-auto inline-flex h-10 items-center gap-2.5 border border-line-strong px-4 font-mono text-caption font-medium uppercase min-[1081px]:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" className="grid w-4 gap-1">
            <i className="h-px bg-current" />
            <i className="h-0.5 w-2.5 bg-trace" />
          </span>
          {open ? t('nav.close') : t('nav.menu')}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : DUR.base, ease: EASE_OUT }}
          >
            <MobileMenu
              settings={settings}
              onClose={() => {
                setOpen(false)
                menuButton.current?.focus()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/** Hidden after scrolling down past the header, shown again on any scroll up. One rAF per event. */
function useHideOnScroll(locked: boolean) {
  const [state, setState] = useState({ scrolled: false, hidden: false })
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      setState((prev) => {
        const hidden = locked
          ? false
          : delta > 4 && y > 96
            ? true
            : delta < -4
              ? false
              : prev.hidden
        const scrolled = y > 8
        return prev.hidden === hidden && prev.scrolled === scrolled ? prev : { hidden, scrolled }
      })
      if (Math.abs(delta) > 4) last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [locked])
  return state
}
