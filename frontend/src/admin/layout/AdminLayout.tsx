import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { preloadSections } from '../sectionLoaders'
import { Skeleton } from '../ui/feedback'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import type { ThemeChoice } from './theme'
import { Topbar } from './Topbar'

interface AdminLayoutProps {
  theme: ThemeChoice
  onThemeChange: (theme: ThemeChoice) => void
}

/** Shown while a section's chunk loads. */
function SectionSkeleton() {
  const t = useT()
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={t('app.loading')}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

/**
 * After moving to another section, focus goes to the content (screen readers announce the
 * new page, keyboard users do not start over from the menu) and the page starts at the top.
 * Changes of query parameters (filters, an open record) keep focus where it is.
 */
function useFocusOnNavigation() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    document.getElementById('admin-main')?.focus({ preventScroll: true })
  }, [pathname])
}

export function AdminLayout({ theme, onThemeChange }: AdminLayoutProps) {
  const t = useT()
  useFocusOnNavigation()
  useEffect(() => preloadSections(), [])
  return (
    <div className="min-h-dvh">
      <a
        href="#admin-main"
        className="sr-only z-toast rounded bg-panel px-3 py-2 text-sm shadow focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        {t('app.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-dvh flex-col md:pl-rail xl:pl-sidebar">
        <Topbar theme={theme} onThemeChange={onThemeChange} />
        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 px-4 pb-[calc(theme(spacing.bottombar)+1.5rem)] pt-4 outline-none md:px-6 md:pb-8 md:pt-6"
        >
          <Suspense fallback={<SectionSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
