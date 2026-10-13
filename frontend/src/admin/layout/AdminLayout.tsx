import { Outlet } from 'react-router-dom'
import { useT } from '../i18n'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import type { ThemeChoice } from './theme'
import { Topbar } from './Topbar'

interface AdminLayoutProps {
  theme: ThemeChoice
  onThemeChange: (theme: ThemeChoice) => void
}

export function AdminLayout({ theme, onThemeChange }: AdminLayoutProps) {
  const t = useT()
  return (
    <div className="min-h-dvh">
      <a
        href="#admin-main"
        className="fixed left-2 top-2 z-toast -translate-y-20 rounded bg-panel px-3 py-2 text-sm shadow focus:translate-y-0"
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
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
